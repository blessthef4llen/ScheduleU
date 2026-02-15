from pydantic import BaseModel, Field
from typing import Literal

class GenerateRequest(BaseModel):
    targets: list[str] = Field(..., description="Courses you want to schedule (e.g. major requirements).")
    completed: list[str] = Field(default_factory=list, description="Already completed courses")
    max_units: int = Field(default= 18, ge=1, le=30)
    max_courses: int = Field(default=6, ge=1, le=12)
    terms: list[str] = Field(default_factory=lambda: ["Fall", "Spring"], description="Term labels are in rotation")
    start_term_index: int = Field(default=0, ge=0, description="Index into terms list to start.")
    include_coreqs: bool = Field(default=True, description="If true, schedule required coreqs automatically.")
    strict_coreq_same_term: bool = Field(default=False, description="If true, coreq must be in same term; else same or earlier.")
    unknown_course_policy: Literal["ignore", "error"] = "ignore"

class ScheduledCourse(BaseModel):
    course: str
    title: str | None = None
    units: float | None = None

class TermPlan(BaseModel):
    term: str
    courses: list[ScheduledCourse]
    total_units: float | None = None

class GenerateResponse(BaseModel):
    plan: list[TermPlan]
    unscheduled: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

