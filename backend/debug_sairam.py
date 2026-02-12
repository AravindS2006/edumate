import asyncio
import httpx
from crypto_utils import encrypt_data
import json

# Configuration
BASE_URL = "https://student.sairam.edu.in/studapi"
USERNAME = "sec23ec242@sairamtap.edu.in" 
# Use a placeholder or prompt. For this debug script, we need the real password or we can't test.
# Since I don't have the password, I will use a placeholder and ask the user to fill it or 
# I will try to use the *exact* encrypted payload from the HAR if that's reusable (usually not due to timestamps, but worth a check if encryption is deterministic).
# Wait, the HAR showed the request. 
# HAR Request: {"userName":"...","password":"..."}
# I will assume the user has the credentials in `crypto_utils` or I will ask them to run this script.

# Better approach: Create a script that acts as a CLI for the user to input creds.

async def debug_login():
    print("--- Starting Sairam API Debugger ---")
    
    # Header Setup (Exact from HAR)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://student.sairam.edu.in/sign-in",
        "Origin": "https://student.sairam.edu.in",
        "Content-Type": "application/json",
        "institutionguid": "6EB79EFC-C8B1-47DC-922D-8A7C5E8DAB63"
    }
    
    # 1. Login
    print("\n[1] Testing Login Endpoint...")
    
    # We need the user to input their password safely or hardcode it in their local version.
    # For now, I will use the `crypto_utils` logic.
    # Assuming `crypto_utils` has the key logic correct.
    
    try:
        password = "Aravind@2399"
        
        payload = {
            "userName": encrypt_data(USERNAME),
            "password": encrypt_data(password)
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{BASE_URL}/User/Login", json=payload, headers=headers)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}...") # Print first 500 chars
            
            if resp.status_code == 200:
                data = resp.json()
                auth_token = data.get("idToken")
                studtblId = data.get("userId")
                
                print(f"\nLogin Success!")
                print(f"Token: {auth_token[:20]}...")
                print(f"StudtblID: {studtblId}")
                
                # 2. Test Dashboard Data
                print("\n[2] Testing Dashboard Data Fetch...")
                
                # Update headers with Token
                headers["Authorization"] = f"Bearer {auth_token}"
                # Referer changes for dashboard
                headers["Referer"] = "https://student.sairam.edu.in/dashboard"
                
                # Encode ID?
                # The browser sends it encoded in the URL query string.
                # httpx `params` argument handles encoding automatically.
                
                params = {"studtblId": studtblId}
                
                dash_resp = await client.get(
                    f"{BASE_URL}/Dashboard/GetStudentDashboardDetails",
                    params=params, 
                    headers=headers
                )
                
                print(f"Dashboard Status: {dash_resp.status_code}")
                if dash_resp.status_code == 200:
                    # Print FULL JSON to see if academic info is here
                    print(f"Dashboard JSON: {json.dumps(dash_resp.json(), indent=2)}")
                
                # 3. Test Academic Details - Brute Force
                print("\n[3] Testing Academic Data Fetch Candidates...")
                
                candidates = [
                    "Student/GetStudentAcademicDetails",
                    "Student/GetAcademicDetails",
                    "Academic/GetStudentAcademicDetails",
                    "Academic/GetAcademicDetails",
                    "Student/GetStudentDetails",
                ]
                
                found_academic = False
                for endpoint in candidates:
                    print(f"Trying: {endpoint}...")
                    try:
                        resp = await client.get(f"{BASE_URL}/{endpoint}", params=params, headers=headers)
                        print(f"  -> Status: {resp.status_code}")
                        if resp.status_code == 200:
                            print(f"  -> SUCCESS! Found at: {endpoint}")
                            print(f"  -> Data: {json.dumps(resp.json(), indent=2)[:500]}")
                            found_academic = True
                            break # Found it
                    except Exception as e:
                        print(f"  -> Error: {e}")
                
                if not found_academic:
                    print("Could not find a working Academic Endpoint.")

                # 4. Test Personal Details
                print("\n[4] Testing Personal Data Fetch...")
                pers_resp = await client.get(
                    f"{BASE_URL}/Student/GetStudentPersonalDetails",
                    params=params,
                    headers=headers
                )
                print(f"Personal Status: {pers_resp.status_code}")
                output_data = {
                    "dashboard": dash_resp.json() if dash_resp.status_code == 200 else {"error": dash_resp.status_code},
                    "personal": pers_resp.json() if pers_resp.status_code == 200 else {"error": pers_resp.status_code},
                }
                
                with open("debug_output.json", "w") as f:
                    json.dump(output_data, f, indent=2)
                print("Debug Output saved to debug_output.json")
                
            else:
                print("Login Failed. Cannot proceed.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(debug_login())
