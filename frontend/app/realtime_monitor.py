import os
import time
from typing import Any, Dict, Optional
from dotenv import load_dotenv

# Set up the Handshake with your repositories
# Note: Ensure PYTHONPATH is set to .../ScheduleU/frontend
from app import realtime_sections_repository as sec_repo
from app import notifications_repository as notif_repo
from app import watchlist_repository as watch_repo

print("--- DEBUG: Realtime Monitor is starting up ---")

def should_alert(min_open_seats: int, open_seats: Optional[int], new_status: Optional[str]) -> bool:
    """Logic to decide if a notification should be triggered."""
    if new_status and new_status.lower() == "open":
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
    """Updates the DB and creates a notification if a seat opened up."""
    
    # 1. Update the record in Supabase
    old_status, old_open, old_cap = sec_repo.update_section_status(
        section_id=section_id,
        new_status=new_status,
        open_seats=open_seats,
        capacity=capacity,
    )

    snapshot = sec_repo.get_section_snapshot(section_id)
    watches = sec_repo.get_active_watches_for_section(section_id)

    created_count = 0
    for w in watches:
        # Check if this update meets the user's 'min_seats' requirement
        if not should_alert(w["min_open_seats"], snapshot.get("open_seats"), snapshot.get("status")):
            continue

        # De-dupe: don't notify twice for the same status change
        last_notified_at = w.get("last_notified_at")
        last_status_at = snapshot.get("last_status_at")
        if last_notified_at and last_status_at and last_notified_at >= last_status_at:
            continue

        # This payload matches your Dashboard's "Schu-Teal" UI theme
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
                "status": snapshot["status"],
                "open_seats": snapshot["open_seats"],
            },
            "deep_link": f"/courses/{snapshot['course_id']}?section={snapshot['section_id']}"
        }

        # Send to the Notification Center table
        notif_repo.create_notification(user_id=w["user_id"], notif_type="seat_open", payload=payload)
        watch_repo.mark_notified(w["watch_id"])
        created_count += 1

    return {
        "section_id": section_id,
        "notifications_created": created_count,
    }

# --- THE OPERATING ENGINE ---
if __name__ == "__main__":
    load_dotenv() # Pulls your Supabase keys
    
    print("--- MONITOR ACTIVE: Polling for Seat Changes ---")
    
    while True:
        try:
            # In a real run, this would fetch all 'watched' IDs from the DB
            # For now, it pulses every 60 seconds to keep the connection alive
            print(f"[{time.strftime('%H:%M:%S')}] Checking watchlists...")
            
            # This is where the script links to your pinned courses
            # Example: check_all_watched_sections()
            
            time.sleep(60) 
        except Exception as e:
            print(f"Error in monitor loop: {e}")
            time.sleep(10)