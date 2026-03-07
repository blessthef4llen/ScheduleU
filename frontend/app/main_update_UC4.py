#Updated main.py to integrate the backend
from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field
from app import watchlist_repository as watch_repo
from app import notifications_repository as notif_repo
from app import realtime_monitor as rt

class WatchCreateRequest(BaseModel):
    user_id: int
    section_id: int
    min_open_seats: int = Field(default=1, ge=0)
    quiet_hours: Optional[Dict[str, Any]] = None
    channels: Optional[Dict[str, Any]] = None

class WatchRemoveRequest(BaseModel):
    user_id: int
    section_id: int

class SectionStatusUpdateRequest(BaseModel):
    section_id: int
    status: Optional[str] = None
    open_seats: Optional[int] = None
    capacity: Optional[int] = None

class MarkReadRequest(BaseModel):
    user_id: int
    notification_id: int

@app.post("/watchlist")
def add_to_watchlist(payload: WatchCreateRequest):
    return watch_repo.add_watch(
        user_id=payload.user_id,
        section_id=payload.section_id,
        min_open_seats=payload.min_open_seats,
        quiet_hours=payload.quiet_hours,
        channels=payload.channels,
    )

@app.get("/watchlist/{user_id}")
def get_watchlist(user_id: int):
    return watch_repo.list_watchlist(user_id)

@app.post("/watchlist/remove")
def remove_from_watchlist(payload: WatchRemoveRequest):
    watch_repo.remove_watch(payload.user_id, payload.section_id)
    return {"status": "ok"}

@app.get("/notifications/{user_id}")
def get_notifications(user_id: int, unread_only: bool = False):
    return notif_repo.list_notifications(user_id, unread_only=unread_only)

@app.post("/notifications/mark-read")
def mark_notification_read(payload: MarkReadRequest):
    notif_repo.mark_read(payload.user_id, payload.notification_id)
    return {"status": "ok"}

# This endpoint simulates "CES pushed/polled update" for now:
@app.post("/sections/status/update")
def update_section_status(payload: SectionStatusUpdateRequest):
    # In production: protect this route (service role / admin key / internal network)
    return rt.process_section_update(
        section_id=payload.section_id,
        new_status=payload.status,
        open_seats=payload.open_seats,
        capacity=payload.capacity,
    )
