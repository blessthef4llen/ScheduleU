from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, List, Set

@dataclass(frozen=True)
class MeetingBlock:
    days: Set[int]              # 0=Mon ... 6=Sun
    start_min: int              # minutes from midnight
    end_min: int
    meeting_type: Optional[str] = None
    location: Optional[str] = None
    instructor: Optional[str] = None
    comments: Optional[str] = None

@dataclass(frozen=True)
class SectionOption:
    course: str
    section_id: str
    meetings: List[MeetingBlock]
    location: Optional[str] = None
    instructor: Optional[str] = None
