from fastapi import FastAPI, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
from mangum import Mangum

# Import crypto_utils from same directory
import importlib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crypto_utils import encrypt_data, decrypt_data

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base URL for Sairam Student API
BASE_URL = "https://student.sairam.edu.in/studapi"

@app.get("/")
async def root():
    return {"message": "Edumate Backend Proxy is Running", "docs": "/docs"}

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(credentials: LoginRequest):
    payload = {
        "userName": encrypt_data(credentials.username),
        "password": encrypt_data(credentials.password)
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://student.sairam.edu.in/sign-in",
        "Origin": "https://student.sairam.edu.in",
        "Content-Type": "application/json",
        "institutionguid": "6EB79EFC-C8B1-47DC-922D-8A7C5E8DAB63"
    }

    print(f"Attempting Login for user: {credentials.username}")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(f"{BASE_URL}/User/Login", json=payload, headers=headers)
            print(f"Upstream Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "token": data.get("idToken"),
                    "studtblId": data.get("userId"),
                    "user_data": data 
                }
            else:
                print(f"Upstream Error: {response.text}")
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
def get_upstream_headers(request: Request):
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://student.sairam.edu.in/dashboard",
        "Origin": "https://student.sairam.edu.in",
        "Content-Type": "application/json",
        "institutionguid": "6EB79EFC-C8B1-47DC-922D-8A7C5E8DAB63",
        "Authorization": request.headers.get("Authorization", "")
    }

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
    
    upstream_url = f"{BASE_URL}/Document/DownloadBlob"
    headers = get_upstream_headers(request)
    
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
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    upstream_url = f"{BASE_URL}/Dashboard/GetStudentDashboardDetails"
    headers = get_upstream_headers(request)
    
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
    upstream_url = f"{BASE_URL}/Student/GetStudentAcademicDetails"
    headers = get_upstream_headers(request)
    
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
@app.get("/api/student/personal")
async def get_personal_details(request: Request, studtblId: str):
    studtblId = fix_id(studtblId)
    upstream_url = f"{BASE_URL}/Student/GetStudentPersonalDetails"
    headers = get_upstream_headers(request)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId}, headers=headers)
            if resp.status_code == 200:
                json_data = resp.json()
                if "data" in json_data and json_data["data"]:
                    raw = json_data["data"]
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
    upstream_url = f"{BASE_URL}/HallTicket/GetStudentExamStatus"
    headers = get_upstream_headers(request)
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
                    return {
                        "attendance_eligible": raw.get("isAttendanceEligible", False),
                        "fees_eligible": raw.get("isFeesEligible", False),
                        "current_status": raw.get("currentStatus", ""),
                        "total_fees": raw.get("fees", 0),
                        "paid_online": raw.get("onlinePaymentFees", 0),
                        "previous_due": raw.get("previousFeeDue", 0),
                        "attendance_pct": raw.get("attendancePercentage", 0),
                        "od_pct": raw.get("odPercentage", 0)
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
    upstream_url = f"{BASE_URL}/Student/GetStudentAcademicPercentage"
    headers = get_upstream_headers(request)
    
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
    upstream_url = f"{BASE_URL}/Student/GetStudentParentDetails"
    headers = get_upstream_headers(request)
    
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
    upstream_url = f"{BASE_URL}/Report/GetReportMenuWithSubCategories"
    headers = get_upstream_headers(request)
    
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
    upstream_url = f"{BASE_URL}/Report/GetReportFilterByReportId"
    headers = get_upstream_headers(request)
    
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
    HAR shows: POST Report/ReportsByName
    Body: {"reportName":"Attendance","semesterId":4,"studtblId":"..."}
    Returns: PDF binary
    """
    body = await request.json()
    upstream_url = f"{BASE_URL}/Report/ReportsByName"
    headers = get_upstream_headers(request)
    
    report_name = body.get("reportName", "Attendance")
    semester_id = body.get("semesterId", 6)
    stud_id = fix_id(body.get("studtblId", ""))
    
    payload = {
        "reportName": report_name,
        "semesterId": semester_id,
        "studtblId": stud_id
    }
    
    print(f"[ReportPDF] name='{report_name}' sem={semester_id}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(upstream_url, json=payload, headers=headers)
            print(f"[ReportPDF] Status: {resp.status_code}, Content-Type: {resp.headers.get('content-type')}")
            
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "application/pdf")
                return Response(
                    content=resp.content,
                    media_type=content_type,
                    status_code=200,
                    headers={
                        "Content-Disposition": f"inline; filename={report_name}_sem{semester_id}.pdf"
                    }
                )
    except Exception as e:
        print(f"[ReportPDF] Exception: {e}")
    
    return Response(status_code=500, content=b"Failed to download report")

# ============================================================
#  LEGACY REPORT ENDPOINT (kept for compatibility, now JSON-based)
# ============================================================
@app.get("/api/reports")
async def get_report(request: Request, studtblId: str, type: str):
    """Legacy endpoint - returns filter data for the selected report type."""
    studtblId = fix_id(studtblId)
    report_map = {"attendance": 9, "cat": 1, "endsem": 5}
    report_sub_id = report_map.get(type.lower(), 9)
    
    upstream_url = f"{BASE_URL}/Report/GetReportFilterByReportId"
    headers = get_upstream_headers(request)
    
    try:
        async with httpx.AsyncClient() as client:
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
#  INBOX
# ============================================================
@app.get("/api/inbox")
async def get_inbox(request: Request, receiver_id: str):
    upstream_url = f"{BASE_URL}/Inbox/GetUnreadCategories"
    headers = get_upstream_headers(request)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"Receiver": receiver_id}, headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"[Inbox] Exception: {e}")
        
    return {"unread_count": 0, "categories": []}

# Vercel Serverless Handler
handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
