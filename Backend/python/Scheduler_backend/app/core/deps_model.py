"""Core scheduling backend logic for Deps Model."""

# app/core/deps_model.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Set, List, Tuple, Optional


# Basic course metadata used by the scheduler.
@dataclass(frozen=True)
class CourseMeta:
    code: str                 # normalized: "A/ST600", "CECS274"
    title: Optional[str] = None
    units: Optional[float] = None


# In-memory prerequisite/corequisite graph.
@dataclass
class DependencyModel:
    # canonical course universe (ideally from full catalog; can start from deps-only)
    courses: Dict[str, CourseMeta]

    # dependencies
    prereqs: Dict[str, Set[str]]   # course -> prereq courses
    coreqs: Dict[str, Set[str]]    # course -> coreq courses

    # Ensure a course exists in the model before adding edges.
    def ensure_course(self, code: str) -> None:
        if code not in self.courses:
            self.courses[code] = CourseMeta(code=code)

    def add_prereq(self, course: str, prereq: str) -> None:
        self.ensure_course(course)
        self.ensure_course(prereq)
        self.prereqs.setdefault(course, set()).add(prereq)

    def add_coreq(self, course: str, coreq: str) -> None:
        self.ensure_course(course)
        self.ensure_course(coreq)
        self.coreqs.setdefault(course, set()).add(coreq)

    def all_prereqs(self, course: str) -> Set[str]:
        return set(self.prereqs.get(course, set()))

    def all_coreqs(self, course: str) -> Set[str]:
        return set(self.coreqs.get(course, set()))

    def dependency_closure(self, targets: Set[str]) -> Set[str]:
        """
        Returns targets plus any transitive prereqs/coreqs found in the model.
        (Useful if user only provides major requirements but you want a complete plan.)
        """
        seen = set(targets)
        stack = list(targets)
        while stack:
            c = stack.pop()
            for p in self.all_prereqs(c) | self.all_coreqs(c):
                if p not in seen:
                    seen.add(p)
                    stack.append(p)
        return seen

    def build_prereq_graph(self, subset: Set[str]) -> Tuple[Dict[str, Set[str]], Dict[str, int]]:
        """
        Build adjacency + indegree for prereq edges within subset.
        Edge: prereq -> course
        """
        adj: Dict[str, Set[str]] = {c: set() for c in subset}
        indeg: Dict[str, int] = {c: 0 for c in subset}

        for course in subset:
            for p in self.all_prereqs(course):
                if p in subset:
                    adj[p].add(course)
                    indeg[course] += 1
        return adj, indeg

    def detect_cycle(self, subset: Set[str]) -> bool:
        """
        Kahn’s algorithm cycle detection on prereq graph.
        """
        adj, indeg = self.build_prereq_graph(subset)
        q = [c for c in subset if indeg[c] == 0]
        visited = 0
        while q:
            n = q.pop()
            visited += 1
            for nxt in adj.get(n, set()):
                indeg[nxt] -= 1
                if indeg[nxt] == 0:
                    q.append(nxt)
        return visited != len(subset)
