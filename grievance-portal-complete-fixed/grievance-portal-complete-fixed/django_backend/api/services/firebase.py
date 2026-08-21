import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_firestore_db():
    global _db
    if _db is not None:
        return _db
    
    # Try initializing app if not already initialized
    try:
        if not firebase_admin._apps:
            project_id = os.getenv('FIREBASE_PROJECT_ID')
            private_key = os.getenv('FIREBASE_PRIVATE_KEY', '')
            client_email = os.getenv('FIREBASE_CLIENT_EMAIL')

            if project_id and private_key and client_email:
                # Handle escaped newlines in private key
                private_key = private_key.replace('\\n', '\n')
                
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID', ''),
                    "private_key": private_key,
                    "client_email": client_email,
                    "client_id": os.getenv('FIREBASE_CLIENT_ID', ''),
                    "auth_uri": os.getenv('FIREBASE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
                    "token_uri": os.getenv('FIREBASE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email}"
                })
                firebase_admin.initialize_app(cred)
                print("✅ [FirebaseService] Firebase Admin SDK initialized successfully via ENV")
            else:
                # Fallback to key file if exists
                key_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'firebase-key.json')
                if os.path.exists(key_path):
                    cred = credentials.Certificate(key_path)
                    firebase_admin.initialize_app(cred)
                    print("✅ [FirebaseService] Firebase Admin SDK initialized successfully via JSON")
                else:
                    raise Exception("Missing FIREBASE env vars or firebase-key.json")
                    
        _db = firestore.client()
        return _db
    except Exception as e:
        print(f"❌ [FirebaseService] Failed to initialize Firebase: {e}")
        return None
