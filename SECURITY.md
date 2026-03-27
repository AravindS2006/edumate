# Security Implementation Guide

## Overview

This document describes the comprehensive security improvements implemented to address critical vulnerabilities, specifically IDOR (Insecure Direct Object Reference) / BOLA (Broken Object Level Authorization) attacks and other security threats.

## Critical Vulnerabilities Fixed

### 1. IDOR/BOLA Authorization Gap ✅

**Problem**: All API endpoints accepted `studtblId` parameter without validating that the authenticated user owns that resource. This allowed any authenticated user to access any other student's data by changing the `studtblId` parameter.

**Solution**: Implemented comprehensive authorization middleware that:
- Extracts user ID from JWT token
- Validates that requested `studtblId` matches authenticated user's ID
- Blocks unauthorized access with 403 Forbidden response
- Logs all authorization failures for security auditing

**Affected Endpoints** (35+ endpoints now protected):
- `/api/student/personal` - Personal details
- `/api/student/parent` - Parent contact information
- `/api/student/academic` - Academic details
- `/api/student/exam-status` - Exam eligibility and fees
- `/api/student/arrears` - Academic arrears
- `/api/dashboard/stats` - Dashboard statistics
- `/api/profile/*` - Profile images and achievements
- `/api/attendance/*` - Attendance records
- `/api/hallticket/*` - Hall ticket data
- `/api/document/*` - Document uploads and status
- `/api/reports/*` - Academic reports
- And many more...

### 2. Token Validation ✅

**Problem**: Authorization header was forwarded to upstream without verification. No validation of token authenticity, expiration, or ownership.

**Solution**:
- Added JWT token decoding and validation
- Extract user ID from token claims
- Verify token structure and format
- Log token validation failures

### 3. Input Validation & Sanitization ✅

**Problem**: User inputs were not validated or sanitized, exposing the system to injection attacks.

**Solution**:
- Implemented `sanitize_input()` function to remove dangerous characters
- Added `validate_studtbl_id_format()` to ensure IDs match expected format
- Enhanced `fix_id()` function with validation checks
- Limit input length to prevent buffer overflow attacks

### 4. Rate Limiting ✅

**Problem**: No rate limiting allowed attackers to enumerate student IDs and perform bulk data exfiltration.

**Solution**:
- Implemented rate limiting middleware
- Limit: 100 requests per minute per IP/user
- Rate limit storage with automatic cleanup of old entries
- Returns 429 Too Many Requests when limit exceeded
- Logs rate limit violations for security monitoring

### 5. Security Audit Logging ✅

**Problem**: No logging of security events made it impossible to detect IDOR attacks or other malicious activity.

**Solution**:
- Created `SecurityAuditLogger` class
- Logs all authorization attempts (success and failure)
- Logs token validation failures
- Logs rate limit violations
- Logs invalid input attempts
- Each log includes: timestamp, user ID, IP address, endpoint, and details

### 6. CORS Configuration ✅

**Problem**: Overly permissive CORS settings (`allow_methods=["*"]`, `allow_headers=["*"]`) could be exploited.

**Solution**:
- Restricted allowed HTTP methods to: GET, POST, OPTIONS
- Restricted allowed headers to: Authorization, Content-Type, X-Institution-Id
- Added `max_age` for preflight caching
- Maintained origin whitelist and regex pattern

### 7. Security Headers ✅

**Problem**: Missing security headers exposed users to various attacks (clickjacking, XSS, MIME sniffing).

**Solution**: Added security middleware that sets:
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- `Strict-Transport-Security` - Forces HTTPS connections

## Architecture

### Security Module (`security.py`)

The security module provides:

1. **JWT Token Handling**
   - `extract_user_id_from_token()` - Extracts user ID from JWT
   - `decode_studtbl_id()` - Normalizes base64-encoded IDs

2. **Authorization**
   - `validate_request_authorization()` - Main authorization function
   - `verify_token_and_ownership()` - Validates token ownership
   - Compares normalized user ID with requested resource ID

3. **Rate Limiting**
   - `check_rate_limit()` - Checks if rate limit exceeded
   - `enforce_rate_limit()` - Enforces rate limits on requests
   - In-memory storage (should use Redis in production)

4. **Input Validation**
   - `validate_studtbl_id_format()` - Validates ID format
   - `sanitize_input()` - Removes dangerous characters

5. **Audit Logging**
   - `SecurityAuditLogger` class
   - `log_authorization_failure()` - Logs IDOR attempts
   - `log_token_validation_failure()` - Logs invalid tokens
   - `log_event()` - General security event logging

### Integration in `main.py`

1. **Global Middleware**
   - `security_middleware()` - Applies rate limiting and security headers
   - Runs on every request except health checks

2. **Per-Endpoint Authorization**
   - Each protected endpoint calls `validate_request_authorization()`
   - Validates before forwarding to upstream API
   - Example:
     ```python
     @app.get("/api/student/personal")
     async def get_personal_details(request: Request, studtblId: str):
         studtblId = fix_id(studtblId)
         # SECURITY: Validate user owns this resource
         await validate_request_authorization(request, studtblId, "/api/endpoint")
         # ... rest of endpoint logic
     ```

## Security Flow

### Request Flow with Security Checks

```
1. Client Request
   ↓
2. Global Security Middleware
   - Rate limiting check
   - Add security headers
   ↓
3. Endpoint Handler
   - Parse studtblId
   - Call fix_id() - sanitizes and validates format
   ↓
4. Authorization Check
   - Extract token from Authorization header
   - Decode JWT to get user ID
   - Compare user ID with requested studtblId
   - Log authorization attempt
   ↓
5. Forward to Upstream (if authorized)
   - Make request to upstream ERP API
   - Return response to client
   ↓
6. Log Result
   - Audit log success/failure
```

### Error Responses

- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Valid token but no permission to access resource
- **400 Bad Request**: Invalid studtblId format
- **429 Too Many Requests**: Rate limit exceeded

## Testing Security

### Test IDOR Protection

```bash
# 1. Login as User A
curl -X POST https://api.edumate.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"userA","password":"passA"}'
# Response: {"token":"TOKEN_A","studtblId":"ID_A"}

# 2. Try to access User B's data with User A's token
curl https://api.edumate.com/api/student/personal?studtblId=ID_B \
  -H "Authorization: Bearer TOKEN_A"
# Expected: 403 Forbidden - Access denied
```

### Test Rate Limiting

```bash
# Make 101 requests in quick succession
for i in {1..101}; do
  curl https://api.edumate.com/api/student/personal?studtblId=MY_ID \
    -H "Authorization: Bearer MY_TOKEN"
done
# Expected: First 100 succeed, 101st returns 429 Too Many Requests
```

### Test Input Validation

```bash
# Try with invalid studtblId format
curl https://api.edumate.com/api/student/personal?studtblId=<script>alert(1)</script> \
  -H "Authorization: Bearer TOKEN"
# Expected: 400 Bad Request - Invalid studtblId format
```

## Deployment Considerations

### Production Requirements

1. **Environment Variables**
   - `ENVIRONMENT=production` - Enables production mode
   - `LOGS_SECRET_KEY` - Required for log access (must be set)
   - `FRONTEND_URL` - Allowed frontend origin

2. **Rate Limiting Storage**
   - Current: In-memory (resets on restart)
   - Recommended: Redis or similar for distributed systems
   - Update `security.py` rate_limit_storage to use Redis

3. **Audit Logging**
   - Current: In-memory list
   - Recommended: Send to external logging service (Datadog, CloudWatch, etc.)
   - Implement `SecurityAuditLogger.flush_to_service()` method

4. **Token Verification**
   - Current: Decodes without signature verification (proxy mode)
   - Upstream ERP validates signature
   - If needed, add JWT secret for local verification

### Security Best Practices

1. **Regular Security Audits**
   - Review audit logs daily for suspicious patterns
   - Monitor rate limit violations
   - Check for repeated authorization failures (IDOR attempts)

2. **Token Management**
   - Use short-lived tokens (recommended: 15-60 minutes)
   - Implement token refresh mechanism
   - Revoke tokens on logout

3. **HTTPS Only**
   - Always use HTTPS in production
   - Set `Strict-Transport-Security` header (already implemented)

4. **Database Security**
   - Use prepared statements (upstream ERP responsibility)
   - Encrypt sensitive data at rest
   - Regular backups

5. **Monitoring**
   - Set up alerts for:
     - High rate of 403 errors (potential IDOR attack)
     - Rate limit violations
     - Invalid token attempts
   - Track endpoint access patterns

## Migration Guide

### Frontend Changes Required

**IMPORTANT**: The frontend should continue to work without modifications because:
1. Authorization checks happen on backend only
2. User can only access their own data (which they were meant to see)
3. API responses remain the same structure
4. Only unauthorized access attempts are blocked

**No Breaking Changes** - Users accessing their own data will not notice any difference.

### Testing Checklist

- [ ] Users can login successfully
- [ ] Dashboard loads correctly
- [ ] Personal details display properly
- [ ] Parent details display properly
- [ ] Academic information loads
- [ ] Attendance records work
- [ ] Hall tickets can be downloaded
- [ ] Documents can be accessed
- [ ] Reports generate correctly
- [ ] Profile images load
- [ ] Achievements display
- [ ] Rate limiting doesn't affect normal usage
- [ ] Unauthorized access is properly blocked

## Security Improvements Roadmap

### Phase 1 (Implemented) ✅
- JWT token validation
- Authorization middleware
- IDOR protection on all endpoints
- Rate limiting
- Input validation
- Security audit logging
- CORS hardening
- Security headers

### Phase 2 (Recommended)
- [ ] Implement Redis for rate limiting
- [ ] External audit logging service
- [ ] Token refresh mechanism
- [ ] CSRF protection for state-changing operations
- [ ] API key authentication for service-to-service
- [ ] Implement Content Security Policy (CSP)
- [ ] Add request signing/HMAC validation
- [ ] Database query parameterization audit

### Phase 3 (Advanced)
- [ ] Implement OAuth 2.0/OIDC
- [ ] Multi-factor authentication (MFA)
- [ ] Anomaly detection for suspicious access patterns
- [ ] Automated security scanning (SAST/DAST)
- [ ] Penetration testing
- [ ] Bug bounty program

## Compliance

These security improvements help with:

- **GDPR**: Data integrity and confidentiality (Article 5, 32)
- **DPDP Act (India 2023)**: Data security requirements
- **FERPA**: Student record protection
- **ISO 27001**: Information security management
- **OWASP Top 10**: Addresses broken access control (#1)

## Support

For security concerns or questions:
1. Review this documentation
2. Check audit logs for security events
3. Monitor rate limiting metrics
4. Review application logs for errors

## Change Log

### Version 2.0 (2026-03-27)
- **CRITICAL**: Fixed IDOR/BOLA vulnerability on 35+ endpoints
- Added JWT token validation and authorization
- Implemented rate limiting (100 req/min)
- Added comprehensive security audit logging
- Enhanced input validation and sanitization
- Hardened CORS configuration
- Added security headers middleware
- Created security module (`security.py`)
- Updated all sensitive endpoints with authorization checks

### Version 1.0 (Previous)
- Basic proxy functionality
- No authorization checks
- Vulnerable to IDOR attacks
