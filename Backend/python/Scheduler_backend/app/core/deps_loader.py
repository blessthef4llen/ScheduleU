"""Core scheduling backend logic for Deps Loader."""

from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Dict, Set, Any, List

from .deps_model import DependencyModel, CourseMeta
from .normalize import norm_course_code, split_codes
from .supabase_client import get_supabase


def _new_model() -> DependencyModel:
    return DependencyModel(courses={}, prereqs={}, coreqs={})


def _merge_models(base: DependencyModel, overlay: DependencyModel) -> DependencyModel:
    for code, meta in overlay.courses.items():
        existing = base.courses.get(code)
        if existing is None:
            base.courses[code] = meta
            continue
        if existing.title is None and meta.title is not None:
            base.courses[code] = CourseMeta(code=existing.code, title=meta.title, units=existing.units if existing.units is not None else meta.units)
        elif existing.units is None and meta.units is not None:
            base.courses[code] = CourseMeta(code=existing.code, title=existing.title, units=meta.units)

    for course, groups in overlay.prereq_groups.items():
        for group in groups:
            base.add_prereq_group(course, set(group))

    for course, coreqs in overlay.coreqs.items():
        for coreq in coreqs:
            base.add_coreq(course, coreq)

    return base


def _load_dependency_model_from_local_csv(csv_path: Path) -> DependencyModel:
    model = _new_model()
    if not csv_path.exists():
        return model

    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            course = norm_course_code(str(row.get("course_code_full") or "").strip())
            if not course:
                continue

            title = str(row.get("course_title") or "").strip() or None
            units = None
            units_raw = str(row.get("units") or "").strip()
            if units_raw:
                try:
                    units = float(units_raw)
                except ValueError:
                    units = None

            if course not in model.courses:
                model.courses[course] = CourseMeta(code=course, title=title, units=units)

            prereq_codes = split_codes(str(row.get("prereq_course_codes") or ""))
            prereq_text = str(row.get("prereq_course") or "").strip().lower()
            if prereq_codes:
                if len(prereq_codes) > 1 and " or " in prereq_text:
                    model.add_prereq_group(course, set(prereq_codes))
                else:
                    for code in prereq_codes:
                        model.add_prereq(course, code)

            coreq_codes = split_codes(str(row.get("coreq_course_codes") or ""))
            for code in coreq_codes:
                model.add_coreq(course, code)

    return model


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

    model = _new_model()


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

        local_csv_enabled = os.getenv("DEPS_LOCAL_CSV_OVERLAY", "1").strip().lower() not in {"0", "false", "no"}
        local_csv_path = os.getenv(
            "DEPS_LOCAL_CSV_PATH",
            str(Path(__file__).resolve().parents[2] / "data" / "pre_req_filtered.csv"),
        ).strip()
        if local_csv_enabled:
            model = _merge_models(model, _load_dependency_model_from_local_csv(Path(local_csv_path)))

        return model


    raise RuntimeError(
        f"Unsupported DEPS_MODE='{mode}'. Use 'edges_split' (aliases: 'edges', 'edge_split')."
    )
