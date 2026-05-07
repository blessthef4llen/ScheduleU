from __future__ import annotations

import json
import os
from urllib import request, error
from typing import List

from app.core.section_scheduler import ScheduleMetrics
from app.core.section_models import SectionOption


def _fmt_min(total_min: int) -> str:
    h = total_min // 60
    m = total_min % 60
    return f"{h:02d}:{m:02d}"


def _heuristic_bullets(metrics: ScheduleMetrics, preference: str) -> list[str]:
    bullets = [
        f"Uses {metrics.days_used} day(s) on campus with about {metrics.total_gap_minutes} minute(s) of gaps.",
        f"Earliest class starts around {_fmt_min(metrics.earliest_start)} and latest class ends around {_fmt_min(metrics.latest_end)}.",
    ]
    p = (preference or "compact").strip().lower()
    if p == "fewest_days":
        bullets.append("Ranked to prioritize fewer campus days even if some class times are less ideal.")
    elif p == "latest_start":
        bullets.append("Ranked to prioritize later starts so mornings are less packed.")
    elif p == "earliest_end":
        bullets.append("Ranked to prioritize earlier end times to free up evenings.")
    else:
        bullets.append("Ranked to balance fewer days, tighter schedules, and earlier finishes.")
    return bullets[:3]


def _call_openai_for_bullets(prompt: str) -> list[str]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY missing")

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You explain schedule quality for college students. "
                    "Return strict JSON: {\"bullets\":[\"...\",\"...\",\"...\"]} "
                    "with 2-3 concise bullets."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }

    req = request.Request(
        url="https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    with request.urlopen(req, timeout=8) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    bullets = parsed.get("bullets", [])
    cleaned = [str(b).strip() for b in bullets if str(b).strip()]
    if not cleaned:
        raise RuntimeError("LLM returned empty bullets")
    return cleaned[:3]


def generate_schedule_benefits(
    sections: List[SectionOption],
    metrics: ScheduleMetrics,
    ranking_preference: str,
) -> list[str]:
    section_preview = []
    for s in sections[:10]:
        section_preview.append(f"{s.course} sec {s.section_id}")
    prompt = (
        f"Ranking preference: {ranking_preference}\n"
        f"Days used: {metrics.days_used}\n"
        f"Total gap minutes: {metrics.total_gap_minutes}\n"
        f"Earliest start: {_fmt_min(metrics.earliest_start)}\n"
        f"Latest end: {_fmt_min(metrics.latest_end)}\n"
        f"Sections: {', '.join(section_preview)}\n"
        "Give 2-3 bullets on why this schedule is beneficial."
    )

    try:
        return _call_openai_for_bullets(prompt)
    except (error.URLError, error.HTTPError, json.JSONDecodeError, KeyError, RuntimeError):
        return _heuristic_bullets(metrics, ranking_preference)
