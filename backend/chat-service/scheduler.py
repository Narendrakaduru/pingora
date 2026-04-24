from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone, timedelta
from database import db
from ws_manager import manager

scheduler = AsyncIOScheduler()

async def check_schedules():
    now = datetime.now(timezone.utc)
    # Find schedules that are due and not notified
    cursor = db.schedules.find({"start_time": {"$lte": now}, "is_notified": False})
    due_schedules = await cursor.to_list(length=None)
    
    if due_schedules:
        for sched in due_schedules:
            new_msg = {
                "room": sched["room_id"],
                "username": sched["created_by"],
                "text": f"📅 Meeting Starting: {sched['title']} is starting now!",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "meeting_card",
                "metadata": {
                    "meeting_title": sched["title"],
                    "meeting_id": str(sched["_id"]),
                    "start_time": sched["start_time"].isoformat(),
                    "end_time": sched["end_time"].isoformat()
                },
                "reactions": []
            }
            result = await db.messages.insert_one(new_msg)
            new_msg["_id"] = str(result.inserted_id)
            
            # Broadcast
            await manager.broadcast_to_room(sched["room_id"], {"type": "message", "data": new_msg})
            
            # Mark as notified
            await db.schedules.update_one({"_id": sched["_id"]}, {"$set": {"is_notified": True}})

    # Check for 5-minute notifications
    five_mins_from_now = now + timedelta(minutes=5)
    # Find schedules starting within 5 mins, that are still in the future, and not notified for 5m yet
    cursor_5m = db.schedules.find({
        "start_time": {"$lte": five_mins_from_now, "$gt": now}, 
        "is_notified_5m": {"$ne": True}
    })
    due_schedules_5m = await cursor_5m.to_list(length=100)
    
    if due_schedules_5m:
        for sched in due_schedules_5m:
            new_msg = {
                "room": sched["room_id"],
                "username": sched["created_by"],
                "text": f"⏰ Meeting Reminder: {sched['title']} is starting in 5 minutes!",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "meeting_card",
                "metadata": {
                    "meeting_title": sched["title"],
                    "meeting_id": str(sched["_id"]),
                    "start_time": sched["start_time"].isoformat(),
                    "end_time": sched["end_time"].isoformat()
                },
                "reactions": []
            }
            result = await db.messages.insert_one(new_msg)
            new_msg["_id"] = str(result.inserted_id)
            await manager.broadcast_to_room(sched["room_id"], {"type": "message", "data": new_msg})
            # Mark as 5m notified
            await db.schedules.update_one({"_id": sched["_id"]}, {"$set": {"is_notified_5m": True}})

async def cleanup_disappearing_messages():
    """Delete messages that have expired according to room settings."""
    now = datetime.now(timezone.utc)
    
    # Get all rooms with disappearing messages enabled
    cursor = db.room_settings.find({"disappearing_time": {"$ne": "off"}})
    rooms = await cursor.to_list(length=None)
    
    for room in rooms:
        room_id = room["room_id"]
        d_time = room["disappearing_time"]
        
        # Parse duration
        delta = None
        if d_time == "24h": delta = timedelta(hours=24)
        elif d_time == "7d": delta = timedelta(days=7)
        elif d_time == "90d": delta = timedelta(days=90)
        
        if delta:
            threshold = now - delta
            # Delete messages in this room older than threshold
            # MongoDB stores ISO strings for timestamps in many places, but let's check.
            # Convert threshold to ISO format just in case, or use datetime objects if stored as such.
            threshold_iso = threshold.isoformat()
            
            result = await db.messages.delete_many({
                "room": room_id,
                "timestamp": {"$lt": threshold_iso}
            })
            
            if result.deleted_count > 0:
                print(f"CLEANUP: Deleted {result.deleted_count} expired messages from room {room_id}")
                # Optional: broadcast a "clear_chat" or "messages_deleted" event
                await manager.broadcast_to_room(room_id, {
                    "type": "messages_pruned",
                    "room": room_id,
                    "count": result.deleted_count
                })

def start_scheduler():
    scheduler.add_job(check_schedules, 'interval', minutes=1, id="check_schedules_job")
    scheduler.add_job(cleanup_disappearing_messages, 'interval', minutes=1, id="cleanup_messages_job")
    scheduler.start()

def shutdown_scheduler():
    scheduler.shutdown()
