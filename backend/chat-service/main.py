from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import os, mimetypes
mimetypes.add_type('audio/mp4', '.m4a')
mimetypes.add_type('audio/mp4', '.acc')
mimetypes.add_type('audio/3gpp', '.3gp')
mimetypes.add_type('audio/3gpp', '.3gpp')
mimetypes.add_type('audio/webm', '.webm')

from scheduler import start_scheduler, shutdown_scheduler
from routers import messages, schedules, groups, rooms, ws, settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting scheduler...", flush=True)
    start_scheduler()
    yield
    # Shutdown
    print("Shutting down scheduler...", flush=True)
    shutdown_scheduler()

app = FastAPI(lifespan=lifespan)

# Create uploads directory
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
# app.mount("/api/chat/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all extracted routers with /api/chat prefix
app.include_router(messages.router, prefix="/api/chat")
app.include_router(schedules.router, prefix="/api/chat")
app.include_router(groups.router, prefix="/api/chat")
app.include_router(rooms.router, prefix="/api/chat")
app.include_router(ws.router, prefix="/api/chat")
app.include_router(settings.router, prefix="/api/chat")
