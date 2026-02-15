"""Helpers for normalizing course code strings."""

import re


# Match department + number + optional suffix in common course formats.
def norm_course_code(s: str) -> str:
    """Return a normalized course code key."""

    COURSE_TOKEN_RE = re.compile(r"\b([A-Z][A-Z/]{1,10})\s*([0-9]{2,3})([A-Z]?)\b")
    
    if not s:
        return ""
    
    s = s.strip().upper()
    m = COURSE_TOKEN_RE.search(s)
    if not m:
        return s.replace(" ", "")
    dept, num, suff = m.group(1), m.group(2), m.group(3)
    return f"{dept}{num}{suff}"


# Split pipe-delimited values and normalize each code.
def split_codes(cell: str) -> list[str]:
    if not cell:
        return []
    parts = [p.strip() for p in str(cell).split("|") if p.strip()]
    return [norm_course_code(p) for p in parts if norm_course_code(p)]
