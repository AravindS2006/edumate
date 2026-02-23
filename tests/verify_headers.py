
import sys
import os
import asyncio
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.append(os.getcwd())

# Mock sheets_logger before importing app to avoid import errors or side effects
sys.modules["api.sheets_logger"] = MagicMock()

from api.index import app, response_cache

# Mock the global client
mock_client = AsyncMock()
mock_response = MagicMock()
mock_response.status_code = 200
mock_response.json.return_value = {"success": True, "data": []} # Default empty data
mock_client.get.return_value = mock_response
mock_client.post.return_value = mock_response

# Helper to run async cache operations
def run_async(coro):
    return asyncio.run(coro)

def test_cache_headers():
    # Initialize TestClient which triggers lifespan
    with TestClient(app) as client:
        # Patch app state client
        app.state.client = mock_client
        
        print("Verifying Cache-Control Headers...")
        
        # 1. Static Data / Personal Details
        # Mock upstream response for personal details
        mock_response.json.return_value = {
            "data": {
                "studentName": "Test Student",
                "studRollNo": "123",
                "officialEmailid": "test@example.com"
            }
        }
        
        # Test Cache Miss (fetch from upstream)
        resp = client.get("/api/student/personal?studtblId=123")
        cc = resp.headers.get("Cache-Control", "")
        print(f"Personal Details (Miss): {cc} -> {'PASS' if 'max-age=86400' in cc else 'FAIL'}")
        
        # Test Cache Hit
        resp = client.get("/api/student/personal?studtblId=123")
        cc = resp.headers.get("Cache-Control", "")
        print(f"Personal Details (Hit):  {cc} -> {'PASS' if 'max-age=86400' in cc else 'FAIL'}")

        # 2. Dynamic Data / Full Profile
        # Mock profile
        # Use simple non-empty data for all endpoints called by full-profile
        # full-profile calls stats, academic, personal, exam_status, etc.
        # We need to ensure none crash.
        # stats -> list
        # academic -> list
        # personal -> dict/list
        # The mock returns the SAME response for ALL calls because we use one mock_client.get
        # So providing a generic dict that satisfies all is tricky.
        # Better: change mock_client.get side_effect to return different responses based on url.
        
        def side_effect(url, params=None, headers=None):
            m = MagicMock()
            m.status_code = 200
            if "Personal" in url:
                m.json.return_value = {"data": [{"studentName": "Test"}]}
            elif "Dashboard" in url:
                m.json.return_value = {"data": [{"uG_Cgpa": 8.5}]}
            elif "Academic" in url: # AcademicDetails or AcademicPercentage
                 if "Percentage" in url:
                     m.json.return_value = {"data": []}
                 else:
                    m.json.return_value = {"data": [{"semester": 6}]}
            elif "Exam" in url:
                m.json.return_value = {"data": [{"currentStatus": "Permitted"}]}
            elif "Parent" in url:
                 m.json.return_value = {"data": [{"fatherName": "Dad"}]}
            else:
                 m.json.return_value = {"data": []}
            return m
            
        mock_client.get.side_effect = side_effect
        
        resp = client.get("/api/student/full-profile?studtblId=123&semesterId=6")
        cc = resp.headers.get("Cache-Control", "")
        print(f"Full Profile (Miss):     {cc} -> {'PASS' if 'max-age=600' in cc else 'FAIL'}")
        
        # Re-get for cache hit
        # We need to make sure the previous 'Miss' actually cached it.
        # Since TestClient runs in thread, and app uses response_cache...
        # response_cache is global in index.py. It should persist.
        resp = client.get("/api/student/full-profile?studtblId=123&semesterId=6")
        cc = resp.headers.get("Cache-Control", "")
        print(f"Full Profile (Hit):      {cc} -> {'PASS' if 'max-age=600' in cc else 'FAIL'}")
        
        # 3. Semi-Dynamic / Report Filters
        # mock side effect handles default empty list which is fine?
        # Filters expects "semesterData"
        def side_effect_filters(url, params=None, headers=None):
            m = MagicMock()
            m.status_code = 200
            m.json.return_value = {"data": {"semesterData": []}}
            return m
        mock_client.get.side_effect = side_effect_filters
        
        resp = client.get("/api/reports/filters?reportSubId=1&studtblId=123")
        cc = resp.headers.get("Cache-Control", "")
        print(f"Report Filters (Miss):   {cc} -> {'PASS' if 'max-age=3600' in cc else 'FAIL'}")
        
        resp = client.get("/api/reports/filters?reportSubId=1&studtblId=123")
        cc = resp.headers.get("Cache-Control", "")
        print(f"Report Filters (Hit):    {cc} -> {'PASS' if 'max-age=3600' in cc else 'FAIL'}")

        # 4. Attendance Course Detail
        def side_effect_att(url, params=None, headers=None):
            m = MagicMock()
            m.status_code = 200
            m.json.return_value = {"data": []} 
            return m
        mock_client.get.side_effect = side_effect_att
        
        resp = client.get("/api/attendance/course-detail?studtblId=123")
        cc = resp.headers.get("Cache-Control", "")
        print(f"Att Course (Miss):       {cc} -> {'PASS' if 'max-age=600' in cc else 'FAIL'}")
        
        resp = client.get("/api/attendance/course-detail?studtblId=123")
        cc = resp.headers.get("Cache-Control", "")
        print(f"Att Course (Hit):        {cc} -> {'PASS' if 'max-age=600' in cc else 'FAIL'}")

if __name__ == "__main__":
    try:
        test_cache_headers()
    except Exception as e:
        print(f"Test Execution Failed: {e}")
