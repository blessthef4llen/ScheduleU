import re
import csv
import argparse
from dataclasses import dataclass
from typing import List, Optional

from bs4 import BeautifulSoup


@dataclass
class Subject:
    term: str
    name: str
    display_code: str
    code: str
    href: Optional[str]


def normalize_subject_code(display_code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", display_code.upper())


def parse_subjects_from_html(term: str, html: str) -> List[Subject]:
    soup = BeautifulSoup(html, "html.parser")
    root = soup.find("div", class_="indexList") or soup

    subjects: list[Subject] = []

    for li in root.find_all("li"):
        a = li.find("a")
        if not a:
            continue

        text = " ".join(a.get_text(strip=True).split())
        href = a.get("href")

        parens = re.findall(r"\(([^)]+)\)", text)
        if not parens:
            continue

        display_code = parens[-1].strip()
        if not re.fullmatch(r"[A-Z/& ]{2,10}", display_code):
            continue

        name = text[: text.find("(")].strip()
        if not name:
            continue

        code = normalize_subject_code(display_code)

        subjects.append(
            Subject(term=term, name=name, display_code=display_code, code=code, href=href)
        )

    # dedupe by normalized code
    unique: dict[str, Subject] = {}
    for s in subjects:
        unique.setdefault(s.code, s)

    return list(unique.values())


def write_subjects_csv(subjects: List[Subject], out_path: str) -> None:
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["term", "code", "display_code", "name", "href"])
        for s in subjects:
            writer.writerow([s.term, s.code, s.display_code, s.name, s.href])


def main():
    parser = argparse.ArgumentParser(description="Parse CSULB View-by-Subject HTML into CSV.")
    parser.add_argument("--term", required=True, help='e.g. "Spring_2026"')
    parser.add_argument("--html", required=True, help="Path to saved View-by-Subject HTML file")
    parser.add_argument("--out", required=True, help="CSV output path, e.g. subjects.csv")
    args = parser.parse_args()

    with open(args.html, "r", encoding="utf-8") as f:
        html = f.read()

    subjects = parse_subjects_from_html(args.term, html)
    write_subjects_csv(subjects, args.out)

    print(f"Wrote {len(subjects)} subjects -> {args.out}")


if __name__ == "__main__":
    main()