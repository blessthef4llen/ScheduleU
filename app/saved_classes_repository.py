from typing import Any, Dict, List, Optional

from app.db import get_connection


def list_saved_classes(user_id: int, term: Optional[str] = None) -> List[Dict[str, Any]]:
    # Reads a flattened schedule+course view for frontend consumption.
    with get_connection() as conn:
        with conn.cursor() as cur:
            if term:
                cur.execute(
                    """
                    SELECT
                        sch.id AS schedule_id,
                        sch.term,
                        si.id AS schedule_item_id,
                        sec.id AS section_id,
                        c.subject,
                        c.number,
                        c.title,
                        COALESCE(c.units, 0) AS units,
                        COALESCE(sec.status, 'planned') AS section_status
                    FROM schedules sch
                    JOIN schedule_items si ON si.schedule_id = sch.id
                    JOIN sections sec ON sec.id = si.section_id
                    JOIN courses c ON c.id = sec.course_id
                    WHERE sch.user_id = %s AND sch.term = %s
                    ORDER BY c.subject, c.number, sec.sec;
                    """,
                    (user_id, term),
                )
            else:
                cur.execute(
                    """
                    SELECT
                        sch.id AS schedule_id,
                        sch.term,
                        si.id AS schedule_item_id,
                        sec.id AS section_id,
                        c.subject,
                        c.number,
                        c.title,
                        COALESCE(c.units, 0) AS units,
                        COALESCE(sec.status, 'planned') AS section_status
                    FROM schedules sch
                    JOIN schedule_items si ON si.schedule_id = sch.id
                    JOIN sections sec ON sec.id = si.section_id
                    JOIN courses c ON c.id = sec.course_id
                    WHERE sch.user_id = %s
                    ORDER BY sch.term DESC, c.subject, c.number, sec.sec;
                    """,
                    (user_id,),
                )
            rows = cur.fetchall()

    return [
        {
            "id": str(r[2]),
            "schedule_id": r[0],
            "section_id": r[3],
            "term": r[1],
            "code": f"{r[4]} {r[5]}",
            "title": r[6],
            "units": int(r[7] or 0),
            "status": _to_demo_status(r[8]),
        }
        for r in rows
    ]


def add_saved_class(user_id: int, section_id: int, term: str) -> Dict[str, Any]:
    # Ensures the term schedule exists, then idempotently inserts schedule_items row.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM schedules
                WHERE user_id = %s AND term = %s
                ORDER BY id
                LIMIT 1;
                """,
                (user_id, term),
            )
            existing_schedule = cur.fetchone()

            if existing_schedule:
                schedule_id = existing_schedule[0]
            else:
                # Create term schedule on first save for this user/term pair.
                cur.execute(
                    """
                    INSERT INTO schedules (user_id, term)
                    VALUES (%s, %s)
                    RETURNING id;
                    """,
                    (user_id, term),
                )
                schedule_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO schedule_items (schedule_id, section_id)
                VALUES (%s, %s)
                ON CONFLICT (schedule_id, section_id) DO NOTHING
                RETURNING id;
                """,
                (schedule_id, section_id),
            )
            inserted = cur.fetchone()
            if inserted:
                schedule_item_id = inserted[0]
            else:
                # If duplicate insert was ignored, fetch the existing record.
                cur.execute(
                    """
                    SELECT id
                    FROM schedule_items
                    WHERE schedule_id = %s AND section_id = %s
                    LIMIT 1;
                    """,
                    (schedule_id, section_id),
                )
                schedule_item_id = cur.fetchone()[0]

            cur.execute(
                """
                SELECT
                    sch.id AS schedule_id,
                    sch.term,
                    si.id AS schedule_item_id,
                    sec.id AS section_id,
                    c.subject,
                    c.number,
                    c.title,
                    COALESCE(c.units, 0) AS units,
                    COALESCE(sec.status, 'planned') AS section_status
                FROM schedule_items si
                JOIN schedules sch ON sch.id = si.schedule_id
                JOIN sections sec ON sec.id = si.section_id
                JOIN courses c ON c.id = sec.course_id
                WHERE si.id = %s;
                """,
                (schedule_item_id,),
            )
            row = cur.fetchone()

        conn.commit()

    return {
        "id": str(row[2]),
        "schedule_id": row[0],
        "section_id": row[3],
        "term": row[1],
        "code": f"{row[4]} {row[5]}",
        "title": row[6],
        "units": int(row[7] or 0),
        "status": _to_demo_status(row[8]),
    }


def remove_saved_class(user_id: int, section_id: int, term: Optional[str] = None) -> int:
    # Removes a specific section from one term or all terms for the user.
    with get_connection() as conn:
        with conn.cursor() as cur:
            if term:
                cur.execute(
                    """
                    DELETE FROM schedule_items si
                    USING schedules sch
                    WHERE si.schedule_id = sch.id
                      AND sch.user_id = %s
                      AND sch.term = %s
                      AND si.section_id = %s
                    RETURNING si.id;
                    """,
                    (user_id, term, section_id),
                )
            else:
                cur.execute(
                    """
                    DELETE FROM schedule_items si
                    USING schedules sch
                    WHERE si.schedule_id = sch.id
                      AND sch.user_id = %s
                      AND si.section_id = %s
                    RETURNING si.id;
                    """,
                    (user_id, section_id),
                )
            rows = cur.fetchall()
        conn.commit()
    return len(rows)


def reset_saved_classes(user_id: int, term: Optional[str] = None) -> int:
    # Bulk clear helper used by the demo "reset" action.
    with get_connection() as conn:
        with conn.cursor() as cur:
            if term:
                cur.execute(
                    """
                    DELETE FROM schedule_items si
                    USING schedules sch
                    WHERE si.schedule_id = sch.id
                      AND sch.user_id = %s
                      AND sch.term = %s
                    RETURNING si.id;
                    """,
                    (user_id, term),
                )
            else:
                cur.execute(
                    """
                    DELETE FROM schedule_items si
                    USING schedules sch
                    WHERE si.schedule_id = sch.id
                      AND sch.user_id = %s
                    RETURNING si.id;
                    """,
                    (user_id,),
                )
            rows = cur.fetchall()
        conn.commit()
    return len(rows)


def _to_demo_status(section_status: Optional[str]) -> str:
    # Normalizes DB section status values into UI-friendly labels.
    if not section_status:
        return "Planned"
    normalized = section_status.strip().lower()
    if normalized in {"open", "in progress"}:
        return "In Progress"
    if normalized in {"closed", "completed"}:
        return "Completed"
    return "Planned"
