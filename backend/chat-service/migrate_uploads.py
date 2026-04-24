import os
import shutil
from pymongo import MongoClient
import re

MONGO_URL = "mongodb://localhost:27027/"
DB_NAME = "chat_db"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
messages_col = db.messages

# Path relative to python script running on host
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')

def migrate():
    print(f"Starting migration. Uploads dir: {UPLOAD_DIR}")
    
    # We want to find messages with a file_url
    # file_url is stored in metadata.file_url
    query = {"metadata.file_url": {"$exists": True, "$ne": None}}
    messages = list(messages_col.find(query))
    
    migrated_count = 0
    missing_count = 0
    
    for msg in messages:
        file_url = msg.get("metadata", {}).get("file_url")
        if not file_url:
            continue
            
        print(f"Found file_url: {file_url}")
        
        # Determine the user_id from the URL or the DB
        # Previous format: /uploads/{user_id}/{file_type}/{uuid}.ext
        # But wait! What if it was just /uploads/{uuid}.ext ? 
        # Let's extract the actual filename part
        
        parts = file_url.strip('/').split('/')
        # parts could be ['uploads', user_id, file_type, filename] or ['uploads', filename]
        
        # We need the user_id. Is it in the DB?
        # db record might have username, but not user_id. 
        # The frontend passed user_id in the form but it might not be in the message document!
        # Let's see what's in the document.
        print("Msg keys:", msg.keys())
        print("Msg metadata:", msg.get("metadata"))
        break

if __name__ == "__main__":
    migrate()
