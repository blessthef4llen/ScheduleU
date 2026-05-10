"""Core scheduling backend logic for Rmp Client."""

from __future__ import annotations

import base64
import os
import re
from functools import lru_cache
from typing import Any

import requests

from app.api.professor_models import ProfessorRatingLookupResponse

RMP_GRAPHQL_URL = "https://www.ratemyprofessors.com/graphql"
RMP_SEARCH_SCHOOLS_QUERY = """
query NewSearchSchoolsQuery($query: SchoolSearchQuery!) {
  newSearch {
    schools(query: $query) {
      edges {
        node {
          id
          legacyId
          name
          city
          state
        }
      }
    }
  }
}
""".strip()
RMP_GRAPHQL_QUERY = """
query TeacherSearchResultsPageQuery(
  $query: TeacherSearchQuery!
  $schoolID: ID
  $includeSchoolFilter: Boolean!
) {
  search: newSearch {
    teachers(query: $query, first: 1000, after: "") {
      edges {
        node {
          id
          legacyId
          firstName
          lastName
          department
          avgRating
          avgDifficulty
          wouldTakeAgainPercent
          numRatings
          school {
            id
            name
          }
        }
      }
    }
  }
  school: node(id: $schoolID) @include(if: $includeSchoolFilter) {
    __typename
    ... on School {
      name
    }
    id
  }
}
""".strip()
DEFAULT_SCHOOL_NAME = os.getenv("RMP_SCHOOL_NAME", "California State University Long Beach")
REQUEST_TIMEOUT_SECONDS = 8


def _coerce_float(value: Any) -> float | None:
    if value in (None, "", "N/A"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_int(value: Any) -> int | None:
    if value in (None, "", "N/A"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_instructor_name(name: str) -> str | None:
    text = re.sub(r"\s+", " ", name).strip()
    if not text:
        return None

    lowered = text.lower()
    if lowered in {"tba", "staff", "arranged", "unknown", "n/a"}:
        return None

    text = re.sub(r"\b(dr|prof|professor)\.?\s+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\([^)]*\)", "", text).strip()

    for separator in [" / ", " & ", ";", "|"]:
        if separator in text:
            text = text.split(separator, 1)[0].strip()

    if "," in text and text.count(",") == 1:
        last, first = [part.strip() for part in text.split(",", 1)]
        if first and last:
            text = f"{first} {last}"

    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def _candidate_search_texts(name: str) -> list[str]:
    tokens = [token for token in name.split(" ") if token]
    if not tokens:
        return []

    candidates: list[str] = [name]

    if len(tokens) >= 2 and len(tokens[-1]) == 1:
        last_name = " ".join(tokens[:-1]).strip()
        first_initial = tokens[-1].strip()

        last_name_with_initial = f"{last_name} {first_initial}".strip()
        if last_name_with_initial:
            candidates.append(last_name_with_initial)

        without_initial = last_name
        if without_initial:
            candidates.append(without_initial)

        last_name_only = last_name
        if last_name_only:
            candidates.append(last_name_only)

    deduped: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        lowered = candidate.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        deduped.append(candidate)
    return deduped


def _score_match(search_name: str, node: dict[str, Any]) -> tuple[int, int]:
    first = str(node.get("firstName") or "").strip()
    last = str(node.get("lastName") or "").strip()
    combined = f"{first} {last}".strip()

    if not combined:
        return (10_000, 10_000)

    search_tokens = [token for token in re.split(r"\s+", search_name.lower()) if token]
    first_initial = ""
    search_last_name = ""

    if len(search_tokens) >= 2 and len(search_tokens[-1]) == 1:
        first_initial = search_tokens[-1]
        search_last_name = " ".join(search_tokens[:-1]).strip()
    elif search_tokens:
        search_last_name = " ".join(search_tokens).strip()

    normalized_search = re.sub(r"[^a-z]", "", search_name.lower())
    normalized_combined = re.sub(r"[^a-z]", "", combined.lower())
    normalized_last = re.sub(r"[^a-z]", "", last.lower())
    normalized_first = re.sub(r"[^a-z]", "", first.lower())

    if normalized_search == normalized_combined:
        return (0, 0)

    last_name_penalty = 0
    if search_last_name:
        normalized_search_last = re.sub(r"[^a-z]", "", search_last_name)
        if normalized_search_last != normalized_last:
            last_name_penalty += 100

    first_initial_penalty = 0
    if first_initial:
        if not normalized_first.startswith(first_initial):
            first_initial_penalty += 50

    # Fall back to simple character distance once whitespace is removed.
    distance = abs(len(normalized_search) - len(normalized_combined))
    if normalized_search and normalized_combined:
        distance += 0 if normalized_search in normalized_combined or normalized_combined in normalized_search else 10

    ratings_penalty = -_coerce_int(node.get("numRatings") or 0) or 0
    return (last_name_penalty + first_initial_penalty + distance, ratings_penalty)


def _request_graphql(headers: dict[str, str], payload: dict[str, Any]) -> dict[str, Any] | None:
    try:
        response = requests.post(
            RMP_GRAPHQL_URL,
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        body = response.json()
    except Exception:
        return None

    if body.get("errors"):
        return None
    return body


@lru_cache(maxsize=16)
def _resolve_school_id(headers_key: str, school_name: str) -> tuple[str | None, str]:
    headers = {
        "Authorization": headers_key,
        "Content-Type": "application/json",
        "Referer": "https://www.ratemyprofessors.com/",
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }
    payload = {
        "query": RMP_SEARCH_SCHOOLS_QUERY,
        "variables": {
            "query": {
                "text": school_name,
            }
        },
    }
    body = _request_graphql(headers, payload)
    if not body:
        return (None, school_name)

    edges = (
        body.get("data", {})
        .get("newSearch", {})
        .get("schools", {})
        .get("edges", [])
    )
    nodes = [edge.get("node", {}) for edge in edges if isinstance(edge, dict)]
    if not nodes:
        return (None, school_name)

    def score_school(node: dict[str, Any]) -> tuple[int, int]:
        name = str(node.get("name") or "").strip().lower()
        target = school_name.strip().lower()
        exact_penalty = 0 if name == target else 50
        contains_penalty = 0 if target in name or name in target else 20
        legacy_penalty = 0 if _coerce_int(node.get("legacyId")) else 10
        return (exact_penalty + contains_penalty, legacy_penalty)

    best = sorted(nodes, key=score_school)[0]
    return (best.get("id"), str(best.get("name") or school_name))


@lru_cache(maxsize=512)
def lookup_professor_rating(name: str) -> ProfessorRatingLookupResponse:
    normalized_name = _normalize_instructor_name(name)
    if not normalized_name:
        return ProfessorRatingLookupResponse(query=name, normalized_name=None, found=False)

    headers = {
        "Authorization": "Basic dGVzdDp0ZXN0",
        "Content-Type": "application/json",
        "Referer": "https://www.ratemyprofessors.com/",
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }
    school_id, resolved_school_name = _resolve_school_id(headers["Authorization"], DEFAULT_SCHOOL_NAME)
    if not school_id:
        return ProfessorRatingLookupResponse(query=name, normalized_name=normalized_name, found=False)

    nodes: list[dict[str, Any]] = []

    for search_text in _candidate_search_texts(normalized_name):
        payload = {
            "query": RMP_GRAPHQL_QUERY,
            "variables": {
                "query": {
                    "text": search_text,
                    "schoolID": school_id,
                },
                "schoolID": school_id,
                "includeSchoolFilter": True,
            },
        }

        body = _request_graphql(headers, payload)
        if not body:
            continue

        edges = (
            body.get("data", {})
            .get("search", {})
            .get("teachers", {})
            .get("edges", [])
        )
        nodes = [edge.get("node", {}) for edge in edges if isinstance(edge, dict)]
        if nodes:
            break

    if not nodes:
        return ProfessorRatingLookupResponse(query=name, normalized_name=normalized_name, found=False)

    best = sorted(nodes, key=lambda node: _score_match(normalized_name, node))[0]
    matched_name = f"{best.get('firstName', '')} {best.get('lastName', '')}".strip() or None
    legacy_id = _coerce_int(best.get("legacyId"))

    profile_url = None
    if legacy_id is not None:
        profile_url = f"https://www.ratemyprofessors.com/professor/{legacy_id}"

    return ProfessorRatingLookupResponse(
        query=name,
        normalized_name=normalized_name,
        found=True,
        matched_name=matched_name,
        department=(best.get("department") or None),
        school_name=((best.get("school") or {}).get("name") or resolved_school_name),
        avg_rating=_coerce_float(best.get("avgRating")),
        avg_difficulty=_coerce_float(best.get("avgDifficulty")),
        would_take_again_percent=_coerce_float(best.get("wouldTakeAgainPercent")),
        num_ratings=_coerce_int(best.get("numRatings")),
        profile_url=profile_url,
        legacy_id=legacy_id,
    )
