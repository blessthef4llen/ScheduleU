from __future__ import annotations

from pydantic import BaseModel


class ProfessorRatingLookupResponse(BaseModel):
    query: str
    normalized_name: str | None = None
    found: bool
    matched_name: str | None = None
    department: str | None = None
    school_name: str | None = None
    avg_rating: float | None = None
    avg_difficulty: float | None = None
    would_take_again_percent: float | None = None
    num_ratings: int | None = None
    profile_url: str | None = None
    legacy_id: int | None = None
    source: str = "ratemyprofessors"
