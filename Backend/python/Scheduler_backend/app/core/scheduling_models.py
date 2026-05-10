"""Core scheduling backend logic for Scheduling Models."""

from dataclasses import dataclass
from typing import List, Optional


# Planned courses for one term.
@dataclass
class TermSchedule:
    term: str
    courses: List[str]
    total_units: Optional[float]


# Full multi-term planning result.
@dataclass
class SchedulePlan:
    terms: List[TermSchedule]
    unscheduled: List[str]
    warnings: List[str]
