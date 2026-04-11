from typing import Any, Dict, List, Optional
from app.db import get_connection

def create_notification(user_id: int, notif_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO notifications (user_id, type, payload)
                VALUES (%s, %s, %s::jsonb)
                RETURNING id, user_id, type, payload, is_read, created_at;
                """,
                (user_id, notif_type, payload),
            )
            row = cur.fetchone()
        conn.commit()

    return {
        "id": row[0],
        "user_id": row[1],
        "type": row[2],
        "payload": row[3],
        "is_read": row[4],
        "created_at": row[5],
    }

def list_notifications(user_id: int, unread_only: bool = False) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            if unread_only:
                cur.execute(
                    "SELECT id, user_id, type, payload, is_read, created_at FROM v_notifications WHERE user_id=%s AND is_read=FALSE ORDER BY created_at DESC;",
                    (user_id,),
                )
            else:
                cur.execute(
                    "SELECT id, user_id, type, payload, is_read, created_at FROM v_notifications WHERE user_id=%s ORDER BY created_at DESC;",
                    (user_id,),
                )
            rows = cur.fetchall()

    return [
        {"id": r[0], "user_id": r[1], "type": r[2], "payload": r[3], "is_read": r[4], "created_at": r[5]}
        for r in rows
    ]

def mark_read(user_id: int, notification_id: int) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notifications SET is_read=TRUE WHERE id=%s AND user_id=%s;",
                (notification_id, user_id),
            )
        conn.commit()
