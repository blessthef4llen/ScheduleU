# app/core/catalog_merge.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Set, Optional

from .deps_model import DependencyModel, CourseMeta
from .catalog_loader import CatalogCourse


# Summary of how catalog data overlaps dependency data.
@dataclass(frozen=True)
class MergeSummary:
    offered_count: int
    deps_only_count: int
    catalog_only_count: int


def merge_catalog_into_dependency_model(
    model: DependencyModel,
    catalog: Dict[str, CatalogCourse],
    *,
    add_catalog_only_courses: bool = True
) -> MergeSummary:
    """
    Merge Spring catalog metadata into DependencyModel.courses.

    - Courses in catalog get their title/units set (authoritative for term).
    - Courses that exist only in dependencies remain in model (external prereqs/coreqs).
    - Optionally add catalog-only courses into the model so scheduling can include
      courses with no prereqs/coreqs.

    Note: DependencyModel.courses is the course universe for the scheduler.
    """

    # Track sets
    catalog_set: Set[str] = set(catalog.keys())
    deps_set: Set[str] = set(model.courses.keys())

    # Update / overwrite metadata for offered courses
    for code, cat_course in catalog.items():
        if code in model.courses:
            existing = model.courses[code]
            model.courses[code] = CourseMeta(
                code=code,
                title=cat_course.title if cat_course.title is not None else existing.title,
                units=cat_course.units if cat_course.units is not None else existing.units,
            )
        else:
            if add_catalog_only_courses:
                model.courses[code] = CourseMeta(
                    code=code,
                    title=cat_course.title,
                    units=cat_course.units,
                )

    # Compute summary counts
    new_deps_set = set(model.courses.keys())
    offered_count = len(catalog_set & new_deps_set)
    deps_only_count = len(new_deps_set - catalog_set)          # external prereqs not offered in Spring
    catalog_only_count = len(catalog_set - deps_set)           # courses offered that had no deps row originally

    return MergeSummary(
        offered_count=offered_count,
        deps_only_count=deps_only_count,
        catalog_only_count=catalog_only_count,
    )
