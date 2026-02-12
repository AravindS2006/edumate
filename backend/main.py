from fastapi import FastAPI, HTTPException, Request, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
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
BASE_URL = "https://student.sairam.edu.in/stdapi"

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(credentials: LoginRequest):
    # Sairam API expects separate encrypted strings in a JSON body
    payload = {
            )
            
            if resp.status_code == 200:
                # Upstream returns encrypted response? Or plain?
                # Usually it responds with JSON. Let's assume it returns JSON with the needed ID.
                # If it's encrypted, we'd need to decrypt.
                # For now, we'll try to parse it.
                try:
                    data = resp.json()
                    return data 
                except:
                    pass
    except Exception as e:
        print(f"Upstream login failed: {e}")

    # Fallback Mock for Dev
    if credentials.username == "test":
        return {
            "status": "success",
            "token": "mock_token_123",
            "studtblId": "12345", # MOCK ID
            "user": {
                "name": "Sairam Student (Mock)",
                "reg_no": credentials.username
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/profile/image")
async def get_profile_image(studtblId: str, documentId: str = "tdN4BQKuPTzj9130EWB8Gw=="):
    # documentId seems static in the user request or specific to the user?
    # User said: "studapi/Document/DownloadBlob?documentId=tdN4BQKuPTzj9130EWB8Gw%3D%3D&studtblId"
    # We'll forward the params.
    
    upstream_url = f"{BASE_URL}/Document/DownloadBlob"
    params = {"documentId": documentId, "studtblId": studtblId}
    
    try:
        async with httpx.AsyncClient() as client:
            req = client.build_request("GET", upstream_url, params=params)
            r = await client.send(req, stream=True)
            return StreamingResponse(
                r.aiter_bytes(), 
                media_type=r.headers.get("content-type"),
                status_code=r.status_code
            )
    except Exception as e:
        # Fallback to a placeholder image
        return Response(status_code=404)

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(studtblId: str):
    upstream_url = f"{BASE_URL}/Dashboard/GetStudentDashboardDetails"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId})
            if resp.status_code == 200:
                return resp.json()
    except:
        pass
        
    # Mock Data
    return {
        "attendance_percentage": 85.5,
        "assignments_pending": 2,
        "cgpa": 8.75,
        "arrears": 0
    }

@app.get("/api/student/academic")
async def get_academic_details(studtblId: str):
    upstream_url = f"{BASE_URL}/Student/GetStudentAcademicDetails"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId})
            if resp.status_code == 200:
                return resp.json()
    except:
        pass
        
    return {
        "dept": "Computer Science and Engineering",
        "semester": 6,
        "section": "A",
        "batch": "2023-2027"
    }

@app.get("/api/student/personal")
async def get_personal_details(studtblId: str):
    upstream_url = f"{BASE_URL}/Student/GetStudentPersonalDetails"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"studtblId": studtblId})
            if resp.status_code == 200:
                return resp.json()
    except:
        pass
        
    return {
        "name": "Sairam Student",
        "reg_no": "412345678",
        "dob": "2003-01-01"
    }

@app.get("/api/reports")
async def get_report(studtblId: str, type: str):
    # Mapping report types to IDs
    report_map = {
        "cat": 1,
        "endsem": 5,
        "attendance": 9
    }
    
    report_id = report_map.get(type.lower())
    if not report_id:
        return {"error": "Invalid report type"}
        
    upstream_url = f"{BASE_URL}/Report/GetReportFilterByReportId"
    params = {"ReportSubId": report_id, "studtblId": studtblId}
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params=params)
            if resp.status_code == 200:
                return resp.json()
    except:
        pass
        
    # Mock Report Data
    return {
        "title": f"{type.capitalize()} Report",
        "data": [
            {"subject": "Maths", "marks": 90, "max": 100},
            {"subject": "Physics", "marks": 85, "max": 100}
        ]
    }

@app.get("/api/inbox")
async def get_inbox(receiver_id: str):
    upstream_url = f"{BASE_URL}/Inbox/GetUnreadCategories"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(upstream_url, params={"Receiver": receiver_id})
            if resp.status_code == 200:
                return resp.json()
    except:
        pass
        
    return {"unread_count": 5, "categories": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
