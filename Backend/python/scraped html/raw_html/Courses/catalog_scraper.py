import re
import csv
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple

from bs4 import BeautifulSoup

# Matches: "COTA 400 - Introduction to ...", "A/ST 190 - ...", "ART 343A - ..."
COURSE_H3_RE = re.compile(
    r"^\s*([A-Z][A-Z/& ]{0,12}?\s*\d{3}[A-Z]?)\s*-\s*(.+?)\s*$"
)

def norm_space(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "")).strip()

def subject_from_course_code(course_code_full: str) -> str:
    """
    "COTA 400" -> "COTA"
    "A/ST 190" -> "A/ST"
    "ART 343A" -> "ART"
    """
    code = norm_space(course_code_full).upper()
    parts = code.split(" ")
    return parts[0] if parts else "UNKNOWN"

def extract_units(text: str) -> str:
    # Matches: "(3 units)" or "(1 unit)" or "(3.0 units)"
    m = re.search(r"\((\d+(?:\.\d+)?)\s*units?\)", text, re.I)
    if not m:
        return ""
    u = m.group(1)
    return u[:-2] if u.endswith(".0") else u

def extract_prereq_coreq(text: str) -> Tuple[str, str]:
    t = norm_space(text)

    # Combined label -> copy into both
    m = re.search(r"Prerequisite\(s\)/Corequisite\(s\)\s*:\s*([^\.]+)", t, re.I)
    if m:
        val = norm_space(m.group(1))
        return val, val

    prereq = ""
    coreq = ""

    m = re.search(r"Prerequisites?\s*:\s*([^\.]+)", t, re.I)
    if m:
        prereq = norm_space(m.group(1))

    m = re.search(r"Corequisites?\s*:\s*([^\.]+)", t, re.I)
    if m:
        coreq = norm_space(m.group(1))

    return prereq, coreq

def parse_html_courses(html: str) -> List[Dict[str, str]]:
    soup = BeautifulSoup(html, "lxml")
    rows: List[Dict[str, str]] = []

    # Each course is typically an <li> containing an <h3> with code + title
    for li in soup.select("li"):
        h3 = li.find("h3")
        if not h3:
            continue

        header = norm_space(h3.get_text(" ", strip=True))
        m = COURSE_H3_RE.match(header)
        if not m:
            continue

        course_code_full = norm_space(m.group(1)).upper()
        course_title = norm_space(m.group(2))

        li_text = li.get_text("\n", strip=True)
        units = extract_units(li_text)
        prereq, coreq = extract_prereq_coreq(li_text)

        # Keep only courses with prereq/coreq info
        if not prereq and not coreq:
            continue

        rows.append({
            "course_code_full": course_code_full,
            "course_title": course_title,
            "units": units,
            "course_info": "",
            "class_notes_ref": "",
            "prereq_course": prereq,
            "coreq_courses": coreq,
        })

    return rows

def dedupe_rows(rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    One row per course_code_full.
    If duplicates exist, keep the row with the "richest" prereq/coreq text.
    """
    best: Dict[str, Dict[str, str]] = {}
    for r in rows:
        key = norm_space(r["course_code_full"]).upper()
        score = len(r.get("prereq_course", "")) + len(r.get("coreq_courses", "")) \
                + (2 if r.get("units", "").strip() else 0) \
                + (2 if r.get("course_title", "").strip() else 0)
        if key not in best:
            best[key] = r
        else:
            old = best[key]
            old_score = len(old.get("prereq_course", "")) + len(old.get("coreq_courses", "")) \
                        + (2 if old.get("units", "").strip() else 0) \
                        + (2 if old.get("course_title", "").strip() else 0)
            if score > old_score:
                best[key] = r

    return [best[k] for k in sorted(best.keys())]

def write_csv(rows: List[Dict[str, str]], out_path: Path) -> None:
    fields = [
        "course_code_full",
        "course_title",
        "units",
        "course_info",
        "class_notes_ref",
        "prereq_course",
        "coreq_courses",
    ]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fields})

def main():
    ap = argparse.ArgumentParser(
        description="Parse catalog HTML files in a folder, export per-subject CSVs and a combined CSV."
    )
    ap.add_argument("--in_dir", required=True, help="Folder containing .html files")
    ap.add_argument("--out_dir", required=True, help="Folder to write subject CSVs")
    ap.add_argument("--combined_csv", default="ALL_SUBJECTS.csv", help="Filename for the combined CSV")
    ap.add_argument("--subject_from", choices=["course_code", "filename"], default="course_code",
                    help="How to group by subject: from course code (default) or from filename prefix.")
    args = ap.parse_args()

    in_dir = Path(args.in_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    html_files = sorted(in_dir.glob("*.html"))
    if not html_files:
        raise SystemExit(f"No .html files found in {in_dir}")

    all_rows: List[Dict[str, str]] = []
    subject_rows: Dict[str, List[Dict[str, str]]] = defaultdict(list)

    for fp in html_files:
        html = fp.read_text(encoding="utf-8", errors="ignore")
        rows = parse_html_courses(html)

        # Add file-level rows into appropriate buckets
        if args.subject_from == "filename":
            # e.g., "COTA.html" => subject "COTA"
            subj = fp.stem.upper()
            subject_rows[subj].extend(rows)
        else:
            # group each row by subject derived from course_code_full
            for r in rows:
                subj = subject_from_course_code(r["course_code_full"])
                subject_rows[subj].append(r)

        all_rows.extend(rows)

    # Dedupe within each subject + write subject files
    for subj, rows in sorted(subject_rows.items()):
        deduped = dedupe_rows(rows)
        # Make filenames safe: "A/ST" -> "A_ST"
        safe_subj = subj.replace("/", "_")
        write_csv(deduped, out_dir / f"{safe_subj}.csv")

    # Dedupe overall + write combined CSV
    all_deduped = dedupe_rows(all_rows)
    write_csv(all_deduped, out_dir / args.combined_csv)

    print(f"Parsed HTML files: {len(html_files)}")
    print(f"Subjects exported: {len(subject_rows)}")
    print(f"Total courses with pre/coreq (deduped): {len(all_deduped)}")
    print(f"Output folder: {out_dir.resolve()}")
    print(f"Combined CSV: {out_dir / args.combined_csv}")

if __name__ == "__main__":
    main()
