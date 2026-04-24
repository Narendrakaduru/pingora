from fastapi import WebSocket
from typing import List, Dict, Set
import json
from database import db
from datetime import datetime, timezone

class ConnectionManager:
    def __init__(self):
        # username -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # room_id -> Set of usernames
        self.room_subscriptions: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        is_new_user = False
        if username not in self.active_connections:
            self.active_connections[username] = []
            is_new_user = True
        self.active_connections[username].append(websocket)
        print(f"WS CONNECTED: {username} (Tab {len(self.active_connections[username])}) | Total Users: {len(self.active_connections)}")

        await websocket.send_text(json.dumps({
            "type": "online_users", 
            "users": list(self.active_connections.keys())
        }))

        if is_new_user:
            await self.broadcast_to_all({"type": "user_status", "username": username, "status": "online"})

    async def disconnect(self, websocket: WebSocket, username: str):
        if username in self.active_connections:
            if websocket in self.active_connections[username]:
                self.active_connections[username].remove(websocket)
            if not self.active_connections[username]:
                del self.active_connections[username]
                
                # Update user_presence
                now = datetime.now(timezone.utc).isoformat()
                try:
                    await db.user_presence.update_one(
                        {"username": username.lower()},
                        {"$set": {"last_seen": now}},
                        upsert=True
                    )
                except Exception as e:
                    print(f"Failed to update user presence: {e}")

                # Broadcast that user went offline
                await self.broadcast_to_all({"type": "user_status", "username": username, "status": "offline", "last_seen": now})
                
                # Only remove from rooms if no more active tabs
                for room_id in list(self.room_subscriptions.keys()):
                    if username in self.room_subscriptions[room_id]:
                        self.room_subscriptions[room_id].remove(username)
                        if not self.room_subscriptions[room_id]:
                            del self.room_subscriptions[room_id]
        print(f"WS DISCONNECTED: {username} | Remaining Users: {len(self.active_connections)}")

    def join_room(self, username: str, room_id: str):
        if room_id not in self.room_subscriptions:
            self.room_subscriptions[room_id] = set()
        self.room_subscriptions[room_id].add(username)
        print(f"User {username} joined room {room_id}")

    def leave_room(self, username: str, room_id: str):
        if room_id in self.room_subscriptions and username in self.room_subscriptions[room_id]:
            self.room_subscriptions[room_id].remove(username)
            if not self.room_subscriptions[room_id]:
                del self.room_subscriptions[room_id]
        print(f"User {username} left room {room_id}")

    async def send_personal_message(self, message: dict, username: str):
        username = username.lower()
        if username in self.active_connections:
            websockets = self.active_connections[username]
            # Send to all active tabs/devices for this user
            for websocket in websockets:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    print(f"Failed to send personal message to {username} on a tab: {e}")

    async def broadcast_to_room(self, room_id: str, message: dict):
        if room_id in self.room_subscriptions:
            usernames = self.room_subscriptions[room_id]
            for username in usernames:
                if username in self.active_connections:
                    for websocket in self.active_connections[username]:
                        try:
                            await websocket.send_text(json.dumps(message))
                        except Exception as e:
                            print(f"Failed to broadcast to {username} on a tab: {e}")

    async def broadcast_to_all(self, message: dict):
        for username, websockets in self.active_connections.items():
            for websocket in websockets:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    print(f"Failed to broadcast globally to {username}: {e}")

manager = ConnectionManager()
