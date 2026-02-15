from dataclasses import dataclass
from typing import List, Optional

@dataclass
class TermSchedule:
    term: str
    courses: List[str]
    total_units: Optional[float]

@dataclass
class SchedulePlan:
    terms: List[TermSchedule]
    unscheduled: List[str]
    warnings: List[str]