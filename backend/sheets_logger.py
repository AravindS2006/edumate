import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
import datetime
import json
import logging

# Configure basic logging
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
        
        self.creds = None
        
        # Debug: Check environment variables availability
        has_env_creds = bool(os.environ.get("GOOGLE_CREDENTIALS"))
        has_gcp_email = bool(os.environ.get("GCP_SERVICE_ACCOUNT_EMAIL"))
        has_gcp_key = bool(os.environ.get("GCP_PRIVATE_KEY"))
        logger.info(f"SheetsLogger Init: Env credentials present? JSON={has_env_creds}, GCP_EMAIL={has_gcp_email}, GCP_KEY={has_gcp_key}")

        # 1. Try Credentials JSON Content from Env Var (Vercel)
        google_creds_json = os.environ.get("GOOGLE_CREDENTIALS")
        if google_creds_json:
            try:
                creds_dict = json.loads(google_creds_json)
                self.creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, self.scope)
            except Exception as e:
                logger.error(f"Failed to load credentials from GOOGLE_CREDENTIALS env var: {e}")

        # 2. Try Vercel GCP Integration Variables
        if not self.creds:
            gcp_email = os.environ.get("GCP_SERVICE_ACCOUNT_EMAIL")
            gcp_key = os.environ.get("GCP_PRIVATE_KEY")
            
            if gcp_email and gcp_key:
                try:
                    # Handle newlines in private key if they are escaped
                    if "\\n" in gcp_key:
                        gcp_key = gcp_key.replace("\\n", "\n")
                        
                    creds_dict = {
                        "type": "service_account",
                        "client_email": gcp_email,
                        "private_key": gcp_key,
                        "private_key_id": os.environ.get("GCP_PRIVATE_KEY_ID", "dummy_key_id"),
                        "project_id": os.environ.get("GCP_PROJECT_ID", ""),
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                    self.creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, self.scope)
                    logger.info("Loaded credentials from Vercel GCP Integration variables")
                except Exception as e:
                    logger.error(f"Failed to create credentials from GCP variables: {e}")

        # 3. Try Credentials File Path (Local)
        if not self.creds:
            logger.info("No environment credentials found, checking local files...")
            possible_paths = [
                credentials_path,
                "credentials.json",
                "gen-lang-client-0354311340-378911baa079.json",
                os.path.join(os.path.dirname(__file__), "credentials.json"),
                os.path.join(os.path.dirname(__file__), "..", "credentials.json"),
                os.path.join(os.path.dirname(__file__), "..", "gen-lang-client-0354311340-378911baa079.json")
            ]
            
            for path in possible_paths:
                if path and os.path.exists(path):
                    try:
                        self.creds = ServiceAccountCredentials.from_json_keyfile_name(path, self.scope)
                        logger.info(f"Loaded credentials from {path}")
                        break
                    except Exception as e:
                        logger.error(f"Error loading credentials from {path}: {e}")

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
        else:
            logger.warning("SheetsLogger: No credentials could be loaded from any source.")

    def log_login(self, user_data):
        if not self.sheet:
            state = f"Creds={bool(self.creds)}, Client={bool(self.client)}, SheetID={self.sheet_id}, SheetObj={bool(self.sheet)}"
            logger.warning(f"Google Sheet not configured. Skipping log. State: {state}")
            return

        try:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            row = [
                timestamp,
                user_data.get("username", "N/A"),
                user_data.get("name", "N/A"),
                user_data.get("status", "Success"),
                user_data.get("ip", "Unknown"),
                user_data.get("institution", "Unknown")
            ]
            self.sheet.append_row(row)
            logger.info(f"Logged login for {user_data.get('username')}")
        except Exception as e:
            logger.error(f"Failed to log to Google Sheet: {e}")

    def get_logs(self, limit=50):
        if not self.sheet:
            return []
        try:
            records = self.sheet.get_all_records()
            return records[-limit:]
        except Exception as e:
            logger.error(f"Failed to fetch logs: {e}")
            return []

# Singleton instance
DEFAULT_SHEET_ID = "1rPpzG5ZOcvhKfb8PCPHmgz2T33nZwWBzXbxW4uiiuAY"
sheets_logger = SheetsLogger(sheet_id=DEFAULT_SHEET_ID)
