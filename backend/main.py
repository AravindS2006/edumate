from fastapi import FastAPI, HTTPException, Request, Response, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import httpx
import json
import asyncio
import base64
import hashlib
import random
import time
from contextlib import asynccontextmanager
import os
import jwt
from crypto_utils import encrypt_data, decrypt_data
from sheets_logger import sheets_logger
from security import (
    validate_request_authorization,
    enforce_rate_limit,
    sanitize_input,
    audit_logger,
    validate_studtbl_id_format
)

# SECRET KEY for accessing logs — must be set via environment variable in production
LOGS_SECRET_KEY = os.environ.get("LOGS_SECRET_KEY")
if not LOGS_SECRET_KEY:
    ENVIRONMENT_CHECK = os.environ.get("ENVIRONMENT", "development")
    if ENVIRONMENT_CHECK.lower() == "production":
        raise RuntimeError("LOGS_SECRET_KEY environment variable must be set in production")
    LOGS_SECRET_KEY = "edumate_admin_secret"  # fallback for local development only


@asynccontextmanager
async def lifespan(app: FastAPI):
    limits = httpx.Limits(max_keepalive_connections=20, max_connections=40)
    app.state.client = httpx.AsyncClient(limits=limits, timeout=20.0, verify=False)
    yield
    await app.state.client.aclose()

@asynccontextmanager
async def get_client(request: Request):
    yield request.app.state.client

# Disable API docs in production
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
is_production = ENVIRONMENT.lower() == "production"

app = FastAPI(
    lifespan=lifespan,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json"
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

# Allow CORS — read allowed origins from FRONTEND_URL env var
frontend_url = os.environ.get("FRONTEND_URL", "https://edumate1-sairam.vercel.app")
origins = [
    frontend_url,
    "https://edumate1-sairam.vercel.app",
    "https://edumate1-sairam.vercel.app/",
    "http://localhost:3000",
    "http://localhost:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(.*\.vercel\.app|localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Only allow necessary methods
    allow_headers=["Authorization", "Content-Type", "X-Institution-Id"],  # Only allow necessary headers
    max_age=3600,  # Cache preflight requests for 1 hour
)

@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    response = await call_next(request)
    if request.method == "GET" and response.status_code == 200:
        path = request.url.path
        if "/api/dashboard/stats" in path or "/api/student/academic" in path or "/api/student/personal" in path or "/api/student/parent" in path:
            response.headers["Cache-Control"] = "public, max-age=1800"  # 30 mins
        elif "/api/profile/image" in path:
            response.headers["Cache-Control"] = "public, max-age=86400" # 1 day
        elif "/api/attendance/" in path or "/api/reports/" in path or "/api/student/exam-status" in path or "/api/hallticket/" in path:
            # 5 mins for volatile data
            response.headers["Cache-Control"] = "public, max-age=300"
    return response

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """
    Global security middleware to enforce rate limiting and log requests.
    """
    # Skip security checks for health and root endpoints
    if request.url.path in ["/", "/api/health", "/docs", "/redoc", "/openapi.json"]:
        return await call_next(request)

    # Apply rate limiting (except for login endpoint which has its own limits)
    if request.url.path != "/api/login":
        try:
            await enforce_rate_limit(request)
        except HTTPException as e:
            return Response(
                content=json.dumps({"error": e.detail}),
                status_code=e.status_code,
                media_type="application/json"
            )

    # Add security headers to response
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response

# Institutions Configuration
INSTITUTIONS = {
    "SEC": {
        "BASE_URL": "https://student.sairam.edu.in/studapi",
        "Origin": "https://student.sairam.edu.in",
        "Referer": "https://student.sairam.edu.in/dashboard",
        "institutionguid": "6EB79EFC-C8B1-47DC-922D-8A7C5E8DAB63"
    },
    "SIT": {
        "BASE_URL": "https://student.sairamit.edu.in/studapi",
        "Origin": "https://student.sairamit.edu.in",
        "Referer": "https://student.sairamit.edu.in/dashboard",
        "institutionguid": "6EB79EFC-C8B1-47DC-922D-8A7C5E8DAB63" # Same Project Key
    }
}

DEFAULT_INSTITUTION = "SEC"
TEST_TOKEN_SECRET = os.environ.get("TEST_TOKEN_SECRET") or hashlib.sha256(f"{LOGS_SECRET_KEY}-test-token".encode()).hexdigest()
PROXY_TOKEN_SECRET = os.environ.get("PROXY_TOKEN_SECRET") or hashlib.sha256(f"{LOGS_SECRET_KEY}-proxy-token".encode()).hexdigest()
PROXY_TOKEN_ISSUER = "edumate-proxy"
MOCK_PDF_CONTENT = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
TEST_FIRST_NAMES = ["Arjun", "Kavin", "Nithin", "Rithik", "Vignesh", "Harini", "Keerthana", "Priya"]
TEST_LAST_NAMES = ["Kumar", "Raj", "S", "M", "R", "N", "T", "Balan"]
TEST_BRANCHES = [("CSE", "CS"), ("ECE", "EC"), ("EEE", "EE"), ("IT", "IT"), ("MECH", "ME")]

def get_institution_config(request: Request):
    """
    Determines the institution from the 'X-Institution-Id' header.
    Returns (base_url, headers_dict).
    """
    inst_id = request.headers.get("X-Institution-Id", DEFAULT_INSTITUTION).upper()
    if inst_id not in INSTITUTIONS:
        inst_id = DEFAULT_INSTITUTION
        
    config = INSTITUTIONS[inst_id]
    
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        token = authorization[7:]
        try:
            payload = jwt.decode(token, PROXY_TOKEN_SECRET, algorithms=["HS256"])
            if payload.get("iss") == PROXY_TOKEN_ISSUER and payload.get("upstream_token"):
                authorization = "Bearer " + str(payload.get("upstream_token"))
        except Exception:
            pass

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": config["Referer"],
        "Origin": config["Origin"],
        "Content-Type": "application/json",
        "institutionguid": config["institutionguid"],
        "Authorization": authorization
    }
    
    return config["BASE_URL"], headers


@app.get("/")
async def root():
    response = {"message": "Edumate Backend Proxy is Running"}
    if not is_production:
        response["docs"] = "/docs"
    return response

class LoginRequest(BaseModel):
    username: str
    password: str

def _test_seed(studtbl_id: str, inst_id: str) -> int:
    digest = hashlib.sha256(f"{studtbl_id}:{inst_id}".encode()).hexdigest()
    return int(digest[:16], 16)

def _get_test_context(request: Request, requested_studtbl_id: Optional[str] = None):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        # NOTE: Used only to detect locally-issued test tokens for mock responses.
        # Real authorization continues to be enforced by validate_request_authorization().
        payload = jwt.decode(token, options={"verify_signature": False})
    except Exception:
        return None
    if not payload.get("is_test_user"):
        return None

    studtbl_id = str(payload.get("sub") or payload.get("studtblId") or "")
    if not studtbl_id:
        return None
    if requested_studtbl_id and studtbl_id != requested_studtbl_id:
        return None

    inst_id = request.headers.get("X-Institution-Id", DEFAULT_INSTITUTION).upper()
    seed = _test_seed(studtbl_id, inst_id)
    rng = random.Random(seed)

    branch_name, branch_code = TEST_BRANCHES[rng.randint(0, len(TEST_BRANCHES) - 1)]
    sem = rng.randint(3, 8)
    year_of_study = min(4, max(2, (sem + 1) // 2))
    section = ["A", "B", "C"][rng.randint(0, 2)]
    roll_suffix = rng.randint(101, 999)
    reg_no = f"{inst_id}{str(rng.randint(21, 24)).zfill(2)}{branch_code}{roll_suffix}"
    name = f"{TEST_FIRST_NAMES[rng.randint(0, len(TEST_FIRST_NAMES)-1)]} {TEST_LAST_NAMES[rng.randint(0, len(TEST_LAST_NAMES)-1)]}"
    attendance = round(rng.uniform(78.2, 96.3), 2)
    cgpa = round(rng.uniform(7.4, 9.6), 2)
    pgpa = round(min(10, cgpa + rng.uniform(-0.4, 0.6)), 2)
    od_pct = round(rng.uniform(1.0, 7.5), 2)
    absent_pct = round(max(0.2, 100 - attendance - od_pct), 2)
    official_email = f"{reg_no.lower()}@{inst_id.lower()}.edu.in"
    mobile = f"9{rng.randint(100000000, 999999999)}"
    father_mobile = f"8{rng.randint(100000000, 999999999)}"
    mother_mobile = f"7{rng.randint(100000000, 999999999)}"
    academic_year = "2025-2026"

    attendance_courses = [
        {
            "id": i + 1,
            "courseId": i + 1,
            "courseCode": f"{branch_code}{200 + i}",
            "courseName": title,
            "attendancePercentage": round(rng.uniform(75, 98), 2),
            "present_hrs": rng.randint(28, 42),
            "total_hrs": rng.randint(40, 48),
            "credit": rng.randint(2, 4)
        }
        for i, title in enumerate(["Data Structures", "Database Systems", "Operating Systems", "Computer Networks", "AI Fundamentals"])
    ]
    leave_data = [
        {
            "fromDate": "2026-02-04",
            "leaveType": "On Duty",
            "reason": "Inter-college Hackathon",
            "status": "Approved",
            "noOfHours": 6
        },
        {
            "fromDate": "2026-03-12",
            "leaveType": "Medical",
            "reason": "Viral fever",
            "status": "Approved",
            "noOfHours": 8
        }
    ]
    daily_data = [
        {"date": "2026-05-01", "attendanceStatus": "P"},
        {"date": "2026-05-02", "attendanceStatus": "P"},
        {"date": "2026-05-03", "attendanceStatus": "OD"},
        {"date": "2026-05-04", "attendanceStatus": "A"},
    ]
    arrears_data = [
        {
            "subjectCode": f"{branch_code}155",
            "subjectName": "Engineering Mathematics II",
            "attemptType": "Arrear",
            "semester": 2
        }
    ] if rng.randint(0, 1) == 1 else []

    context = {
        "studtblId": studtbl_id,
        "reg_no": reg_no,
        "name": name,
        "stats": {
            "attendance_percentage": attendance,
            "cgpa": cgpa,
            "arrears": len(arrears_data),
            "od_percentage": od_pct,
            "od_count": rng.randint(2, 9),
            "absent_percentage": absent_pct,
            "program": "B.E.",
            "branch_code": branch_code,
            "mentor_name": f"Dr. {TEST_LAST_NAMES[rng.randint(0, len(TEST_LAST_NAMES)-1)]}",
            "total_semesters": 8,
            "total_years": 4,
            "pgpa": pgpa
        },
        "personal": {
            "name": name,
            "reg_no": reg_no,
            "photo_id": "tdN4BQKuPTzj9130EWB8Gw==",
            "email": official_email,
            "date_of_birth": "2005-09-14",
            "gender": "Male" if rng.randint(0, 1) == 1 else "Female",
            "community": "BC",
            "religion": "Hindu",
            "mobile": mobile,
            "bus_route": f"Route-{rng.randint(1, 35)}",
            "hostel": rng.randint(0, 1) == 1,
            "languages": "English, Tamil",
            "age": "20"
        },
        "academic": {
            "dept": branch_name,
            "semester": sem,
            "semester_id": sem,
            "semester_name": f"Semester {sem}",
            "semester_type": "Even" if sem % 2 == 0 else "Odd",
            "section": section,
            "batch": "2022-2026",
            "admission_mode": "Counselling",
            "university_reg_no": f"UNIV{rng.randint(100000, 999999)}",
            "mentor_name": f"Dr. {TEST_LAST_NAMES[rng.randint(0, len(TEST_LAST_NAMES)-1)]}",
            "hostel": rng.randint(0, 1) == 1,
            "bus_code": f"B{rng.randint(1, 30)}",
            "current_academic_year": academic_year,
            "branch_id": rng.randint(1, 6),
            "year_of_study_id": year_of_study,
            "section_id": rng.randint(1, 4),
            "academic_year_id": 14,
            "program_id": 1,
            "regulation_id": 12
        },
        "academic_percentage": {
            "records": [
                {"exam": "SSLC", "year": "2020", "percentage": "93.4"},
                {"exam": "HSC", "year": "2022", "percentage": "91.8"}
            ]
        },
        "parent": {
            "father_name": f"{TEST_LAST_NAMES[rng.randint(0, len(TEST_LAST_NAMES)-1)]} Kumar",
            "father_occupation": "Business",
            "father_mobile": father_mobile,
            "mother_name": f"{TEST_LAST_NAMES[rng.randint(0, len(TEST_LAST_NAMES)-1)]} Priya",
            "mother_occupation": "Teacher",
            "mother_mobile": mother_mobile,
            "guardian_name": f"{TEST_LAST_NAMES[rng.randint(0, len(TEST_LAST_NAMES)-1)]} Rajan",
            "guardian_occupation": "Engineer",
            "guardian_mobile": f"6{rng.randint(100000000, 999999999)}"
        },
        "identifiers": {
            "umisId": f"UMIS{rng.randint(10000000, 99999999)}",
            "abcId": f"{rng.randint(10**11, 10**12-1)}",
            "nptelEmailId": official_email,
            "fitIndiaId": f"FIT{rng.randint(10000, 99999)}",
            "officialMail": official_email
        },
        "attendance": {
            "course": attendance_courses,
            "daily": daily_data,
            "overall": {
                "TotalWorkingHours": 420,
                "PresentHours": 360,
                "ODHours": 24,
                "AbsentHours": 36,
                "total_hours": 420,
                "present_hours": 360,
                "od_hours": 24,
                "absent_hours": 36
            },
            "leave": leave_data
        },
        "exam_status": {
            "attendance_eligible": attendance >= 75,
            "fees_eligible": True,
            "current_status": "Eligible",
            "total_fees": 125000,
            "paid_online": 125000,
            "previous_due": 0,
            "attendance_pct": attendance,
            "od_pct": od_pct,
            "arrears_current": len(arrears_data),
            "arrears_history": len(arrears_data)
        },
        "arrears": arrears_data,
        "reports": {
            "attendance": {"id": sem, "name": f"Semester {sem}", "number": sem},
            "cat": {"id": max(1, sem-1), "name": f"Semester {max(1, sem-1)}", "number": max(1, sem-1)},
            "endsem": {"id": sem, "name": f"Semester {sem}", "number": sem}
        },
        "hallticket": {
            "history": [
                {"semester_Name": f"Semester {sem-1}", "totalCreditPerSemester": 22, "totalFees": 122500},
                {"semester_Name": f"Semester {sem}", "totalCreditPerSemester": 21, "totalFees": 125000}
            ],
            "subjects": [
                {"subjectCode": c["courseCode"], "subjectName": c["courseName"], "credit": c["credit"], "attemptType": "Regular"}
                for c in attendance_courses
            ],
            "notes": [{"title": "HallTicket Instructions", "notes": "Carry your college ID card and hall ticket printout."}],
            "download_status": {"success": True, "message": "Eligible to download hall ticket"},
            "academic_year_sem": [
                {"academicYearId": 14, "academicYearName": academic_year, "semesterType": "Odd"},
                {"academicYearId": 14, "academicYearName": academic_year, "semesterType": "Even"}
            ]
        },
        "documents": {
            "uploaded": [
                {"id": "DOC101", "uploadedGuidId": "UGID101", "documentCode": "AADHAR", "documentName": "Aadhaar Card", "description": "Identity proof", "ocrStatus": "Classified", "uploadedDate": "2026-01-14", "documentNumber": "XXXX-XXXX-4821", "remarks": "Verified"},
                {"id": "DOC102", "uploadedGuidId": "UGID102", "documentCode": "HSC", "documentName": "HSC Marksheet", "description": "Academic proof", "ocrStatus": "Updated", "uploadedDate": "2026-01-16", "documentNumber": None, "remarks": "Verified"}
            ],
            "others": [
                {"id": "DOC201", "uploadedGuidId": "UGID201", "documentCode": "NSS", "documentName": "NSS Certificate", "description": "Other certificate", "ocrStatus": "Pending", "uploadedDate": "2026-02-10", "documentNumber": None, "remarks": "Awaiting review"}
            ]
        },
        "achievements": {
            "studies": [
                {"studiesName": "Mini Project Expo", "score": "A+"},
                {"studiesName": "Paper Presentation", "score": "A"}
            ],
            "amcat": [
                {"headerName": "Quantitative Aptitude", "value": "86"},
                {"headerName": "Logical Reasoning", "value": "82"}
            ]
        },
        "courses": [
            {"subjectCode": f"{branch_code}301", "subjectName": "Machine Learning", "credits": 3, "subjectType": "Core"},
            {"subjectCode": f"{branch_code}332", "subjectName": "Cloud Computing", "credits": 3, "subjectType": "Core"},
            {"subjectCode": f"{branch_code}351", "subjectName": "Data Visualization", "credits": 2, "subjectType": "Elective"}
        ],
        "inbox": {
            "categories": [
                {"id": 1, "inboxCategoryGuid": "CAT-MENTOR", "categoryName": "Mentoring", "description": "Mentor messages", "messageCount": 2, "unreadMessageCount": 1},
                {"id": 2, "inboxCategoryGuid": "CAT-ACADEMIC", "categoryName": "Academic", "description": "Academic notices", "messageCount": 1, "unreadMessageCount": 0}
            ],
            "messages": [
                {"id": 1, "messageId": 1, "messageGuid": "MSG-101", "categoryGuid": "CAT-MENTOR", "title": "Weekly Mentoring Update", "description": "Please submit your progress sheet.", "suggestion": "Upload before Friday", "sender": "mentor@college.edu", "receiver": reg_no, "messageDate": "2026-05-15T10:30:00", "isRead": False, "link": "701228~mentor-note.pdf", "counselingId": 701228, "needStudentAction": True},
                {"id": 2, "messageId": 2, "messageGuid": "MSG-102", "categoryGuid": "CAT-ACADEMIC", "title": "Internal Assessment Schedule", "description": "CAT-II timetable published.", "suggestion": None, "sender": "office@college.edu", "receiver": reg_no, "messageDate": "2026-05-10T09:00:00", "isRead": True, "link": None, "counselingId": None, "needStudentAction": False}
            ],
            "message_details": {
                "id": 1,
                "messageGuid": "MSG-101",
                "title": "Weekly Mentoring Update",
                "description": "Please submit your progress sheet and be ready with project demo points.",
                "sender": "mentor@college.edu",
                "receiver": reg_no,
                "suggestion": "Upload before Friday",
                "messageDate": "2026-05-15T10:30:00",
                "isRead": False,
                "link": "701228~mentor-note.pdf",
                "topicDiscussed": "Project Review",
                "action": "Submit PPT",
                "mentoringDocumentId": 701228,
                "mentoringDocumentName": "mentor-note.pdf",
                "studentDocumentId": None
            }
        }
    }
    return context

@app.post("/api/login")
async def login(request: Request, credentials: LoginRequest, background_tasks: BackgroundTasks):
    base_url, base_headers = get_institution_config(request)
    
    payload = {
        "userName": encrypt_data(credentials.username),
        "password": encrypt_data(credentials.password)
    }
    
    headers = base_headers.copy()
    headers["Referer"] = f"{base_headers['Origin']}/sign-in"

    client_ip = request.client.host if request.client else "Unknown"
    
    async with get_client(request) as client:
        try:
            response = await client.post(f"{base_url}/User/Login", json=payload, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                now = int(time.time())
                inst_id = request.headers.get("X-Institution-Id", DEFAULT_INSTITUTION).upper()
                upstream_token = data.get("idToken")
                proxy_payload = {
                    "iss": PROXY_TOKEN_ISSUER,
                    "sub": data.get("userId"),
                    "studtblId": data.get("userId"),
                    "upstream_token": upstream_token,
                    "inst_id": inst_id,
                    "name": data.get("name"),
                    "reg_no": data.get("regNo"),
                    "iat": now,
                    "exp": now + 86400
                }
                proxy_token = jwt.encode(proxy_payload, PROXY_TOKEN_SECRET, algorithm="HS256")
                
                # Fetch Name from Personal Details for better logging
                student_name = "Unknown"
                try:
                    # Update headers with the new token
                    headers["Authorization"] = f"Bearer {data.get('idToken')}"
                    headers["Authorization"] = "Bearer " + str(upstream_token or "")
                    pers_resp = await client.get(f"{base_url}/Student/GetStudentPersonalDetails", params={"studtblId": data.get("userId")}, headers=headers)
                    if pers_resp.status_code == 200:
                        p_data = pers_resp.json()
                        # Some APIs return {"data": {"studentName": ...}}, others return {"studentName": ...}
                        inner_data = p_data.get("data") if isinstance(p_data, dict) else {}
                        if isinstance(p_data, list) and len(p_data) > 0:
                            # Handle case where p_data is a list
                            inner_data = p_data[0]
                        
                        student_name = (inner_data.get("studentName") if isinstance(inner_data, dict) else None) or \
                                      p_data.get("studentName") or \
                                      (inner_data.get("name") if isinstance(inner_data, dict) else None) or \
                                      p_data.get("name") or \
                                      data.get("name", "Unknown")
                except Exception as e:
                    student_name = data.get("name", "Unknown")

                # Log success
                if sheets_logger:
                    user_details = {
                        "username": credentials.username,
                        "name": student_name, 
                        "status": "Success",
                        "ip": client_ip,
                        "institution": base_url
                    }
                    background_tasks.add_task(sheets_logger.log_login, user_details)

                return {
                    "token": proxy_token,
                    "studtblId": data.get("userId"),
                    "user_data": data 
                }
            else:
                if sheets_logger:
                    background_tasks.add_task(sheets_logger.log_login, {
                        "username": credentials.username,
                        "status": f"Failed: {response.status_code}",
                        "ip": client_ip
                    })
                response.raise_for_status()

        except Exception as e:
            pass
    # Fallback Mock for Dev
    if credentials.username == "test" and credentials.password == "test":
        inst_id = request.headers.get("X-Institution-Id", DEFAULT_INSTITUTION).upper()
        mock_raw_id = f"{inst_id}TEST{int(time.time())}"
        mock_studtbl_id = base64.b64encode(mock_raw_id.encode()).decode()
        mock_seed = _test_seed(mock_studtbl_id, inst_id)
        mock_rng = random.Random(mock_seed)
        branch_code = TEST_BRANCHES[mock_rng.randint(0, len(TEST_BRANCHES) - 1)][1]
        mock_context = {
            "name": f"{TEST_FIRST_NAMES[mock_rng.randint(0, len(TEST_FIRST_NAMES)-1)]} {TEST_LAST_NAMES[mock_rng.randint(0, len(TEST_LAST_NAMES)-1)]}",
            "reg_no": f"{inst_id}{str(mock_rng.randint(21, 24)).zfill(2)}{branch_code}{mock_rng.randint(101, 999)}"
        }
        now = int(time.time())
        token_payload = {
            "sub": mock_studtbl_id,
            "studtblId": mock_studtbl_id,
            "reg_no": mock_context.get("reg_no", credentials.username),
            "name": mock_context.get("name", "Test Student"),
            "is_test_user": True,
            "inst_id": inst_id,
            "iat": now,
            "exp": now + 86400
        }
        token = jwt.encode(token_payload, TEST_TOKEN_SECRET, algorithm="HS256")
        return {
            "status": "success",
            "token": token,
            "studtblId": mock_studtbl_id,
            "user": {
                "name": token_payload["name"],
                "reg_no": token_payload["reg_no"]
            },
            "user_data": {
                "idToken": token,
                "userId": mock_studtbl_id,
                "name": token_payload["name"],
                "regNo": token_payload["reg_no"],
                "instId": inst_id
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- Helper for Headers ---
# Removed get_upstream_headers as it is replaced by get_institution_config

def fix_id(studtblId: str) -> str:
    """
    Ensure + and = are not corrupted by URL encoding.
    Also sanitize input to prevent injection attacks.
    """
    if not studtblId:
        return ""

    # Sanitize input first
    studtblId = sanitize_input(studtblId, max_length=200)

    # Fix URL encoding
    studtblId = studtblId.replace(" ", "+")

    # Validate format
    if not validate_studtbl_id_format(studtblId):
        raise HTTPException(
            status_code=400,
            detail="Invalid studtblId format"
        )

    return studtblId


def build_attendance_params(request: Request) -> dict:
    """Build upstream params for attendance endpoints. SEC and SIT .NET APIs expect PascalCase."""
    q = dict(request.query_params)
    return {
        "studtblId": fix_id(q.get("studtblId", "")),
        "AcademicYearId": q.get("academicYearId", q.get("AcademicYearId", "14")),
        "BranchId": q.get("branchId", q.get("BranchId", "2")),
        "SemesterId": q.get("semesterId", q.get("SemesterId", "6")),
        "YearOfStudyId": q.get("yearOfStudyId", q.get("YearOfStudyId", "3")),
        "SectionId": q.get("sectionId", q.get("SectionId", "1")),
    }

# ============================================================
#  PROFILE IMAGE
# ============================================================
@app.get("/api/profile/image")
async def get_profile_image(request: Request, studtblId: str, documentId: str = "tdN4BQKuPTzj9130EWB8Gw=="):
    studtblId = fix_id(studtblId)
    documentId = fix_id(documentId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/profile/image")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Document/DownloadBlob"
    
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"documentId": documentId, "studtblId": studtblId}, headers=headers)
            
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "image/jpeg")
                return Response(
                    content=resp.content,
                    media_type=content_type,
                    status_code=200
                )
            else:
                pass
    except Exception as e:
        pass
    
    return Response(status_code=404)

# ============================================================
#  DASHBOARD STATS
# ============================================================
# ============================================================
#  DASHBOARD STATS
# ============================================================
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/dashboard/stats")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return test_ctx["stats"]

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Dashboard/GetStudentDashboardDetails"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            
            if resp.status_code == 200:
                json_data = resp.json()
                stats = {
                    "attendance_percentage": 0,
                    "cgpa": 0.0,
                    "arrears": 0,
                    "od_percentage": 0,
                    "od_count": 0,
                    "absent_percentage": 0,
                    "program": "",
                    "branch_code": "",
                    "mentor_name": "",
                    "total_semesters": 0,
                    "total_years": 0
                }
                
                if "data" in json_data and isinstance(json_data["data"], list) and len(json_data["data"]) > 0:
                    raw = json_data["data"][0]
                    stats = {
                        "attendance_percentage": raw.get("attendancePercentage", 0),
                        "cgpa": raw.get("uG_Cgpa", 0.0),
                        "arrears": 0,  # Will be filled from exam-status
                        "od_percentage": raw.get("odPercentage", 0),
                        "od_count": raw.get("odCount", 0),
                        "absent_percentage": raw.get("absentPercentage", 0),
                        "program": raw.get("program", ""),
                        "branch_code": raw.get("branchCode", ""),
                        "mentor_name": raw.get("mentorName", ""),
                        "total_semesters": raw.get("totalSemesters", 0),
                        "total_years": raw.get("totalYears", 0),
                        "pgpa": raw.get("pG_Cgpa", 0.0) # Updated key per user feedback
                    }
                return stats
            else:
                pass
    except Exception as e:
        pass
        
    return {"error": "Failed to fetch dashboard data"}

# ============================================================
#  ACADEMIC DETAILS (sem, branch, hostel, etc.)
# ============================================================
@app.get("/api/student/academic")
async def get_academic_details(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/student/academic")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return test_ctx["academic"]

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentAcademicDetails"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and isinstance(json_data["data"], list) and len(json_data["data"]) > 0:
                    raw = json_data["data"][0]
                    return {
                        "dept": raw.get("studentDepartment") or raw.get("programName", ""),
                        "semester": raw.get("currentSemsterId") or raw.get("semesterNo", 0),
                        "semester_name": raw.get("semesterName", ""),
                        "semester_type": raw.get("semesterType", ""),
                        "section": raw.get("sectionName", ""), # Not always available in this endpoint
                        "batch": raw.get("academicBatchYear") or raw.get("batchName", ""),
                        "admission_mode": raw.get("admissionMode", ""),
                        "university_reg_no": raw.get("universityRegNo") or raw.get("universityRegisterNo", ""),
                        "mentor_name": raw.get("mentorName", ""),
                        "hostel": raw.get("hostel") or raw.get("isHosteller", False),
                        "bus_code": raw.get("busCode") or raw.get("busRouteCode", ""),
                        "current_academic_year": raw.get("currentAcademicYear") or raw.get("academicYear", ""),
                        # Raw IDs for other API calls
                        "branch_id": raw.get("branchId"),
                        "year_of_study_id": raw.get("yearOfStudyId"),
                        "section_id": raw.get("sectionId"),
                        "academic_year_id": raw.get("academicYearId")
                    }
    except Exception as e:
        pass

    return {"error": "Failed to fetch academic details"}

# ============================================================
#  PERSONAL DETAILS
# ============================================================
# ============================================================
#  PERSONAL DETAILS
# ============================================================
@app.get("/api/student/personal")
async def get_personal_details(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/student/personal")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return test_ctx["personal"]

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentPersonalDetails"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and json_data["data"]:
                    raw = json_data["data"]
                    # Handle cases where data is a list (sometimes happens)
                    if isinstance(raw, list) and len(raw) > 0:
                        raw = raw[0]
                    elif isinstance(raw, list):
                        return {"error": "Invalid data format"}

                    return {
                        "name": raw.get("studentName", ""),
                        "reg_no": raw.get("studRollNo", ""),
                        "photo_id": raw.get("photoDocumentId", ""),
                        "email": raw.get("officialEmailid", ""),
                        "date_of_birth": raw.get("dateOfBirth", ""),
                        "gender": raw.get("gender", ""),
                        "community": raw.get("community", ""),
                        "religion": raw.get("religion", ""),
                        "mobile": raw.get("mobileNo", ""),
                        "bus_route": raw.get("busRoute", ""),
                        "hostel": raw.get("isHostel", False),
                        "languages": raw.get("languageKnown", ""),
                        "age": raw.get("currentAge", "")
                    }
            else:
                pass
    except Exception as e:
        pass

    return {"error": "Failed to fetch personal details"}

# ============================================================
#  EXAM STATUS (for arrears / eligibility)
# ============================================================
# ============================================================
#  EXAM STATUS (for arrears / eligibility)
# ============================================================
@app.get("/api/student/exam-status")
async def get_exam_status(request: Request, studtblId: str,
                          academicYearId: int = 14, yearOfStudyId: int = 3,
                          semesterId: int = 6, branchId: int = 2,
                          sectionId: int = 2, semesterType: str = "Even"):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/student/exam-status")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return test_ctx["exam_status"]

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetStudentExamStatus"
    params = {
        "studtblId": studtblId,
        "AcademicYearId": academicYearId,
        "YearOfStudyId": yearOfStudyId,
        "SemesterId": semesterId,
        "BranchId": branchId,
        "SectionId": sectionId,
        "presemesterType": semesterType
    }
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            
            if resp.status_code == 200:
                json_data = resp.json()
                
                raw = {}
                if "data" in json_data and json_data["data"]:
                    raw = json_data["data"]
                
                # Check if we have arrears data. If not, and we are not in Sem 1, try previous semester.
                has_arrear_info = raw.get("historyOfArrears") is not None or raw.get("totalArrears") is not None
                
                if not has_arrear_info and semesterId > 1:
                    # Determine previous sem type
                    prev_sem_type = "Odd" if semesterType == "Even" else "Even"
                    params["SemesterId"] = semesterId - 1
                    params["presemesterType"] = prev_sem_type
                    
                    # Retry fetch
                    resp_prev = await client.get(upstream_url, params=params, headers=headers)
                    if resp_prev.status_code == 200:
                        json_prev = resp_prev.json()
                        if "data" in json_prev and json_prev["data"]:
                            raw_prev = json_prev["data"]
                            # Merge relevant fields if missing in current (prefer current for fees/attendance, prev for results)
                            if raw.get("historyOfArrears") is None: raw["historyOfArrears"] = raw_prev.get("historyOfArrears")
                            if raw.get("totalArrears") is None: raw["totalArrears"] = raw_prev.get("totalArrears")
                            if raw.get("noOfArrears") is None: raw["noOfArrears"] = raw_prev.get("noOfArrears")

                # Debug: Print all keys to find arrears info

                return {
                    "attendance_eligible": raw.get("isAttendanceEligible", False),
                    "fees_eligible": raw.get("isFeesEligible", False),
                    "current_status": raw.get("currentStatus", ""),
                    "total_fees": raw.get("fees", 0),
                    "paid_online": raw.get("onlinePaymentFees", 0),
                    "previous_due": raw.get("previousFeeDue", 0),
                    "attendance_pct": raw.get("attendancePercentage", 0),
                    "od_pct": raw.get("odPercentage", 0),
                    # Potential new fields
                    "arrears_current": raw.get("noOfArrears", 0),
                    "arrears_history": raw.get("historyOfArrears", 0)
                }
    except Exception as e:
        pass
    
    return {"error": "Failed to fetch exam status"}

# ============================================================
#  ARREARS DETAILS
# ============================================================
@app.get("/api/student/arrears")
async def get_arrears_details(
    request: Request,
    studtblId: str,
    academicYearId: int = 14,
    branchId: int = 2,
    yearOfStudyId: int = 3,
    semesterId: int = 6,
    sectionId: int = 2,
    programmeId: int = 1,
    semesterType: str = "Even"
):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/student/arrears")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        arrears = test_ctx["arrears"]
        return {"success": True, "count": len(arrears), "data": arrears}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetHallticketSubjectDetails"
    
    upstream_params = {
        "AcademicYear_Id": academicYearId,
        "programme_id": programmeId,
        "Branch_Id": branchId,
        "year_id": yearOfStudyId,
        "Semester_Id": semesterId,
        "Section_Id": sectionId,
        "studtblId": studtblId,
        "Sem_Type": semesterType
    }
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=upstream_params, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and isinstance(json_data["data"], list):
                    # Filter for arrears
                    arrear_subjects = [
                        item for item in json_data["data"]
                        if item.get("attemptType", "").lower() == "arrear"
                    ]
                    return {"success": True, "count": len(arrear_subjects), "data": arrear_subjects}
                return {"success": True, "count": 0, "data": []}
    except Exception as e:
        pass
        
    return {"error": "Failed to fetch arrears details"}

# ============================================================
#  ACADEMIC PERCENTAGE (HSC / SSLC)
# ============================================================
@app.get("/api/student/academic-percentage")
async def get_academic_percentage(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/student/academic-percentage")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return test_ctx["academic_percentage"]

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentAcademicPercentage"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and isinstance(json_data["data"], list):
                    return {
                        "records": [
                            {
                                "exam": item.get("qualifiedExam", ""),
                                "year": item.get("yearOfPassing", ""),
                                "percentage": item.get("aPercentage", "0")
                            }
                            for item in json_data["data"]
                        ]
                    }
    except Exception as e:
        pass
    
    return {"error": "Failed to fetch academic percentage"}

# ============================================================
#  PARENT DETAILS
# ============================================================
@app.get("/api/student/parent")
async def get_parent_details(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/student/parent")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return test_ctx["parent"]

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentParentDetails"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and json_data["data"]:
                    raw = json_data["data"]
                    return {
                        "father_name": raw.get("fatherName", ""),
                        "father_occupation": raw.get("fatherOccupation", ""),
                        "father_mobile": raw.get("fatherMobileNo", ""),
                        "mother_name": raw.get("motherName", ""),
                        "mother_occupation": raw.get("motherOccupation", ""),
                        "mother_mobile": raw.get("motherMobileNo", ""),
                        "guardian_name": raw.get("guardianName", ""),
                        "guardian_occupation": raw.get("guardianOccupation", ""),
                        "guardian_mobile": raw.get("guardianMobileNo", "")
                    }
    except Exception as e:
        pass
    
    return {"error": "Failed to fetch parent details"}

# ============================================================
#  HALLTICKET
# ============================================================

@app.get("/api/hallticket/history")
async def get_hallticket_history(request: Request, studtblId: str, searchTerm: str = ""):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/hallticket/history")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["hallticket"]["history"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetHallTicketHistoryByStudent"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId, "SearchTerm": searchTerm}, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        pass
    return {"error": "Failed to fetch hallticket history"}


@app.get("/api/hallticket/subject-details")
async def get_hallticket_subject_details(
    request: Request,
    studtblId: str,
    academicYearId: int = 14,
    branchId: int = 2,
    yearOfStudyId: int = 3,
    semesterId: int = 6,
    sectionId: int = 2,
    programmeId: int = 1,
    semesterType: str = "Even"
):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/hallticket/subject-details")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["hallticket"]["subjects"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetHallticketSubjectDetails"
    
    params = {
        "AcademicYear_Id": academicYearId, "programme_id": programmeId, "Branch_Id": branchId,
        "year_id": yearOfStudyId, "Semester_Id": semesterId, "Section_Id": sectionId,
        "studtblId": studtblId, "Sem_Type": semesterType
    }
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch subject details"}


@app.get("/api/hallticket/student-mentor-subjects")
async def get_hallticket_student_mentor_subjects(
    request: Request, studtblId: str, academicYearId: int = 14, branchId: int = 2,
    sectionId: int = 2, publishYearId: int = 0, semesterType: str = "Even"
):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/hallticket/student-mentor-subjects")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetStudentAndMentorSubjects"
    
    params = {
        "studtblId": studtblId, "AcademicYear_Id": academicYearId, "Branch_Id": branchId,
        "Section_Id": sectionId, "publishYearId": publishYearId, "semesterType": semesterType
    }
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch mentor subjects"}


@app.get("/api/hallticket/selected-subject")
async def get_hallticket_selected_subject(
    request: Request, studtblId: str, academicYearId: int = 14, branchId: int = 2,
    semesterId: int = 6, sectionId: int = 2, semesterType: str = "Even"
):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/hallticket/selected-subject")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetStudentSelectedSubject"
    
    params = {
        "studtblId": studtblId, "AcademicYear_Id": academicYearId, "Branch_Id": branchId,
        "Semester_Id": semesterId, "Section_Id": sectionId, "semesterType": semesterType
    }
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch selected subjects"}


@app.get("/api/hallticket/notes")
async def get_hallticket_notes(request: Request, category: str = "hallticket"):
    test_ctx = _get_test_context(request)
    if test_ctx:
        return {"success": True, "data": test_ctx["hallticket"]["notes"]}
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetGlobalStaticNotesByCategory"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"Category": category}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch notes"}


@app.get("/api/hallticket/academic-year-sem")
async def get_hallticket_academic_year_sem(request: Request, programmeId: int = 1):
    test_ctx = _get_test_context(request)
    if test_ctx:
        return {"success": True, "data": test_ctx["hallticket"]["academic_year_sem"]}
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetAcademicYearAndSemesterType"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"programmeId": programmeId}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch academic year and sem"}


@app.get("/api/hallticket/download-status")
async def get_hallticket_download_status(
    request: Request, studtblId: str, semesterId: int = 6,
    semesterType: str = "Odd", academicYearId: int = 14
):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/hallticket/download-status")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return test_ctx["hallticket"]["download_status"]

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/HallTicket/GetDownloadHallTicketsByFeesPaid"
    params = {
        "studtblId": studtblId, "SemesterId": semesterId, 
        "semesterType": semesterType, "academicYearId": academicYearId
    }
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch download status"}

class HallTicketDownloadRequest(BaseModel):
    reportName: str
    studtblId: str
    semesterId: int
    hallticketId: Optional[int] = None

@app.post("/api/hallticket/download-pdf")
async def download_hallticket_pdf(request: Request, payload: HallTicketDownloadRequest):
    test_ctx = _get_test_context(request, payload.studtblId)
    if test_ctx:
        return StreamingResponse(
            content=iter([MOCK_PDF_CONTENT]),
            status_code=200,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=HallTicket.pdf"}
        )
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/ReportsByName"
    
    # We must use the exact payload the user specified, ensuring the encrypted ID is intact
    upstream_payload = {
        "reportName": payload.reportName,
        "studtblId": payload.studtblId,
        "semesterId": payload.semesterId,
        "hallticketId": payload.hallticketId
    }
    
    try:
        async with get_client(request) as client:
            resp = await client.post(upstream_url, json=upstream_payload, headers=headers)
            content_type = resp.headers.get("content-type", "application/pdf")
            return StreamingResponse(
                content=iter([resp.content]),
                status_code=resp.status_code,
                media_type=content_type,
                headers={"Content-Disposition": "attachment; filename=HallTicket.pdf"}
            )
    except Exception as e:
        return {"error": str(e)}

# ============================================================
#  DOCUMENT UPLOAD
# ============================================================

@app.get("/api/document/status")
async def get_document_status(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/document/status")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["documents"]["uploaded"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Document/GetDocumentStatusByStudent"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch document status"}

@app.get("/api/document/others")
async def get_other_documents(request: Request, studtblId: str, ocrStatus: str = "others"):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/document/others")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["documents"]["others"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Document/GetOtherDocumentsByStudent"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId, "ocrStatus": ocrStatus}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch other documents"}

@app.get("/api/document/endorsement-list")
async def get_endorsement_list(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/document/endorsement-list")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Endorsement/GetEndorsementList"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch endorsement list"}

@app.get("/api/document/professional-course-list")
async def get_professional_course_list(request: Request, endorsementId: int = 1):
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Endorsement/GetProfessionalCourseList"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"endorsementId": endorsementId}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch professional course list"}

@app.get("/api/document/endorsement-certificates")
async def get_endorsement_certificates(request: Request, studtblId: str, endorsementId: int = 1, searchText: str = ""):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/document/endorsement-certificates")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Endorsement/GetEndorsementCertificateList"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId, "endorsementId": endorsementId, "searchText": searchText}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch endorsement certificates"}

@app.get("/api/document/endorsement-courses")
async def get_endorsement_courses(request: Request, studtblId: str, professionalCourseId: int = 1):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/document/endorsement-courses")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Endorsement/GetEndorsementCourseList"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId, "professionalCourseId": professionalCourseId}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch endorsement courses"}

@app.get("/api/document/download-blob")
async def download_document_blob(request: Request, studtblId: str, documentId: str):
    studtblId = fix_id(studtblId)
    documentId = fix_id(documentId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/document/download-blob")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return StreamingResponse(iter([b"Mock document content for test user"]), media_type="application/pdf")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Document/DownloadBlob"
    
    # We'll stream the binary reaction directly to the client
    from fastapi.responses import StreamingResponse
    try:
        async with get_client(request) as client:
            # We use stream() to efficiently pass through binary data like PDFs or Images
            response = await client.get(upstream_url, params={"documentId": documentId, "studtblId": studtblId}, headers=headers)
            
            def iterfile():
                yield response.content
            
            # Forward the exact content type from the upstream API
            content_type = response.headers.get("Content-Type", "application/octet-stream")
            return StreamingResponse(iterfile(), media_type=content_type)
    except Exception as e: pass
    return {"error": "Failed to download blob"}
# ============================================================
#  REPORT MENU (available report types)
# ============================================================
@app.get("/api/reports/menu")
async def get_report_menu(request: Request):
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/GetReportMenuWithSubCategories"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        pass
    
    return {"error": "Failed to fetch report menu"}

# ============================================================
#  REPORT FILTERS (semester list for a report type)
# ============================================================
@app.get("/api/reports/filters")
async def get_report_filters(request: Request, reportSubId: int, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/reports/filters")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/GetReportFilterByReportId"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"ReportSubId": reportSubId, "studtblId": studtblId}, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and "semesterData" in json_data.get("data", {}):
                    semesters = json_data["data"]["semesterData"]
                    return {
                        "semesters": [
                            {"id": s.get("semesterId"), "name": s.get("semesterName", ""), "number": s.get("semesterNo", 0)}
                            for s in semesters
                        ]
                    }
    except Exception as e:
        pass
    
    return {"error": "Failed to fetch report filters"}

# ============================================================
#  REPORT PDF (actual report content - returns PDF binary)
# ============================================================
@app.post("/api/reports/download")
async def download_report(request: Request):
    """
    POST Report/ReportsByName — forwards all body params to upstream.
    """
    body = await request.json()
    test_ctx = _get_test_context(request, body.get("studtblId"))
    if test_ctx:
        return Response(
            content=MOCK_PDF_CONTENT,
            media_type="application/pdf",
            status_code=200,
            headers={"Content-Disposition": "inline; filename=MockReport.pdf"}
        )
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/ReportsByName"
    
    # Fix studtblId encoding if present
    if "studtblId" in body:
        body["studtblId"] = fix_id(body["studtblId"])
    
    report_name = body.get("reportName", "Attendance")
    semester_id = body.get("semesterId", 6)
    
    
    async def try_download(payload: dict) -> Response | None:
        """Try a single download request, return Response on success or None."""
        try:
            async with get_client(request) as client:
                resp = await client.post(upstream_url, json=payload, headers=headers)
                ct = resp.headers.get('content-type', '').lower()
                size = len(resp.content)
                
                # Check for PDF regardless of status code
                if resp.content[:5] == b'%PDF-' or ('pdf' in ct and size > 200):
                    return Response(
                        content=resp.content,
                        media_type="application/pdf",
                        status_code=200,
                        headers={"Content-Disposition": f"inline; filename={report_name}_sem{semester_id}.pdf"}
                    )
                
                if 'octet-stream' in ct and size > 500:
                    return Response(
                        content=resp.content,
                        media_type="application/pdf",
                        status_code=200,
                        headers={"Content-Disposition": f"inline; filename={report_name}_sem{semester_id}.pdf"}
                    )
                return None
        except Exception as e:
            return None

    # Attempt 1: As-is
    res = await try_download(body)
    if res: return res

    # Attempt 2: Alternate names if failed
    alt_map = {"CAT Performance": "CAT", "University-End Semester": "End Semester"}
    if report_name in alt_map:
        res = await try_download({**body, "reportName": alt_map[report_name]})
        if res: return res

    return Response(status_code=502, content=json.dumps({"error": "Failed to generate report"}).encode())

# ============================================================
#  LEGACY REPORT ENDPOINT (kept for compatibility, now JSON-based)
# ============================================================
@app.get("/api/reports")
async def get_report(request: Request, studtblId: str, type: str):
    """Legacy endpoint - returns filter data for the selected report type."""
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/reports")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        report_type = type.lower() if type else "attendance"
        sem = test_ctx["reports"].get(report_type, test_ctx["reports"]["attendance"])
        return {
            "title": f"{type.capitalize()} Report",
            "type": type,
            "reportSubId": {"attendance": 9, "cat": 1, "endsem": 5}.get(report_type, 9),
            "reportName": {"attendance": "Attendance", "cat": "CAT Performance", "endsem": "University-End Semester"}.get(report_type, "Attendance"),
            "filterData": {
                "BranchId": test_ctx["academic"]["branch_id"],
                "SectionId": test_ctx["academic"]["section_id"],
                "AcademicYearId": test_ctx["academic"]["academic_year_id"]
            },
            "semesters": [sem]
        }

    report_map = {"attendance": 9, "cat": 1, "endsem": 5}
    report_sub_id = report_map.get(type.lower(), 9)
    
    # Also get the correct report name from the menu
    report_name_map = {"attendance": "Attendance", "cat": "CAT Performance", "endsem": "University-End Semester"}
    report_name = report_name_map.get(type.lower(), "Attendance")
    
    report_name = report_name_map.get(type.lower(), "Attendance")
    
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/GetReportFilterByReportId"
    
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"ReportSubId": report_sub_id, "studtblId": studtblId}, headers=headers)
            
            if resp.status_code == 200:
                json_data = resp.json()
                
                # Log FULL response structure to understand what SSRS needs
                if "data" in json_data:
                    data = json_data["data"]
                # Log non-semester data for debugging (removed)

                if "data" in json_data and "semesterData" in json_data.get("data", {}):
                    data = json_data["data"]
                    semesters = data["semesterData"]
                    return {
                        "title": f"{type.capitalize()} Report",
                        "type": type,
                        "reportSubId": report_sub_id,
                        "reportName": report_name,
                        "filterData": {k: v for k, v in data.items() if k != "semesterData"},
                        "semesters": [
                            {
                                "id": s.get("semesterId"),
                                "name": s.get("semesterName", ""),
                                "number": s.get("semesterNo", 0),
                                **{k: v for k, v in s.items() if k not in ("semesterId", "semesterName", "semesterNo")}
                            }
                            for s in semesters
                        ]
                    }
            else:
                pass
    except Exception as e:
        pass
        
    return {"error": "Failed to fetch reports"}

# ============================================================
#  ATTENDANCE DETAILS (Course, Daily, Overall, Leave)
# ============================================================

def _extract_attendance_data(json_data, inst_id: str = "SEC"):
    """Extract list from SEC (raw list) or SIT ({success, data}) response."""
    if isinstance(json_data, list):
        return json_data
    if isinstance(json_data, dict) and "data" in json_data:
        d = json_data["data"]
        return d if isinstance(d, list) else [d] if d else []
    return []


@app.get("/api/attendance/course-detail")
async def get_attendance_course_detail(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/attendance/course-detail")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["attendance"]["course"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetAttendanceCourseDetail"
    params = build_attendance_params(request)
    params["studtblId"] = fix_id(studtblId)
    inst_id = request.headers.get("X-Institution-Id", "SEC").upper()

    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                items = _extract_attendance_data(json_data, inst_id)

                if isinstance(items, list) and len(items) > 0:
                    is_sit = inst_id == "SIT" or ("courseCode" in items[0] and "attendancePercentage" in items[0]) or "subjectCode" in items[0] or "courseName" in items[0]
                    if is_sit:
                        normalized = [{
                            "courseCode": item.get("subjectCode") or item.get("courseCode", ""),
                            "courseName": item.get("subjectName") or item.get("courseName", ""),
                            "attendancePercentage": item.get("attendancePercentage") or item.get("percentage") or item.get("p_Percentage") or 0,
                            "courseId": item.get("courseId") or item.get("id"),
                            "id": item.get("id") or item.get("courseId")
                        } for item in items]
                        return {"success": True, "data": normalized}
                    return {"success": True, "data": items}
                elif isinstance(items, list):
                    return {"success": True, "data": items}
                return json_data if isinstance(json_data, dict) else {"success": True, "data": []}
    except Exception as e:
        pass
    return {"error": "Failed to fetch course attendance"}

@app.get("/api/attendance/daily-detail")
async def get_attendance_daily_detail(request: Request, studtblId: str):
    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/attendance/daily-detail")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["attendance"]["daily"]}

    base_url, headers = get_institution_config(request)
    params = build_attendance_params(request)
    params["studtblId"] = fix_id(studtblId)
    inst_id = request.headers.get("X-Institution-Id", "SEC").upper()

    # SIT and SEC use same endpoint; try both spellings (Attedance typo vs Attendance)
    endpoints = [
        f"{base_url}/Student/GetStudentDailyAttedanceDetail",
        f"{base_url}/Student/GetStudentDailyAttendanceDetail",
    ]

    try:
        async with get_client(request) as client:
            for upstream_url in endpoints:
                resp = await client.get(upstream_url, params=params, headers=headers)
                if resp.status_code == 200:
                    json_data = resp.json()
                    data = _extract_attendance_data(json_data, inst_id)
                    
                    # Calculate ODs for debugging
                    od_count = 0
                    if isinstance(data, list):
                        for item in data:
                            # Check known fields for OD status
                            status = str(item.get("attendanceStatus") or item.get("presentAbsent") or "").upper()
                            if "OD" in status or "DUTY" in status:
                                od_count += 1
                    else:
                        pass
                    
                    return {"success": True, "data": data}
    except Exception as e:
        pass
    return {"error": "Failed to fetch daily attendance"}

@app.get("/api/attendance/overall-detail")
async def get_attendance_overall_detail(request: Request, studtblId: str):
    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/attendance/overall-detail")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["attendance"]["overall"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetAttendanceOverAllDetail"
    params = build_attendance_params(request)
    params["studtblId"] = fix_id(studtblId)

    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                data = _extract_attendance_data(json_data)
                return {"success": True, "data": data}
    except Exception as e:
        pass
    return {"error": "Failed to fetch overall attendance"}

@app.get("/api/attendance/leave-status")
async def get_leave_status(request: Request, studtblId: str):
    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/attendance/leave-status")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["attendance"]["leave"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetLeaveStatusByStudent"
    params = build_attendance_params(request)
    params["studtblId"] = fix_id(studtblId)
    inst_id = request.headers.get("X-Institution-Id", "SEC").upper()

    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                data = _extract_attendance_data(json_data, inst_id)
                return {"success": True, "data": data}
    except Exception as e:
        pass
    return {"error": "Failed to fetch leave status"}

# ============================================================
# ============================================================
#  INBOX
# ============================================================

@app.get("/api/inbox")
async def get_inbox(request: Request, receiver_id: str):
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Inbox/GetUnreadCategories"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"Receiver": receiver_id}, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        pass
        
    return {"unread_count": 0, "categories": []}

# ============================================================
#  USER PROFILE
# ============================================================

@app.get("/api/profile/identifiers")
async def get_identifiers(request: Request, studtblId: str):
    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/profile/identifiers")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": [test_ctx["identifiers"]]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentIdentifiersById"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/profile/achievements/studies")
async def get_achievement_studies(request: Request, studtblId: str):
    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/profile/achievements/studies")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["achievements"]["studies"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Achievements/GetAchievementStudies"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/profile/achievements/nptel")
async def get_achievement_nptel(request: Request, studtblId: str):
    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/profile/achievements/nptel")

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Achievements/GetNPTELSemesterList"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/profile/achievements/amcat")
async def get_achievement_amcat(request: Request, studtblId: str):
    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/profile/achievements/amcat")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["achievements"]["amcat"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Achievements/GetAmcatPgpaHeaderList"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/profile/course-details")
async def get_course_details(request: Request, studtblId: str, regulationId: str, branchId: str, semesterId: str, pageNumber: str = "1", pageSize: str = "100"):
    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/profile/course-details")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return {"success": True, "data": test_ctx["courses"]}

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentCourseDetails"
    params = {
        "studtblId": studtblId,
        "regulationId": regulationId,
        "branchId": branchId,
        "semesterId": semesterId,
        "pageNumber": pageNumber,
        "pageSize": pageSize
    }
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
    except Exception as e:
        return {"error": str(e)}

# ============================================================
#  INBOX
# ============================================================

@app.get("/api/inbox/categories")
async def get_inbox_categories(request: Request, studtblId: str):
    # studtblId here is actually the reg number (e.g. "SEC23EC242"), NOT encrypted — pass as-is
    test_ctx = _get_test_context(request)
    if test_ctx:
        return {"success": True, "data": test_ctx["inbox"]["categories"]}
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Inbox/GetInboxCategory"
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params={"StudtblId": studtblId}, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch inbox categories"}

@app.get("/api/inbox/messages")
async def get_inbox_messages(
    request: Request,
    categoryGuid: str,
    receiver: str,
    pageNumber: int = 1,
    pageSize: int = 10,
    searchText: str = "",
    isArchived: bool = False,
    isRead: Optional[bool] = None
):
    test_ctx = _get_test_context(request)
    if test_ctx:
        filtered = [m for m in test_ctx["inbox"]["messages"] if m["categoryGuid"] == categoryGuid]
        if isRead is not None:
            filtered = [m for m in filtered if bool(m.get("isRead")) == bool(isRead)]
        if searchText:
            st = searchText.lower()
            filtered = [m for m in filtered if st in (m.get("title", "").lower() + " " + m.get("description", "").lower())]
        return {"success": True, "data": {"data": filtered, "totalCount": len(filtered)}}
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Inbox/GetMessagesByCategory"
    params: dict = {
        "CategoryGuid": categoryGuid,
        "Receiver": receiver,
        "pageNumber": pageNumber,
        "pageSize": pageSize,
        "SearchText": searchText,
        "IsArchived": str(isArchived).lower()
    }
    if isRead is not None:
        params["IsRead"] = str(isRead).lower()
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch messages"}

@app.get("/api/inbox/message-details")
async def get_message_details(request: Request, categoryGuid: str, messageGuid: str, receiver: str):
    test_ctx = _get_test_context(request)
    if test_ctx:
        detail = dict(test_ctx["inbox"]["message_details"])
        detail["messageGuid"] = messageGuid
        return {"success": True, "data": detail}
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Inbox/GetMessageDetails"
    params = {"CategoryGuid": categoryGuid, "MessageGuid": messageGuid, "Receiver": receiver}
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200: return resp.json()
    except Exception as e: pass
    return {"error": "Failed to fetch message details"}

@app.get("/api/inbox/download-doc")
async def download_inbox_doc(request: Request, studtblId: str, documentId: str, documentType: str = "MENTORING_DOC"):
    studtblId = fix_id(studtblId)

    # SECURITY: Validate user owns this resource
    await validate_request_authorization(request, studtblId, "/api/inbox/download-doc")
    test_ctx = _get_test_context(request, studtblId)
    if test_ctx:
        return StreamingResponse(
            content=iter([b"Mock inbox document content for test user"]),
            status_code=200,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=document_{documentId}.pdf"}
        )

    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Document/DownloadBlob"
    params = {"documentId": documentId, "studtblId": studtblId, "documentType": documentType}
    try:
        async with get_client(request) as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            content_type = resp.headers.get("content-type", "application/octet-stream")
            return StreamingResponse(
                content=iter([resp.content]),
                status_code=resp.status_code,
                media_type=content_type,
                headers={"Content-Disposition": f"attachment; filename=document_{documentId}"}
            )
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
