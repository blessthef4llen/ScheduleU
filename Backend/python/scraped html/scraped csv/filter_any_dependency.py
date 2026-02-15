#!/usr/bin/env python3
"""
filter_any_dependency_v3.py

Keeps rows that have ANY course-to-course dependency.
Fixes missed rows by handling bare-number prereqs/coreqs like "274" (dept implied).

Outputs:
  - out_csv: filtered rows (same schema as input)
  - audit_csv: extracted codes + small snippets for debugging

Usage:
  python3 filter_any_dependency_v3.py \
    --in_csv in.csv --out_csv out.csv --audit_csv audit.csv \
    --subject_col subject \
    --prereq_col prereq_courses --coreq_col coreq_courses \
    --prereq_text_col prereq_text_raw --coreq_text_col coreq_text_raw
"""

from __future__ import annotations
import argparse, csv, re
from typing import Dict, List, Set, Optional, Tuple

DEPT_CODE_RE = re.compile(r"\b([A-Z]{2,6})\s*([0-9]{2,3})([A-Z]?)\b")
BARE_NUM_RE  = re.compile(r"\b([0-9]{2,3})([A-Z]?)\b")

STOPWORD_DEPTS = {
    "AND","OR","THE","FOR","TO","IN","OF","ON","AT","BY","WITH","FROM",
    "A","AN","AS","IS","ARE","BE","WAS","WERE","NOT","NO","YES"
}

IGNORE_PHRASES = [
    "graduate standing","junior standing","senior standing",
    "upper-division standing","upper division standing",
    "ge foundations","general education",
    "consent of instructor","instructor consent","department consent",
    "permission of instructor","permission required",
    "admission to the program","admission to program",
    "minimum gpa","gpa","restricted to","major only",
]

def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in_csv", required=True)
    ap.add_argument("--out_csv", required=True)
    ap.add_argument("--audit_csv", required=True)
    ap.add_argument("--delimiter", default=",")
    ap.add_argument("--subject_col", default="subject")

    ap.add_argument("--prereq_col", default="prereq_courses")
    ap.add_argument("--coreq_col", default="coreq_courses")
    ap.add_argument("--prereq_text_col", default="prereq_text_raw")
    ap.add_argument("--coreq_text_col", default="coreq_text_raw")
    ap.add_argument("--extra_text_cols", nargs="*", default=["description","notes","requisites"])
    return ap.parse_args()

def norm_subject(s: str) -> str:
    return (s or "").strip().upper()

def has_ignore_phrase(text: str) -> bool:
    t = (text or "").lower()
    return any(p in t for p in IGNORE_PHRASES)

def extract_codes_with_context(text: str, row_subject: str, valid_subjects: Set[str]) -> List[str]:
    """
    Extract explicit DEPT+NUM codes. Also infer dept for bare numbers using:
      - last dept seen in text (if any)
      - else row_subject (if available and valid)
    We keep it conservative using stopwords and valid_subjects when available.
    """
    if not text:
        return []

    row_subject = norm_subject(row_subject)
    subj_ok = (not valid_subjects) or (row_subject in valid_subjects)

    seen: Set[str] = set()
    out: List[str] = []

    # 1) explicit dept+num
    last_dept: Optional[str] = None
    any_explicit_dept = False
    for m in DEPT_CODE_RE.finditer(text):
        dept = m.group(1).upper()
        num  = m.group(2)
        suf  = m.group(3).upper()

        if dept in STOPWORD_DEPTS:
            continue
        if valid_subjects and dept not in valid_subjects:
            continue

        any_explicit_dept = True
        last_dept = dept
        code = f"{dept}{num}{suf}"
        if code not in seen:
            seen.add(code)
            out.append(code)

    # 2) infer for bare numbers
    inferred_dept: Optional[str] = None
    if last_dept:
        inferred_dept = last_dept
    elif subj_ok and row_subject:
        inferred_dept = row_subject

    # Only infer bare nums if:
    #  - we have an inferred dept, AND
    #  - either there were no explicit depts in text (common "274"), OR we already saw a dept ("CECS 274 and 274L")
    if inferred_dept and (not any_explicit_dept or last_dept):
        for m in BARE_NUM_RE.finditer(text):
            num = m.group(1)
            suf = m.group(2).upper()

            # Guard: avoid picking up random 2-3 digit things in non-req text.
            # If the text is long and has no req indicators, be cautious.
            code = f"{inferred_dept}{num}{suf}"
            if code not in seen:
                seen.add(code)
                out.append(code)

    return out

def extract_from_cell(cell: str, row_subject: str, valid_subjects: Set[str]) -> List[str]:
    # Works for pipe/comma/json-ish too, because we just scan for patterns
    return extract_codes_with_context(str(cell or ""), row_subject, valid_subjects)

def main() -> None:
    args = parse_args()

    with open(args.in_csv, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=args.delimiter)
        if not reader.fieldnames:
            raise SystemExit("Input CSV has no header.")
        rows = list(reader)
        fieldnames = reader.fieldnames

    # Build valid subject set if subject_col exists and populated
    valid_subjects: Set[str] = set()
    if args.subject_col in fieldnames:
        for r in rows:
            s = norm_subject(r.get(args.subject_col, ""))
            if s:
                valid_subjects.add(s)

    filtered: List[Dict[str, str]] = []
    audit: List[Dict[str, str]] = []

    for i, row in enumerate(rows):
        row_subj = row.get(args.subject_col, "") if args.subject_col in row else ""

        prereq_codes: List[str] = []
        coreq_codes: List[str] = []
        source = ""

        # structured first
        prereq_cell = row.get(args.prereq_col, "") if args.prereq_col in row else ""
        coreq_cell  = row.get(args.coreq_col, "") if args.coreq_col in row else ""

        prereq_codes = extract_from_cell(prereq_cell, row_subj, valid_subjects)
        coreq_codes  = extract_from_cell(coreq_cell,  row_subj, valid_subjects)
        if prereq_codes or coreq_codes:
            source = "structured"

        # raw text fallback
        if not prereq_codes and args.prereq_text_col in row:
            txt = row.get(args.prereq_text_col, "") or ""
            if not (has_ignore_phrase(txt) and not DEPT_CODE_RE.search(txt)):
                prereq_codes = extract_codes_with_context(txt, row_subj, valid_subjects)
                if prereq_codes:
                    source = source or "raw_text"

        if not coreq_codes and args.coreq_text_col in row:
            txt = row.get(args.coreq_text_col, "") or ""
            if not (has_ignore_phrase(txt) and not DEPT_CODE_RE.search(txt)):
                coreq_codes = extract_codes_with_context(txt, row_subj, valid_subjects)
                if coreq_codes:
                    source = source or "raw_text"

        # extra columns last
        if not prereq_codes and not coreq_codes:
            found: List[str] = []
            for c in args.extra_text_cols:
                if c in row and row.get(c):
                    found += extract_codes_with_context(row.get(c, ""), row_subj, valid_subjects)
            # treat as prereq bucket
            if found:
                # de-dup preserve order
                seen = set()
                prereq_codes = [x for x in found if not (x in seen or seen.add(x))]
                source = "extra_text"

        has_dep = bool(prereq_codes or coreq_codes)
        if has_dep:
            filtered.append(row)

        audit.append({
            "row_index": str(i),
            "course_label": (row.get("course_key") or row.get("course_id") or row.get("course_code_full") or "").strip(),
            "row_subject": norm_subject(row_subj),
            "valid_subjects_count": str(len(valid_subjects)),
            "source": source,
            "prereq_codes": "|".join(prereq_codes),
            "coreq_codes": "|".join(coreq_codes),
            "prereq_snip": (str(prereq_cell) or "")[:200],
            "coreq_snip": (str(coreq_cell) or "")[:200],
            "prereq_text_snip": (str(row.get(args.prereq_text_col, "")) or "")[:200],
            "coreq_text_snip": (str(row.get(args.coreq_text_col, "")) or "")[:200],
        })

    with open(args.out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(filtered)

    audit_fields = [
        "row_index","course_label","row_subject","valid_subjects_count","source",
        "prereq_codes","coreq_codes","prereq_snip","coreq_snip","prereq_text_snip","coreq_text_snip"
    ]
    with open(args.audit_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=audit_fields)
        w.writeheader()
        w.writerows(audit)

    print(f"Input rows: {len(rows)}")
    print(f"Valid subjects detected: {len(valid_subjects)}")
    print(f"Kept rows with class dependencies: {len(filtered)} -> {args.out_csv}")
    print(f"Wrote audit -> {args.audit_csv}")

if __name__ == "__main__":
    main()
