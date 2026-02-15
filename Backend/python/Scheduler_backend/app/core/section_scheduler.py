from __future__ import annotations

import re
from typing import Dict, List, Optional, Set, Tuple

from app.core.section_models import SectionOption, MeetingBlock


# --- Parsing helpers ---

DAY_MAP = {
    "M": 0,
    "MON": 0,
    "T": 1,
    "TUE": 1,
    "TU": 1,
    "W": 2,
    "WED": 2,
    "TH": 3,
    "R": 3,     # some systems use R for Thursday
    "THU": 3,
    "F": 4,
    "FRI": 4,
    "SA": 5,
    "SAT": 5,
    "SU": 6,
    "SUN": 6,
}

def parse_days(day_str: str) -> Set[int]:
    """
    Supports formats like:
      "MW", "TTh", "TR", "Mon/Wed", "M W", "T,Th"
    """
    s = day_str.strip()
    if not s:
        return set()

    s = s.replace("/", " ").replace(",", " ").replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()

    # Normalize common multi-letter tokens first
    tokens: List[str] = []
    i = 0
    upper = s.upper()

    # Detect "TH" as a token (or "TTH")
    while i < len(upper):
        if upper[i:i+2] == "TH":
            tokens.append("TH")
            i += 2
        elif upper[i] in "MTWRF":
            tokens.append(upper[i])
            i += 1
        elif upper[i].isalpha():
            # Handle words like MON WED
            # Split on spaces then map later
            break
        else:
            i += 1

    if not tokens:
        tokens = upper.split()

    out = set()
    for t in tokens:
        t = t.strip()
        if not t:
            continue
        if t in DAY_MAP:
            out.add(DAY_MAP[t])
        else:
            # Try matching MON/TUE/WED/THU/FRI
            t3 = t[:3]
            if t3 in DAY_MAP:
                out.add(DAY_MAP[t3])
    return out


TIME_RE = re.compile(
    r"^\s*([0-9]{1,2})(?::([0-9]{2}))?\s*(AM|PM)?\s*-\s*([0-9]{1,2})(?::([0-9]{2}))?\s*(AM|PM)?\s*$",
    re.IGNORECASE
)

def _to_minutes(h: int, m: int, ampm: Optional[str]) -> int:
    ampm_u = (ampm or "").upper()
    if ampm_u in ("AM", "PM"):
        if h == 12:
            h = 0
        if ampm_u == "PM":
            h += 12
    return h * 60 + m

def parse_time_range(time_str: str) -> Optional[Tuple[int, int]]:
    """
    Supports: "10:00AM-11:15AM", "2-3:15PM", "14:00-15:15"
    If AM/PM missing, assumes 24h if hour >= 13, otherwise returns None (ambiguous).
    """
    s = time_str.strip()
    if not s or "TBA" in s.upper():
        return None

    m = TIME_RE.match(s)
    if not m:
        return None

    h1 = int(m.group(1))
    m1 = int(m.group(2) or 0)
    ap1 = m.group(3)

    h2 = int(m.group(4))
    m2 = int(m.group(5) or 0)
    ap2 = m.group(6)

    # If one side has AM/PM and the other doesn't, copy it
    if ap1 and not ap2:
        ap2 = ap1
    if ap2 and not ap1:
        ap1 = ap2

    # If neither has AM/PM, assume 24h only if hours look 24h
    if not ap1 and not ap2:
        if h1 >= 13 or h2 >= 13:
            start = h1 * 60 + m1
            end = h2 * 60 + m2
            return (start, end) if end > start else None
        return None

    start = _to_minutes(h1, m1, ap1)
    end = _to_minutes(h2, m2, ap2)
    return (start, end) if end > start else None


# --- Conflict checking and scheduling ---

def conflicts(a: MeetingBlock, b: MeetingBlock, buffer_min: int = 0) -> bool:
    if not (a.days & b.days):
        return False
    # Apply buffer both ways
    a_start = a.start_min - buffer_min
    a_end = a.end_min + buffer_min
    b_start = b.start_min - buffer_min
    b_end = b.end_min + buffer_min
    return not (a_end <= b_start or b_end <= a_start)

def section_conflicts(sec: SectionOption, chosen: List[SectionOption], buffer_min: int = 0) -> bool:
    for other in chosen:
        for ma in sec.meetings:
            for mb in other.meetings:
                if conflicts(ma, mb, buffer_min=buffer_min):
                    return True
    return False

def score_schedule(chosen: List[SectionOption]) -> int:
    """
    Simple scoring:
      - fewer campus days is better
      - fewer gaps is better (approx)
    """
    # Days used
    days_used = set()
    by_day: Dict[int, List[Tuple[int, int]]] = {}
    for s in chosen:
        for m in s.meetings:
            for d in m.days:
                days_used.add(d)
                by_day.setdefault(d, []).append((m.start_min, m.end_min))

    day_penalty = len(days_used) * 1000

    gap_penalty = 0
    for d, intervals in by_day.items():
        intervals.sort()
        for i in range(1, len(intervals)):
            prev_end = intervals[i-1][1]
            cur_start = intervals[i][0]
            if cur_start > prev_end:
                gap_penalty += (cur_start - prev_end)

    return -(day_penalty + gap_penalty)

def pick_sections(
    options_by_course: Dict[str, List[SectionOption]],
    *,
    buffer_min: int = 0,
    max_solutions_checked: int = 20000,
) -> Tuple[List[SectionOption], Dict[str, str]]:
    """
    Returns (best_schedule, failures)
    failures: course -> reason
    """
    courses = list(options_by_course.keys())
    courses.sort(key=lambda c: len(options_by_course.get(c, [])))

    failures: Dict[str, str] = {}
    for c in courses:
        if not options_by_course.get(c):
            failures[c] = "No sections available after filtering."

    best: List[SectionOption] = []
    best_score = -10**18
    checked = 0

    def backtrack(i: int, chosen: List[SectionOption]):
        nonlocal best, best_score, checked
        if checked >= max_solutions_checked:
            return
        if i == len(courses):
            checked += 1
            sc = score_schedule(chosen)
            if sc > best_score:
                best_score = sc
                best = chosen.copy()
            return

        course = courses[i]
        opts = options_by_course.get(course, [])
        if not opts:
            # skip; failure recorded
            backtrack(i + 1, chosen)
            return

        for sec in opts:
            if section_conflicts(sec, chosen, buffer_min=buffer_min):
                continue
            chosen.append(sec)
            backtrack(i + 1, chosen)
            chosen.pop()

    backtrack(0, [])

    return best, failures
