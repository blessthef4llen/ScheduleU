from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.ai_scheduler.router import router as ai_router
from app.db import get_connection
from app import notifications_repository as notif_repo
from app import realtime_monitor as rt
from app import saved_classes_demo_store as demo_store
from app import saved_classes_repository as saved_repo
from app import social_sync_repository as social_repo
from app import watchlist_repository as watch_repo

# Canonical UC4 API app used by local demos and team integration.
app = FastAPI(title="ScheduleU UC4 Backend")

# Allow local Next.js development ports to call this API directly.
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

# Han-branch AI scheduler endpoints are mounted under /ai/* on this backend.
app.include_router(ai_router, prefix="/ai", tags=["AI Scheduler"])


# Existing UC4 payloads for watchlist/notification features.
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


# DB-backed saved-class payloads (future builder integration target).
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


# Demo-store payload used before full builder-to-section wiring is complete.
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


class SocialSyncPreferenceRequest(BaseModel):
    # Simple payload for the on/off switch in the planner UI.
    user_id: int
    enabled: bool


class SocialFriendRequest(BaseModel):
    # Shared payload for add/remove friend actions.
    user_id: int
    friend_user_id: int


@app.get("/health")
def health():
    # Simple liveness check used by frontend startup sync.
    return {"status": "ok", "service": "scheduleu-uc4-backend"}


@app.get("/courses")
def list_courses(term: Optional[str] = None, subject: Optional[str] = None, limit: int = 300):
    # Course listings endpoint backed by the current database view.
    max_limit = max(1, min(limit, 1000))
    where = []
    params: list[Any] = []

    if term:
        where.append("term = %s")
        params.append(term)
    if subject:
        where.append("subject = %s")
        params.append(subject.upper())

    sql = """
        SELECT
            course_id, subject, number, title, units,
            section_id, term, sec, class_number, component_type,
            days, time_range, location, instructor, open_seats, capacity, status, notes
        FROM v_course_listings
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY subject, number, sec NULLS LAST, class_number NULLS LAST LIMIT %s"
    params.append(max_limit)

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, tuple(params))
                rows = cur.fetchall()
                cols = [desc[0] for desc in cur.description]
        return {"courses": [dict(zip(cols, row)) for row in rows]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
    # DB-first read path for eventual real course-builder save actions.
    try:
        courses = saved_repo.list_saved_classes(user_id=user_id, term=term)
        return {"source": "database", "courses": courses}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/uc4/archive/{user_id}")
def schedule_archive(user_id: int):
    # Groups a user's saved classes by term to support schedule archive/history views.
    try:
        rows = saved_repo.list_saved_classes(user_id=user_id)
        grouped: Dict[str, Dict[str, Any]] = {}

        for row in rows:
            term = str(row.get("term") or "Unknown Term")
            if term not in grouped:
                grouped[term] = {"term": term, "total_units": 0, "courses": []}

            grouped[term]["courses"].append(row)
            grouped[term]["total_units"] += int(row.get("units") or 0)

        archive = sorted(grouped.values(), key=lambda item: item["term"], reverse=True)
        return {"user_id": user_id, "terms": archive}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/uc4/saved-classes")
def add_saved_class(payload: SavedClassCreateRequest):
    # Stores selected section inside schedule/schedule_items.
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


@app.get("/uc4/social/section-sync/{user_id}")
def social_section_sync(user_id: int, term: Optional[str] = None):
    # Returns friend list + shared sections for the selected term.
    try:
        return social_repo.get_social_section_sync(user_id=user_id, term=term)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/uc4/social/opt-in")
def social_sync_opt_in(payload: SocialSyncPreferenceRequest):
    # Toggles whether this user shares planned sections.
    try:
        return social_repo.set_sync_preference(user_id=payload.user_id, enabled=payload.enabled)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/uc4/social/friends/add")
def social_sync_add_friend(payload: SocialFriendRequest):
    # Adds a friend connection (mirrored both directions in repository layer).
    try:
        return social_repo.add_friend(user_id=payload.user_id, friend_user_id=payload.friend_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/uc4/social/friends/remove")
def social_sync_remove_friend(payload: SocialFriendRequest):
    # Removes both sides of the friend connection.
    try:
        return social_repo.remove_friend(user_id=payload.user_id, friend_user_id=payload.friend_user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/uc4/demo/saved-classes")
def list_demo_saved_classes(user_id: int = 1):
    # File-backed demo fallback while upstream builder wiring is pending.
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
