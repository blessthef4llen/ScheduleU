from typing import Any, Dict, List, Optional, Tuple
from app.db import get_connection

def update_section_status(
    section_id: int,
    new_status: Optional[str],
    open_seats: Optional[int],
    capacity: Optional[int],
) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """
    Update a section's status/seats/capacity and set last_status_at.
    Returns (old_status, old_open_seats, old_capacity).
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT status, open_seats, capacity FROM sections WHERE id=%s;",
                (section_id,),
            )
            old = cur.fetchone()
            if not old:
                raise ValueError("Section not found")

            cur.execute(
                """
                UPDATE sections
                SET status = COALESCE(%s, status),
                    open_seats = COALESCE(%s, open_seats),
                    capacity = COALESCE(%s, capacity),
                    last_status_at = now()
                WHERE id=%s;
                """,
                (new_status, open_seats, capacity, section_id),
            )
        conn.commit()

    return (old[0], old[1], old[2])

def get_active_watches_for_section(section_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, section_id, min_open_seats, last_notified_at
                FROM watchlists
                WHERE section_id=%s AND is_active=TRUE;
                """,
                (section_id,),
            )
            rows = cur.fetchall()

    return [
        {"watch_id": r[0], "user_id": r[1], "section_id": r[2], "min_open_seats": r[3], "last_notified_at": r[4]}
        for r in rows
    ]

def get_section_snapshot(section_id: int) -> Dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.term, s.sec, s.class_number, s.component_type, s.days, s.time_range, s.location,
                       s.instructor, s.open_seats, s.capacity, s.status, s.last_status_at,
                       c.id, c.subject, c.number, c.title
                FROM sections s
                JOIN courses c ON c.id = s.course_id
                WHERE s.id=%s;
                """,
                (section_id,),
            )
            r = cur.fetchone()

    if not r:
        raise ValueError("Section not found")

    return {
        "section_id": r[0],
        "term": r[1],
        "sec": r[2],
        "class_number": r[3],
        "component_type": r[4],
        "days": r[5],
        "time_range": r[6],
        "location": r[7],
        "instructor": r[8],
        "open_seats": r[9],
        "capacity": r[10],
        "status": r[11],
        "last_status_at": r[12],
        "course_id": r[13],
        "subject": r[14],
        "number": r[15],
        "title": r[16],
    }
