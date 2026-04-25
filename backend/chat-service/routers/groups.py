from fastapi import APIRouter, HTTPException
from typing import List
from models import Group, GroupCreate, GroupUpdate
from bson import ObjectId
from database import db
from datetime import datetime, timezone

from utils import decrypt_text

router = APIRouter()

@router.post("/groups", response_model=Group)
async def create_group(group: GroupCreate):
    group_dict = group.dict()
    if group.created_by not in group_dict["members"]:
        group_dict["members"].append(group.created_by)
    group_dict["created_at"] = datetime.now(timezone.utc)
    result = await db.groups.insert_one(group_dict)
    group_dict["_id"] = str(result.inserted_id)
    return group_dict

@router.get("/groups/{username}", response_model=List[Group])
async def get_user_groups(username: str):
    cursor = db.groups.find({"members": username})
    groups = await cursor.to_list(length=100)
    for g in groups:
        g_id = str(g["_id"])
        g["_id"] = g_id
        
        # Stitch User Settings for Archive/Pin/Mute
        settings = await db.user_settings.find_one({"username": username.lower(), "room_id": g_id})
        if settings:
            settings["_id"] = str(settings["_id"])
            g["settings"] = settings
            
        # Stitch Last Message for Unread states & Previews (respecting soft clear)
        msg_query = {"room": g_id}
        if settings and settings.get("clear_timestamp"):
            ct = settings["clear_timestamp"]
            msg_query["timestamp"] = {"$gt": ct.isoformat() if isinstance(ct, datetime) else ct}

        cursor_msg = db.messages.find(msg_query).sort("timestamp", -1).limit(1)
        last_msgs = await cursor_msg.to_list(length=1)
        if last_msgs:
            last_msg = last_msgs[0]
            last_msg["_id"] = str(last_msg["_id"])
            if "text" in last_msg:
                last_msg["text"] = decrypt_text(last_msg["text"])
            g["lastMessage"] = last_msg

    return groups

@router.put("/groups/{group_id}", response_model=Group)
async def update_group(group_id: str, group_update: GroupUpdate, requester: str):
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group["created_by"] != requester:
        raise HTTPException(status_code=403, detail="Only the creator can update the group")
    
    update_data = {k: v for k, v in group_update.dict().items() if v is not None}
    if not update_data:
        group["_id"] = str(group["_id"])
        return group
        
    await db.groups.update_one({"_id": ObjectId(group_id)}, {"$set": update_data})
    updated_group = await db.groups.find_one({"_id": ObjectId(group_id)})
    updated_group["_id"] = str(updated_group["_id"])
    return updated_group

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, requester: str):
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if group["created_by"] != requester:
        raise HTTPException(status_code=403, detail="Only the creator can delete the group")
        
    await db.groups.delete_one({"_id": ObjectId(group_id)})
    return {"message": "Group deleted successfully"}

@router.post("/groups/{group_id}/leave")
async def leave_group(group_id: str, username: str):
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    if username not in group["members"]:
        raise HTTPException(status_code=400, detail="User is not a member of this group")
    
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$pull": {"members": username}}
    )
    
    # If creator left, reassign or delete
    updated_group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if updated_group:
        if updated_group["created_by"] == username:
            if updated_group["members"]:
                await db.groups.update_one(
                    {"_id": ObjectId(group_id)},
                    {"$set": {"created_by": updated_group["members"][0]}}
                )
            else:
                await db.groups.delete_one({"_id": ObjectId(group_id)})
                return {"message": "Group deleted as last member left"}
    
    return {"message": "Left group successfully"}
