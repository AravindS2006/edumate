from fastapi import FastAPI, HTTPException, Request, Response, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
import asyncio
from crypto_utils import encrypt_data, decrypt_data
from sheets_logger import sheets_logger

# SECRET KEY for accessing logs
LOGS_SECRET_KEY = "edumate_admin_secret"

app = FastAPI()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

# Allow CORS
origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
        "institutionguid": "6EB79EFC-C8B1-47DC-922D-8A7C5E8DAB63" # Same Project Key
    }
}

DEFAULT_INSTITUTION = "SEC"

def get_institution_config(request: Request):
    """
    Determines the institution from the 'X-Institution-Id' header.
    Returns (base_url, headers_dict).
    """
    inst_id = request.headers.get("X-Institution-Id", DEFAULT_INSTITUTION).upper()
    if inst_id not in INSTITUTIONS:
        inst_id = DEFAULT_INSTITUTION
        
    config = INSTITUTIONS[inst_id]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": config["Referer"],
        "Origin": config["Origin"],
        "Content-Type": "application/json",
        "institutionguid": config["institutionguid"],
        "Authorization": request.headers.get("Authorization", "")
    }
    
    return config["BASE_URL"], headers


@app.get("/")
async def root():
    return {"message": "Edumate Backend Proxy is Running", "docs": "/docs"}

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(request: Request, credentials: LoginRequest, background_tasks: BackgroundTasks):
    base_url, base_headers = get_institution_config(request)
    
    payload = {
        "userName": encrypt_data(credentials.username),
        "password": encrypt_data(credentials.password)
    }
    
    headers = base_headers.copy()
    headers["Referer"] = f"{base_headers['Origin']}/sign-in"

    print(f"Attempting Login for user: {credentials.username} at {base_url}")
    client_ip = request.client.host if request.client else "Unknown"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
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

# --- Helper for Headers ---
# Removed get_upstream_headers as it is replaced by get_institution_config

def fix_id(studtblId: str) -> str:
    """Ensure + and = are not corrupted by URL encoding."""
    return studtblId.replace(" ", "+")

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
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(upstream_url, params={"documentId": documentId, "studtblId": studtblId}, headers=headers)
            print(f"[Image] Upstream status: {resp.status_code}, content-type: {resp.headers.get('content-type')}")
            
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "image/jpeg")
                return Response(
                    content=resp.content,
                    media_type=content_type,
                    status_code=200
                )
            else:
                print(f"[Image] Failed: {resp.text[:200]}")
    except Exception as e:
        print(f"[Image] Exception: {e}")
    
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
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Dashboard/GetStudentDashboardDetails"
    
    try:
        async with httpx.AsyncClient() as client:
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
                        "arrears": 0,  # Will be filled from exam-status
                        "od_percentage": raw.get("odPercentage", 0),
                        "od_count": raw.get("odCount", 0),
                        "absent_percentage": raw.get("absentPercentage", 0),
                        "program": raw.get("program", ""),
                        "branch_code": raw.get("branchCode", ""),
                        "mentor_name": raw.get("mentorName", ""),
                        "total_semesters": raw.get("totalSemesters", 0),
                        "total_years": raw.get("totalYears", 0)
                    }
                return stats
            else:
                print(f"[Dashboard] Error: {resp.text[:200]}")
    except Exception as e:
        print(f"[Dashboard] Exception: {e}")
        
    return {"error": "Failed to fetch dashboard data"}

# ============================================================
#  ACADEMIC DETAILS (Fixed! Using correct endpoint)
# ============================================================
@app.get("/api/student/academic")
async def get_academic_details(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    # HAR confirms this endpoint works! Returns batch year, university reg, etc.
    # HAR confirms this endpoint works! Returns batch year, university reg, etc.
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentAcademicDetails"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            print(f"[Academic] ID: '{studtblId}' | Status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                if "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
                    raw = data["data"][0]
                    return {
                        "dept": raw.get("studentDepartment", "Unknown"),
                        "semester": raw.get("currentSemsterId", 0),
                        "semester_name": raw.get("semesterName", ""),
                        "semester_type": raw.get("semesterType", ""),
                        "section": "N/A",  # Not in this endpoint, comes from Dashboard
                        "batch": raw.get("academicBatchYear", ""),
                        "admission_mode": raw.get("admissionMode", ""),
                        "university_reg_no": raw.get("universityRegNo", ""),
                        "mentor_name": raw.get("mentorName", ""),
                        "hostel": raw.get("hostel", False),
                        "bus_code": raw.get("busCode", ""),
                        "current_academic_year": raw.get("currentAcademicYear", ""),
                        "programme_id": raw.get("programmeId", 0),
                        # IDs needed for other endpoints
                        "branch_id": raw.get("branchId", 0),
                        "year_of_study_id": raw.get("yearOfStudyId", 0),
                        "section_id": raw.get("sectionId", 0),
                        "academic_year_id": raw.get("academicYearId", 0),
                        "academic_batch_id": raw.get("academicBatchId", 0)
                    }
    except Exception as e:
        print(f"[Academic] Exception: {e}")

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
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentPersonalDetails"
    try:
        async with httpx.AsyncClient() as client:
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
                print(f"[Personal] Error: {resp.text[:200]}")
    except Exception as e:
        print(f"[Personal] Exception: {e}")
        
    return {"error": "Failed to fetch personal details"}

# ============================================================
#  EXAM STATUS (for arrears / eligibility)
# ============================================================
@app.get("/api/student/exam-status")
async def get_exam_status(request: Request, studtblId: str, 
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
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            print(f"[ExamStatus] Status: {resp.status_code}")
            
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and json_data["data"]:
                    raw = json_data["data"]
                    # Debug: Print all keys to find arrears info
                    print(f"[ExamStatus] Keys: {list(raw.keys())}")
                    print(f"[ExamStatus] Arrear info? 'arrear': {raw.get('arrear')}, 'history': {raw.get('historyOfArrears')}, 'totalArrears': {raw.get('totalArrears')}")
                    
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
        print(f"[ExamStatus] Exception: {e}")
    
    return {"error": "Failed to fetch exam status"}

# ============================================================
#  ACADEMIC PERCENTAGE (HSC / SSLC)
# ============================================================
@app.get("/api/student/academic-percentage")
async def get_academic_percentage(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentAcademicPercentage"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            print(f"[AcadPct] Status: {resp.status_code}")
            
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
        print(f"[AcadPct] Exception: {e}")
    
    return {"error": "Failed to fetch academic percentage"}

# ============================================================
#  PARENT DETAILS
# ============================================================
@app.get("/api/student/parent")
async def get_parent_details(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentParentDetails"
    
    try:
        async with httpx.AsyncClient() as client:
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
        print(f"[Parent] Exception: {e}")
    
    return {"error": "Failed to fetch parent details"}

# ============================================================
#  REPORT MENU (available report types)
# ============================================================
@app.get("/api/reports/menu")
async def get_report_menu(request: Request):
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/GetReportMenuWithSubCategories"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"[ReportMenu] Exception: {e}")
    
    return {"error": "Failed to fetch report menu"}

# ============================================================
#  REPORT FILTERS (semester list for a report type)
# ============================================================
@app.get("/api/reports/filters")
async def get_report_filters(request: Request, reportSubId: int, studtblId: str):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/GetReportFilterByReportId"
    
    try:
        async with httpx.AsyncClient() as client:
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
        print(f"[ReportFilter] Exception: {e}")
    
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
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                resp = await client.post(upstream_url, json=payload, headers=headers)
                ct = resp.headers.get('content-type', '').lower()
                size = len(resp.content)
                print(f"[ReportPDF] -> Status={resp.status_code}, CT='{ct}', Size={size}b")
                
                # Check for PDF regardless of status code
                if resp.content[:5] == b'%PDF-' or ('pdf' in ct and size > 200):
                    print(f"[ReportPDF] SUCCESS: Got PDF ({size} bytes)")
                    return Response(
                        content=resp.content,
                        media_type="application/pdf",
                        status_code=200,
                        headers={"Content-Disposition": f"inline; filename={report_name}_sem{semester_id}.pdf"}
                    )
                
                if 'octet-stream' in ct and size > 500:
                    print(f"[ReportPDF] SUCCESS: Got binary stream ({size} bytes)")
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
#  LEGACY REPORT ENDPOINT (kept for compatibility, now JSON-based)
# ============================================================
@app.get("/api/reports")
async def get_report(request: Request, studtblId: str, type: str):
    """Legacy endpoint - returns filter data for the selected report type."""
    studtblId = fix_id(studtblId)
    report_map = {"attendance": 9, "cat": 1, "endsem": 5}
    report_sub_id = report_map.get(type.lower(), 9)
    
    # Also get the correct report name from the menu
    report_name_map = {"attendance": "Attendance", "cat": "CAT Performance", "endsem": "University-End Semester"}
    report_name = report_name_map.get(type.lower(), "Attendance")
    
    report_name = report_name_map.get(type.lower(), "Attendance")
    
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Report/GetReportFilterByReportId"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"ReportSubId": report_sub_id, "studtblId": studtblId}, headers=headers)
            print(f"[Report] type='{type}' subId={report_sub_id} status={resp.status_code}")
            
            if resp.status_code == 200:
                json_data = resp.json()
                
                # Log FULL response structure to understand what SSRS needs
                if "data" in json_data:
                    data = json_data["data"]
                    print(f"[Report] Full data keys: {list(data.keys()) if isinstance(data, dict) else type(data).__name__}")
                    # Log non-semester data for debugging
                    for key, val in data.items():
                        if key != "semesterData":
                            print(f"[Report] data.{key} = {json.dumps(val)[:200] if not isinstance(val, str) else val[:200]}")
                
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
                print(f"[Report] Error: {resp.text[:500]}")
    except Exception as e:
        print(f"[Report] Exception: {e}")
        
    return {"error": "Failed to fetch reports"}

# ============================================================
#  ATTENDANCE DETAILS (Course, Daily, Overall, Leave)
# ============================================================

@app.get("/api/attendance/course-detail")
async def get_attendance_course_detail(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetAttendanceCourseDetail"
    
    # Forward all incoming query params
    params = dict(request.query_params)
    params["studtblId"] = studtblId
    
    # Fill SEC defaults if absolutely missing
    if "academicYearId" not in params: params["academicYearId"] = 14
    if "branchId" not in params: params["branchId"] = 2
    if "semesterId" not in params: params["semesterId"] = 6

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                
                # Normalize SIT keys if institution is SIT or structure matches
                inst_id = request.headers.get("X-Institution-Id", "SEC").upper()
                items = json_data.get("data") if isinstance(json_data, dict) else json_data
                
                if isinstance(items, list):
                    # Check if it looks like SIT data OR inst_id is SIT
                    # SIT uses 'subjectCode' or returns raw values without the 'data' key
                    is_sit = inst_id == "SIT" or (len(items) > 0 and ("subjectCode" in items[0] or "attendancePercentage" in items[0]))
                    
                    if is_sit:
                        normalized_data = []
                        for item in items:
                            normalized_data.append({
                                "courseCode": item.get("subjectCode") or item.get("courseCode"),
                                "courseName": item.get("subjectName") or item.get("courseName"),
                                "attendancePercentage": item.get("attendancePercentage") or item.get("percentage") or item.get("p_Percentage") or 0,
                                "courseId": item.get("courseId") or item.get("id"),
                                "id": item.get("id") or item.get("courseId")
                            })
                        return {"success": True, "data": normalized_data}
                    else: # If not SIT-like data, but it's a list, wrap it
                        return {"success": True, "data": items}
                
                # If it's not a list, return the original json_data
                return json_data
    except Exception as e:
        print(f"[AttCourse] Exception: {e}")
    return {"error": "Failed to fetch course attendance"}

@app.get("/api/attendance/daily-detail")
async def get_attendance_daily_detail(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetStudentDailyAttedanceDetail"
    
    params = dict(request.query_params)
    params["studtblId"] = studtblId
    if "academicYearId" not in params: params["academicYearId"] = 14
    if "branchId" not in params: params["branchId"] = 2
    if "semesterId" not in params: params["semesterId"] = 6

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if isinstance(json_data, list):
                    return {"success": True, "data": json_data}
                return json_data
    except Exception as e:
        print(f"[AttDaily] Exception: {e}")
    return {"error": "Failed to fetch daily attendance"}

@app.get("/api/attendance/overall-detail")
async def get_attendance_overall_detail(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetAttendanceOverAllDetail"
    
    params = dict(request.query_params)
    params["studtblId"] = studtblId
    if "academicYearId" not in params: params["academicYearId"] = 14
    if "branchId" not in params: params["branchId"] = 2
    if "semesterId" not in params: params["semesterId"] = 6

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if isinstance(json_data, list):
                    return {"success": True, "data": json_data}
                return json_data
    except Exception as e:
        print(f"[AttOverall] Exception: {e}")
    return {"error": "Failed to fetch overall attendance"}

@app.get("/api/attendance/leave-status")
async def get_leave_status(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    base_url, headers = get_institution_config(request)
    upstream_url = f"{base_url}/Student/GetLeaveStatusByStudent"
    
    params = dict(request.query_params)
    params["studtblId"] = studtblId
    if "academicYearId" not in params: params["academicYearId"] = 14
    if "branchId" not in params: params["branchId"] = 2
    if "semesterId" not in params: params["semesterId"] = 6

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params=params, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if isinstance(json_data, list):
                    return {"success": True, "data": json_data}
                return json_data
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
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"Receiver": receiver_id}, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"[Inbox] Exception: {e}")
        
    return {"unread_count": 0, "categories": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
