from typing import Any, Dict, List, Optional

from app.db import get_connection


def _ensure_user_exists(cur: Any, user_id: int) -> None:
    # Keep this simple for demo mode: if a user ID is selected in the UI, make sure it exists.
    cur.execute("SELECT id FROM users WHERE id = %s;", (user_id,))
    if cur.fetchone():
        return

    cur.execute(
        """
        INSERT INTO users (id, email, name)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO NOTHING;
        """,
        (user_id, f"demo_user_{user_id}@scheduleu.local", f"Demo User {user_id}"),
    )
    cur.execute(
        """
        SELECT setval(
            pg_get_serial_sequence('users', 'id'),
            GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 1),
            true
        );
        """
    )


def _ensure_preference_row(cur: Any, user_id: int) -> None:
    # Every user gets one preference row so toggles stay predictable.
    cur.execute(
        """
        INSERT INTO social_sync_preferences (user_id, enabled)
        VALUES (%s, FALSE)
        ON CONFLICT (user_id) DO NOTHING;
        """,
        (user_id,),
    )


def _get_preference(cur: Any, user_id: int) -> bool:
    # Missing row means "off" by default.
    cur.execute("SELECT enabled FROM social_sync_preferences WHERE user_id = %s;", (user_id,))
    row = cur.fetchone()
    return bool(row[0]) if row else False


def _list_friends(cur: Any, user_id: int) -> List[Dict[str, Any]]:
    # Pull friend basics + whether each friend has opted in to sharing.
    cur.execute(
        """
        SELECT
            u.id,
            COALESCE(NULLIF(u.name, ''), u.email, 'User ' || u.id::text) AS display_name,
            u.email,
            COALESCE(p.enabled, FALSE) AS opted_in
        FROM user_friends f
        JOIN users u ON u.id = f.friend_user_id
        LEFT JOIN social_sync_preferences p ON p.user_id = f.friend_user_id
        WHERE f.user_id = %s
        ORDER BY display_name, u.id;
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    return [
        {
            "user_id": int(r[0]),
            "name": r[1],
            "email": r[2],
            "opted_in": bool(r[3]),
        }
        for r in rows
    ]


def set_sync_preference(user_id: int, enabled: bool) -> Dict[str, Any]:
    # Opt-in toggle endpoint helper.
    with get_connection() as conn:
        with conn.cursor() as cur:
            _ensure_user_exists(cur, user_id)
            _ensure_preference_row(cur, user_id)
            cur.execute(
                """
                UPDATE social_sync_preferences
                SET enabled = %s, updated_at = now()
                WHERE user_id = %s;
                """,
                (enabled, user_id),
            )
        conn.commit()
    return {"user_id": user_id, "enabled": enabled}


def add_friend(user_id: int, friend_user_id: int) -> Dict[str, Any]:
    if user_id == friend_user_id:
        raise ValueError("Cannot add yourself as a friend.")

    with get_connection() as conn:
        with conn.cursor() as cur:
            _ensure_user_exists(cur, user_id)
            _ensure_user_exists(cur, friend_user_id)
            _ensure_preference_row(cur, user_id)
            _ensure_preference_row(cur, friend_user_id)

            # Write both directions so "friends" works the same from either account.
            cur.execute(
                """
                INSERT INTO user_friends (user_id, friend_user_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, friend_user_id) DO NOTHING;
                """,
                (user_id, friend_user_id),
            )
            cur.execute(
                """
                INSERT INTO user_friends (user_id, friend_user_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, friend_user_id) DO NOTHING;
                """,
                (friend_user_id, user_id),
            )
            friends = _list_friends(cur, user_id)
        conn.commit()

    return {"status": "ok", "user_id": user_id, "friends": friends}


def remove_friend(user_id: int, friend_user_id: int) -> Dict[str, Any]:
    # Remove both directions in one statement to keep the graph clean.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_friends
                WHERE (user_id = %s AND friend_user_id = %s)
                   OR (user_id = %s AND friend_user_id = %s);
                """,
                (user_id, friend_user_id, friend_user_id, user_id),
            )
            friends = _list_friends(cur, user_id)
        conn.commit()

    return {"status": "ok", "user_id": user_id, "friends": friends}


def get_social_section_sync(user_id: int, term: Optional[str] = None) -> Dict[str, Any]:
    # Main read path: friend list + their planned sections + overlap with current user.
    with get_connection() as conn:
        with conn.cursor() as cur:
            _ensure_user_exists(cur, user_id)
            _ensure_preference_row(cur, user_id)

            opted_in = _get_preference(cur, user_id)
            friends = _list_friends(cur, user_id)
            friend_ids = [friend["user_id"] for friend in friends]
            friend_lookup = {friend["user_id"]: friend for friend in friends}

            user_sections: set[int] = set()
            if opted_in:
                # We only compare overlap if this user opted in.
                cur.execute(
                    """
                    SELECT DISTINCT si.section_id
                    FROM schedules sch
                    JOIN schedule_items si ON si.schedule_id = sch.id
                    WHERE sch.user_id = %s
                      AND (%s IS NULL OR sch.term = %s);
                    """,
                    (user_id, term, term),
                )
                user_sections = {int(row[0]) for row in cur.fetchall()}

            rows: List[Any] = []
            if opted_in and friend_ids:
                # Fetch friend schedule rows for the selected term.
                cur.execute(
                    """
                    SELECT
                        sch.user_id AS friend_user_id,
                        sch.term,
                        sec.id AS section_id,
                        sec.sec,
                        sec.class_number,
                        sec.component_type,
                        sec.days,
                        sec.time_range,
                        sec.location,
                        sec.instructor,
                        COALESCE(sec.open_seats, 0) AS open_seats,
                        COALESCE(sec.capacity, 0) AS capacity,
                        COALESCE(sec.status, 'planned') AS section_status,
                        c.subject,
                        c.number,
                        c.title,
                        COALESCE(c.units, 0) AS units
                    FROM schedules sch
                    JOIN schedule_items si ON si.schedule_id = sch.id
                    JOIN sections sec ON sec.id = si.section_id
                    JOIN courses c ON c.id = sec.course_id
                    WHERE sch.user_id = ANY(%s)
                      AND (%s IS NULL OR sch.term = %s)
                    ORDER BY sch.user_id, sch.term, c.subject, c.number, sec.sec NULLS LAST;
                    """,
                    (friend_ids, term, term),
                )
                rows = cur.fetchall()

            sections_by_friend: Dict[int, List[Dict[str, Any]]] = {friend_id: [] for friend_id in friend_ids}
            overlaps_by_friend: Dict[int, int] = {friend_id: 0 for friend_id in friend_ids}

            for row in rows:
                friend_user_id = int(row[0])
                friend_info = friend_lookup.get(friend_user_id)
                if not friend_info or not friend_info["opted_in"]:
                    # Respect privacy: if a friend is not opted in, do not expose sections.
                    continue

                section_id = int(row[2])
                is_same_section = section_id in user_sections
                section = {
                    "term": row[1],
                    "section_id": section_id,
                    "sec": row[3],
                    "class_number": row[4],
                    "component_type": row[5],
                    "days": row[6],
                    "time_range": row[7],
                    "location": row[8],
                    "instructor": row[9],
                    "open_seats": int(row[10]),
                    "capacity": int(row[11]),
                    "status": row[12],
                    "subject": row[13],
                    "number": row[14],
                    "title": row[15],
                    "units": int(row[16]),
                    "code": f"{row[13]} {row[14]}",
                    "is_same_section_as_me": is_same_section,
                }
                sections_by_friend[friend_user_id].append(section)
                if is_same_section:
                    overlaps_by_friend[friend_user_id] += 1

            friend_payload: List[Dict[str, Any]] = []
            for friend in friends:
                friend_user_id = int(friend["user_id"])
                # Return metadata for all friends, but sections only when both sides allow it.
                friend_payload.append(
                    {
                        "user_id": friend_user_id,
                        "name": friend["name"],
                        "email": friend["email"],
                        "opted_in": bool(friend["opted_in"]),
                        "shared_sections": sections_by_friend.get(friend_user_id, [])
                        if opted_in and friend["opted_in"]
                        else [],
                        "overlap_count": overlaps_by_friend.get(friend_user_id, 0)
                        if opted_in and friend["opted_in"]
                        else 0,
                    }
                )

        conn.commit()

    return {
        "user_id": user_id,
        "term": term,
        "opted_in": opted_in,
        "can_view_friends": opted_in,
        "friends": friend_payload,
    }
