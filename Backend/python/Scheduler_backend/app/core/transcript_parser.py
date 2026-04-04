from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import re
import subprocess
import tempfile
from pathlib import Path

from app.core.normalize import norm_course_code

try:
    from pypdf import PdfReader
except ImportError:  # pragma: no cover
    PdfReader = None

try:
    import fitz
except ImportError:  # pragma: no cover
    fitz = None


GRADE_TOKENS = {
    "A", "A-", "A+",
    "B", "B-", "B+",
    "C", "C-", "C+",
    "D", "D-", "D+",
    "F",
    "P", "NP", "CR", "NC", "W", "AU", "I", "IP",
}

SUMMARY_LINE_RE = re.compile(
    r"\b(?:Term|Course Trans|Transfer Term|Combined|Cum|Transfer Cum|Combined Cum)\s+GPA\b",
    re.IGNORECASE,
)

TERM_RE = re.compile(r"\b(Spring|Summer|Fall|Winter)\s+20\d{2}\b", re.IGNORECASE)
COURSE_LINE_RE = re.compile(
    r"^\s*"
    r"(?P<subject>[A-Z][A-Z/&]{1,7}(?:\s+[A-Z/&]{1,4})?)"
    r"\s+"
    r"(?P<number>[A-Z]?\d{1,3}[A-Z]{0,2})"
    r"(?:\s+[-:]?\s*(?P<rest>.+))?$"
)
NAME_RE = re.compile(r"\b(?:name|student name)\s*:\s*(.+)$", re.IGNORECASE)
ID_RE = re.compile(r"\b(?:student id|campus id|emplid)\s*:\s*([A-Z0-9-]+)\b", re.IGNORECASE)
UNITS_AT_END_RE = re.compile(r"(?P<units>\d+(?:\.\d+)?)\s*$")


@dataclass
class ParsedTranscript:
    student_name: str | None
    student_id: str | None
    courses: list[dict]
    grouped_by_term: list[dict]
    unmatched_lines: list[str]
    warnings: list[str]
    total_pages: int
    extracted_text_chars: int


def _extract_pdf_text(file_bytes: bytes) -> tuple[str, int]:
    if PdfReader is None:
        raise RuntimeError("Missing dependency: pypdf is required for transcript PDF parsing.")

    reader = PdfReader(BytesIO(file_bytes))
    pages: list[str] = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages), len(reader.pages)


def _run_tesseract(image_path: Path) -> str:
    proc = subprocess.run(
        ["tesseract", str(image_path), "stdout"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        stderr = proc.stderr.strip() or "unknown OCR error"
        raise RuntimeError(f"Tesseract failed: {stderr}")
    return proc.stdout


def _extract_pdf_text_with_ocr(file_bytes: bytes) -> tuple[str, int]:
    if fitz is None:
        raise RuntimeError("Missing dependency: PyMuPDF is required for OCR fallback.")

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[str] = []
    with tempfile.TemporaryDirectory(prefix="scheduleu-transcript-ocr-") as tmpdir:
        tmp_path = Path(tmpdir)
        for index, page in enumerate(doc, start=1):
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image_path = tmp_path / f"page-{index}.png"
            pix.save(str(image_path))
            pages.append(_run_tesseract(image_path))
    return "\n".join(pages), len(doc)


def _clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def _is_summary_line(line: str) -> bool:
    return bool(SUMMARY_LINE_RE.search(line))


def _detect_student_info(lines: list[str]) -> tuple[str | None, str | None]:
    student_name = None
    student_id = None
    for line in lines[:40]:
        if student_name is None:
            match = NAME_RE.search(line)
            if match:
                student_name = match.group(1).strip(" :")
        if student_id is None:
            match = ID_RE.search(line)
            if match:
                student_id = match.group(1).strip()
        if student_name and student_id:
            break
    return student_name, student_id


def _split_rest(rest: str) -> tuple[str | None, str | None, float | None]:
    text = rest.strip()

    # Transcript summary/totals fragments should not become course titles.
    if not text or " GPA" in f" {text}" or " Totals" in text:
        return None, None, None

    # Some transfer lines end with repeated numeric fields. Keep only the title-like prefix.
    title_tokens: list[str] = []
    for token in text.split():
        upper = token.upper()
        if re.fullmatch(r"\d+(?:\.\d+)?", token):
            break
        if upper in GRADE_TOKENS:
            break
        title_tokens.append(token)

    text = " ".join(title_tokens).strip(" -")
    units = None

    title = text or None
    return title, None, units


def _line_to_course(line: str, current_term: str | None, known_courses: set[str]) -> dict | None:
    match = COURSE_LINE_RE.match(line)
    if not match:
        return None

    subject = re.sub(r"\s+", " ", match.group("subject").upper()).strip()
    number = match.group("number").upper().strip()
    rest = match.group("rest") or ""
    title, grade, units = _split_rest(rest)
    normalized_code = norm_course_code(f"{subject} {number}") or f"{subject} {number}"

    confidence = 0.55
    if title:
        confidence += 0.15
    if grade:
        confidence += 0.1
    if units is not None:
        confidence += 0.1
    if normalized_code in known_courses:
        confidence += 0.1

    return {
        "course_code": normalized_code,
        "subject": subject,
        "course_number": number,
        "title": title,
        "term": current_term,
        "grade": grade,
        "units": units,
        "raw_line": line,
        "matched_catalog": normalized_code in known_courses,
        "confidence": min(confidence, 1.0),
    }


def _parse_text_to_courses(text: str, known_courses: set[str]) -> tuple[str | None, str | None, list[dict], list[dict], list[str], list[str]]:
    lines = [_clean_line(line) for line in text.splitlines()]
    lines = [line for line in lines if line]

    student_name, student_id = _detect_student_info(lines)

    current_term: str | None = None
    courses: list[dict] = []
    unmatched_lines: list[str] = []

    for line in lines:
        if _is_summary_line(line):
            continue

        term_match = TERM_RE.search(line)
        if term_match:
            current_term = term_match.group(0).title()
            continue

        course = _line_to_course(line, current_term, known_courses)
        if course:
            courses.append(course)
            continue

        if (
            not _is_summary_line(line)
            and re.search(r"\b(?:[A-Z]?\d{1,3}[A-Z]?|\d{1,3}[A-Z]?)\b", line)
            and re.search(r"\b[A-Z]{2,5}\b", line)
        ):
            unmatched_lines.append(line)

    if not courses:
        warnings.append("No course rows were confidently detected. Transcript formatting may need institution-specific parsing rules.")

    term_map: dict[str, list[dict]] = {}
    for course in courses:
        term_key = course["term"] or "Unknown Term"
        term_map.setdefault(term_key, []).append(course)

    grouped_by_term: list[dict] = [
        {"term": term, "courses": grouped_courses}
        for term, grouped_courses in term_map.items()
    ]

    warnings: list[str] = []
    if unmatched_lines:
        warnings.append("Some lines looked course-like but could not be parsed. Review the unmatched lines.")

    return student_name, student_id, courses, grouped_by_term, unmatched_lines[:50], warnings


def parse_transcript_pdf(file_bytes: bytes, known_courses: set[str]) -> ParsedTranscript:
    warnings: list[str] = []

    text, total_pages = _extract_pdf_text(file_bytes)
    student_name, student_id, courses, grouped_by_term, unmatched_lines, parse_warnings = _parse_text_to_courses(
        text,
        known_courses,
    )
    warnings.extend(parse_warnings)

    should_try_ocr = not text.strip() or len(courses) == 0
    if should_try_ocr:
        ocr_text = ""
        try:
            ocr_text, ocr_pages = _extract_pdf_text_with_ocr(file_bytes)
            total_pages = max(total_pages, ocr_pages)
            (
                ocr_student_name,
                ocr_student_id,
                ocr_courses,
                ocr_grouped_by_term,
                ocr_unmatched_lines,
                ocr_parse_warnings,
            ) = _parse_text_to_courses(ocr_text, known_courses)

            if len(ocr_courses) > len(courses):
                text = ocr_text
                student_name = ocr_student_name or student_name
                student_id = ocr_student_id or student_id
                courses = ocr_courses
                grouped_by_term = ocr_grouped_by_term
                unmatched_lines = ocr_unmatched_lines
                warnings = [w for w in warnings if "could not be parsed" not in w]
                warnings.extend(ocr_parse_warnings)
                warnings.append("Used OCR fallback because direct PDF text extraction was empty or insufficient.")
            elif not text.strip():
                warnings.append("OCR fallback ran, but still could not confidently detect course rows.")
        except Exception as exc:
            warnings.append(f"OCR fallback was unavailable or failed: {exc}")

    return ParsedTranscript(
        student_name=student_name,
        student_id=student_id,
        courses=courses,
        grouped_by_term=grouped_by_term,
        unmatched_lines=unmatched_lines,
        warnings=warnings + (
            ["No course rows were confidently detected. Transcript formatting may need institution-specific parsing rules."]
            if not courses else []
        ),
        total_pages=total_pages,
        extracted_text_chars=len(text),
    )
