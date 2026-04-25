from fastapi import APIRouter
from database import db
from datetime import datetime, timezone
from utils import decrypt_text

router = APIRouter()

@router.get("/rooms")
async def get_active_dm_partners(username: str):
    username = username.lower()
    """Return list of usernames and their last message data that the given user has an active DM conversation with."""
    
    # 1. Get all DM room IDs involving this user
    pipeline = [
        {"$match": {"room": {"$regex": f"^dm:.*{username}.*"}}},
        {"$group": {"_id": "$room"}}
    ]
    rooms_cursor = db.messages.aggregate(pipeline)
    rooms_list = await rooms_cursor.to_list(length=None)

    partners_data = []
    for r in rooms_list:
        room_id = r["_id"]
        
        # Determine the partner's name from room_id (e.g. "dm:alice:bob")
        parts = room_id.replace("dm:", "").split(":")
        other = [p for p in parts if p != username]
        partner_username = other[0] if other else None
        
        # 2. Get user settings for this room (is archived?)
        user_settings = await db.user_settings.find_one({"username": username, "room_id": room_id})
        
        # Fetch partner's settings to get read receipts
        partner_settings = None
        if partner_username:
            partner_settings = await db.user_settings.find_one({"username": partner_username, "room_id": room_id})
        
        # 3. Get the very last message for this room (respecting soft clear)
        msg_query = {"room": room_id}
        if user_settings and user_settings.get("clear_timestamp"):
            ct = user_settings["clear_timestamp"]
            msg_query["timestamp"] = {"$gt": ct.isoformat() if isinstance(ct, datetime) else ct}

        last_msg = await db.messages.find_one(
            msg_query,
            sort=[("timestamp", -1)]
        )
        
        if last_msg:
            last_msg["_id"] = str(last_msg["_id"])
            if "text" in last_msg:
                last_msg["text"] = decrypt_text(last_msg["text"])
            
            if partner_username:
                # 4. Get partner presence (last_seen)
                presence = await db.user_presence.find_one({"username": partner_username.lower()})
                last_seen = presence.get("last_seen") if presence else None

                # Fetch shared room settings (disappearing messages)
                shared_settings = await db.room_settings.find_one({"room_id": room_id})
                disappearing_time = shared_settings.get("disappearing_time", "off") if shared_settings else "off"

                partners_data.append({
                    "username": partner_username,
                    "room_id": room_id,
                    "lastMessage": last_msg,
                    "last_seen": last_seen,
                    "settings": {
                        "is_pinned": user_settings.get("is_pinned", False) if user_settings else False,
                        "is_muted": user_settings.get("is_muted", False) if user_settings else False,
                        "is_archived": user_settings.get("is_archived", False) if user_settings else False,
                        "is_favourite": user_settings.get("is_favourite", False) if user_settings else False,
                        "labels": user_settings.get("labels", []) if user_settings else [],
                        "last_read_timestamp": user_settings.get("last_read_timestamp") if user_settings else None,
                        "partner_last_read_timestamp": partner_settings.get("last_read_timestamp") if partner_settings else None,
                        "disappearing_time": disappearing_time
                    }
                })

    # Sort partners: Pinned first, then by last message timestamp (descending)
    partners_data.sort(key=lambda x: (x["settings"]["is_pinned"], x["lastMessage"].get("timestamp", "")), reverse=True)

    return {"partners": partners_data}

@router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, username: str):
    """Hide a room from the user. Currently just resets settings. 
       True deletion requires message filtering per user."""
    username = username.lower()
    await db.user_settings.delete_one({"username": username, "room_id": room_id})
    return {"success": True}

@router.delete("/internal/cleanup-user/{username}")
async def cleanup_user_data(username: str):
    username = username.lower()
    # 1. Delete groups created by this user
    await db.groups.delete_many({"created_by": username})
    # 2. Remove user from all other groups
    await db.groups.update_many(
        {"members": username},
        {"$pull": {"members": username}}
    )
    # 3. Delete user settings
    await db.user_settings.delete_many({"username": username})
    # 4. Delete presence
    await db.user_presence.delete_many({"username": username})
    
    return {"success": True}

