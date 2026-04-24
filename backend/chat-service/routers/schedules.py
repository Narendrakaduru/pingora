from fastapi import APIRouter, HTTPException
from typing import List
from models import Schedule, ScheduleCreate
from database import db
from datetime import datetime, timezone
from bson import ObjectId
from ws_manager import manager

router = APIRouter()

@router.get("/schedules", response_model=List[dict])
async def get_schedules(username: str = None):
    if not username:
        # Fallback to returning nothing or specific public events if no username is provided
        # For security, we'll return an empty list if no user context
        return []

    username = username.lower()
    
    # 1. Get all group IDs where the user is a member
    user_groups = await db.groups.find({"members": username}).to_list(length=None)
    group_ids = [str(g["_id"]) for g in user_groups]
    
    # 2. Build the query
    query = {
        "$or": [
            {"created_by": username},
            {"participants": username},
            {"room_id": "general-chat"},
            {"room_id": {"$in": group_ids}},
            {"room_id": {"$regex": f"^dm:.*{username}.*"}}
        ]
    }
    
    schedules = await db.schedules.find(query).to_list(100)
    for sched in schedules:
        sched["_id"] = str(sched["_id"])
    return schedules

@router.post("/schedules")
async def create_schedule(schedule: ScheduleCreate):
    sched_dict = schedule.model_dump() if hasattr(schedule, "model_dump") else schedule.dict()
    sched_dict["is_notified"] = False
    sched_dict["is_notified_5m"] = False
    result = await db.schedules.insert_one(sched_dict)
    
    new_msg = {
        "room": sched_dict["room_id"],
        "username": sched_dict["created_by"],
        "text": f"📅 Meeting Scheduled: {sched_dict['title']}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "meeting_card",
        "metadata": {
            "meeting_title": sched_dict["title"],
            "meeting_id": str(result.inserted_id),
            "start_time": sched_dict["start_time"].isoformat(),
            "end_time": sched_dict["end_time"].isoformat()
        },
        "reactions": []
    }
    msg_result = await db.messages.insert_one(new_msg)
    new_msg["_id"] = str(msg_result.inserted_id)
    await manager.broadcast_to_room(sched_dict["room_id"], {"type": "message", "data": new_msg})

    sched_dict["_id"] = str(result.inserted_id)
    return sched_dict

@router.put("/schedules/{schedule_id}", response_model=Schedule)
async def update_schedule(schedule_id: str, schedule: ScheduleCreate):
    sched_dict = schedule.model_dump() if hasattr(schedule, "model_dump") else schedule.dict()
    sched_dict["is_notified"] = False
    sched_dict["is_notified_5m"] = False
    
    existing = await db.schedules.find_one({"_id": ObjectId(schedule_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    await db.schedules.update_one(
        {"_id": ObjectId(schedule_id)},
        {"$set": sched_dict}
    )
    
    new_msg = {
        "room": sched_dict["room_id"],
        "username": sched_dict["created_by"],
        "text": f"🔄 Meeting Updated: {sched_dict['title']}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "meeting_card",
        "metadata": {
            "meeting_title": sched_dict["title"],
            "meeting_id": schedule_id,
            "start_time": sched_dict["start_time"].isoformat(),
            "end_time": sched_dict["end_time"].isoformat()
        },
        "reactions": []
    }
    msg_result = await db.messages.insert_one(new_msg)
    new_msg["_id"] = str(msg_result.inserted_id)
    await manager.broadcast_to_room(sched_dict["room_id"], {"type": "message", "data": new_msg})

    sched_dict["_id"] = schedule_id
    return sched_dict
