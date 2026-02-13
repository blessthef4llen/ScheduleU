#!/usr/bin/env python3
"""
course_dependency.py

Keep only rows that have at least one *course code* dependency in prereq/coreq.

Supports either:
  - structured columns (prereq_courses/coreq_courses) like "CECS274|MATH123"
  - or raw text columns (prereq_text_raw/coreq_text_raw/description)

Writes:
  1) out_csv: filtered courses
  2) optional edges_csv: one row per dependency edge (course -> required_course)

Examples:
  python3 course_dependency.py \
    --in_csv catalog_with_reqs.csv \
    --out_csv courses_with_class_dependencies.csv

  python3 course_dependency.py \
    --in_csv catalog_with_reqs.csv \
    --out_csv courses_with_class_dependencies.csv \
    --edges_csv dependency_edges.csv \
    --course_key_col course_key \
    --prereq_col prereq_courses --coreq_col coreq_courses
"""

from __future__ import annotations

import argparse
import csv
import re
from typing import Dict, List, Set, Tuple, Optional

COURSE_RE = re.compile(r"\b([A-Z]{2,6})\s*([0-9]{2,3})([A-Z]?)\b")

DEFAULT_IGNORE_PHRASES = [
    "graduate standing", "junior standing", "senior standing",
    "upper-division standing", "upper division standing",
    "ge foundations", "general education",
    "consent of instructor", "instructor consent",
    "department consent", "permission of instructor", "permission required",
    "admission to the program", "admission to program",
    "minimum gpa", "gpa", "restricted to", "major only",
]

def extract_codes(any_text: str) -> Set[str]:
    if not any_text:
        return set()
    codes = set()
    for dept, num, suf in COURSE_RE.findall(str(any_text).upper()):
        codes.add(f"{dept}{num}{suf}")
    return codes

def split_structured_list(cell: str) -> Set[str]:
    """
    Handles pipe-separated, comma-separated, JSON-ish arrays, or random text.
    Just extracts all course codes present.
    """
    return extract_codes(cell or "")

def looks_like_only_non_course_req(text: str, ignore_phrases: List[str]) -> bool:
    t = (text or "").lower()
    if any(p in t for p in ignore_phrases) and not extract_codes(text):
        return True
    return False

def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Filter CSV to courses that have any class dependency.")
    ap.add_argument("--in_csv", required=True)
    ap.add_argument("--out_csv", required=True)
    ap.add_argument("--edges_csv", default=None, help="Optional: write dependency edges CSV")
    ap.add_argument("--delimiter", default=",")
    ap.add_argument("--course_key_col", default="course_key", help="Course identifier column for edges output")

    # Preferred structured columns (if you have them)
    ap.add_argument("--prereq_col", default="prereq_courses")
    ap.add_argument("--coreq_col", default="coreq_courses")

    # Fallback raw text columns (if structured columns not present/empty)
    ap.add_argument("--prereq_text_col", default="prereq_text_raw")
    ap.add_argument("--coreq_text_col", default="coreq_text_raw")
    ap.add_argument("--extra_text_cols", nargs="*", default=["description", "notes", "requisites"])

    return ap.parse_args()

def main() -> None:
    args = parse_args()
    ignore_phrases = DEFAULT_IGNORE_PHRASES

    with open(args.in_csv, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=args.delimiter)
        if not reader.fieldnames:
            raise SystemExit("No header found in input CSV.")

        fieldnames = reader.fieldnames
        filtered: List[Dict[str, str]] = []
        edges: List[Dict[str, str]] = []

        for row in reader:
            # Gather prereq/coreq codes from structured columns if present
            prereq_codes = split_structured_list(row.get(args.prereq_col, ""))
            coreq_codes  = split_structured_list(row.get(args.coreq_col, ""))

            # If structured cols are empty, fall back to raw text columns
            if not prereq_codes:
                prereq_text = row.get(args.prereq_text_col, "") or ""
                if not looks_like_only_non_course_req(prereq_text, ignore_phrases):
                    prereq_codes = extract_codes(prereq_text)

            if not coreq_codes:
                coreq_text = row.get(args.coreq_text_col, "") or ""
                if not looks_like_only_non_course_req(coreq_text, ignore_phrases):
                    coreq_codes = extract_codes(coreq_text)

            # If still empty, try other text columns (optional)
            if not prereq_codes and not coreq_codes:
                for c in args.extra_text_cols:
                    if c in row:
                        prereq_codes |= extract_codes(row.get(c, "") or "")

            has_any = bool(prereq_codes or coreq_codes)
            if not has_any:
                continue

            filtered.append(row)

            # Optional: build dependency edges
            if args.edges_csv:
                course_key = (row.get(args.course_key_col) or "").strip() or (row.get("course_id") or "").strip()
                if not course_key:
                    # fallback: try subject+number if present, else skip edges
                    subj = (row.get("subject") or "").strip()
                    num  = (row.get("course_number") or row.get("catalog_number") or "").strip()
                    course_key = f"{subj} {num}".strip()

                if course_key:
                    for req in sorted(prereq_codes):
                        edges.append({"course_key": course_key, "required_course": req, "type": "prereq"})
                    for req in sorted(coreq_codes):
                        edges.append({"course_key": course_key, "required_course": req, "type": "coreq"})

        # Write filtered CSV (same schema as input)
        with open(args.out_csv, "w", newline="", encoding="utf-8") as out:
            w = csv.DictWriter(out, fieldnames=fieldnames, extrasaction="ignore")
            w.writeheader()
            w.writerows(filtered)

        print(f"Kept {len(filtered)} rows with class dependencies -> {args.out_csv}")

        # Write edges CSV if requested
        if args.edges_csv:
            with open(args.edges_csv, "w", newline="", encoding="utf-8") as out:
                w = csv.DictWriter(out, fieldnames=["course_key", "required_course", "type"])
                w.writeheader()
                w.writerows(edges)
            print(f"Wrote {len(edges)} dependency edges -> {args.edges_csv}")

if __name__ == "__main__":
    main()
