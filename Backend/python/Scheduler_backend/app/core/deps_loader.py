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

    Two supported storage shapes:

    A) EDGES TABLE (recommended)
      DEPS_MODE=edges
      DEPS_TABLE=course_dependencies
      DEPS_COURSE_COL=course_code
      DEPS_REQUIRED_COL=required_course_code
      DEPS_TYPE_COL=type          # values: 'prereq' or 'coreq'

    B) LISTS TABLE
      DEPS_MODE=lists
      DEPS_TABLE=course_reqs
      DEPS_COURSE_COL=course_code_full
      DEPS_PREREQ_COL=prereq_course_codes
      DEPS_COREQ_COL=coreq_course_codes

    Optional metadata columns (if present on same table/view):
      DEPS_TITLE_COL=course_title
      DEPS_UNITS_COL=units
    """
    mode = os.getenv("DEPS_MODE", "edges").strip().lower()
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

    # One row per dependency edge.
    if mode == "edges":
        select_cols = [course_col, required_col, type_col]
        if title_col:
            select_cols.append(title_col)
        if units_col:
            select_cols.append(units_col)

        res = sb.table(table).select(",".join(select_cols)).execute()
        rows = res.data or []

        for r in rows:
            course = norm_course_code((r.get(course_col) or "").strip())
            req = norm_course_code((r.get(required_col) or "").strip())
            rel = (r.get(type_col) or "").strip().lower()

            if not course or not req:
                continue

            # optional metadata if present
            if course not in model.courses:
                title = (r.get(title_col) or "").strip() if title_col else None
                units = None
                if units_col:
                    try:
                        units = float(str(r.get(units_col)).strip())
                    except Exception:
                        units = None
                model.courses[course] = CourseMeta(code=course, title=title or None, units=units)

            if rel == "coreq":
                model.add_coreq(course, req)
            else:
                # default prereq
                model.add_prereq(course, req)

        return model

    # One row per course with pipe-delimited prereq/coreq lists.
    if mode == "lists":
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

            title = (r.get(title_col) or "").strip() if title_col else None
            units = None
            if units_col:
                try:
                    units = float(str(r.get(units_col)).strip())
                except Exception:
                    units = None

            model.courses[course] = CourseMeta(code=course, title=title or None, units=units)

            for p in split_codes(r.get(prereq_col, "")):
                model.add_prereq(course, p)
            for c in split_codes(r.get(coreq_col, "")):
                model.add_coreq(course, c)

        return model
    
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


    raise RuntimeError(f"Unsupported DEPS_MODE='{mode}'. Use 'edges', 'edge_split' or 'lists'.")
