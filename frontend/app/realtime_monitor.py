from typing import Any, Dict, Optional
from app import realtime_sections_repository as sec_repo
from app import notifications_repository as notif_repo
from app import watchlist_repository as watch_repo

def should_alert(min_open_seats: int, open_seats: Optional[int], new_status: Optional[str]) -> bool:
    if new_status and new_status.lower() == "open":
        # If status is open, alert even if seats missing; but prefer seat rule if provided
        if open_seats is None:
            return True
    if open_seats is None:
        return False
    return open_seats >= min_open_seats

def process_section_update(
    section_id: int,
    new_status: Optional[str],
    open_seats: Optional[int],
    capacity: Optional[int],
) -> Dict[str, Any]:
    old_status, old_open, old_cap = sec_repo.update_section_status(
        section_id=section_id,
        new_status=new_status,
        open_seats=open_seats,
        capacity=capacity,
    )

    snapshot = sec_repo.get_section_snapshot(section_id)
    watches = sec_repo.get_active_watches_for_section(section_id)

    created = 0
    for w in watches:
        if not should_alert(w["min_open_seats"], snapshot.get("open_seats"), snapshot.get("status")):
            continue

        # De-dupe: if we already notified AFTER the last_status_at, don't spam
        last_notified_at = w.get("last_notified_at")
        last_status_at = snapshot.get("last_status_at")
        if last_notified_at and last_status_at and last_notified_at >= last_status_at:
            continue

        payload = {
            "event": "seat_open",
            "course": {
                "subject": snapshot["subject"],
                "number": snapshot["number"],
                "title": snapshot["title"],
            },
            "section": {
                "section_id": snapshot["section_id"],
                "term": snapshot["term"],
                "class_number": snapshot["class_number"],
                "component_type": snapshot["component_type"],
                "days": snapshot["days"],
                "time_range": snapshot["time_range"],
                "location": snapshot["location"],
                "instructor": snapshot["instructor"],
                "status": snapshot["status"],
                "open_seats": snapshot["open_seats"],
                "capacity": snapshot["capacity"],
            },
            "previous": {
                "status": old_status,
                "open_seats": old_open,
                "capacity": old_cap,
            },
            "deep_link": f"/courses/{snapshot['course_id']}?section={snapshot['section_id']}"
        }

        notif_repo.create_notification(user_id=w["user_id"], notif_type="seat_open", payload=payload)
        watch_repo.mark_notified(w["watch_id"])
        created += 1

    return {
        "section_id": section_id,
        "old_status": old_status,
        "new_status": snapshot.get("status"),
        "notifications_created": created,
    }
