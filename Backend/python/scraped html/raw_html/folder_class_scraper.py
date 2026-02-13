#!/usr/bin/env python3
r"""
folder_subject_scraper.py

Parse a folder of CSULB subject HTML pages (one subject per file),
extract all course + section rows, and export:

1) One CSV per subject (required)
2) One combined CSV (optional)

Postgres-friendly:
- Uses \N for NULL numeric fields
- section_uid is the primary identifier
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


def make_section_uid(term, course_code_full, sec, type_, days, time_, location, instructor, class_number):
    if class_number.strip():
        return f"{term}|{course_code_full}|{sec}|{class_number.strip()}"

    sig = "|".join([term, course_code_full, sec, type_, days, time_, location, instructor])
    h = hashlib.sha1(sig.encode("utf-8")).hexdigest()[:16]
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
    class_number: str
    section_uid: str

    no_material_cost: bool
    reserve_capacity: str
    class_notes_ref: str
    type: str
    days: str
    time: str
    open_seats: str
    location: str
    instructor: str
    comment: str


NUMERIC_FIELDS = {"class_number", "reserve_capacity"}
BOOLEAN_FIELDS = {"no_material_cost"}


def row_for_csv(row: SectionRow) -> Dict[str, Any]:
    d = asdict(row)
    out = {}

    for k, v in d.items():
        if k in NUMERIC_FIELDS:
            out[k] = r"\N" if not v else str(v)
        elif k in BOOLEAN_FIELDS:
            out[k] = "TRUE" if v else "FALSE"
        else:
            out[k] = "" if v is None else str(v)

    return out


# ----------------------------
# Parsing
# ----------------------------

def detect_subject_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    el = soup.select_one("span.courseCode")
    if not el:
        return ""
    m = re.match(r"^([A-Z]+)\s+", clean_text(el.get_text()))
    return m.group(1) if m else ""


def parse_subject_html(term: str, html: str, fallback_subject: str) -> List[SectionRow]:
    soup = BeautifulSoup(html, "html.parser")
    rows = []

    for block in soup.select("div.courseBlock"):
        code_el = block.select_one(".courseCode")
        title_el = block.select_one(".courseTitle")
        units_el = block.select_one(".units")
        info_el = block.select_one(".courseInfo")

        course_code_full = clean_text(code_el.get_text()) if code_el else ""
        course_title = clean_text(title_el.get_text()) if title_el else ""
        units = parse_units(clean_text(units_el.get_text())) if units_el else ""
        course_info = clean_text(info_el.get_text()) if info_el else ""

        m = re.match(r"^([A-Z]+)\s+(.+)$", course_code_full)
        subject = m.group(1) if m else fallback_subject
        course_number = m.group(2) if m else ""

        table = block.select_one("table.sectionTable")
        if not table:
            continue

        for tr in table.select("tr"):
            sec_th = tr.find("th", scope="row")
            if not sec_th:
                continue

            tds = tr.find_all("td")
            if not tds:
                continue

            sec = clean_text(sec_th.get_text())
            class_number = clean_text(tds[0].get_text()) if len(tds) > 0 else ""
            no_cost = bool_from_no_cost_cell(tds[1]) if len(tds) > 1 else False
            reserve = clean_text(tds[2].get_text()) if len(tds) > 2 else ""
            notes = extract_notes_ref(tds[3]) if len(tds) > 3 else ""
            type_ = clean_text(tds[4].get_text()) if len(tds) > 4 else ""
            days = clean_text(tds[5].get_text()) if len(tds) > 5 else ""
            time_ = clean_text(tds[6].get_text()) if len(tds) > 6 else ""
            open_seats = open_seats_value(tds[7]) if len(tds) > 7 else ""
            location = clean_text(tds[8].get_text()) if len(tds) > 8 else ""
            instructor = clean_text(tds[9].get_text()) if len(tds) > 9 else ""
            comment = clean_text(tds[10].get_text()) if len(tds) > 10 else ""

            uid = make_section_uid(
                term, course_code_full, sec, type_, days, time_, location, instructor, class_number
            )

            rows.append(
                SectionRow(
                    term=term,
                    subject=subject,
                    course_number=course_number,
                    course_code_full=course_code_full,
                    course_title=course_title,
                    units=units,
                    course_info=course_info,
                    sec=sec,
                    class_number=class_number,
                    section_uid=uid,
                    no_material_cost=no_cost,
                    reserve_capacity=reserve,
                    class_notes_ref=notes,
                    type=type_,
                    days=days,
                    time=time_,
                    open_seats=open_seats,
                    location=location,
                    instructor=instructor,
                    comment=comment,
                )
            )

    return rows


def dedupe(rows: List[SectionRow]) -> List[SectionRow]:
    seen = {}
    for r in rows:
        if r.section_uid not in seen:
            seen[r.section_uid] = r
    return list(seen.values())


# ----------------------------
# Main
# ----------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--term", required=True)
    ap.add_argument("--html-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--combined-out", help="Optional combined CSV path")
    args = ap.parse_args()

    html_dir = Path(args.html_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    combined_rows: List[SectionRow] = []

    for html_file in sorted(html_dir.glob("*.html")):
        html = html_file.read_text(encoding="utf-8", errors="replace")
        subject = detect_subject_from_html(html) or html_file.stem.upper()

        rows = parse_subject_html(args.term, html, subject)
        rows = dedupe(rows)
        combined_rows.extend(rows)

        out_path = out_dir / f"{subject}_{args.term}.csv"
        with out_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=SectionRow.__dataclass_fields__.keys())
            writer.writeheader()
            for r in rows:
                writer.writerow(row_for_csv(r))

        print(f"Wrote {out_path.name} ({len(rows)} rows)")

    if args.combined_out:
        combined_out = Path(args.combined_out)
        with combined_out.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=SectionRow.__dataclass_fields__.keys())
            writer.writeheader()
            for r in dedupe(combined_rows):
                writer.writerow(row_for_csv(r))

        print(f"Wrote combined CSV → {combined_out}")


if __name__ == "__main__":
    main()
