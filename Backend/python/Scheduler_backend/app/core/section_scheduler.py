from __future__ import annotations

import re
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass

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


# Parse many day-string formats into internal day indexes.
def parse_days(day_str: str) -> Set[int]:
    """
    Supports formats like:
      "MW", "TTh", "TR", "Mon/Wed", "M W", "T,Th"
    """
    raw = day_str.strip()
    if not raw:
        return set()

    # Normalize separators and casing.
    upper = raw.upper().replace("/", " ").replace(",", " ").replace("-", " ")
    upper = re.sub(r"\s+", " ", upper).strip()

    # Support compact forms (MW, TTH, TUTH) and spaced words (MON WED, TU TH).
    # Use longest-first token matching to avoid splitting TH into T + H, etc.
    compact = re.sub(r"[^A-Z]", "", upper)
    if compact:
        token_re = re.compile(r"MON|TUE|WED|THU|FRI|SAT|SUN|TH|TU|SA|SU|M|T|W|R|F")
        tokens = token_re.findall(compact)
    else:
        tokens = []
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


# Convert parsed hour/minute to minutes from midnight.
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
    # If meetings overlap in time on any shared day, they conflict.
    if not (a.end_min <= b.start_min or b.end_min <= a.start_min):
        return True

    # Meetings do not overlap; enforce one-way minimum gap.
    # Exactly-equal buffer is allowed (reject only when gap < buffer).
    if a.end_min <= b.start_min:
        return (b.start_min - a.end_min) < buffer_min
    return (a.start_min - b.end_min) < buffer_min

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


@dataclass(frozen=True)
class ScheduleMetrics:
    days_used: int
    total_gap_minutes: int
    earliest_start: int
    latest_end: int


def compute_schedule_metrics(chosen: List[SectionOption]) -> ScheduleMetrics:
    days_used_set = set()
    by_day: Dict[int, List[Tuple[int, int]]] = {}
    earliest_start = 24 * 60
    latest_end = 0

    for sec in chosen:
        for m in sec.meetings:
            earliest_start = min(earliest_start, m.start_min)
            latest_end = max(latest_end, m.end_min)
            for d in m.days:
                days_used_set.add(d)
                by_day.setdefault(d, []).append((m.start_min, m.end_min))

    total_gap = 0
    for intervals in by_day.values():
        intervals.sort()
        for i in range(1, len(intervals)):
            prev_end = intervals[i - 1][1]
            cur_start = intervals[i][0]
            if cur_start > prev_end:
                total_gap += (cur_start - prev_end)

    if earliest_start == 24 * 60:
        earliest_start = 0

    return ScheduleMetrics(
        days_used=len(days_used_set),
        total_gap_minutes=total_gap,
        earliest_start=earliest_start,
        latest_end=latest_end,
    )


def score_schedule_by_preference(
    chosen: List[SectionOption],
    preference: str = "compact",
    preferred_sections: Optional[Dict[str, str]] = None,
) -> int:
    m = compute_schedule_metrics(chosen)
    p = (preference or "compact").strip().lower()

    # Higher score = better ranking.
    if p == "fewest_days":
        base = -(m.days_used * 100000 + m.total_gap_minutes * 10 + m.latest_end)
    elif p == "latest_start":
        base = m.earliest_start * 100 - m.days_used * 1000 - m.total_gap_minutes
    elif p == "earliest_end":
        base = -(m.latest_end * 100 + m.total_gap_minutes * 10 + m.days_used * 1000)
    else:
        # compact (default): fewer days + fewer gaps + earlier finish.
        base = -(m.days_used * 100000 + m.total_gap_minutes * 10 + m.latest_end)

    # Prefer schedules that keep the user's selected sections when possible.
    # This is a strong ranking bonus, but it is not a hard constraint.
    if not preferred_sections:
        return base
    matched = 0
    for sec in chosen:
        pref = preferred_sections.get(sec.course)
        if pref and sec.section_id.strip() == pref.strip():
            matched += 1
    return base + matched * 1_000_000


def pick_ranked_schedules(
    options_by_course: Dict[str, List[SectionOption]],
    *,
    buffer_min: int = 0,
    max_solutions_checked: int = 20000,
    max_results: int = 5,
    ranking_preference: str = "compact",
    preferred_sections: Optional[Dict[str, str]] = None,
) -> Tuple[List[Tuple[List[SectionOption], int, ScheduleMetrics]], Dict[str, str]]:
    """
    Returns ranked schedules:
      [ (sections, score, metrics), ... ]
    """
    courses = list(options_by_course.keys())
    courses.sort(key=lambda c: len(options_by_course.get(c, [])))

    failures: Dict[str, str] = {}
    for c in courses:
        if not options_by_course.get(c):
            failures[c] = "No sections available after filtering."

    checked = 0
    candidates: List[Tuple[List[SectionOption], int, ScheduleMetrics]] = []
    seen_keys: Set[Tuple[Tuple[str, str], ...]] = set()

    def _schedule_key(chosen: List[SectionOption]) -> Tuple[Tuple[str, str], ...]:
        return tuple(sorted((s.course, s.section_id) for s in chosen))

    def backtrack(i: int, chosen: List[SectionOption]):
        nonlocal checked
        if checked >= max_solutions_checked:
            return
        if i == len(courses):
            checked += 1
            key = _schedule_key(chosen)
            if key in seen_keys:
                return
            seen_keys.add(key)
            score = score_schedule_by_preference(
                chosen,
                ranking_preference,
                preferred_sections=preferred_sections,
            )
            metrics = compute_schedule_metrics(chosen)
            candidates.append((chosen.copy(), score, metrics))
            return

        course = courses[i]
        opts = options_by_course.get(course, [])
        if not opts:
            backtrack(i + 1, chosen)
            return

        for sec in opts:
            if section_conflicts(sec, chosen, buffer_min=buffer_min):
                continue
            chosen.append(sec)
            backtrack(i + 1, chosen)
            chosen.pop()

    backtrack(0, [])

    candidates.sort(key=lambda t: t[1], reverse=True)
    return candidates[: max(1, max_results)], failures

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
    ranked, failures = pick_ranked_schedules(
        options_by_course,
        buffer_min=buffer_min,
        max_solutions_checked=max_solutions_checked,
        max_results=1,
        ranking_preference="compact",
    )
    best = ranked[0][0] if ranked else []
    return best, failures
