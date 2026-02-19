from fastapi import FastAPI, HTTPException, Request, Response, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, ORJSONResponse
from pydantic import BaseModel
import httpx
import json
import os, sys
import time
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
# Ensure crypto_utils can be imported from same directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crypto_utils import encrypt_data, decrypt_data
# Import sheets_logger - assuming it is in the same directory or available
# For Vercel, likely need to copy/make available, or fix python path more broadly.
# But assuming file structure is flat in generic python handler or similar.
# Actually, api/index.py is usually entry point. We might need to copy sheets_logger.py to api/ or referenced correctly.
# In Vercel, "api/index.py" executes.
try:
    from sheets_logger import sheets_logger
    print("Imported sheets_logger successfully")
except Exception as e:
    print(f"Could not import sheets_logger: {e}")
    sheets_logger = None

# SECRET KEY for accessing logs
# SECRET KEY for accessing logs
LOGS_SECRET_KEY = "edumate_admin_secret"

# Simple In-Memory TTL Cache
class TTLCache:
    def __init__(self, ttl: int = 60):
        self.cache: Dict[str, Any] = {}
        self.ttl = ttl
        self.lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self.lock:
            entry = self.cache.get(key)
            if entry:
                data, expiry = entry
                if time.time() < expiry:
                    return data
                del self.cache[key]
            return None

    async def set(self, key: str, value: Any):
        async with self.lock:
            self.cache[key] = (value, time.time() + self.ttl)

    async def clear(self):
        async with self.lock:
            self.cache.clear()

# Initialize Cache
response_cache = TTLCache(ttl=60)  # 60 seconds cache

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create Transport for Connection Pooling and Global Client
    print("Starting up: Creating global HTTP client...")
    # Use a global client with connection pooling
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    app.state.client = httpx.AsyncClient(limits=limits, timeout=15.0)
    yield
    # Shutdown: Close Client
    print("Shutting down: Closing global HTTP client...")
    await app.state.client.aclose()

app = FastAPI(lifespan=lifespan, default_response_class=ORJSONResponse)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        "institutionguid": "6EB79EFC-C8B1-47DC-922D-8A7C5E8DAB63"  # Same Project Key
    }
}

DEFAULT_INSTITUTION = "SEC"

def get_institution_config(request: Request):
    """
    Determines the institution from the 'X-Institution-Id' header.
    Returns (base_url, headers_dict).
    """
    inst_id = request.headers.get("X-Institution-Id", DEFAULT_INSTITUTION).upper()
    config = INSTITUTIONS.get(inst_id, INSTITUTIONS[DEFAULT_INSTITUTION])
    
    base_url = config["BASE_URL"]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": config["Referer"],
        "Origin": config["Origin"],
        "Content-Type": "application/json",
        "institutionguid": config["institutionguid"],
        "Authorization": request.headers.get("Authorization", "")
    }
    return base_url, headers

@app.get("/")
async def root():
    return {"message": "Edumate Backend Proxy is Running", "docs": "/docs"}

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(request: Request, credentials: LoginRequest, background_tasks: BackgroundTasks):
    base_url, headers = get_institution_config(request)
    
    payload = {
        "userName": encrypt_data(credentials.username),
        "password": encrypt_data(credentials.password)
    }
    
    # Override for login-specific headers
    headers["Referer"] = headers["Origin"] + "/sign-in"

    print(f"Attempting Login for user: {credentials.username}")
    client_ip = request.client.host if request.client else "Unknown"
    
    # Use global client
    client = request.app.state.client
    try:
        # Inner try wrapper to maintain indentation
        if True:
            response = await client.post(f"{base_url}/User/Login", json=payload, headers=headers)
            print(f"Upstream Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Fetch Name from Personal Details for better logging
                student_name = "Unknown"
                try:
                    # Update headers with the new token
                    headers["Authorization"] = f"Bearer {data.get('idToken')}"
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
                    print(f"Failed to fetch student name for logging: {e}")
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
                    "token": data.get("idToken"),
                    "studtblId": data.get("userId"),
                    "user_data": data 
                }
            else:
                print(f"Upstream Error: {response.text}")
                if sheets_logger:
                    background_tasks.add_task(sheets_logger.log_login, {
                        "username": credentials.username,
                        "status": f"Failed: {response.status_code}",
                        "ip": client_ip
                    })
                response.raise_for_status()



    except Exception as e:
        print(f"Upstream login failed: {e}")
        if sheets_logger:
                background_tasks.add_task(sheets_logger.log_login, {
                "username": credentials.username,
                "status": f"Exception: {str(e)}",
                "ip": client_ip
            })

    # Fallback Mock for Dev
    if credentials.username == "test":
        return {
            "status": "success",
            "token": "mock_token_123",
            "studtblId": "12345",
            "user": {
                "name": "Sairam Student (Mock)",
                "reg_no": credentials.username
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/admin/logs")
async def get_logs(secret: str = Query(..., description="Secret key to access logs"), limit: int = 50):
    if secret != LOGS_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    if sheets_logger:
        return sheets_logger.get_logs(limit)
    return {"error": "Logger not initialized"}

def fix_id(studtblId: str) -> str:
    """Ensure + and = are not corrupted by URL encoding."""
    return studtblId.replace(" ", "+")


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


def _extract_attendance_data(json_data, inst_id: str = "SEC"):
    """Extract list from SEC (raw list) or SIT ({success, data}) response."""
    if isinstance(json_data, list):
        return json_data
    if isinstance(json_data, dict) and "data" in json_data:
        d = json_data["data"]
        return d if isinstance(d, list) else [d] if d else []
    return []


# ============================================================
#  PROFILE IMAGE
# ============================================================
@app.get("/api/profile/image")
async def get_profile_image(request: Request, studtblId: str, documentId: str = "tdN4BQKuPTzj9130EWB8Gw=="):
    studtblId = fix_id(studtblId)
    documentId = fix_id(documentId)
    
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Document/DownloadBlob"
    
    print(f"[Image] studtblId='{studtblId}' documentId='{documentId}'")
    
    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params={"documentId": documentId, "studtblId": studtblId}, headers=headers)
        print(f"[Image] Upstream status: {resp.status_code}, content-type: {resp.headers.get('content-type')}")
        
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "image/jpeg")
            return Response(
                content=resp.content,
                media_type=content_type,
                status_code=200,
                headers={"Cache-Control": "public, max-age=3600"}
            )
        else:
            print(f"[Image] Failed: {resp.text[:200]}")
    except Exception as e:
        print(f"[Image] Exception: {e}")
    
    return Response(status_code=404)

# ============================================================
#  DASHBOARD STATS
# ============================================================
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(request: Request, studtblId: str, response: Response):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Dashboard/GetStudentDashboardDetails"
    
    # Cache check
    cache_key = f"dashboard:{studtblId}"
    cached = await response_cache.get(cache_key)
    if cached:
        return cached

    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
        print(f"[Dashboard] ID: '{studtblId}' | Status: {resp.status_code}")
            
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
                    "arrears": 0,
                    "od_percentage": raw.get("odPercentage", 0),
                    "od_count": raw.get("odCount", 0),
                    "absent_percentage": raw.get("absentPercentage", 0),
                    "program": raw.get("program", ""),
                    "branch_code": raw.get("branchCode", ""),
                    "mentor_name": raw.get("mentorName", ""),
                    "total_semesters": raw.get("totalSemesters", 0),
                    "total_years": raw.get("totalYears", 0),
                    "pgpa": raw.get("pG_Cgpa", 0.0),
                    "raw_data": raw
                }
            
            # Set Cache
            await response_cache.set(cache_key, stats)
            response.headers["Cache-Control"] = "public, max-age=60"
            return stats
        else:
            print(f"[Dashboard] Error: {resp.text[:200]}")
    except Exception as e:
        print(f"[Dashboard] Exception: {e}")
        
    return {"error": "Failed to fetch dashboard data"}

# ============================================================
#  ACADEMIC DETAILS
# ============================================================
@app.get("/api/student/academic")
async def get_academic_details(request: Request, studtblId: str, response: Response):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentAcademicDetails"
    
    # Cache check
    cache_key = f"academic:{studtblId}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
        print(f"[Academic] ID: '{studtblId}' | Status: {resp.status_code}")
            
        if resp.status_code == 200:
            data = resp.json()
            if "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
                raw = data["data"][0]
                semester = raw.get("currentSemsterId") or raw.get("semester") or 0
                result = {
                    "dept": raw.get("studentDepartment") or raw.get("dept", "Unknown"),
                    "semester": semester,
                    "semester_name": raw.get("semesterName", ""),
                    "semester_type": raw.get("semesterType", ""),
                    "section": "N/A",
                    "batch": raw.get("academicBatchYear", ""),
                    "admission_mode": raw.get("admissionMode", ""),
                    "university_reg_no": raw.get("universityRegNo", ""),
                    "mentor_name": raw.get("mentorName", ""),
                    "hostel": raw.get("hostel", False),
                    "bus_code": raw.get("busCode", ""),
                    "current_academic_year": raw.get("currentAcademicYear", ""),
                    "programme_id": raw.get("programmeId", 0),
                    "branch_id": raw.get("branchId") or raw.get("branch_id", 0),
                    "year_of_study_id": raw.get("yearOfStudyId") or raw.get("year_of_study_id", 0),
                    "section_id": raw.get("sectionId") or raw.get("section_id", 0),
                    "academic_year_id": raw.get("academicYearId") or raw.get("academic_year_id", 0),
                    "academic_batch_id": raw.get("academicBatchId") or raw.get("academic_batch_id", 0)
                }
                await response_cache.set(cache_key, result)
                response.headers["Cache-Control"] = "public, max-age=60"
                return result
    except Exception as e:
        print(f"[Academic] Exception: {e}")

    return {"error": "Failed to fetch academic details"}

# ============================================================
#  PERSONAL DETAILS
# ============================================================
@app.get("/api/student/personal")
async def get_personal_details(request: Request, studtblId: str, response: Response):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentPersonalDetails"
    # Cache check
    cache_key = f"personal:{studtblId}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
        if resp.status_code == 200:
            json_data = resp.json()
            if "data" in json_data and json_data["data"]:
                raw = json_data["data"]
                result = {
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
                await response_cache.set(cache_key, result)
                response.headers["Cache-Control"] = "public, max-age=60"
                return result
            else:
                print(f"[Personal] Error: {resp.text[:200]}")
    except Exception as e:
        print(f"[Personal] Exception: {e}")
        
    return {"error": "Failed to fetch personal details"}

# ============================================================
#  FULL STUDENT PROFILE (AGGREGATED)
# ============================================================
@app.get("/api/student/full-profile")
async def get_full_student_profile(request: Request, studtblId: str, response: Response,
                                   academicYearId: int = 14, yearOfStudyId: int = 3,
                                   semesterId: int = 6, branchId: int = 2,
                                   sectionId: int = 2, semesterType: str = "Even"):
    """
    Aggressively fetches all student data in parallel and returns a single JSON object.
    Reduces latency and Vercel function invocations.
    """
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    inst_id = request.headers.get("X-Institution-Id", "SEC").upper()

    # Cache check
    cache_key = f"full_profile:{studtblId}:{inst_id}:sem{semesterId}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    endpoints = {
        "stats": (f"{base_url}/Dashboard/GetStudentDashboardDetails", {"studtblId": studtblId}),
        "academic": (f"{base_url}/Student/GetStudentAcademicDetails", {"studtblId": studtblId}),
        "personal": (f"{base_url}/Student/GetStudentPersonalDetails", {"studtblId": studtblId}),
        "exam_status": (f"{base_url}/HallTicket/GetStudentExamStatus", {
             "studtblId": studtblId, "AcademicYearId": academicYearId, "YearOfStudyId": yearOfStudyId,
             "SemesterId": semesterId, "BranchId": branchId, "SectionId": sectionId, "presemesterType": semesterType
        }),
        "attendance_overall": (f"{base_url}/Student/GetAttendanceOverAllDetail", {**build_attendance_params(request), "studtblId": studtblId}),
        "parent": (f"{base_url}/Student/GetStudentParentDetails", {"studtblId": studtblId})
    }

    try:
        client = request.app.state.client
        # Create tasks
        # Create tasks
        tasks = []
        keys = []
        
        for key, (url, params) in endpoints.items():
            keys.append(key)
            tasks.append(client.get(url, params=params, headers=headers))
        
        # Execute in parallel
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        aggregated_data = {}
        
        for key, resp in zip(keys, responses):
            if isinstance(resp, Exception):
                print(f"[FullProfile] {key} failed: {resp}")
                aggregated_data[key] = {"error": str(resp)}
                continue
            
            if resp.status_code == 200:
                json_data = resp.json()
                
                # Logic extraction (simplified replication of individual endpoints)
                if key == "stats":
                    if "data" in json_data and isinstance(json_data["data"], list) and len(json_data["data"]) > 0:
                        raw = json_data["data"][0]
                        aggregated_data[key] = {
                            "cgpa": raw.get("uG_Cgpa", 0.0), # Corrected key from uG_Cgpa
                            "attendance": raw.get("attendancePercentage", 0),
                            "history_of_arrears": raw.get("historyOfArrears", 0),
                            "standing_arrears": raw.get("standingArrears", 0),
                            "raw_data": raw
                        } 
                    else: aggregated_data[key] = None
                elif key == "academic":
                    if "data" in json_data and isinstance(json_data["data"], list) and len(json_data["data"]) > 0:
                        raw = json_data["data"][0]
                        aggregated_data[key] = {
                            "dept": raw.get("studentDepartment") or raw.get("dept", "Unknown"),
                            "semester": raw.get("currentSemsterId") or raw.get("semester") or 0,
                            "semester_name": raw.get("semesterName", ""),
                            "batch": raw.get("academicBatchYear", ""),
                            "mentor_name": raw.get("mentorName", ""),
                            "current_academic_year": raw.get("currentAcademicYear", "")
                        }
                    else: aggregated_data[key] = None
                elif key == "personal":
                    if "data" in json_data:
                        raw = json_data["data"]
                        # Handle list or dict weirdness if needed, but usually dict here
                        if isinstance(raw, list) and raw: raw = raw[0]
                        
                        aggregated_data[key] = {
                            "name": raw.get("studentName", "") or raw.get("name", ""),
                            "reg_no": raw.get("studRollNo", ""),
                            "email": raw.get("officialEmailid", ""),
                            "photo_id": raw.get("photoDocumentId", ""), 
                        }
                    else: aggregated_data[key] = None
                elif key == "exam_status":
                    if "data" in json_data:
                        raw = json_data["data"]
                        if isinstance(raw, list) and raw: raw = raw[0]
                        aggregated_data[key] = {
                            "attendance_eligible": raw.get("isAttendanceEligible", False),
                            "fees_eligible": raw.get("isFeesEligible", False),
                            "current_status": raw.get("currentStatus", "")
                        }
                    else: aggregated_data[key] = None
                elif key == "attendance_overall":
                        aggregated_data[key] = _extract_attendance_data(json_data)
                elif key == "parent":
                    if "data" in json_data:
                        raw = json_data["data"]
                        if isinstance(raw, list) and raw: raw = raw[0]
                        aggregated_data[key] = {
                            "father_name": raw.get("fatherName", ""),
                            "father_mobile": raw.get("fatherMobileNo", "")
                        }
                    else: aggregated_data[key] = None
            else:
                aggregated_data[key] = {"error": f"Status {resp.status_code}"}
        
        # Cache the result
        await response_cache.set(cache_key, aggregated_data)
        response.headers["Cache-Control"] = "public, max-age=60"
        return aggregated_data

    except Exception as e:
        print(f"[FullProfile] Exception: {e}")
        return {"error": f"Failed to fetch full profile: {str(e)}"}

# ============================================================
#  EXAM STATUS
# ============================================================
@app.get("/api/student/exam-status")
async def get_exam_status(request: Request, studtblId: str, response: Response, 
                          academicYearId: int = 14, yearOfStudyId: int = 3,
                          semesterId: int = 6, branchId: int = 2,
                          sectionId: int = 2, semesterType: str = "Even"):
    studtblId = fix_id(studtblId)
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
    
    # Cache check
    cache_key = f"exam_status:{studtblId}:{academicYearId}:{semesterId}:{yearOfStudyId}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params=params, headers=headers)
        print(f"[ExamStatus] Status: {resp.status_code}")
            
        if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and json_data["data"]:
                    raw = json_data["data"]
                    result = {
                        "attendance_eligible": raw.get("isAttendanceEligible", False),
                        "fees_eligible": raw.get("isFeesEligible", False),
                        "current_status": raw.get("currentStatus", ""),
                        "total_fees": raw.get("fees", 0),
                        "paid_online": raw.get("onlinePaymentFees", 0),
                        "previous_due": raw.get("previousFeeDue", 0),
                        "attendance_pct": raw.get("attendancePercentage", 0),
                        "od_pct": raw.get("odPercentage", 0)
                    }
                    await response_cache.set(cache_key, result)
                    response.headers["Cache-Control"] = "public, max-age=60"
                    return result
    except Exception as e:
        print(f"[ExamStatus] Exception: {e}")
    
    return {"error": "Failed to fetch exam status"}

# ============================================================
#  ACADEMIC PERCENTAGE
# ============================================================
@app.get("/api/student/academic-percentage")
async def get_academic_percentage(request: Request, studtblId: str, response: Response):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentAcademicPercentage"
    
    # Cache check
    cache_key = f"acad_pct:{studtblId}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        async with httpx.AsyncClient(transport=request.app.state.transport) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            print(f"[AcadPct] Status: {resp.status_code}")
            
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and isinstance(json_data["data"], list):
                    result = {
                        "records": [
                            {
                                "exam": item.get("qualifiedExam", ""),
                                "year": item.get("yearOfPassing", ""),
                                "percentage": item.get("aPercentage", "0")
                            }
                            for item in json_data["data"]
                        ]
                    }
                    await response_cache.set(cache_key, result)
                    response.headers["Cache-Control"] = "public, max-age=60"
                    return result
    except Exception as e:
        print(f"[AcadPct] Exception: {e}")
    
    return {"error": "Failed to fetch academic percentage"}

# ============================================================
#  PARENT DETAILS
# ============================================================
@app.get("/api/student/parent")
async def get_parent_details(request: Request, studtblId: str, response: Response):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentParentDetails"
    
    # Cache check
    cache_key = f"parent:{studtblId}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        async with httpx.AsyncClient(transport=request.app.state.transport) as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and json_data["data"]:
                    raw = json_data["data"]
                    result = {
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
                    await response_cache.set(cache_key, result)
                    response.headers["Cache-Control"] = "public, max-age=60"
                    return result
    except Exception as e:
        print(f"[Parent] Exception: {e}")
    
    return {"error": "Failed to fetch parent details"}

# ============================================================
#  REPORT MENU
# ============================================================
@app.get("/api/reports/menu")
async def get_report_menu(request: Request, response: Response):
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/GetReportMenuWithSubCategories"
    
    # Cache check
    cache_key = "report_menu"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            await response_cache.set(cache_key, data)
            response.headers["Cache-Control"] = "public, max-age=60"
            return data
    except Exception as e:
        print(f"[ReportMenu] Exception: {e}")
    
    return {"error": "Failed to fetch report menu"}

# ============================================================
#  REPORT FILTERS
# ============================================================
@app.get("/api/reports/filters")
async def get_report_filters(request: Request, reportSubId: int, studtblId: str, response: Response):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/GetReportFilterByReportId"
    
    # Cache check
    cache_key = f"report_filters:{reportSubId}:{studtblId}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params={"ReportSubId": reportSubId, "studtblId": studtblId}, headers=headers)
        if resp.status_code == 200:
            json_data = resp.json()
            if "data" in json_data and "semesterData" in json_data.get("data", {}):
                semesters = json_data["data"]["semesterData"]
                result = {
                    "semesters": [
                        {"id": s.get("semesterId"), "name": s.get("semesterName", ""), "number": s.get("semesterNo", 0)}
                        for s in semesters
                    ]
                }
                await response_cache.set(cache_key, result)
                response.headers["Cache-Control"] = "public, max-age=60"
                return result
    except Exception as e:
        print(f"[ReportFilter] Exception: {e}")
    
    return {"error": "Failed to fetch report filters"}

# ============================================================
#  REPORT PDF
# ============================================================
@app.post("/api/reports/download")
async def download_report(request: Request):
    """
    POST Report/ReportsByName — forwards all body params to upstream.
    """
    body = await request.json()
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/ReportsByName"
    
    # Fix studtblId encoding if present
    if "studtblId" in body:
        body["studtblId"] = fix_id(body["studtblId"])
    
    report_name = body.get("reportName", "Attendance")
    semester_id = body.get("semesterId", 6)
    
    print(f"[ReportPDF] name='{report_name}' sem={semester_id}")
    
    async def try_download(payload: dict) -> Response | None:
        """Try a single download request, return Response on success or None."""
        try:
            # Use a separate client for downloads if custom timeout/config needed, or share global if appropriate.
            # Reports might be large, so maybe keep separate or use global with stream.
            # Using global for now to reuse connection pool, but note timeout is 15s global vs 60s here.
            # Reverting to separate client for long downloads to avoid blocking global pool or hitting timeout.
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
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
            print(f"[ReportPDF] Try error: {e}")
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
#  LEGACY REPORT ENDPOINT
# ============================================================
@app.get("/api/reports")
async def get_report(request: Request, studtblId: str, type: str):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    report_map = {"attendance": 9, "cat": 1, "endsem": 5}
    report_sub_id = report_map.get(type.lower(), 9)
    
    upstream_url = f"{base_url}/Report/GetReportFilterByReportId"
    
    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params={"ReportSubId": report_sub_id, "studtblId": studtblId}, headers=headers)
        if resp.status_code == 200:
            json_data = resp.json()
            if "data" in json_data and "semesterData" in json_data.get("data", {}):
                semesters = json_data["data"]["semesterData"]
                return {
                    "title": f"{type.capitalize()} Report",
                    "type": type,
                    "reportSubId": report_sub_id,
                    "semesters": [
                        {"id": s.get("semesterId"), "name": s.get("semesterName", ""), "number": s.get("semesterNo", 0)}
                        for s in semesters
                    ]
                }
            else:
                print(f"[Report] Error: {resp.text[:200]}")
    except Exception as e:
        print(f"[Report] Exception: {e}")
        
    return {"error": "Failed to fetch reports"}

# ============================================================
#  ATTENDANCE DETAILS (Course, Daily, Overall, Leave)
# ============================================================

@app.get("/api/attendance/course-detail")
async def get_attendance_course_detail(request: Request, studtblId: str, response: Response):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetAttendanceCourseDetail"
    params = build_attendance_params(request)
    params["studtblId"] = studtblId
    inst_id = request.headers.get("X-Institution-Id", "SEC").upper()

    # Cache check
    cache_key = f"att_course:{studtblId}:{inst_id}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
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
                    result = {"success": True, "data": normalized}
                    await response_cache.set(cache_key, result)
                    response.headers["Cache-Control"] = "public, max-age=60"
                    return result
                
                result = {"success": True, "data": items}
                await response_cache.set(cache_key, result)
                response.headers["Cache-Control"] = "public, max-age=60"
                return result
            elif isinstance(items, list):
                result = {"success": True, "data": items}
                await response_cache.set(cache_key, result)
                response.headers["Cache-Control"] = "public, max-age=60"
                return result
            
            result = json_data if isinstance(json_data, dict) else {"success": True, "data": []}
            # Don't cache empty/weird unless sure
            return result
    except Exception as e:
        print(f"[AttCourse] Exception: {e}")
    return {"error": "Failed to fetch course attendance"}

@app.get("/api/attendance/daily-detail")
async def get_attendance_daily_detail(request: Request, studtblId: str, response: Response):
    base_url, headers = get_institution_config(request)
    params = build_attendance_params(request)
    params["studtblId"] = fix_id(studtblId)
    inst_id = request.headers.get("X-Institution-Id", "SEC").upper()

    endpoints = [
        f"{base_url}/Student/GetStudentDailyAttedanceDetail",
        f"{base_url}/Student/GetStudentDailyAttendanceDetail",
    ]

    # Cache check
    cache_key = f"att_daily:{studtblId}:{inst_id}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
        # Parallel execution for fallback URLs
        tasks = [client.get(url, params=params, headers=headers) for url in endpoints]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, resp in enumerate(results):
                if isinstance(resp, Exception):
                    print(f"[AttDaily] Request {i} failed: {resp}")
                    continue
                
                print(f"[AttDaily] {inst_id} req={i} status={resp.status_code}")
                if resp.status_code == 200:
                    json_data = resp.json()
                    data = _extract_attendance_data(json_data, inst_id)
                    result = {"success": True, "data": data}
                    await response_cache.set(cache_key, result)
                    response.headers["Cache-Control"] = "public, max-age=60"
                    return result
                    
    except Exception as e:
        print(f"[AttDaily] Exception: {e}")
    return {"error": "Failed to fetch daily attendance"}

@app.get("/api/attendance/overall-detail")
async def get_attendance_overall_detail(request: Request, studtblId: str, response: Response):
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetAttendanceOverAllDetail"
    params = build_attendance_params(request)
    params["studtblId"] = fix_id(studtblId)

    # Cache check
    cache_key = f"att_overall:{studtblId}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params=params, headers=headers)
        if resp.status_code == 200:
            json_data = resp.json()
            data = _extract_attendance_data(json_data)
            result = {"success": True, "data": data}
            await response_cache.set(cache_key, result)
            response.headers["Cache-Control"] = "public, max-age=60"
            return result
    except Exception as e:
        print(f"[AttOverall] Exception: {e}")
    return {"error": "Failed to fetch overall attendance"}

@app.get("/api/attendance/leave-status")
async def get_leave_status(request: Request, studtblId: str, response: Response):
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetLeaveStatusByStudent"
    params = build_attendance_params(request)
    params["studtblId"] = fix_id(studtblId)
    inst_id = request.headers.get("X-Institution-Id", "SEC").upper()

    # Cache check
    cache_key = f"att_leave:{studtblId}:{inst_id}"
    cached = await response_cache.get(cache_key)
    if cached:
        response.headers["Cache-Control"] = "public, max-age=60"
        return cached

    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params=params, headers=headers)
        print(f"[AttLeave] {inst_id} status={resp.status_code}")
        if resp.status_code == 200:
            json_data = resp.json()
            data = _extract_attendance_data(json_data, inst_id)
            result = {"success": True, "data": data}
            await response_cache.set(cache_key, result)
            response.headers["Cache-Control"] = "public, max-age=60"
            return result
    except Exception as e:
        print(f"[AttLeave] Exception: {e}")
    return {"error": "Failed to fetch leave status"}

# ============================================================
#  INBOX
# ============================================================
@app.get("/api/inbox")
async def get_inbox(request: Request, receiver_id: str):
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Inbox/GetUnreadCategories"
    try:
        client = request.app.state.client
        resp = await client.get(upstream_url, params={"Receiver": receiver_id}, headers=headers)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[Inbox] Exception: {e}")
        
    return {"unread_count": 0, "categories": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
