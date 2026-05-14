"""API models and helpers for Term Models."""

from pydantic import BaseModel, Field
from typing import Optional


# One blocked time window provided by the user.
class BlockedTime(BaseModel):
    days: list[str] = Field(
        default_factory=list,
        description="Days this block applys to, e.g. ['M','W'] or ['T','TH']",
        examples=[["M", "W"]]
    )
    start: str = Field(
        ...,
        description="Start time of the block, e.g. '12:00PM'",
        examples=["12:00PM"]
    )
    end: str = Field(
        ...,
        description="End time of the block, e.g. '2:00PM'",
        examples=["2:00PM"]
    )


# User constraints for building a single-term schedule.
class TermConstraints(BaseModel):
    earliest_time: Optional[str] = Field(
        default=None,
        description="Earliest allowed start time, e.g. '09:00AM'"
    )
    latest_time: Optional[str] = Field(
        default=None,
        description="Latest allowed end time, e.g. '06:00PM'"
    )
    days_off: list[str] = Field(
        default_factory=list,
        description="Days to avoid, e.g. ['F']"
    )
    buffer_minutes: int = Field(
        default=15,
        ge=0,
        le=60
    )
    blocked_times: list[BlockedTime] = Field(
        default_factory=list,
        description="Time windows to avoid. Sections in these slots will be rejected"
    )

    min_instructor_ratings: Optional[float] = Field(
        default=None,
        ge=0,
        le=5,
        description="Future feature minimun instructor rating [0-5], section below are filtered out if below minimum"
    )
    preferred_professors: list[str] = Field(
        default_factory=list,
        description="Professor names to prefer when ranking otherwise valid schedules."
    )
    blocked_professors: list[str] = Field(
        default_factory=list,
        description="Professor names to exclude from generated schedules when possible."
    )
    ranking_preference: str = Field(
        default="compact",
        description="Ranking preference: compact | fewest_days | latest_start | earliest_end"
    )
    max_schedules: int = Field(
        default=3,
        ge=1,
        le=10,
        description="How many ranked schedule options to return."
    )


class LockedSection(BaseModel):
    course: str
    section_id: str


# Request payload for term schedule generation.
class TermScheduleRequest(BaseModel):
    term: str
    requested_courses: list[str]
    completed_courses: list[str] = Field(default_factory=list)
    locked_sections: list[LockedSection] = Field(default_factory=list)
    constraints: TermConstraints = Field(default_factory=TermConstraints)


# One meeting row in the selected schedule output.
class SelectedMeeting(BaseModel):
    type: Optional[str] = None
    day: str
    start: str
    end: str
    location: Optional[str] = None
    instructor: Optional[str] = None
    comments: Optional[str] = None


# One selected section with all of its meetings.
class SelectedSection(BaseModel):
    course: str
    section_id: str
    meetings: list[SelectedMeeting]


class ScheduleCandidate(BaseModel):
    rank: int
    score: int
    metrics: dict
    explanation_bullets: list[str] = Field(default_factory=list)
    selected_sections: list[SelectedSection] = Field(default_factory=list)


# Response payload for term schedule generation.
class TermScheduleResponse(BaseModel):
    term: str
    selected_sections: list[SelectedSection] = Field(default_factory=list)
    generated_schedules: list[ScheduleCandidate] = Field(default_factory=list)
    unscheduled_courses: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
