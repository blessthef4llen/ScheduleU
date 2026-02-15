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
        default= None,
        ge=0,
        le=5,
        description="Future feature minimun instructor rating [0-5], section below are filtered out if below minimum"
    )

# Request payload for term schedule generation.
class TermScheduleRequest(BaseModel):
    term: str
    requested_courses: list[str]
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

# Response payload for term schedule generation.
class TermScheduleResponse(BaseModel):
    term: str
    selected_sections: list[SelectedSection] = Field(default_factory=list)
    unscheduled_courses: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
