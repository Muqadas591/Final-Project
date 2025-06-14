import os
import json
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

def test_google_drive_api():
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
    google_service_account_key = os.environ.get('GOOGLE_SERVICE_ACCOUNT_KEY')
    default_credential_path = '../calmiayoutube-0446c67672c9.json'

    creds = None
    if google_service_account_key:
        if os.path.exists(google_service_account_key):
            creds = Credentials.from_service_account_file(
                google_service_account_key,
                scopes=SCOPES
            )
        else:
            try:
                creds_info = json.loads(google_service_account_key)
                creds = Credentials.from_service_account_info(
                    creds_info,
                    scopes=SCOPES
                )
            except json.JSONDecodeError:
                print("Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY environment variable")
                return

    if creds is None:
        if os.path.exists(default_credential_path):
            creds = Credentials.from_service_account_file(
                default_credential_path,
                scopes=SCOPES
            )
        else:
            print(f"Google service account credentials not found at default path: {default_credential_path}")
            return

    try:
        drive_service = build('drive', 'v3', credentials=creds)
        # List first 5 files to test connectivity
        results = drive_service.files().list(pageSize=5, fields="files(id, name)").execute()
        items = results.get('files', [])
        if not items:
            print('No files found.')
        else:
            print('Files:')
            for item in items:
                print(f"{item['name']} ({item['id']})")
    except Exception as e:
        print(f"Error accessing Google Drive API: {e}")

if __name__ == "__main__":
    test_google_drive_api()
