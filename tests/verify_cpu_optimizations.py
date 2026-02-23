import sys
import os
from fastapi.testclient import TestClient

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from api.index import app
    # Import directly from api.crypto_utils to verify the specific file used by api/index.py
    import api.crypto_utils as crypto_utils
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def test_crypto_cache():
    print("Testing Crypto Cache...")
    # First call initializes
    c1 = crypto_utils.get_cipher()
    # Second call should return same object
    c2 = crypto_utils.get_cipher()
    
    if c1 is c2:
        print("PASS: Cipher is cached.")
    else:
        print("FAIL: Cipher is NOT cached.")

def test_global_client():
    print("Testing Global Client Initialization...")
    # TestClient runs lifespan on enter
    with TestClient(app) as client:
        if hasattr(app.state, "client"):
            print("PASS: app.state.client initialized.")
            # Verify type roughly
            print(f"Client Type: {type(app.state.client)}")
        else:
            print("FAIL: app.state.client NOT initialized.")

if __name__ == "__main__":
    test_crypto_cache()
    test_global_client()
