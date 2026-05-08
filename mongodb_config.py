from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables if .env exists
load_dotenv(override=True)

def get_mongodb_client():
    """Initializes and returns a MongoDB client."""
    # The MONGO_URI should be in the format: 
    # mongodb+srv://<username>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority
    mongo_uri = os.environ.get('MONGO_URI')
    
    if not mongo_uri:
        print("WARNING: 'MONGO_URI' environment variable is missing.")
        return None
        
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # Test connection
        client.admin.command('ping')
        print("MongoDB connected successfully!")
        return client
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

# Initialize client and database
client = get_mongodb_client()
db = client.get_database('bihar_outreach') if client else None
