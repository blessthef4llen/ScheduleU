import json
from pathlib import Path
from typing import Any, Dict, List

DATA_DIR = Path(__file__).resolve().parents[1] / "Backend" / "python" / "demo_data"
DATA_FILE = DATA_DIR / "saved_classes.json"

DEFAULT_COURSES = [
    {
        "id": "demo-1",
        "code": "CECS 328",
        "title": "Data Structures & Algorithms",
        "units": 3,
        "term": "Spring 2026",
        "status": "In Progress",
    },
    {
        "id": "demo-2",
        "code": "MATH 247",
        "title": "Calculus III",
        "units": 4,
        "term": "Spring 2026",
        "status": "Planned",
    },
    {
        "id": "demo-3",
        "code": "CECS 343",
        "title": "Intro to Software Engineering",
        "units": 3,
        "term": "Fall 2026",
        "status": "Planned",
    },
]


def list_saved_classes(user_id: int) -> List[Dict[str, Any]]:
    all_data = _load_all()
    user_key = str(user_id)
    if user_key not in all_data:
        all_data[user_key] = DEFAULT_COURSES.copy()
        _save_all(all_data)
    return all_data[user_key]


def upsert_saved_class(user_id: int, course: Dict[str, Any]) -> Dict[str, Any]:
    all_data = _load_all()
    user_key = str(user_id)
    existing = all_data.get(user_key, DEFAULT_COURSES.copy())

    replaced = False
    for index, row in enumerate(existing):
        if str(row.get("id")) == str(course.get("id")):
            existing[index] = course
            replaced = True
            break

    if not replaced:
        existing.append(course)

    all_data[user_key] = existing
    _save_all(all_data)
    return course


def remove_saved_class(user_id: int, course_id: str) -> int:
    all_data = _load_all()
    user_key = str(user_id)
    existing = all_data.get(user_key, [])
    filtered = [row for row in existing if str(row.get("id")) != str(course_id)]
    all_data[user_key] = filtered
    _save_all(all_data)
    return len(existing) - len(filtered)


def reset_saved_classes(user_id: int) -> None:
    all_data = _load_all()
    all_data[str(user_id)] = DEFAULT_COURSES.copy()
    _save_all(all_data)


def _load_all() -> Dict[str, List[Dict[str, Any]]]:
    if not DATA_FILE.exists():
        return {}
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_all(data: Dict[str, List[Dict[str, Any]]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
