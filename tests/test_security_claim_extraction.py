import sys
from pathlib import Path
import unittest

import jwt


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(REPO_ROOT / "backend"))

from security import extract_user_id_from_token  # noqa: E402


class TestSecurityClaimExtraction(unittest.TestCase):
    def test_extract_user_id_prefers_studtblid_over_sub(self):
        mock_studtbl_id = "mock_student_id_for_test"
        token = jwt.encode(
            {"sub": "firebase_uid_123", "studtblId": mock_studtbl_id},
            "test-secret",
            algorithm="HS256",
        )
        self.assertEqual(extract_user_id_from_token(token), mock_studtbl_id)

    def test_extract_user_id_falls_back_to_sub_when_needed(self):
        token = jwt.encode(
            {"sub": "firebase_uid_123"},
            "test-secret",
            algorithm="HS256",
        )
        self.assertEqual(extract_user_id_from_token(token), "firebase_uid_123")


if __name__ == "__main__":
    unittest.main()
