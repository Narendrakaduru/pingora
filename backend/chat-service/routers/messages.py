from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from database import db
from datetime import datetime, timezone
import os, shutil, json
from bson import ObjectId
from ws_manager import manager
from utils import encrypt_text, decrypt_text, encrypt_data, decrypt_data
from fastapi.responses import Response, StreamingResponse
import io


router = APIRouter()
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Normalise incoming file_type values to canonical category folder names
# mirroring user-service: uploads/{user_id}/{category}/{filename}
CATEGORY_MAP = {
    "image": "photo",   # chat 'image' -> 'photo' (same as user-service profile photos)
}

@router.get("/messages", response_model=List[dict])
async def get_messages(room: str = "general-chat"):
    # 1. Fetch newest 100 messages
    latest_messages = await db.messages.find({"room": room}).sort("timestamp", -1).to_list(100)
    
    # 2. Fetch ALL pinned messages in this room (to ensure they are available for the pinned messages bar)
    pinned_messages = await db.messages.find({"room": room, "is_pinned": True}).to_list(50)
    
    # 3. Merge and deduplicate
    unique_messages = {str(m["_id"]): m for m in (latest_messages + pinned_messages)}
    merged = list(unique_messages.values())
    
    # Sort by timestamp ASC for the UI
    merged.sort(key=lambda x: x.get("timestamp", ""))

    for msg in merged:
        msg["_id"] = str(msg["_id"])
        if "text" in msg:
            msg["text"] = decrypt_text(msg.get("text", ""))
            
    return merged

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    room: str = Form(...),
    username: str = Form(...),
    user_id: str = Form(...),
    file_type: str = Form("document")
):
    # Resolve category (normalise 'image' -> 'photo', etc.)
    category = CATEGORY_MAP.get(file_type, file_type)

    # Directory structure: uploads/{user_id}/{category}/
    target_dir = os.path.join(UPLOAD_DIR, user_id, category)
    os.makedirs(target_dir, exist_ok=True)

    # Filename pattern: {user_id}-{timestamp_ms}{ext}  — mirrors user-service
    ext = os.path.splitext(file.filename)[1]
    timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    unique_name = f"{user_id}-{timestamp_ms}{ext}"
    file_path = os.path.join(target_dir, unique_name)

    # Read file content and encrypt it
    content = await file.read()
    encrypted_content = encrypt_data(content)

    with open(file_path, "wb") as f:
        f.write(encrypted_content)


    file_url = f"/uploads/{user_id}/{category}/{unique_name}"

    new_msg = {
        "room": room,
        "username": username,
        "text": f"Sent a {file_type}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": file_type,
        "metadata": {
            "file_url": file_url,
            "file_name": file.filename,
            "file_size": os.path.getsize(file_path),
            "content_type": file.content_type
        },
        "reactions": []
    }
    db_msg = new_msg.copy()
    db_msg["text"] = encrypt_text(db_msg["text"])
    result = await db.messages.insert_one(db_msg)
    new_msg["_id"] = str(result.inserted_id)
    await manager.broadcast_to_room(room, {"type": "message", "data": new_msg})
    return new_msg

@router.post("/poll")
async def create_poll(
    room: str = Form(...),
    username: str = Form(...),
    question: str = Form(...),
    options: str = Form(...)
):
    """Create a poll message."""
    option_list = json.loads(options)
    poll_options = [{"text": opt, "votes": []} for opt in option_list]
    
    new_msg = {
        "room": room,
        "username": username,
        "text": f"📊 Poll: {question}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "poll",
        "metadata": {
            "question": question,
            "options": poll_options
        },
        "reactions": []
    }
    db_msg = new_msg.copy()
    db_msg["text"] = encrypt_text(db_msg["text"])
    result = await db.messages.insert_one(db_msg)
    new_msg["_id"] = str(result.inserted_id)
    await manager.broadcast_to_room(room, {"type": "message", "data": new_msg})
    return new_msg

@router.delete("/messages/room/{room_id}")
async def clear_room_messages(room_id: str):
    """Delete all messages in a specific room."""
    await db.messages.delete_many({"room": room_id})
    # Broadcast clear event if needed
    await manager.broadcast_to_room(room_id, {"type": "clear_chat", "room": room_id})
    return {"success": True}

@router.get("/uploads/{user_id}/{category}/{filename}")
async def serve_file(user_id: str, category: str, filename: str):
    """Serve and decrypt files on the fly."""
    file_path = os.path.join(UPLOAD_DIR, user_id, category, filename)
    if not os.path.exists(file_path):
        return Response(status_code=404)
    
    with open(file_path, "rb") as f:
        encrypted_content = f.read()
    
    decrypted_content = decrypt_data(encrypted_content)
    
    # Guess mime type
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    return Response(content=decrypted_content, media_type=mime_type)

import mimetypes

