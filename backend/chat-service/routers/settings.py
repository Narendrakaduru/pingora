from fastapi import APIRouter, HTTPException
from database import db
from models import UserRoomSettings
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/settings")

async def get_or_create_settings(username: str, room_id: str):
    settings = await db.user_settings.find_one({"username": username.lower(), "room_id": room_id})
    if not settings:
        new_settings = {
            "username": username.lower(),
            "room_id": room_id,
            "is_pinned": False,
            "is_muted": False,
            "is_archived": False,
            "is_favourite": False,
            "labels": [],
            "last_read_timestamp": datetime.now(timezone.utc)
        }
        await db.user_settings.insert_one(new_settings)
        return new_settings
    return settings

@router.post("/pin")
async def toggle_pin(username: str, room_id: str, pin: bool):
    await get_or_create_settings(username, room_id)
    await db.user_settings.update_one(
        {"username": username.lower(), "room_id": room_id},
        {"$set": {"is_pinned": pin}}
    )
    return {"success": True}

@router.post("/mute")
async def toggle_mute(username: str, room_id: str, mute: bool):
    await get_or_create_settings(username, room_id)
    await db.user_settings.update_one(
        {"username": username.lower(), "room_id": room_id},
        {"$set": {"is_muted": mute}}
    )
    return {"success": True}

@router.post("/archive")
async def toggle_archive(username: str, room_id: str, archive: bool):
    await get_or_create_settings(username, room_id)
    await db.user_settings.update_one(
        {"username": username.lower(), "room_id": room_id},
        {"$set": {"is_archived": archive}}
    )
    return {"success": True}

@router.post("/favourite")
async def toggle_favourite(username: str, room_id: str, favourite: bool):
    await get_or_create_settings(username, room_id)
    await db.user_settings.update_one(
        {"username": username.lower(), "room_id": room_id},
        {"$set": {"is_favourite": favourite}}
    )
    return {"success": True}

@router.post("/label")
async def update_labels(username: str, room_id: str, label: str, action: str):
    await get_or_create_settings(username, room_id)
    if action == "add":
        # Single choice: replace all labels with this one
        await db.user_settings.update_one(
            {"username": username.lower(), "room_id": room_id},
            {"$set": {"labels": [label]}}
        )
    elif action == "clear":
        await db.user_settings.update_one(
            {"username": username.lower(), "room_id": room_id},
            {"$set": {"labels": []}}
        )
    else:
        await db.user_settings.update_one(
            {"username": username.lower(), "room_id": room_id},
            {"$pull": {"labels": label}}
        )
    return {"success": True}

@router.post("/read")
async def mark_as_read(username: str, room_id: str):
    from ws_manager import manager
    
    await get_or_create_settings(username, room_id)
    now_utc = datetime.now(timezone.utc)
    await db.user_settings.update_one(
        {"username": username.lower(), "room_id": room_id},
        {"$set": {"last_read_timestamp": now_utc}}
    )
    
    # Broadcast read receipt to the room
    await manager.broadcast_to_room(
        room_id, 
        {
            "type": "read_receipt",
            "room": room_id,
            "username": username.lower(),
            "timestamp": now_utc.isoformat()
        }
    )
    
    return {"success": True}

@router.get("/partner/{partner_username}")
async def get_partner_settings(partner_username: str, room_id: str):
    partner_settings = await db.user_settings.find_one({"username": partner_username.lower(), "room_id": room_id})
    return {"last_read_timestamp": partner_settings.get("last_read_timestamp") if partner_settings else None}

@router.get("/room/{room_id}")
async def get_room_settings_shared(room_id: str):
    settings = await db.room_settings.find_one({"room_id": room_id})
    if not settings:
        return {"disappearing_time": "off"}
    return {"disappearing_time": settings.get("disappearing_time", "off")}

@router.post("/room/disappearing")
async def update_room_disappearing(username: str, room_id: str, disappearing_time: str):
    from ws_manager import manager
    
    # Update or create room settings
    await db.room_settings.update_one(
        {"room_id": room_id},
        {
            "$set": {
                "disappearing_time": disappearing_time,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": username.lower()
            }
        },
        upsert=True
    )
    
    # Broadcast to room so other partner updates immediately
    await manager.broadcast_to_room(
        room_id,
        {
            "type": "room_settings_update",
            "room": room_id,
            "settings": {"disappearing_time": disappearing_time},
            "updated_by": username.lower()
        }
    )

    # Send system message
    is_off = disappearing_time == 'off'
    msg_text = f"Disappearing messages turned {'off' if is_off else 'on'}. Messages disappear after {disappearing_time}."
    
    from utils import encrypt_text
    sys_msg = {
        "room": room_id,
        "username": "system",
        "type": "system",
        "text": msg_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reactions": [],
        "metadata": None
    }
    db_msg = sys_msg.copy()
    db_msg["text"] = encrypt_text(db_msg["text"])
    res = await db.messages.insert_one(db_msg)
    sys_msg["_id"] = str(res.inserted_id)
    
    await manager.broadcast_to_room(room_id, {"type": "message", "data": sys_msg})
    
    return {"success": True}
