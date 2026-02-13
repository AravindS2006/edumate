import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
import datetime
import json
import logging

# Configure basic logging for the app
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SheetsLogger:
    def __init__(self, credentials_path=None, sheet_id=None):
        self.scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive"
        ]
        
        # Try to get credentials from Env Var (Vercel) or File (Local)
        self.creds = None
        
        # 1. Try Credentials JSON Content from Env Var (Best for Vercel)
        google_creds_json = os.environ.get("GOOGLE_CREDENTIALS")
        if google_creds_json:
            try:
                creds_dict = json.loads(google_creds_json)
                self.creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, self.scope)
            except Exception as e:
                logger.error(f"Failed to load credentials from GOOGLE_CREDENTIALS env var: {e}")

        # 2. Try Credentials File Path (Best for Local)
        if not self.creds:
            if not credentials_path:
                # Default path or Env var for path
                credentials_path = os.environ.get("GOOGLE_CREDENTIALS_PATH", "credentials.json")
            
            if os.path.exists(credentials_path):
                 self.creds = ServiceAccountCredentials.from_json_keyfile_name(credentials_path, self.scope)
            else:
                logger.warning(f"Google Credentials file not found at {credentials_path}")

        self.client = None
        self.sheet_id = sheet_id or os.environ.get("GOOGLE_SHEET_ID")
        self.sheet = None

        if self.creds:
            try:
                self.client = gspread.authorize(self.creds)
                if self.sheet_id:
                    self.sheet = self.client.open_by_key(self.sheet_id).sheet1
                    logger.info("Successfully connected to Google Sheet")
                else:
                    logger.warning("GOOGLE_SHEET_ID not provided")
            except Exception as e:
                logger.error(f"Failed to connect to Google Sheets: {e}")

    def log_login(self, user_data):
        """
        Logs a login event to the sheet.
        user_data example: {"username": "...", "name": "...", "timestamp": "...", "status": "..."}
        """
        if not self.sheet:
            logger.warning("Google Sheet not configured. Skipping log.")
            return

        try:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            row = [
                timestamp,
                user_data.get("username", "N/A"),
                user_data.get("name", "N/A"),
                user_data.get("status", "Success"),
                user_data.get("ip", "Unknown"),
                user_data.get("institution", "Unknown") # If you have this
            ]
            self.sheet.append_row(row)
            logger.info(f"Logged login for {user_data.get('username')}")
        except Exception as e:
            logger.error(f"Failed to log to Google Sheet: {e}")

    def get_logs(self, limit=50):
        """
        Fetches the last N logs.
        """
        if not self.sheet:
            return []

        try:
            # get_all_records returns a list of dictionaries
            # This assumes the first row is headers
            records = self.sheet.get_all_records()
            # Return last N records (most recent usually at bottom, or we can sort)
            return records[-limit:] 
            # Alternatively, if no headers, use get_all_values()
        except Exception as e:
            logger.error(f"Failed to fetch logs: {e}")
            return []

# Singleton instance to be used by main app
# Provide the hardcoded path from user request for local testing
# In Vercel, this file won't exist, so it will fall back to Env Var if set, or just fail gracefully.
LOCAL_CREDS_PATH = r"c:\Users\aravi\Documents\GitHub\edumate\gen-lang-client-0354311340-378911baa079.json"
LOCAL_SHEET_ID = "1rPpzG5ZOcvhKfb8PCPHmgz2T33nZwWBzXbxW4uiiuAY"

sheets_logger = SheetsLogger(credentials_path=LOCAL_CREDS_PATH, sheet_id=LOCAL_SHEET_ID)
