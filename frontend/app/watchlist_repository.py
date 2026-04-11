from typing import Any, Dict, List, Optional
from app.db import get_connection

def add_watch(
    user_id: int,
    section_id: int,
    min_open_seats: int = 1,
    quiet_hours: Optional[Dict[str, Any]] = None,
    channels: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO watchlists (user_id, section_id, min_open_seats, quiet_hours, channels)
                VALUES (%s, %s, %s, %s::jsonb, %s::jsonb)
                ON CONFLICT (user_id, section_id)
                DO UPDATE SET
                  min_open_seats = EXCLUDED.min_open_seats,
                  quiet_hours = EXCLUDED.quiet_hours,
                  channels = EXCLUDED.channels,
                  is_active = TRUE
                RETURNING id, user_id, section_id, min_open_seats, is_active, last_notified_at, created_at, updated_at;
                """,
                (user_id, section_id, min_open_seats, quiet_hours, channels),
            )
            row = cur.fetchone()
        conn.commit()

    return {
        "id": row[0],
        "user_id": row[1],
        "section_id": row[2],
        "min_open_seats": row[3],
        "is_active": row[4],
        "last_notified_at": row[5],
        "created_at": row[6],
        "updated_at": row[7],
    }

def remove_watch(user_id: int, section_id: int) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE watchlists SET is_active = FALSE WHERE user_id=%s AND section_id=%s;",
                (user_id, section_id),
            )
        conn.commit()

def list_watchlist(user_id: int) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT watch_id, user_id, section_id, min_open_seats, is_active, last_notified_at,
                       course_id, subject, number, title, term, sec, class_number, component_type,
                       days, time_range, location, instructor, open_seats, capacity, status, last_status_at,
                       created_at, updated_at
                FROM v_watchlist_details
                WHERE user_id = %s
                ORDER BY updated_at DESC;
                """,
                (user_id,),
            )
            rows = cur.fetchall()

    cols = [
        "watch_id","user_id","section_id","min_open_seats","is_active","last_notified_at",
        "course_id","subject","number","title","term","sec","class_number","component_type",
        "days","time_range","location","instructor","open_seats","capacity","status","last_status_at",
        "created_at","updated_at"
    ]
    return [dict(zip(cols, r)) for r in rows]

def mark_notified(watch_id: int) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE watchlists SET last_notified_at = now() WHERE id = %s;",
                (watch_id,),
            )
        conn.commit()
