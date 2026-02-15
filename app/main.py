from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app import notifications_repository as notif_repo
from app import realtime_monitor as rt
from app import saved_classes_demo_store as demo_store
from app import saved_classes_repository as saved_repo
from app import watchlist_repository as watch_repo

app = FastAPI(title="ScheduleU UC4 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class SavedClassCreateRequest(BaseModel):
    user_id: int
    section_id: int
    term: str


class SavedClassRemoveRequest(BaseModel):
    user_id: int
    section_id: int
    term: Optional[str] = None


class SavedClassResetRequest(BaseModel):
    user_id: int
    term: Optional[str] = None


class DemoSavedCourse(BaseModel):
    id: str
    code: str
    title: str
    units: int = Field(default=0, ge=0)
    term: str
    status: str = "Planned"


class DemoSavedClassRequest(BaseModel):
    user_id: int = 1
    course: DemoSavedCourse


@app.get("/health")
def health():
    return {"status": "ok", "service": "scheduleu-uc4-backend"}


@app.post("/watchlist")
def add_to_watchlist(payload: WatchCreateRequest):
    try:
        return watch_repo.add_watch(
            user_id=payload.user_id,
            section_id=payload.section_id,
            min_open_seats=payload.min_open_seats,
            quiet_hours=payload.quiet_hours,
            channels=payload.channels,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/watchlist/{user_id}")
def get_watchlist(user_id: int):
    try:
        return watch_repo.list_watchlist(user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/watchlist/remove")
def remove_from_watchlist(payload: WatchRemoveRequest):
    try:
        watch_repo.remove_watch(payload.user_id, payload.section_id)
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/notifications/{user_id}")
def get_notifications(user_id: int, unread_only: bool = False):
    try:
        return notif_repo.list_notifications(user_id, unread_only=unread_only)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/notifications/mark-read")
def mark_notification_read(payload: MarkReadRequest):
    try:
        notif_repo.mark_read(payload.user_id, payload.notification_id)
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/sections/status/update")
def update_section_status(payload: SectionStatusUpdateRequest):
    try:
        return rt.process_section_update(
            section_id=payload.section_id,
            new_status=payload.status,
            open_seats=payload.open_seats,
            capacity=payload.capacity,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/uc4/saved-classes/{user_id}")
def list_saved_classes(user_id: int, term: Optional[str] = None):
    try:
        courses = saved_repo.list_saved_classes(user_id=user_id, term=term)
        return {"source": "database", "courses": courses}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/uc4/saved-classes")
def add_saved_class(payload: SavedClassCreateRequest):
    try:
        row = saved_repo.add_saved_class(
            user_id=payload.user_id,
            section_id=payload.section_id,
            term=payload.term,
        )
        return {"source": "database", "course": row}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.delete("/uc4/saved-classes")
def remove_saved_class(payload: SavedClassRemoveRequest):
    try:
        removed = saved_repo.remove_saved_class(
            user_id=payload.user_id,
            section_id=payload.section_id,
            term=payload.term,
        )
        return {"source": "database", "removed": removed}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/uc4/saved-classes/reset")
def reset_saved_classes(payload: SavedClassResetRequest):
    try:
        removed = saved_repo.reset_saved_classes(user_id=payload.user_id, term=payload.term)
        return {"source": "database", "removed": removed}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/uc4/demo/saved-classes")
def list_demo_saved_classes(user_id: int = 1):
    return {"source": "demo-store", "courses": demo_store.list_saved_classes(user_id)}


@app.post("/uc4/demo/saved-classes")
def upsert_demo_saved_class(payload: DemoSavedClassRequest):
    row = demo_store.upsert_saved_class(payload.user_id, payload.course.model_dump())
    return {"source": "demo-store", "course": row}


@app.delete("/uc4/demo/saved-classes/{course_id}")
def remove_demo_saved_class(course_id: str, user_id: int = 1):
    removed = demo_store.remove_saved_class(user_id, course_id)
    return {"source": "demo-store", "removed": removed}


@app.post("/uc4/demo/saved-classes/reset")
def reset_demo_saved_classes(user_id: int = 1):
    demo_store.reset_saved_classes(user_id)
    return {"source": "demo-store", "status": "ok"}
