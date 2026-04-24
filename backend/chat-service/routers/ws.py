from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ws_manager import manager
from database import db
from datetime import datetime, timezone
import json
import httpx
from bson import ObjectId
from utils import encrypt_text, decrypt_text

router = APIRouter()

# URL of the user-service (internal docker network or host)
USER_SERVICE_URL = "http://host.docker.internal:5001"

async def get_user_privacy_info(target_username: str, requester_username: str) -> dict:
    """Fetch privacy and friendship info for a given user from user-service."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{USER_SERVICE_URL}/api/auth/privacy/{target_username.lower()}?requester={requester_username.lower()}")
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"[privacy-check] Failed to fetch info for {target_username}: {e}")
    return {"exists": True, "blockedContacts": [], "acceptRequests": True, "isFriend": False}


@router.websocket("/ws/{username}")
async def websocket_endpoint(websocket: WebSocket, username: str):
    username = username.lower()
    await manager.connect(websocket, username)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            msg_type = message_data.get("type")

            if msg_type == "join_room":
                room_id = message_data.get("room")
                if room_id:
                    manager.join_room(username, room_id)

            elif msg_type == "leave_room":
                room_id = message_data.get("room")
                if room_id:
                    manager.leave_room(username, room_id)

            elif msg_type == "message":
                room = message_data.get("room")
                if not room: continue

                # ── Privacy & Friendship check for DMs ──────────────────
                if room.startswith("dm:"):
                    parts = room.replace("dm:", "").split(":")
                    recipient = next((p for p in parts if p.lower() != username.lower()), None)
                    if recipient:
                        privacy_info = await get_user_privacy_info(recipient, username)
                        blocked_contacts = [u.lower() for u in privacy_info.get("blockedContacts", [])]
                        
                        if not privacy_info.get("exists", True):
                            await manager.send_personal_message({
                                "type": "error",
                                "message": "This user no longer exists.",
                                "code": "USER_NOT_FOUND",
                                "room": room
                            }, username)
                            continue

                        if username.lower() in blocked_contacts:
                            continue  # Sender is blocked — discard silently
                        
                        is_friend = privacy_info.get("isFriend", False)
                        if not is_friend:
                            # Count messages sent by this user to this recipient in this room
                            msg_count = await db.messages.count_documents({
                                "room": room,
                                "username": username
                            })
                            if msg_count >= 3:
                                # Block message and notify sender
                                await manager.send_personal_message({
                                    "type": "error",
                                    "message": "Message limit reached. Send a friend request to continue chatting.",
                                    "code": "LIMIT_REACHED",
                                    "room": room
                                }, username)
                                continue

                new_msg = {
                    "room": room,
                    "username": username,
                    "type": message_data.get("message_type", "text"),
                    "text": message_data["text"],
                    "metadata": message_data.get("metadata", None),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "reactions": [],
                    "reply_to": message_data.get("reply_to", None)
                }
                db_msg = new_msg.copy()
                db_msg["text"] = encrypt_text(db_msg.get("text", ""))
                result = await db.messages.insert_one(db_msg)
                new_msg["_id"] = str(result.inserted_id)
                await manager.broadcast_to_room(room, {"type": "message", "data": new_msg})

                # DM fallback: personal delivery if recipient isn't subscribed to this room
                if room.startswith("dm:"):
                    parts = room.replace("dm:", "").split(":")
                    recipient = next((p for p in parts if p.lower() != username.lower()), None)
                    if recipient:
                        users_in_room = manager.room_subscriptions.get(room, set())
                        if recipient.lower() not in users_in_room:
                            await manager.send_personal_message({"type": "message", "data": new_msg}, recipient)

                # Global notification for groups
                if not room.startswith("dm:") and room != "general-chat":
                    try:
                        group = await db.groups.find_one({"_id": ObjectId(room)})
                        if group and "members" in group:
                            users_in_room = manager.room_subscriptions.get(room, set())
                            for member in group["members"]:
                                # Skip users already in the room subscription to prevent double messages
                                if member.lower() != username.lower() and member.lower() not in users_in_room:
                                    await manager.send_personal_message({"type": "message", "data": new_msg}, member)
                    except Exception as e:
                        print(f"Group message broadcast error: {e}")

            elif msg_type == "edit_message":
                room = message_data.get("room")
                msg_id = message_data.get("message_id")
                new_text = message_data.get("text")
                if not room or not msg_id or not new_text: continue

                target_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                if target_msg and target_msg.get("username") == username:
                    # Check 5 minutes limit
                    msg_time = datetime.fromisoformat(target_msg["timestamp"])
                    time_diff = (datetime.now(timezone.utc) - msg_time).total_seconds()
                    
                    if time_diff <= 300: # 5 minutes
                        encrypted_text = encrypt_text(new_text)
                        await db.messages.update_one(
                            {"_id": ObjectId(msg_id)},
                            {"$set": {"text": encrypted_text, "is_edited": True}}
                        )
                        
                        updated_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                        updated_msg["_id"] = str(updated_msg["_id"])
                        if "text" in updated_msg:
                            updated_msg["text"] = decrypt_text(updated_msg["text"])
                        
                        await manager.broadcast_to_room(room, {"type": "message_update", "data": updated_msg})

            elif msg_type == "reaction":
                room = message_data.get("room")
                if not room: continue
                msg_id = message_data["message_id"]
                emoji = message_data["emoji"]

                # 1. Update original message reactions
                await db.messages.update_one(
                    {"_id": ObjectId(msg_id)},
                    {"$pull": {"reactions": {"username": username}}}
                )
                await db.messages.update_one(
                    {"_id": ObjectId(msg_id)},
                    {"$push": {"reactions": {"username": username, "emoji": emoji}}}
                )

                # 2. Fetch updated message to get context for the summary
                updated_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                if updated_msg:
                    updated_msg["_id"] = str(updated_msg["_id"])
                    if "text" in updated_msg:
                        updated_msg["text"] = decrypt_text(updated_msg["text"])
                    
                    # 3. Create a reaction summary for the sidebar
                    orig_type = updated_msg.get("type", "text")
                    orig_text = updated_msg.get("text", "")
                    
                    target_content = ""
                    if orig_type == 'text':
                        target_content = f'"{orig_text[:20]}{"..." if len(orig_text) > 20 else ""}"'
                    elif orig_type in ['image', 'photo']:
                        target_content = "'🖼️ Photo'"
                    elif orig_type == 'video':
                        target_content = "'🎥 Video'"
                    elif orig_type == 'document':
                        target_content = "'📄 Document'"
                    else:
                        target_content = f"'{orig_type}'"

                    summary_text = f"{username} reacted {emoji} to: {target_content}"
                    
                    summary_msg = {
                        "room": room,
                        "username": username,
                        "type": "reaction_summary",
                        "text": encrypt_text(summary_text),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "reactions": []
                    }
                    
                    # Insert summary so it becomes the 'last_message' in the room list
                    result = await db.messages.insert_one(summary_msg)
                    summary_msg["_id"] = str(result.inserted_id)
                    summary_msg["text"] = summary_text
                    
                    # Broadcast reaction update for the bubble, and summary for the sidebar
                    await manager.broadcast_to_room(room, {"type": "reaction_update", "data": updated_msg})
                    await manager.broadcast_to_room(room, {"type": "message", "data": summary_msg})

            elif msg_type == "delete_message":
                room = message_data.get("room")
                msg_id = message_data.get("message_id")
                if not room or not msg_id: continue
                # We can check if it's the sender or an admin
                target_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                if target_msg and target_msg.get("username") == username:
                    if target_msg.get("is_deleted"):
                        # Stage 2: Hard Delete
                        await db.messages.delete_one({"_id": ObjectId(msg_id)})
                        await manager.broadcast_to_room(room, {"type": "delete_message_permanent", "message_id": msg_id})
                    else:
                        # Stage 1: Soft Delete
                        await db.messages.update_one(
                            {"_id": ObjectId(msg_id)},
                            {"$set": {"is_deleted": True}}
                        )
                        updated_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                        updated_msg["_id"] = str(updated_msg["_id"])
                        if "text" in updated_msg:
                            updated_msg["text"] = decrypt_text(updated_msg["text"])
                        await manager.broadcast_to_room(room, {"type": "message_update", "data": updated_msg})

            elif msg_type == "star_message":
                room = message_data.get("room")
                msg_id = message_data.get("message_id")
                if not room or not msg_id: continue
                target_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                if target_msg:
                    stars = target_msg.get("stars", [])
                    if username in stars:
                        await db.messages.update_one({"_id": ObjectId(msg_id)}, {"$pull": {"stars": username}})
                    else:
                        await db.messages.update_one({"_id": ObjectId(msg_id)}, {"$push": {"stars": username}})
                    
                    updated_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                    updated_msg["_id"] = str(updated_msg["_id"])
                    if "text" in updated_msg:
                        updated_msg["text"] = decrypt_text(updated_msg["text"])
                    await manager.broadcast_to_room(room, {"type": "message_update", "data": updated_msg})

            elif msg_type == "pin_message":
                room = message_data.get("room")
                msg_id = message_data.get("message_id")
                if not room or not msg_id: continue
                target_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                if target_msg:
                    new_val = not target_msg.get("is_pinned", False)
                    await db.messages.update_one({"_id": ObjectId(msg_id)}, {"$set": {"is_pinned": new_val}})
                    
                    updated_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                    updated_msg["_id"] = str(updated_msg["_id"])
                    if "text" in updated_msg:
                        updated_msg["text"] = decrypt_text(updated_msg["text"])
                    await manager.broadcast_to_room(room, {"type": "message_update", "data": updated_msg})

            elif msg_type == "poll_vote":
                room = message_data.get("room")
                if not room: continue
                msg_id = message_data["message_id"]
                option_idx = message_data["option_index"]
                
                await db.messages.update_one(
                    {"_id": ObjectId(msg_id)},
                    {"$pull": {f"metadata.options.$[].votes": username}}
                )
                await db.messages.update_one(
                    {"_id": ObjectId(msg_id)},
                    {"$push": {f"metadata.options.{option_idx}.votes": username}}
                )
                
                updated_msg = await db.messages.find_one({"_id": ObjectId(msg_id)})
                updated_msg["_id"] = str(updated_msg["_id"])
                if "text" in updated_msg:
                    updated_msg["text"] = decrypt_text(updated_msg["text"])
                await manager.broadcast_to_room(room, {"type": "poll_update", "data": updated_msg})

            elif msg_type == "call_log":
                room = message_data.get("room")
                if not room: continue
                new_msg = {
                    "room": room,
                    "username": username,
                    "type": "call_log",
                    "text": message_data.get("text", "Call"),
                    "metadata": message_data.get("metadata", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "reactions": []
                }
                db_msg = new_msg.copy()
                db_msg["text"] = encrypt_text(db_msg.get("text", ""))
                result = await db.messages.insert_one(db_msg)
                new_msg["_id"] = str(result.inserted_id)
                await manager.broadcast_to_room(room, {"type": "call_log", "data": new_msg})
                
                # Global notification for DMs and Groups
                if room != "general-chat":
                    try:
                        # Extract recipients
                        recipients = []
                        if room.startswith("dm:"):
                            parts = room.replace("dm:", "").split(":")
                            for p in parts:
                                if p.lower() != username.lower():
                                    recipients.append(p)
                        else:
                            group = await db.groups.find_one({"_id": ObjectId(room)})
                            if group and "members" in group:
                                recipients = [m for m in group["members"] if m.lower() != username.lower()]
                        
                        users_in_room = manager.room_subscriptions.get(room, set())
                        for member in recipients:
                            if member.lower() not in users_in_room:
                                await manager.send_personal_message({"type": "call_log", "data": new_msg}, member)
                    except Exception as e:
                        print(f"Call_log broadast error: {e}")

            elif msg_type in ["typing", "stop_typing"]:
                room = message_data.get("room")
                if room:
                    await manager.broadcast_to_room(room, {
                        "type": msg_type,
                        "room": room,
                        "username": username
                    })

            elif msg_type in ["call_request", "call_response", "webrtc_signal", "call_hangup", "call_handled"]:
                target_user = message_data.get("target")
                if target_user:
                    # ── Block check for calls ────────────────────────────
                    if msg_type == "call_request":
                        privacy_info = await get_user_privacy_info(target_user, username)
                        if not privacy_info.get("exists", True):
                            await manager.send_personal_message({
                                "type": "call_hangup",
                                "room": message_data.get("room"),
                                "reason": "user_not_found",
                                "message": "This user no longer exists."
                            }, username)
                            continue

                        blocked_contacts = [u.lower() for u in privacy_info.get("blockedContacts", [])]
                        if username.lower() in blocked_contacts:
                            # Silently reject — tell caller it was unavailable
                            await manager.send_personal_message({
                                "type": "call_hangup",
                                "from": target_user,
                                "call_id": message_data.get("call_id"),
                                "reason": "unavailable"
                            }, username)
                            print(f"[block] call_request from {username} to {target_user} blocked")
                            continue
                        
                        is_friend = privacy_info.get("isFriend", False)
                        if not is_friend:
                             # For now, let's also block calls from non-friends if we want to be strict
                             # Based on "only then each other can send messages, see status", calls are usually considered messages too
                             await manager.send_personal_message({
                                "type": "call_hangup",
                                "from": target_user,
                                "call_id": message_data.get("call_id"),
                                "reason": "declined"
                            }, username)
                             print(f"[friend-check] call from {username} to {target_user} blocked (not friends)")
                             continue

                    print(f"SIGNAL [{msg_type}]: {username} -> {target_user}")
                    if msg_type == "webrtc_signal":
                        sig_type = message_data.get("signal", {}).get("type", "unknown")
                        print(f"  - WebRTC Detail: {sig_type}")
                    
                    message_data["from"] = username
                    await manager.send_personal_message(message_data, target_user)
                else:
                    print(f"SIGNAL ERROR: No target for {msg_type} from {username}")


    except WebSocketDisconnect:
        await manager.disconnect(websocket, username)
