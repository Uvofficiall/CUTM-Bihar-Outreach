import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os
import json

def initialize_firebase():
    """Initializes Firebase Admin SDK and returns the Firestore client."""
    if not firebase_admin._apps:
        try:
            # First try loading from environment variable (for Vercel/Production)
            firebase_creds = os.environ.get('FIREBASE_KEY')
            
            if firebase_creds:
                cred_dict = json.loads(firebase_creds)
                cred = credentials.Certificate(cred_dict)
                print("Firebase initialized successfully using environment variables.")
            else:
                # Fallback to local json file (for local development)
                cred_path = os.path.join(os.path.dirname(__file__), 'firebase-key.json')
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    print("Firebase initialized successfully using firebase-key.json.")
                else:
                    print("WARNING: 'firebase-key.json' not found and FIREBASE_CREDENTIALS env var is missing.")
                    return None
                    
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            return None
            
    return True

# Initialize Firebase only (no Firestore client exported here)
firebase_initialized = initialize_firebase()
