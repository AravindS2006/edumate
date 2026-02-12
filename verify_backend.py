import httpx
import asyncio

async def verify():
    base_url = "http://localhost:8000"
    
    print("Verifying Backend API...")
    
    # 1. Login
    print("\n[TEST] Login Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/api/login",
                json={"username": "test", "password": "test"}
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
            
            if response.status_code == 200 and "token" in response.json():
                print("✅ Login Successful")
            else:
                print("❌ Login Failed")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

    # 2. Dashboard
    print("\n[TEST] Dashboard Endpoint")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{base_url}/api/dashboard")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
            
            if response.status_code == 200 and "attendance" in response.json():
                print("✅ Dashboard Data Retrieved")
            else:
                print("❌ Dashboard Failed")
                
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
