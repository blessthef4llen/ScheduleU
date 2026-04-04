# API route dependencies.
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.api.models import GenerateRequest, GenerateResponse
from app.core.normalize import norm_course_code
from app.core.scheduler_engine import generate_plan

from app.core.deps_loader import load_dependency_model_from_supabase
from app.core.catalog_loader import load_catalog_from_supabase
from app.core.catalog_merge import merge_catalog_into_dependency_model

from app.api.term_models import TermScheduleRequest, TermScheduleResponse
from app.api.transcript_models import TranscriptParseResponse
from app.core.section_loader import load_section_options_for_courses
from app.core.section_scheduler import pick_ranked_schedules
from app.core.schedule_explainer import generate_schedule_benefits
from app.core.transcript_parser import parse_transcript_pdf

from app.core.section_scheduler import parse_days, parse_time_range, conflicts

router = APIRouter()

# Cached data loaded once at startup.
DEP_MODEL = None
MERGE_SUMMARY = None


@router.on_event("startup")
def startup_load() -> None:
    """
    Load all required data from Supabase once at startup.
    """
    global DEP_MODEL, MERGE_SUMMARY

    DEP_MODEL = load_dependency_model_from_supabase()

    # If you have a Spring/offered-courses table/view, load & merge it.
    # If you don't want term-scoped offerings yet, you can skip this merge.
    catalog = load_catalog_from_supabase()
    MERGE_SUMMARY = merge_catalog_into_dependency_model(
        DEP_MODEL,
        catalog=catalog,
        add_catalog_only_courses=True
    )


@router.get("/health")
def health():
    if DEP_MODEL is None:
        return {"ok": False, "error": "Dependency model not loaded"}
    return {
        "ok": True,
        "courses_in_model": len(DEP_MODEL.courses),
        "merge_summary": (MERGE_SUMMARY.__dict__ if MERGE_SUMMARY else None),
    }


@router.post("/schedule/generate", response_model=GenerateResponse)
def schedule_generate(req: GenerateRequest):
    if DEP_MODEL is None:
        raise HTTPException(status_code=500, detail="Dependency model not loaded")

    targets = {norm_course_code(c) for c in req.targets if norm_course_code(c)}
    completed = {norm_course_code(c) for c in req.completed if norm_course_code(c)}

    if req.unknown_course_policy == "error":
        unknown = sorted([c for c in targets if c not in DEP_MODEL.courses])
        if unknown:
            raise HTTPException(status_code=400, detail={"unknown_courses": unknown})

    terms = req.terms if req.terms else ["Fall", "Spring"]
    # If only seasonal labels are provided (e.g., Fall/Spring), expand them to a fixed planning horizon.
    if len(terms) <= 4 and all(("20" not in t) for t in terms):
        horizon = 12
        expanded = []
        for i in range(horizon):
            expanded.append(terms[(req.start_term_index + i) % len(terms)])
        terms = expanded

    plan = generate_plan(
        model=DEP_MODEL,
        targets=targets,
        completed=set(completed),
        terms=terms,
        max_units=req.max_units,
        max_courses=req.max_courses,
        include_prereq_closure=True,
        include_coreqs=req.include_coreqs,
        strict_coreq_same_term=req.strict_coreq_same_term,
    )

    # Convert planner output to API response format.
    plan_out = []
    for term_sched in plan.terms:
        courses_out = []
        total_units = 0.0
        total_units_known = True

        for code in term_sched.courses:
            meta = DEP_MODEL.courses.get(code)
            title = meta.title if meta else None
            units = meta.units if meta else None

            if units is None:
                total_units_known = False
            else:
                total_units += float(units)

            courses_out.append({"course": code, "title": title, "units": units})

        plan_out.append({
            "term": term_sched.term,
            "courses": courses_out,
            "total_units": (total_units if total_units_known else None),
        })

    return GenerateResponse(plan=plan_out, unscheduled=plan.unscheduled, warnings=plan.warnings)

@router.post("/term/schedule", response_model=TermScheduleResponse)
def term_schedule(req: TermScheduleRequest):
    # Normalize requested courses
    requested = [norm_course_code(c) for c in req.requested_courses if norm_course_code(c)]
    if not requested:
        return TermScheduleResponse(term=req.term, warnings=["No valid requested_courses provided."])

    # Load section options from Supabase
    options_by_course = load_section_options_for_courses(requested)
    locked_by_course = {
        norm_course_code(item.course): item.section_id.strip()
        for item in req.locked_sections
        if norm_course_code(item.course) and item.section_id.strip()
    }

    # Convert one time string to minutes.
    def _parse_single_time(t: str) -> int:
        # Reuse the range parser by passing the same start/end time.
        rng = parse_time_range(f"{t}-{t}")
        if rng is None:
            raise ValueError(f"Bad time: {t}")
        return rng[0]

    # Build blocked time ranges from the request.
    blocked_blocks = []
    for b in req.constraints.blocked_times:
        days = set()
        for d in b.days:
            days |= parse_days(d) if len(d) > 1 else parse_days(d)  # supports "M" or "Th"
        t = parse_time_range(f"{b.start}-{b.end}")
        if days and t:
            start_min, end_min = t
            blocked_blocks.append((days, start_min, end_min))

    earliest_min = None
    latest_min = None
    if req.constraints.earliest_time:
        earliest_min = _parse_single_time(req.constraints.earliest_time)
    if req.constraints.latest_time:
        latest_min = _parse_single_time(req.constraints.latest_time)

    days_off_set = set()
    for d in req.constraints.days_off:
        days_off_set |= parse_days(d)

    # Apply user time/day filters before picking sections.
    for course, opts in list(options_by_course.items()):
        kept = []
        for sec in opts:
            ok = True
            for m in sec.meetings:
                # days off
                if m.days & days_off_set:
                    ok = False
                    break

                # earliest/latest
                if earliest_min is not None and m.start_min < earliest_min:
                    ok = False
                    break
                if latest_min is not None and m.end_min > latest_min:
                    ok = False
                    break

                # blocked times overlap
                for bd, bs, be in blocked_blocks:
                    if not (m.days & bd):
                        continue
                    # reuse same overlap logic (no buffer for blocked windows)
                    if not (m.end_min <= bs or be <= m.start_min):
                        ok = False
                        break
                if not ok:
                    break

            if ok:
                kept.append(sec)

        options_by_course[course] = kept

    # Pick ranked conflict-free schedules from the remaining sections.
    ranked, failures = pick_ranked_schedules(
        options_by_course,
        buffer_min=req.constraints.buffer_minutes,
        max_results=req.constraints.max_schedules,
        ranking_preference=req.constraints.ranking_preference,
        preferred_sections=locked_by_course,
    )
    best = ranked[0][0] if ranked else []

    if not best:
        unscheduled = sorted(list(set(requested)))
        warnings = ["No conflict-free schedule found for the requested courses."]
        if locked_by_course:
            warnings.append("Some locked sections could not be used with the current constraints.")
        if failures:
            warnings.append(f"Section availability issues: {failures}")
        return TermScheduleResponse(
            term=req.term,
            unscheduled_courses=unscheduled,
            warnings=warnings,
        )

    def _serialize_sections(section_list):
        selected_sections = []
        for sec in section_list:
            meetings = []
            for m in sec.meetings:
                # Convert internal day numbers back to short labels.
                day_map_rev = {0: "M", 1: "T", 2: "W", 3: "Th", 4: "F", 5: "Sa", 6: "Su"}
                for d in sorted(m.days):
                    meetings.append({
                        "type": m.meeting_type,
                        "day": day_map_rev.get(d, str(d)),
                        "start": f"{m.start_min//60:02d}:{m.start_min%60:02d}",
                        "end": f"{m.end_min//60:02d}:{m.end_min%60:02d}",
                        "location": m.location,
                        "instructor": m.instructor,
                        "comments": m.comments,
                    })

            selected_sections.append({
                "course": sec.course,
                "section_id": sec.section_id,
                "meetings": meetings,
            })
        return selected_sections

    selected_sections = _serialize_sections(best)
    generated_schedules = []
    for idx, (secs, score, metrics) in enumerate(ranked, start=1):
        explanation_bullets = generate_schedule_benefits(
            secs,
            metrics,
            req.constraints.ranking_preference,
        )
        generated_schedules.append({
            "rank": idx,
            "score": score,
            "metrics": {
                "days_used": metrics.days_used,
                "total_gap_minutes": metrics.total_gap_minutes,
                "earliest_start": metrics.earliest_start,
                "latest_end": metrics.latest_end,
            },
            "explanation_bullets": explanation_bullets,
            "selected_sections": _serialize_sections(secs),
        })

    scheduled_courses = {s["course"] for s in selected_sections}
    unscheduled = sorted([c for c in requested if c not in scheduled_courses])
    warnings = [] if not unscheduled else ["Some requested courses could not be scheduled conflict-free."]

    if locked_by_course and best:
        best_selected = {sec.course: sec.section_id for sec in best}
        matched = sum(
            1 for c, sec_id in locked_by_course.items()
            if best_selected.get(c, "").strip() == sec_id.strip()
        )
        if matched < len(locked_by_course):
            warnings.append(
                f"Used closest available alternatives for {len(locked_by_course) - matched} preferred section(s)."
            )

    return TermScheduleResponse(
        term=req.term,
        selected_sections=selected_sections,
        generated_schedules=generated_schedules,
        unscheduled_courses=unscheduled,
        warnings=warnings,
    )


@router.post("/transcript/parse", response_model=TranscriptParseResponse)
async def transcript_parse(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Upload a PDF transcript.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    known_courses = set(DEP_MODEL.courses.keys()) if DEP_MODEL is not None else set()
    try:
        parsed = parse_transcript_pdf(file_bytes, known_courses=known_courses)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse transcript PDF: {exc}") from exc

    return TranscriptParseResponse(
        student={
            "name": parsed.student_name,
            "student_id": parsed.student_id,
        },
        extracted_courses=parsed.courses,
        grouped_by_term=parsed.grouped_by_term,
        unmatched_lines=parsed.unmatched_lines,
        warnings=parsed.warnings,
        total_pages=parsed.total_pages,
        extracted_text_chars=parsed.extracted_text_chars,
    )
