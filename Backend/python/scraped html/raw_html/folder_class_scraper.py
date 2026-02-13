#!/usr/bin/env python3
r"""
folder_subject_scraper.py

Parse a folder of CSULB SUBJECT schedule HTML pages (one subject per file),
extract all course + section rows, and export one Postgres-ready CSV per subject.

- Auto-detect subject code from HTML (first courseCode like "CECS 491A")
  and falls back to filename (e.g., "CECS.html" -> "CECS").
- Writes \N for NULL numeric fields (Postgres-friendly for COPY/import).
- Deduplicates rows within each subject using section_uid.

Usage:
  python3 folder_subject_scraper.py \
    --term Spring_2026 \
    --html-dir "/path/to/raw_html" \
    --out-dir "/path/to/out_csv"

Deps:
  pip install beautifulsoup4 lxml
"""

import re
import csv
import argparse
import hashlib
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
from pathlib import Path

from bs4 import BeautifulSoup


# ----------------------------
# Helpers
# ----------------------------

def clean_text(s: Optional[str]) -> str:
    if not s:
        return ""
    return " ".join(s.split()).strip()


def parse_units(units_text: str) -> str:
    m = re.search(r"(\d+(?:\.\d+)?)", units_text or "")
    return m.group(1) if m else clean_text(units_text)


def bool_from_no_cost_cell(td) -> bool:
    if td is None:
        return False
    img = td.find("img")
    if not img:
        return False
    alt = (img.get("alt") or "").lower()
    title = (img.get("title") or "").lower()
    return ("zero cost" in alt) or ("zero cost" in title)


def open_seats_value(td) -> str:
    if td is None:
        return ""
    img = td.find("img")
    if img:
        alt = (img.get("alt") or "").strip()
        title = (img.get("title") or "").strip()
        if "Seats available" in alt or "Seats available" in title:
            return "available"
    return clean_text(td.get_text(" ", strip=True))


def extract_notes_ref(td) -> str:
    if td is None:
        return ""
    a = td.find("a")
    if a:
        return clean_text(a.get_text(" ", strip=True))
    return clean_text(td.get_text(" ", strip=True))


def make_section_uid(
    term: str,
    course_code_full: str,
    sec: str,
    type_: str,
    days: str,
    time_: str,
    location: str,
    instructor: str,
    class_number: str,
) -> str:
    """
    Stable UID:
    - Prefer class_number if present
    - Otherwise hash a composite signature of the meeting
    """
    if class_number.strip():
        return f"{term}|{course_code_full}|{sec}|{class_number.strip()}"

    signature = "|".join([
        term,
        course_code_full,
        sec,
        type_,
        days,
        time_,
        location,
        instructor,
    ])
    h = hashlib.sha1(signature.encode("utf-8")).hexdigest()[:16]
    return f"{term}|{course_code_full}|{sec}|NOCLASS|{h}"


# ----------------------------
# Data model
# ----------------------------

@dataclass
class SectionRow:
    term: str
    subject: str
    course_number: str
    course_code_full: str
    course_title: str
    units: str
    course_info: str

    sec: str
    class_number: str          # may be blank -> exported as \N
    section_uid: str           # always present

    no_material_cost: bool
    reserve_capacity: str      # may be blank -> exported as \N if numeric in your schema
    class_notes_ref: str
    type: str
    days: str
    time: str
    open_seats: str
    location: str
    instructor: str
    comment: str


# ----------------------------
# Postgres-friendly conversion
# ----------------------------

NUMERIC_FIELDS = {
    "class_number",
    "reserve_capacity",
}

BOOLEAN_FIELDS = {
    "no_material_cost",
}


def row_dict_for_csv(row: SectionRow) -> Dict[str, Any]:
    d = asdict(row)
    out: Dict[str, Any] = {}
    for key, val in d.items():
        if key in NUMERIC_FIELDS:
            if val is None or (isinstance(val, str) and val.strip() == ""):
                out[key] = r"\N"
            else:
                out[key] = str(val).strip()
        elif key in BOOLEAN_FIELDS:
            out[key] = "TRUE" if bool(val) else "FALSE"
        else:
            out[key] = "" if val is None else str(val)
    return out


# ----------------------------
# Parsing
# ----------------------------

def detect_subject_from_html(html: str) -> str:
    """
    Find the first <span class="courseCode">SUBJ 123</span> and return SUBJ.
    Returns "" if not found.
    """
    soup = BeautifulSoup(html, "html.parser")
    code_el = soup.select_one("span.courseCode")
    if not code_el:
        return ""
    txt = clean_text(code_el.get_text())
    m = re.match(r"^([A-Z]+)\s+", txt)
    return m.group(1) if m else ""


def parse_course_header(course_block) -> dict:
    code_el = course_block.select_one(".courseHeader .courseCode")
    title_el = course_block.select_one(".courseHeader .courseTitle")
    units_el = course_block.select_one(".courseHeader .units")
    info_el = course_block.select_one(".courseHeader .courseInfo")

    course_code_full = clean_text(code_el.get_text()) if code_el else ""
    course_title = clean_text(title_el.get_text()) if title_el else ""
    units = parse_units(clean_text(units_el.get_text())) if units_el else ""
    course_info = clean_text(info_el.get_text()) if info_el else ""

    subj = ""
    num = ""
    m = re.match(r"^([A-Z]+)\s+(.+)$", course_code_full)
    if m:
        subj = m.group(1).strip()
        num = m.group(2).strip()

    return {
        "course_code_full": course_code_full,
        "course_title": course_title,
        "units": units,
        "course_info": course_info,
        "subject": subj,
        "course_number": num,
    }


def parse_subject_page_html(term: str, html: str, fallback_subject: str = "") -> List[SectionRow]:
    soup = BeautifulSoup(html, "html.parser")
    all_rows: list[SectionRow] = []

    for block in soup.select("div.courseBlock"):
        header = parse_course_header(block)

        # Prefer subject from header; fallback to detected/filename
        subject = header["subject"] or fallback_subject

        table = block.select_one("table.sectionTable")
        if not table:
            continue

        for tr in table.select("tr"):
            sec_th = tr.find("th", attrs={"scope": "row"})
            if not sec_th:
                continue

            sec = clean_text(sec_th.get_text(" ", strip=True))
            tds = tr.find_all("td")
            if not tds:
                continue

            # Fixed-position mapping after SEC.
            class_number = clean_text(tds[0].get_text(" ", strip=True)) if len(tds) > 0 else ""
            no_material_cost = bool_from_no_cost_cell(tds[1]) if len(tds) > 1 else False
            reserve_capacity = clean_text(tds[2].get_text(" ", strip=True)) if len(tds) > 2 else ""
            class_notes_ref = extract_notes_ref(tds[3]) if len(tds) > 3 else ""
            type_ = clean_text(tds[4].get_text(" ", strip=True)) if len(tds) > 4 else ""
            days = clean_text(tds[5].get_text(" ", strip=True)) if len(tds) > 5 else ""
            time_ = clean_text(tds[6].get_text(" ", strip=True)) if len(tds) > 6 else ""
            open_seats = open_seats_value(tds[7]) if len(tds) > 7 else ""
            location = clean_text(tds[8].get_text(" ", strip=True)) if len(tds) > 8 else ""
            instructor = clean_text(tds[9].get_text(" ", strip=True)) if len(tds) > 9 else ""
            comment = clean_text(tds[10].get_text(" ", strip=True)) if len(tds) > 10 else ""

            section_uid = make_section_uid(
                term=term,
                course_code_full=header["course_code_full"],
                sec=sec,
                type_=type_,
                days=days,
                time_=time_,
                location=location,
                instructor=instructor,
                class_number=class_number,
            )

            all_rows.append(
                SectionRow(
                    term=term,
                    subject=subject,
                    course_number=header["course_number"],
                    course_code_full=header["course_code_full"],
                    course_title=header["course_title"],
                    units=header["units"],
                    course_info=header["course_info"],
                    sec=sec,
                    class_number=class_number,
                    section_uid=section_uid,
                    no_material_cost=no_material_cost,
                    reserve_capacity=reserve_capacity,
                    class_notes_ref=class_notes_ref,
                    type=type_,
                    days=days,
                    time=time_,
                    open_seats=open_seats,
                    location=location,
                    instructor=instructor,
                    comment=comment,
                )
            )

    return all_rows


# ----------------------------
# Dedupe + CSV writing
# ----------------------------

def dedupe_by_section_uid(rows: List[SectionRow]) -> List[SectionRow]:
    seen: dict[str, SectionRow] = {}
    for r in rows:
        if r.section_uid not in seen:
            seen[r.section_uid] = r
    return list(seen.values())


def write_subject_csv(rows: List[SectionRow], out_path: Path) -> None:
    fieldnames = list(SectionRow.__dataclass_fields__.keys())
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(row_dict_for_csv(r))


# ----------------------------
# Main
# ----------------------------

def main() -> None:
    ap = argparse.ArgumentParser(
        description="Parse a folder of CSULB subject HTML pages and write one CSV per subject."
    )
    ap.add_argument("--term", required=True, help='e.g. "Spring_2026"')
    ap.add_argument("--html-dir", required=True, help="Directory containing subject HTML files (*.html)")
    ap.add_argument("--out-dir", required=True, help="Directory to write per-subject CSV files into")
    args = ap.parse_args()

    html_dir = Path(args.html_dir)
    out_dir = Path(args.out_dir)

    if not html_dir.is_dir():
        raise SystemExit(f"ERROR: --html-dir is not a directory: {html_dir}")

    out_dir.mkdir(parents=True, exist_ok=True)

    html_files = sorted(html_dir.glob("*.html"))
    if not html_files:
        raise SystemExit(f"ERROR: No .html files found in: {html_dir}")

    print(f"Found {len(html_files)} HTML files in {html_dir}")

    total_rows = 0
    total_subjects = 0

    for html_path in html_files:
        html = html_path.read_text(encoding="utf-8", errors="replace")

        # Subject detect: prefer HTML; fallback to filename stem
        subj_from_html = detect_subject_from_html(html)
        fallback_subj = re.sub(r"[^A-Z0-9]", "", html_path.stem.upper())
        subject = subj_from_html or fallback_subj or "UNKNOWN"

        rows = parse_subject_page_html(args.term, html, fallback_subject=subject)
        before = len(rows)
        rows = dedupe_by_section_uid(rows)
        after = len(rows)

        # Output file name: SUBJECT_TERM.csv
        out_path = out_dir / f"{subject}_{args.term}.csv"
        write_subject_csv(rows, out_path)

        print(f"- {html_path.name}: subject={subject} rows={after} (deduped from {before}) -> {out_path.name}")

        total_rows += after
        total_subjects += 1

    print(f"\nDone. Wrote {total_subjects} CSV files. Total section-rows: {total_rows}")


if __name__ == "__main__":
    main()
