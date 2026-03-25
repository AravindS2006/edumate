import sys
import os
import importlib
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

# Mock sheets_logger before importing app to avoid import errors or side effects
sys.modules["sheets_logger"] = MagicMock()


def _load_app(environment: str):
    """Load the app with a specific ENVIRONMENT setting."""
    os.environ["ENVIRONMENT"] = environment

    # Force reimport of main so IS_PRODUCTION is re-evaluated
    if "main" in sys.modules:
        del sys.modules["main"]

    import main
    return main.app


def test_docs_hidden_in_production():
    print("Testing API docs are hidden in production...")
    app = _load_app("production")
    client = TestClient(app, raise_server_exceptions=False)

    resp = client.get("/docs")
    result = "PASS" if resp.status_code == 404 else f"FAIL (got {resp.status_code})"
    print(f"  /docs returns 404: {result}")

    resp = client.get("/redoc")
    result = "PASS" if resp.status_code == 404 else f"FAIL (got {resp.status_code})"
    print(f"  /redoc returns 404: {result}")

    resp = client.get("/openapi.json")
    result = "PASS" if resp.status_code == 404 else f"FAIL (got {resp.status_code})"
    print(f"  /openapi.json returns 404: {result}")

    resp = client.get("/")
    body = resp.json()
    result = "PASS" if "docs" not in body else f"FAIL (docs key present: {body})"
    print(f"  / does not expose docs URL: {result}")


def test_docs_accessible_in_development():
    print("Testing API docs are accessible in development...")
    app = _load_app("development")
    client = TestClient(app, raise_server_exceptions=False)

    resp = client.get("/docs")
    result = "PASS" if resp.status_code == 200 else f"FAIL (got {resp.status_code})"
    print(f"  /docs returns 200: {result}")

    resp = client.get("/redoc")
    result = "PASS" if resp.status_code == 200 else f"FAIL (got {resp.status_code})"
    print(f"  /redoc returns 200: {result}")

    resp = client.get("/openapi.json")
    result = "PASS" if resp.status_code == 200 else f"FAIL (got {resp.status_code})"
    print(f"  /openapi.json returns 200: {result}")

    resp = client.get("/")
    body = resp.json()
    result = "PASS" if body.get("docs") == "/docs" else f"FAIL (body: {body})"
    print(f"  / exposes docs URL: {result}")


if __name__ == "__main__":
    test_docs_hidden_in_production()
    test_docs_accessible_in_development()
