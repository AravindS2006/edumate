# Edumate Backend - Secure API Proxy

A secure FastAPI-based backend proxy for the Edumate student portal that adds critical security layers over the legacy ERP system.

## 🔒 Security Features

### Critical IDOR/BOLA Protection
- **Authorization Middleware**: Validates that users can only access their own data
- **JWT Token Validation**: Extracts and validates user identity from tokens
- **35+ Protected Endpoints**: All sensitive endpoints require authorization
- **Audit Logging**: Comprehensive logging of all authorization attempts

### Additional Security Measures
- **Rate Limiting**: 100 requests per minute per IP/user
- **Input Validation**: Sanitization and format validation for all inputs
- **CORS Hardening**: Restricted methods and headers
- **Security Headers**: X-Frame-Options, X-XSS-Protection, HSTS, etc.
- **HTTPS Enforcement**: Strict-Transport-Security header

## 🚀 Quick Start

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Environment Variables

```bash
# Required in production
export ENVIRONMENT=production
export LOGS_SECRET_KEY=your-secret-key-here

# Optional
export FRONTEND_URL=https://your-frontend.com
```

### Run Development Server

```bash
uvicorn main:app --reload --port 8000
```

### Run Production Server

```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📋 Requirements

- Python 3.8+
- FastAPI
- httpx (async HTTP client)
- PyJWT (JWT token handling)
- pycryptodome (AES encryption for upstream credentials)
- slowapi (rate limiting)
- Other dependencies in requirements.txt

## 🛡️ Security Architecture

### Authorization Flow

```
1. Client sends request with JWT token and studtblId
   ↓
2. Global middleware applies rate limiting
   ↓
3. Endpoint calls validate_request_authorization()
   ↓
4. Security module extracts user ID from JWT
   ↓
5. Compare user ID with requested studtblId
   ↓
6. If authorized: forward to upstream ERP
   If unauthorized: return 403 Forbidden
   ↓
7. Log result to audit log
```

### Protected Resources

All endpoints that accept `studtblId` are now protected:

- **Student Data**: Personal details, academic info, parent details
- **Attendance**: Course, daily, overall attendance records
- **Exams**: Hall tickets, exam status, arrears
- **Documents**: Document status, downloads, endorsements
- **Reports**: Academic reports, transcripts
- **Profile**: Achievements, identifiers, images

## 🔑 API Authentication

All protected endpoints require:

```bash
Authorization: Bearer <jwt-token>
X-Institution-Id: SEC  # or SIT
```

### Example Request

```bash
curl https://api.edumate.com/api/student/personal?studtblId=ABC123 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "X-Institution-Id: SEC"
```

### Error Responses

- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Valid token but no permission to access resource
- `400 Bad Request`: Invalid input format
- `429 Too Many Requests`: Rate limit exceeded

## 📊 Monitoring & Logging

### Audit Logs

Security events are logged including:
- Authorization successes/failures
- Token validation failures
- Rate limit violations
- Invalid input attempts

Each log entry contains:
- Timestamp
- User ID
- IP address
- Endpoint
- Status (success/blocked)
- Details

### Security Monitoring

Monitor these metrics:
- Rate of 403 errors (potential IDOR attacks)
- Rate limit violations
- Invalid token attempts
- Authorization failure patterns

## 🧪 Testing

### Test Authorization

```bash
# Should succeed (own data)
curl /api/student/personal?studtblId=MY_ID -H "Authorization: Bearer MY_TOKEN"

# Should fail with 403 (other user's data)
curl /api/student/personal?studtblId=OTHER_ID -H "Authorization: Bearer MY_TOKEN"
```

### Test Rate Limiting

```bash
# 101st request should return 429
for i in {1..101}; do
  curl /api/student/personal?studtblId=MY_ID -H "Authorization: Bearer MY_TOKEN"
done
```

### Test Input Validation

```bash
# Should return 400
curl /api/student/personal?studtblId=<invalid> -H "Authorization: Bearer MY_TOKEN"
```

## 📁 Project Structure

```
backend/
├── main.py              # Main FastAPI application
├── security.py          # Security module (auth, rate limiting, validation)
├── crypto_utils.py      # AES encryption for upstream credentials
├── sheets_logger.py     # Google Sheets logging
├── requirements.txt     # Python dependencies
└── SECURITY.md         # Detailed security documentation
```

## 🔧 Configuration

### Institutions

Supports two institutions (configured in main.py):
- SEC: Sairam Engineering College
- SIT: Sairam Institute of Technology

### Rate Limits

Default: 100 requests per minute per IP/user

To adjust, modify in `security.py`:
```python
check_rate_limit(key, max_requests=100, window_seconds=60)
```

### CORS Origins

Configured in main.py:
```python
origins = [
    "https://edumate-sairam.vercel.app",
    "http://localhost:3000",
]
```

## 🚨 Security Incidents

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. Email security concerns to the maintainers
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## 📜 API Documentation

### Available Endpoints

#### Authentication
- `POST /api/login` - User login (no auth required)

#### Student Information
- `GET /api/student/personal` - Personal details 🔒
- `GET /api/student/academic` - Academic details 🔒
- `GET /api/student/parent` - Parent details 🔒
- `GET /api/student/exam-status` - Exam eligibility 🔒
- `GET /api/student/arrears` - Arrears details 🔒

#### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics 🔒

#### Attendance
- `GET /api/attendance/course-detail` - Course attendance 🔒
- `GET /api/attendance/daily-detail` - Daily attendance 🔒
- `GET /api/attendance/overall-detail` - Overall attendance 🔒
- `GET /api/attendance/leave-status` - Leave status 🔒

#### Hall Tickets
- `GET /api/hallticket/history` - Hall ticket history 🔒
- `GET /api/hallticket/subject-details` - Subject details 🔒
- `POST /api/hallticket/download-pdf` - Download hall ticket 🔒

#### Documents
- `GET /api/document/status` - Document status 🔒
- `GET /api/document/others` - Other documents 🔒
- `GET /api/document/download-blob` - Download document 🔒

#### Profile
- `GET /api/profile/image` - Profile image 🔒
- `GET /api/profile/achievements/studies` - Academic achievements 🔒
- `GET /api/profile/achievements/nptel` - NPTEL certifications 🔒
- `GET /api/profile/achievements/amcat` - AMCAT scores 🔒

#### Reports
- `GET /api/reports` - Get report filters 🔒
- `POST /api/reports/download` - Download report PDF 🔒

🔒 = Requires authorization (user can only access their own data)

## 🔄 Updates & Maintenance

### Dependency Updates

```bash
pip list --outdated
pip install -U package-name
```

### Security Updates

Regularly update dependencies, especially:
- FastAPI
- httpx
- PyJWT
- pydantic

### Audit Log Rotation

Implement log rotation in production:
```python
# In security.py SecurityAuditLogger
if len(self.events) > 10000:
    # Archive or send to external service
    self.flush_to_service()
    self.events = []
```

## 🤝 Contributing

When contributing code:

1. Follow existing security patterns
2. Add authorization checks to new endpoints
3. Validate and sanitize all inputs
4. Update tests
5. Update documentation

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

- FastAPI framework
- Security best practices from OWASP
- Python security community

## 📞 Support

For issues or questions:
- Check SECURITY.md for detailed security documentation
- Review audit logs for security events
- Monitor application logs for errors

---

**Version**: 2.0.0 (Security Hardened)
**Last Updated**: 2026-03-27
**Security Status**: ✅ IDOR/BOLA Protected
