"""
Security module for Edumate Backend
Handles JWT validation, authorization, rate limiting, and audit logging.
"""

from fastapi import HTTPException, Request, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import jwt
import base64
import hashlib
import logging
import time
from functools import wraps
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security constants
JWT_ALGORITHM = "HS256"  # Default algorithm, will auto-detect from token
TOKEN_TOLERANCE = 300  # 5 minutes tolerance for clock skew

# HTTPBearer security scheme
security = HTTPBearer()


class SecurityAuditLogger:
    """Audit logger for security events."""

    def __init__(self):
        self.events = []

    def log_event(self, event_type: str, user_id: str, details: Dict[str, Any],
                  ip_address: str, status: str = "success"):
        """Log a security event."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "ip_address": ip_address,
            "status": status,
            "details": details
        }
        self.events.append(event)
        logger.info(f"Security Event [{event_type}]: User={user_id}, Status={status}, IP={ip_address}")

    def log_authorization_failure(self, user_id: str, requested_id: str,
                                   endpoint: str, ip_address: str):
        """Log an authorization failure (potential IDOR attempt)."""
        self.log_event(
            event_type="AUTHORIZATION_FAILURE",
            user_id=user_id,
            ip_address=ip_address,
            status="blocked",
            details={
                "requested_id": requested_id,
                "endpoint": endpoint,
                "reason": "User attempted to access resource they don't own"
            }
        )

    def log_token_validation_failure(self, reason: str, ip_address: str):
        """Log a token validation failure."""
        self.log_event(
            event_type="TOKEN_VALIDATION_FAILURE",
            user_id="unknown",
            ip_address=ip_address,
            status="blocked",
            details={"reason": reason}
        )


# Global security audit logger instance
audit_logger = SecurityAuditLogger()


def decode_studtbl_id(studtbl_id: str) -> Optional[str]:
    """
    Decode and normalize studtblId for comparison.
    Since studtblId appears to be base64 encoded, we decode it to get the actual ID.
    """
    try:
        # Fix URL encoding issues first
        studtbl_id = studtbl_id.replace(" ", "+")
        # Try to decode as base64
        decoded = base64.b64decode(studtbl_id).decode('utf-8')
        return decoded
    except Exception:
        # If decoding fails, return the original ID
        return studtbl_id


def extract_user_id_from_token(token: str, verify: bool = False) -> Optional[str]:
    """
    Extract user ID from JWT token without verification.

    Since we're acting as a proxy and the upstream ERP validates the token,
    we extract the user ID to validate ownership without needing the signing key.

    Args:
        token: JWT token string
        verify: Whether to verify signature (default False for proxy mode)

    Returns:
        User ID from token or None if extraction fails
    """
    try:
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]

        # Decode JWT without verification (we're validating ownership, not signature)
        # The upstream ERP will validate the signature
        decoded = jwt.decode(token, options={"verify_signature": verify})

        # Try common JWT claim names for user ID
        user_id = (
            decoded.get('sub') or
            decoded.get('userId') or
            decoded.get('user_id') or
            decoded.get('studtblId') or
            decoded.get('studentId') or
            decoded.get('id')
        )

        return user_id
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error extracting user ID from token: {str(e)}")
        return None


async def verify_token_and_ownership(
    credentials: HTTPAuthorizationCredentials = Security(security),
    requested_studtbl_id: Optional[str] = None
) -> str:
    """
    Verify that the token is valid and that the user owns the requested resource.

    Args:
        credentials: HTTP Bearer credentials containing the JWT token
        requested_studtbl_id: The studtblId being requested

    Returns:
        The authenticated user's ID

    Raises:
        HTTPException: If token is invalid or user doesn't own the resource
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials"
        )

    token = credentials.credentials

    # Extract user ID from token
    user_id = extract_user_id_from_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )

    # If a specific studtblId is requested, verify ownership
    if requested_studtbl_id:
        # Normalize both IDs for comparison
        normalized_user_id = decode_studtbl_id(user_id) if user_id else None
        normalized_requested_id = decode_studtbl_id(requested_studtbl_id)

        # Check if the user owns the requested resource
        if normalized_user_id != normalized_requested_id and user_id != requested_studtbl_id:
            # Log this potential IDOR attempt
            audit_logger.log_authorization_failure(
                user_id=user_id,
                requested_id=requested_studtbl_id,
                endpoint="unknown",
                ip_address="unknown"
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access this resource"
            )

    return user_id


def validate_studtbl_id_format(studtbl_id: str) -> bool:
    """
    Validate that studtblId has the expected format.
    This helps prevent injection attacks and invalid IDs.

    Args:
        studtbl_id: The studtblId to validate

    Returns:
        True if valid, False otherwise
    """
    if not studtbl_id or len(studtbl_id) > 200:
        return False

    try:
        # Check if it's valid base64
        decoded = base64.b64decode(studtbl_id)
        # Check for reasonable length after decoding
        if len(decoded) > 100:
            return False
        return True
    except Exception:
        # If not base64, check if it's alphanumeric with allowed special chars
        allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=-_')
        return all(c in allowed_chars for c in studtbl_id)


async def get_current_user_from_request(request: Request) -> Optional[str]:
    """
    Extract and validate the current user from request headers.

    Args:
        request: FastAPI request object

    Returns:
        User ID if valid, None otherwise
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    return extract_user_id_from_token(token)


async def validate_request_authorization(
    request: Request,
    studtbl_id: str,
    endpoint: str = "unknown"
) -> bool:
    """
    Validate that the current user is authorized to access the requested studtblId.

    Args:
        request: FastAPI request object
        studtbl_id: The studtblId being requested
        endpoint: The endpoint being accessed (for logging)

    Returns:
        True if authorized, raises HTTPException otherwise
    """
    # Get current user from request
    user_id = await get_current_user_from_request(request)

    if not user_id:
        audit_logger.log_token_validation_failure(
            reason="Missing or invalid token",
            ip_address=request.client.host if request.client else "unknown"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    # Validate studtblId format
    if not validate_studtbl_id_format(studtbl_id):
        audit_logger.log_event(
            event_type="INVALID_INPUT",
            user_id=user_id,
            ip_address=request.client.host if request.client else "unknown",
            status="blocked",
            details={
                "studtbl_id": studtbl_id,
                "endpoint": endpoint,
                "reason": "Invalid studtblId format"
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid studtblId format"
        )

    # Normalize IDs for comparison
    normalized_user_id = decode_studtbl_id(user_id)
    normalized_requested_id = decode_studtbl_id(studtbl_id)

    # Check ownership
    if normalized_user_id != normalized_requested_id and user_id != studtbl_id:
        # Log this authorization failure (potential IDOR attempt)
        audit_logger.log_authorization_failure(
            user_id=user_id,
            requested_id=studtbl_id,
            endpoint=endpoint,
            ip_address=request.client.host if request.client else "unknown"
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to access this resource"
        )

    # Log successful authorization
    audit_logger.log_event(
        event_type="AUTHORIZATION_SUCCESS",
        user_id=user_id,
        ip_address=request.client.host if request.client else "unknown",
        status="success",
        details={
            "endpoint": endpoint,
            "studtbl_id": studtbl_id
        }
    )

    return True


# Rate limiting storage (in production, use Redis or similar)
rate_limit_storage: Dict[str, list] = {}

def check_rate_limit(key: str, max_requests: int = 100, window_seconds: int = 60) -> bool:
    """
    Check if a request exceeds the rate limit.

    Args:
        key: Unique key for the rate limit (e.g., IP address or user ID)
        max_requests: Maximum number of requests allowed in the window
        window_seconds: Time window in seconds

    Returns:
        True if within rate limit, False if exceeded
    """
    current_time = time.time()

    # Initialize storage for this key if not exists
    if key not in rate_limit_storage:
        rate_limit_storage[key] = []

    # Remove old requests outside the window
    rate_limit_storage[key] = [
        req_time for req_time in rate_limit_storage[key]
        if current_time - req_time < window_seconds
    ]

    # Check if limit exceeded
    if len(rate_limit_storage[key]) >= max_requests:
        return False

    # Add current request
    rate_limit_storage[key].append(current_time)
    return True


async def enforce_rate_limit(request: Request, identifier: Optional[str] = None):
    """
    Enforce rate limiting on requests.

    Args:
        request: FastAPI request object
        identifier: Optional identifier (uses IP if not provided)

    Raises:
        HTTPException: If rate limit is exceeded
    """
    # Use provided identifier or fall back to IP address
    key = identifier or (request.client.host if request.client else "unknown")

    if not check_rate_limit(key, max_requests=100, window_seconds=60):
        audit_logger.log_event(
            event_type="RATE_LIMIT_EXCEEDED",
            user_id=identifier or "unknown",
            ip_address=request.client.host if request.client else "unknown",
            status="blocked",
            details={"limit": "100 requests per minute"}
        )

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )


def sanitize_input(value: str, max_length: int = 200) -> str:
    """
    Sanitize user input to prevent injection attacks.

    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not value:
        return ""

    # Truncate to max length
    value = value[:max_length]

    # Remove potentially dangerous characters
    # Keep alphanumeric, basic punctuation, and common base64 characters
    allowed_chars = set(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        '+/=-_ .@'
    )

    sanitized = ''.join(c for c in value if c in allowed_chars)

    return sanitized.strip()
