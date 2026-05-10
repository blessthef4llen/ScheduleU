"""API models and helpers for Transcript Models."""

from pydantic import BaseModel, Field


class TranscriptStudentInfo(BaseModel):
    name: str | None = None
    student_id: str | None = None


class TranscriptCourse(BaseModel):
    course_code: str
    subject: str
    course_number: str
    title: str | None = None
    term: str | None = None
    grade: str | None = None
    units: float | None = None
    raw_line: str
    matched_catalog: bool = False
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class TranscriptTermGroup(BaseModel):
    term: str
    courses: list[TranscriptCourse] = Field(default_factory=list)


class TranscriptParseResponse(BaseModel):
    student: TranscriptStudentInfo = Field(default_factory=TranscriptStudentInfo)
    extracted_courses: list[TranscriptCourse] = Field(default_factory=list)
    grouped_by_term: list[TranscriptTermGroup] = Field(default_factory=list)
    unmatched_lines: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    total_pages: int = 0
    extracted_text_chars: int = 0
