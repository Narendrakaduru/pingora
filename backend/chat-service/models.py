from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

class Reaction(BaseModel):
    username: str
    emoji: str

class MessageCreate(BaseModel):
    username: str
    text: str

class Message(BaseModel):
    id: Optional[str] = Field(alias="_id")
    username: str
    text: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    type: str = "text"
    metadata: Optional[dict] = None
    reactions: List[Reaction] = []
    is_edited: bool = False
    reply_to: Optional[dict] = None
    stars: List[str] = []
    is_pinned: bool = False
    is_deleted: bool = False

class ScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    room_id: str
    created_by: str
    participants: Optional[List[str]] = []

class Schedule(BaseModel):
    id: Optional[str] = Field(alias="_id")
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    room_id: str
    created_by: str
    participants: Optional[List[str]] = []
    is_notified: bool = False
    is_notified_5m: bool = False

    class Config:
        populate_by_name = True

class GroupCreate(BaseModel):
    name: str
    members: List[str]
    created_by: str

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    members: Optional[List[str]] = None

class Group(BaseModel):
    id: Optional[str] = Field(alias="_id")
    name: str
    members: List[str]
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    settings: Optional[dict] = None
    lastMessage: Optional[dict] = None

    class Config:
        populate_by_name = True

class UserRoomSettings(BaseModel):
    id: Optional[str] = Field(alias="_id")
    username: str
    room_id: str
    is_pinned: bool = False
    is_muted: bool = False
    is_archived: bool = False
    is_favourite: bool = False
    labels: List[str] = []
    last_read_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    clear_timestamp: Optional[datetime] = None

    class Config:
        populate_by_name = True

class RoomSettings(BaseModel):
    id: Optional[str] = Field(alias="_id")
    room_id: str
    disappearing_time: str = "off" # off, 24h, 7d, 90d
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str

    class Config:
        populate_by_name = True
