import os
import requests
import json
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env'))

data = {
    'category': 'civic_issue',
    'subcategory': 'road_damage',
    'description': 'Test pothole via automated testing.',
    'isAnonymous': 'true',
    'location': json.dumps({'lat': 12.9716, 'lng': 77.5946, 'state': 'karnataka', 'district': 'bangalore', 'pincode': '560001', 'address': 'MG Road'}),
    'aiVisionResult': json.dumps({
        'provider': 'gemini',
        'model': 'gemini-3.6-flash',
        'detectedIssue': 'Pothole',
        'category': 'civic_issue',
        'subcategory': 'road_damage',
        'confidence': 0.98,
        'severity': 'high',
        'isRelevant': True,
        'analysis': 'A deep pothole is visible.',
        'reason': 'Clear evidence of road damage.'
    })
}

res = requests.post('http://127.0.0.1:8000/api/complaints', json=data)
print(f"Status: {res.status_code}")
print(f"Response: {res.text}")

if res.status_code == 201:
    res_data = res.json()
    complaint_id = res_data['data']['complaintId']
    print(f"Complaint ID: {complaint_id}")
    
    # Query Firestore
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID', ''),
                "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
                "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                "client_id": os.getenv('FIREBASE_CLIENT_ID', ''),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.getenv('FIREBASE_CLIENT_EMAIL')}"
            })
            firebase_admin.initialize_app(cred)
            
        db = firestore.client()
        
        doc = db.collection('complaints').document(complaint_id).get()
        if doc.exists:
            print("FIRESTORE DOCUMENT FOUND!")
            print(json.dumps(doc.to_dict(), indent=2, default=str))
        else:
            print("FIRESTORE DOCUMENT NOT FOUND!")
    except Exception as e:
        print(f"Failed to query Firestore: {e}")
