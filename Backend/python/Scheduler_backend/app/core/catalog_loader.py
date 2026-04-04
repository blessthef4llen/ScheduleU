from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, Optional, Any

from .normalize import norm_course_code
from .supabase_client import get_supabase


# Catalog row used by scheduling metadata merge.
@dataclass(frozen=True)
class CatalogCourse:
    code: str
    title: Optional[str] = None
    units: Optional[float] = None


# Parse unit values; return None for unsupported formats.
def _parse_units(units_raw: Any) -> Optional[float]:
    if units_raw is None:
        return None
    s = str(units_raw).strip()
    if not s:
        return None
    # variable units like "1-4" -> None (policy can be added later)
    if "-" in s:
        return None
    try:
        return float(s)
    except Exception:
        return None


def load_catalog_from_supabase() -> Dict[str, CatalogCourse]:
    """
    Loads catalog courses offered (e.g., Spring 26) from Supabase.

    Env config (defaults shown):
      CATALOG_TABLE=spring_courses
      CATALOG_CODE_COL=course_code_full
      CATALOG_TITLE_COL=course_title
      CATALOG_UNITS_COL=units

    Optional term filtering:
      CATALOG_TERM_COL=term
      CATALOG_TERM_VALUE=Spring 2026
    """
    table = os.getenv("CATALOG_TABLE", "spring_courses")
    code_col = os.getenv("CATALOG_CODE_COL", "course_code_full")
    title_col = os.getenv("CATALOG_TITLE_COL", "course_title")
    units_col = os.getenv("CATALOG_UNITS_COL", "units")

    term_col = os.getenv("CATALOG_TERM_COL", "").strip()
    term_val = os.getenv("CATALOG_TERM_VALUE", "").strip()

    sb = get_supabase()

    q = sb.table(table).select(f"{code_col},{title_col},{units_col}")
    if term_col and term_val:
        q = q.eq(term_col, term_val)

    catalog: Dict[str, CatalogCourse] = {}

    page_size = 1000
    start = 0

    while True:
        q = sb.table(table).select(f"{code_col},{title_col},{units_col}")

        if term_col and term_val:
            q = q.eq(term_col, term_val)

        chunk = q.range(start, start + page_size - 1).execute()
        rows = chunk.data or []

        if not rows:
            break

        for r in rows:
            raw_code = (r.get(code_col) or "").strip()
            code = norm_course_code(raw_code)
            if not code:
                continue

            title = (r.get(title_col) or "").strip() if title_col else None
            units = _parse_units(r.get(units_col)) if units_col else None

            catalog[code] = CatalogCourse(
                code=code,
                title=title or None,
                units=units,
            )

        # If fewer than page_size rows returned, we reached the end
        if len(rows) < page_size:
            break

        start += page_size

    return catalog
