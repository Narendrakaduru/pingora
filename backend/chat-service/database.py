from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client = AsyncIOMotorClient(settings.mongodb_url, tz_aware=True)
db = client[settings.database_name]

async def get_db():
    return db
