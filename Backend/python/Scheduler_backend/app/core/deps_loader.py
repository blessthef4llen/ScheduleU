from __future__ import annotations

import os
from typing import Dict, Set, Any, List

from .deps_model import DependencyModel, CourseMeta
from .normalize import norm_course_code, split_codes
from .supabase_client import get_supabase


# Build DependencyModel from Supabase using configured table shape.
def load_dependency_model_from_supabase() -> DependencyModel:
    """
    Loads prerequisites/corequisites from Supabase and returns DependencyModel.

    """
    mode = os.getenv("DEPS_MODE", "edges_split").strip().lower()
    # Backward-compatible aliases.
    if mode in {"edges", "edge_split"}:
        mode = "edges_split"
    table = os.getenv("DEPS_TABLE", "course_dependencies").strip()

    # Common
    course_col = os.getenv("DEPS_COURSE_COL", "course_code").strip()
    title_col = os.getenv("DEPS_TITLE_COL", "").strip()
    units_col = os.getenv("DEPS_UNITS_COL", "").strip()

    # edges-mode
    required_col = os.getenv("DEPS_REQUIRED_COL", "required_course_code").strip()
    type_col = os.getenv("DEPS_TYPE_COL", "type").strip()

    # lists-mode
    prereq_col = os.getenv("DEPS_PREREQ_COL", "prereq_course_codes").strip()
    coreq_col = os.getenv("DEPS_COREQ_COL", "coreq_course_codes").strip()

    sb = get_supabase()

    courses: Dict[str, CourseMeta] = {}
    prereqs: Dict[str, Set[str]] = {}
    coreqs: Dict[str, Set[str]] = {}
    model = DependencyModel(courses=courses, prereqs=prereqs, coreqs=coreqs)


    # One row per course with prereq/coreq columns split into lists.
    if mode == "edges_split":
        # Columns
        prereq_col = os.getenv("DEPS_PREREQ_COL", "prereq_code").strip()
        coreq_col = os.getenv("DEPS_COREQ_COL", "coreq_code").strip()

        select_cols = [course_col, prereq_col, coreq_col]
        if title_col:
            select_cols.append(title_col)
        if units_col:
            select_cols.append(units_col)

        res = sb.table(table).select(",".join(select_cols)).execute()
        rows = res.data or []

        for r in rows:
            course = norm_course_code((r.get(course_col) or "").strip())
            if not course:
                continue

            # optional metadata
            if course not in model.courses:
                title = (r.get(title_col) or "").strip() if title_col else None
                units = None
                if units_col:
                    try:
                        units = float(str(r.get(units_col)).strip())
                    except Exception:
                        units = None

                model.courses[course] = CourseMeta(
                    code=course,
                    title=title or None,
                    units=units,
                )

            # Split prereqs by |
            prereq_raw = r.get(prereq_col)
            if prereq_raw:
                for p in split_codes(prereq_raw):
                    model.add_prereq(course, p)

            # Split coreqs by |
            coreq_raw = r.get(coreq_col)
            if coreq_raw:
                for c in split_codes(coreq_raw):
                    model.add_coreq(course, c)

        return model


    raise RuntimeError(
        f"Unsupported DEPS_MODE='{mode}'. Use 'edges_split' (aliases: 'edges', 'edge_split')."
    )
