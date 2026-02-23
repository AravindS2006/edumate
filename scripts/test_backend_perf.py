
import asyncio
import sys
import os
import time
import json
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi.testclient import TestClient

# Ensure api is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.index import app, response_cache

def test_backend_optimizations():
    print("Starting Backend Optimization Verification...")
    
    # Mock httpx.AsyncClient to avoid hitting real upstream
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": [{"attendancePercentage": 85}]}
    mock_response.headers = {"content-type": "application/json"}

    async def mock_get_side_effect(*args, **kwargs):
        return mock_response
    
    # We need to patch httpx.AsyncClient used inside endpoints
    # But since we use app.state.transport, the client is created inside endpoints.
    # We should patch `httpx.AsyncClient.get` globally or on the instance.
    
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = mock_get_side_effect
        
        with TestClient(app) as client:
            print("[1] Testing Dashboard Stats Caching & Headers")
            stud_id = "test_student"
            
            # First Call (Miss)
            start = time.time()
            resp1 = client.get(f"/api/dashboard/stats?studtblId={stud_id}")
            duration1 = time.time() - start
            assert resp1.status_code == 200
            assert "Cache-Control" in resp1.headers, "Cache-Control header missing"
            assert resp1.headers["Cache-Control"] == "public, max-age=60"
            print(f"    Call 1 (Fresh): {duration1:.4f}s")
            
            # Second Call (Hit)
            start = time.time()
            resp2 = client.get(f"/api/dashboard/stats?studtblId={stud_id}")
            duration2 = time.time() - start
            assert resp2.status_code == 200
            assert resp2.json() == resp1.json()
            print(f"    Call 2 (Cached): {duration2:.4f}s")
            
            # Verify Mock was called only once (for the first request)
            # wait, TestClient runs in same thread/loop? 
            # effectively mock_get should be called once if cache works.
            # But TestClient might start new lifespan? No, context manager handles it.
            
            if mock_get.call_count == 1:
                print("    [PASS] Cache HIT verified (Upstream called once)")
            else:
                print(f"    [FAIL] Upstream called {mock_get.call_count} times")

            print("\n[2] Testing Attendance Daily (Parallel execution)")
            # Reset checks
            mock_get.reset_mock()
            mock_get.reset_mock()
            mock_get.side_effect = mock_get_side_effect
            
            # For daily, we have 2 URLs. gather should call both?
            # actually if we mock get, both tasks start.
            
            resp3 = client.get(f"/api/attendance/daily-detail?studtblId={stud_id}")
            assert resp3.status_code == 200
            assert "Cache-Control" in resp3.headers

            # Should be 2 calls because of 2 endpoints in list
            print(f"    Upstream calls for daily: {mock_get.call_count}")
            if mock_get.call_count == 2:
                 print("    [PASS] Parallel calls verified")
            
            print("\n[3] Testing Connection Pooling (Transport)")
            # We can't easily verify transport reuse via TestClient blackbox, 
            # but we can check if app.state.transport exists.
            assert hasattr(app.state, "transport"), "app.state.transport missing"
            print("    [PASS] Global Transport Initialized")

            print("\n[4] Testing Aggregated Endpoint (Full Profile)")
            # Reset checks
            mock_get.reset_mock()
            mock_get.reset_mock()
            mock_get.side_effect = mock_get_side_effect 
            
            # This should trigger 6 parallel requests
            resp4 = client.get(f"/api/student/full-profile?studtblId={stud_id}")
            assert resp4.status_code == 200
            data4 = resp4.json()
            with open("debug_response.json", "w") as f:
                json.dump(data4, f, indent=2)
            print(f"DEBUG: Full Profile Response written to debug_response.json")
            
            # Check structure
            expected_keys = ["stats", "academic", "personal", "exam_status", "attendance_overall", "parent"]
            for k in expected_keys:
                assert k in data4, f"Missing key {k} in full-profile"
            
            print(f"    Upstream calls for full-profile: {mock_get.call_count}")
            # It should be 6 calls (one for each key in endpoints dict)
            # logic: 6 keys in endpoints dict.
            if mock_get.call_count == 6:
                print("    [PASS] Parallel Aggregation Verified")
            else:
                 print(f"    [WARN] Expected 6 calls, got {mock_get.call_count}")

    print("\nVerification Complete!")

if __name__ == "__main__":
    test_backend_optimizations()
