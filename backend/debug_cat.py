import requests
import json
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

# ------------------------------------------------------------------------------
# 1. Setup & Encryption Data (Same as backend)
# ------------------------------------------------------------------------------
BASE_URL = "http://localhost:8000"
# Use a valid test user if possible, otherwise rely on the backend mock/real logic
USERNAME = "test_user" # Replace with valid if known, or rely on backend mock
PASSWORD = "test_password" 

# AES Key (Must match backend's key generation logic if we were doing raw login, 
# but here we are calling our backend proxy, so we just need valid credentials 
# that the backend accepts. If we use the real backend, we need real credentials.
# The user might be logged in on the frontend.
# Let's try to just use the token file if it exists, or ask the user for one?
# Actually, let's just try to hit the download endpoint assuming we rely on the backend logs
# to tell us what happened if we fail auth. 
# BUT, we need a valid token to even reach the upstream.
# Let's try to login using the provided credentials in the backend:
# In main.py: if credentials.username == "test": return mock
# So we can use "test" / "test" to get a mock token, BUT that won't work for REAL upstream calls.
# We need a REAL token. 

# Alternative: We can't easily get a real token without the user's password.
# However, the user IS logged in. Maybe we can grab the token from the browser local storage?
# No, browser tool failed.

# Let's look at the backend logs again. The previous read_terminal was empty.
# Maybe I can just add more logging to the backend and ask the user to retry?
# Or I can try to find the token in the backend logs if it was printed?
# I see "Token: dummy..." in a previous step.

# Wait, the user provided a snippet of the log in the interaction before:
# [ReportPDF] name='Attendance' sem=6 stud='HPHLbMd+aXKusfSfL79e5w=='
# This contains the student ID. 

# Let's create a script that just hits the local backend.
# We will use a dummy token and hope the backend or upstream handles it, or 
# (more likely) we need the real token.
# Actually, the previous error log showed "Upstream status 400".
# This implies auth worked (otherwise 401).
# So I can probably re-use the student ID from the log 'HPHLbMd+aXKusfSfL79e5w=='
# and try to download.
# But I need a valid Authorization header for the upstream.
# The backend forwards the header.
# So I MUST have a valid token.

# Plan B: inspecting main.py again. 
# It logs [ReportPDF] Full payload: ...
# I will add a print of the headers too.
# Then I will ask the user to click "CAT" again.
# This forces the logs to show up.
# I will then read the logs. The "read_terminal" might have just missed the history.
# I will try read_terminal with a larger history count or wait for new output.

# Let's improve the backend logging first to be absolutely sure we capture everything.
pass
