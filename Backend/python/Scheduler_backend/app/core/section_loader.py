from __future__ import annotations

import os
from typing import Dict, List, Any, Tuple
from collections import defaultdict

from app.core.supabase_client import get_supabase
from app.core.normalize import norm_course_code
from app.core.section_models import SectionOption, MeetingBlock
from app.core.section_scheduler import parse_days, parse_time_range


def _get_env(name: str, default: str) -> str:
    return os.getenv(name, default).strip()


def load_section_options_for_courses(
    courses: List[str],
    *,
    page_size: int = 1000,
) -> Dict[str, List[SectionOption]]:
    """
    Returns: course_code -> list of SectionOption
    """
    sb = get_supabase()

    table = _get_env("SECTION_TABLE", "spring_2026")
    course_col = _get_env("SECTION_COURSE_COL", "course_code_full")
    section_col = _get_env("SECTION_SECTION_COL", "section")

    type_col = _get_env("SECTION_TYPE_COL", "type")
    day_col = _get_env("SECTION_DAY_COL", "day")
    time_col = _get_env("SECTION_TIME_COL", "time")
    loc_col = _get_env("SECTION_LOCATION_COL", "location")
    inst_col = _get_env("SECTION_INSTRUCTOR_COL", "instructor")
    comm_col = _get_env("SECTION_COMMENTS_COL", "comments")

    norm_courses = [norm_course_code(c) for c in courses if norm_course_code(c)]
    if not norm_courses:
        return {}

    # Fetch rows in pages (and filter by requested course list)
    # Use .in_ on the raw course column (assumes values match what user passes or can be normalized similarly)
    # We'll normalize after reading.
    select_cols = [course_col, section_col, type_col, day_col, time_col, loc_col, inst_col, comm_col]
    select_str = ",".join(select_cols)

    all_rows: List[dict] = []
    start = 0
    while True:
        q = (
            sb.table(table)
            .select(select_str)
            .range(start, start + page_size - 1)
        )

        res = q.execute()
        rows = res.data or []
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        start += page_size

    # If the raw in_ filter missed due to formatting differences, fallback: fetch more broadly and filter in Python
    # (Optional) — comment this in if needed later.

    # Group meeting rows into (course, section_id)
    grouped: Dict[Tuple[str, str], List[MeetingBlock]] = defaultdict(list)
    meta: Dict[Tuple[str, str], dict] = {}

    for r in all_rows:
        raw_course = (r.get(course_col) or "").strip()
        course = norm_course_code(raw_course)
        if course not in norm_courses:
            # Sometimes raw_course formatting differs; normalize and compare
            continue

        section_id_raw = r.get(section_col)
        section_id = str(section_id_raw).strip() if section_id_raw is not None else ""
        if not section_id:
            # Without section id, we can’t reliably schedule
            continue

        day_raw = (r.get(day_col) or "").strip()
        time_raw = (r.get(time_col) or "").strip()
        if not day_raw or not time_raw:
            # Skip TBA / missing meetings
            continue

        days = parse_days(day_raw)
        t = parse_time_range(time_raw)
        if not days or t is None:
            continue

        start_min, end_min = t

        mb = MeetingBlock(
            days=days,
            start_min=start_min,
            end_min=end_min,
            meeting_type=(str(r.get(type_col)).strip() if r.get(type_col) is not None else None),
            location=(str(r.get(loc_col)).strip() if r.get(loc_col) is not None else None),
            instructor=(str(r.get(inst_col)).strip() if r.get(inst_col) is not None else None),
            comments=(str(r.get(comm_col)).strip() if r.get(comm_col) is not None else None),
        )

        key = (course, section_id)
        grouped[key].append(mb)
        if key not in meta:
            meta[key] = {
                "location": mb.location,
                "instructor": mb.instructor,
            }

    # Convert grouped meetings into SectionOption lists per course
    out: Dict[str, List[SectionOption]] = defaultdict(list)
    for (course, section_id), meetings in grouped.items():
        m = meta.get((course, section_id), {})
        out[course].append(
            SectionOption(
                course=course,
                section_id=section_id,
                meetings=meetings,
                location=m.get("location"),
                instructor=m.get("instructor"),
            )
        )

    return dict(out)
