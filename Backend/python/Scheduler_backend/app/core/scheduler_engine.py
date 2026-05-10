"""Core scheduling backend logic for Scheduler Engine."""

# app/core/scheduler_engine.py
from __future__ import annotations
from typing import Set, List, Dict, Optional
from .deps_model import DependencyModel
from .scheduling_models import TermSchedule, SchedulePlan


# Return course units, with a default when units are missing.
def units_of(model: DependencyModel, course: str) -> float:
    meta = model.courses.get(course)
    if meta and meta.units is not None:
        return float(meta.units)
    return 3.0  # fallback

def generate_plan(
    model: DependencyModel,
    targets: Set[str],
    completed: Set[str],
    terms: List[str],
    max_units: int = 15,
    max_courses: int = 5,
    include_prereq_closure: bool = True,
    include_coreqs: bool = True,
    strict_coreq_same_term: bool = False,
) -> SchedulePlan:
    # Build a term-by-term plan that respects prereqs, coreqs, and limits.
    warnings: List[str] = []

    # Expand targets to include transitive prereqs/coreqs if desired
    working = model.dependency_closure(targets) if include_prereq_closure else set(targets)

    # Remove completed from planning set
    working -= set(completed)

    # Early cycle check on prereqs (within working)
    if model.detect_cycle(working):
        return SchedulePlan(terms=[], unscheduled=sorted(working), warnings=["Cycle detected in prerequisite graph."])

    # Build prereq graph within working
    adj, indeg = model.build_prereq_graph(working)

    # Track external prereqs (not in working) that could block a course
    def external_prereqs_not_done(course: str) -> Set[str]:
        ext = set()
        for p in model.all_prereqs(course):
            if p not in working and p not in completed:
                ext.add(p)
        return ext

    def is_available(course: str) -> bool:
        if course in completed:
            return False
        if course not in working:
            return False
        if indeg.get(course, 999) != 0:
            return False
        if external_prereqs_not_done(course):
            return False
        return True

    remaining = set(working)
    plan_terms: List[TermSchedule] = []

    for term in terms:
        if not remaining:
            break

        available = sorted([c for c in remaining if is_available(c)],
                           key=lambda c: (len(model.all_prereqs(c)), c))

        if not available:
            # deadlock: blocked by external prereqs or constraints
            break

        chosen: List[str] = []
        used_units: float = 0.0

        def can_add(c: str) -> bool:
            nonlocal used_units
            if c not in remaining or c in chosen:
                return False
            u = units_of(model, c)
            if len(chosen) + 1 > max_courses:
                return False
            if used_units + u > max_units:
                return False
            return True

        def add_course(c: str) -> bool:
            nonlocal used_units
            if not can_add(c):
                return False
            chosen.append(c)
            used_units += units_of(model, c)
            return True

        for c in available:
            if c not in remaining:
                continue

            # Coreq logic
            if include_coreqs:
                coreqs = [x for x in model.all_coreqs(c) if x not in completed]
                coreqs = [x for x in coreqs if x in remaining or x in working]

                if strict_coreq_same_term and coreqs:
                    bundle = [c] + [x for x in coreqs if x in remaining]
                    # Ensure all in bundle are available prereq-wise (basic)
                    if any((x != c and (not is_available(x))) for x in bundle):
                        continue
                    bundle_units = sum(units_of(model, x) for x in bundle)
                    if len(chosen) + len(bundle) <= max_courses and used_units + bundle_units <= max_units:
                        for x in bundle:
                            add_course(x)
                    else:
                        continue
                else:
                    if not add_course(c):
                        continue
                    for x in coreqs:
                        # allow coreq even if not "available" by indeg, unless strict; coreqs usually don’t have prereq constraints
                        if x in remaining and x not in chosen and can_add(x):
                            add_course(x)
            else:
                add_course(c)

        # Ensure at least one course taken if possible (units constraint edge)
        if not chosen and available:
            # take smallest units course
            c = min(available, key=lambda z: units_of(model, z))
            add_course(c)

        # Apply completion updates
        for c in chosen:
            if c not in remaining:
                continue
            remaining.remove(c)
            completed.add(c)
            for nxt in adj.get(c, set()):
                indeg[nxt] -= 1

        total_units = used_units if chosen else 0.0
        plan_terms.append(TermSchedule(term=term, courses=chosen, total_units=total_units))

    unscheduled = sorted(list(remaining))

    if unscheduled:
        # Give a useful warning: external prereqs missing
        blocked_by_external = []
        for c in unscheduled:
            ext = external_prereqs_not_done(c)
            if ext:
                blocked_by_external.append((c, sorted(ext)))
        if blocked_by_external:
            warnings.append(
                "Some courses are blocked by prerequisites not included in the plan and not completed."
            )
        else:
            warnings.append(
                "Some courses could not be scheduled due to constraints (max_units/max_courses) or term list too short."
            )

    return SchedulePlan(terms=plan_terms, unscheduled=unscheduled, warnings=warnings)
