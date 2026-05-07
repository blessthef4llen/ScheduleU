"use client";

import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AddResult, AppUserRow, MeetingBlock, ScheduleRow, SectionLite } from "./types";
import { DAY_NAME, buildBlocks, findConflict, minToTimeStr } from "./conflict";

type SemesterTableRow = {
  term?: string | null;
  subject?: string | null;
  course_number?: string | number | null;
  course_code_full?: string | null;
  course_title?: string | null;
  units?: string | number | null;
  sec?: string | number | null;
  class_number?: string | number | null;
  section_uid?: string | null;
  type?: string | null;
  days?: string | null;
  time?: string | null;
  open_seats?: string | number | null;
  location?: string | null;
  instructor?: string | null;
  comment?: string | null;
};

type LegacySectionRow = {
  id: number | string;
  course_code_full?: string | null;
  term?: string | null;
  sec?: string | null;
  class_number?: number | string | null;
  component_type?: string | null;
  days?: string | null;
  time_range?: string | null;
  location?: string | null;
  instructor?: string | null;
  status?: string | null;
  open_seats?: number | null;
  capacity?: number | null;
  notes?: string | null;
};

type ScheduleItemRow = {
  section_id: number | string;
  section_uid?: string | null;
};

const SEMESTER_TABLES: Record<string, string> = {
  "spring 2026": "spring_2026",
  spring_2026: "spring_2026",
  "summer 2026": "summer_2026",
  summer_2026: "summer_2026",
};

const SEMESTER_SELECT =
  "term, subject, course_number, course_code_full, course_title, units, sec, class_number, section_uid, type, days, time, open_seats, location, instructor, comment";

const LEGACY_SECTION_SELECT =
  "id, course_code_full, term, sec, class_number, component_type, days, time_range, location, instructor, status, open_seats, capacity, notes";

function semesterTableForTerm(term: string): string | null {
  const key = term.trim().toLowerCase().replace(/\s+/g, " ");
  return SEMESTER_TABLES[key] ?? SEMESTER_TABLES[key.replaceAll(" ", "_")] ?? null;
}

function normalizeTerm(term?: string | null): string | null {
  return term ? term.replaceAll("_", " ") : null;
}

function textValue(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 && text !== "\\N" ? text : null;
}

function nullableMeetingValue(value: string | null | undefined): string | null {
  const text = textValue(value);
  if (!text) return null;
  return text.toUpperCase() === "NA" ? null : text;
}

function numericValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function courseCode(subject?: string | null, number?: string | number | null): string | null {
  const code = `${subject ?? ""} ${number ?? ""}`.trim().replace(/\s+/g, " ");
  return code || null;
}

function normalizeSectionNumber(sec?: string | number | null): string | null {
  const section = textValue(sec);
  if (!section) return null;
  return /^\d+$/.test(section) ? section.padStart(2, "0") : section;
}

function mapOpenSeats(value: string | number | null | undefined): {
  openSeats: number | null;
  openSeatsLabel: string | null;
  status: string | null;
} {
  if (value === null || value === undefined) {
    return { openSeats: null, openSeatsLabel: null, status: null };
  }

  if (typeof value === "number") {
    return { openSeats: value, openSeatsLabel: null, status: value > 0 ? "open" : "closed" };
  }

  const text = value.trim();
  if (!text || text === "\\N") {
    return { openSeats: null, openSeatsLabel: null, status: null };
  }

  const parsed = Number(text);
  if (Number.isFinite(parsed)) {
    return { openSeats: parsed, openSeatsLabel: null, status: parsed > 0 ? "open" : "closed" };
  }

  const label = text.replaceAll("_", " ");
  const normalized = label.toLowerCase();
  const status = normalized.includes("available")
    ? "open"
    : normalized.includes("wait")
      ? "waitlist"
      : normalized.includes("closed") || normalized.includes("full")
        ? "closed"
        : null;

  return { openSeats: null, openSeatsLabel: label, status };
}

function semesterRowToSection(row: SemesterTableRow, termTable: string): SectionLite | null {
  const classNumber = textValue(row.class_number);
  const sectionId = numericValue(classNumber);
  if (!classNumber || sectionId === null) return null;

  const seatInfo = mapOpenSeats(row.open_seats);

  return {
    id: sectionId,
    source: "semester_table",
    section_uid: textValue(row.section_uid),
    term_table: termTable,
    term: normalizeTerm(row.term),
    subject: textValue(row.subject),
    course_number: textValue(row.course_number),
    course_code_full: textValue(row.course_code_full) ?? courseCode(row.subject, row.course_number),
    course_title: textValue(row.course_title),
    units: numericValue(row.units),
    section: normalizeSectionNumber(row.sec),
    component_type: textValue(row.type),
    class_number: classNumber,
    instructor: textValue(row.instructor),
    days: nullableMeetingValue(row.days),
    time_range: nullableMeetingValue(row.time),
    location: textValue(row.location),
    status: seatInfo.status,
    open_seats: seatInfo.openSeats,
    open_seats_label: seatInfo.openSeatsLabel,
    capacity: null,
  };
}

function legacyRowToSection(row: LegacySectionRow): SectionLite {
  return {
    id: Number(row.id),
    source: "sections",
    section_uid: null,
    term_table: null,
    term: row.term ?? null,
    subject: null,
    course_number: null,
    course_code_full: textValue(row.course_code_full),
    course_title: null,
    section: row.sec ?? null,
    component_type: row.component_type ?? null,
    class_number: row.class_number ?? null,
    instructor: row.instructor ?? null,
    days: row.days ?? null,
    time_range: row.time_range ?? null,
    location: row.location ?? null,
    status: row.status ?? null,
    open_seats: row.open_seats ?? null,
    open_seats_label: null,
    capacity: row.capacity ?? null,
  };
}

function sortSectionsByInput(sections: SectionLite[], sectionIds: number[]) {
  const order = new Map(sectionIds.map((id, index) => [id, index]));
  return sections.sort((a, b) => (order.get(a.id) ?? 999999) - (order.get(b.id) ?? 999999));
}

async function fetchSemesterRows(
  supabase: SupabaseClient,
  termTable: string,
  limit: number
): Promise<{ rows: SemesterTableRow[]; error: string | null }> {
  const pageSize = 1000;
  const rows: SemesterTableRow[] = [];

  for (let from = 0; from < limit; from += pageSize) {
    const to = Math.min(from + pageSize - 1, limit - 1);
    const { data, error } = await supabase
      .from(termTable)
      .select(SEMESTER_SELECT)
      .order("subject", { ascending: true })
      .order("course_number", { ascending: true })
      .order("class_number", { ascending: true })
      .range(from, to);

    if (error) return { rows: [], error: error.message };

    const page = (data ?? []) as SemesterTableRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return { rows, error: null };
}

export async function getAuthedAppUser() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser();
  const authUser = data?.user;

  if (error || !authUser) {
    return { appUser: null as AppUserRow | null, error: error?.message ?? "Please sign in to save a schedule." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("id, auth_uid, email, name")
    .eq("auth_uid", authUser.id)
    .maybeSingle();

  if (fetchError) {
    return { appUser: null as AppUserRow | null, error: fetchError.message };
  }

  if (existing) {
    return { appUser: existing as AppUserRow, error: null as string | null };
  }

  const email = authUser.email ?? `${authUser.id}@scheduleu.local`;
  const name =
    typeof authUser.user_metadata?.full_name === "string"
      ? authUser.user_metadata.full_name
      : email.split("@")[0];

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert([{ email, name, auth_uid: authUser.id }])
    .select("id, auth_uid, email, name")
    .single();

  if (insertError) {
    return { appUser: null as AppUserRow | null, error: insertError.message };
  }

  return { appUser: inserted as AppUserRow, error: null as string | null };
}

export async function getOrCreateSchedule(params: { userId: string; term: string }) {
  const supabase = getSupabase();
  const { userId, term } = params;

  const { data: fetchedSchedule, error: fetchError } = await supabase
    .from("schedules")
    .select("id, user_id, term, created_at")
    .eq("user_id", userId)
    .eq("term", term)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return { schedule: null as ScheduleRow | null, error: fetchError.message };
  }

  if (fetchedSchedule) {
    return { schedule: fetchedSchedule as ScheduleRow, error: null as string | null };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("schedules")
    .insert([{ user_id: userId, term }])
    .select("id, user_id, term, created_at")
    .single();

  if (insertError) {
    return { schedule: null as ScheduleRow | null, error: insertError.message };
  }

  return { schedule: inserted as ScheduleRow, error: null as string | null };
}

export async function fetchScheduleSectionIds(scheduleId: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("schedule_items")
    .select("section_id, section_uid")
    .eq("schedule_id", scheduleId);

  if (error) return { sectionIds: [] as number[], error: error.message };

  const sectionIds = ((data ?? []) as ScheduleItemRow[]).map((row) => Number(row.section_id));
  return { sectionIds: sectionIds.filter(Number.isFinite), error: null as string | null };
}

export async function fetchSectionsByIds(sectionIds: number[], term = "Spring 2026") {
  if (sectionIds.length === 0) return { sections: [] as SectionLite[], error: null as string | null };

  const supabase = getSupabase();
  const sections: SectionLite[] = [];
  const foundIds = new Set<number>();
  let semesterError: string | null = null;
  const termTable = semesterTableForTerm(term);

  if (termTable) {
    const { data, error } = await supabase
      .from(termTable)
      .select(SEMESTER_SELECT)
      .in("class_number", sectionIds.map(String));

    if (error) {
      semesterError = error.message;
    } else {
      for (const section of ((data ?? []) as SemesterTableRow[])
        .map((row) => semesterRowToSection(row, termTable))
        .filter((row): row is SectionLite => row !== null)) {
        sections.push(section);
        foundIds.add(section.id);
      }
    }
  }

  const missingIds = sectionIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    const fallback = await supabase
      .from("sections")
      .select(LEGACY_SECTION_SELECT)
      .in("id", missingIds);

    if (fallback.error && sections.length === 0) {
      return { sections: [], error: fallback.error.message || semesterError };
    }

    sections.push(...((fallback.data ?? []) as LegacySectionRow[]).map(legacyRowToSection));
  }

  return { sections: sortSectionsByInput(sections, sectionIds), error: null as string | null };
}

export async function fetchSectionCatalog(params: { term: string; limit?: number }) {
  const { term, limit = 1000 } = params;
  const supabase = getSupabase();
  const termTable = semesterTableForTerm(term);

  if (termTable) {
    const { rows, error } = await fetchSemesterRows(supabase, termTable, limit);

    if (!error) {
      return {
        sections: rows
          .map((row) => semesterRowToSection(row, termTable))
          .filter((row): row is SectionLite => row !== null),
        error: null as string | null,
      };
    }
  }

  const fallback = await supabase
    .from("sections")
    .select(LEGACY_SECTION_SELECT)
    .eq("term", term)
    .order("class_number", { ascending: true })
    .limit(limit);

  if (fallback.error) return { sections: [] as SectionLite[], error: fallback.error.message };
  return { sections: ((fallback.data ?? []) as LegacySectionRow[]).map(legacyRowToSection), error: null as string | null };
}

export async function sectionExistsInSchedule(scheduleId: number, sectionId: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("schedule_items")
    .select("schedule_id, section_id")
    .eq("schedule_id", scheduleId)
    .eq("section_id", sectionId)
    .maybeSingle();

  if (error) return { exists: false, error: error.message };
  return { exists: Boolean(data), error: null as string | null };
}

export async function fetchSectionMeeting(sectionId: number, term = "Spring 2026") {
  const result = await fetchSectionsByIds([sectionId], term);
  if (result.error || result.sections.length === 0) {
    return { section: null as SectionLite | null, error: result.error ?? "Section not found" };
  }

  return { section: result.sections[0], error: null as string | null };
}

async function insertScheduleItem(params: {
  scheduleId: number;
  sectionId: number;
  sectionUid?: string | null;
}) {
  const supabase = getSupabase();
  const payload = {
    schedule_id: params.scheduleId,
    section_id: params.sectionId,
    section_uid: params.sectionUid ?? null,
  };

  const insert = await supabase.from("schedule_items").insert([payload]);
  if (!insert.error || !insert.error.message.includes("section_uid")) {
    return insert.error;
  }

  const retry = await supabase
    .from("schedule_items")
    .insert([{ schedule_id: params.scheduleId, section_id: params.sectionId }]);
  return retry.error;
}

async function ensureLegacySectionMirror(section: SectionLite) {
  const supabase = getSupabase();
  const classNumber = numericValue(section.class_number);

  const { error } = await supabase.from("sections").upsert(
    [
      {
        id: section.id,
        course_code_full: section.course_code_full,
        term: section.term ?? "Spring 2026",
        instructor: section.instructor,
        meeting_time: [section.days, section.time_range].filter(Boolean).join(" ") || null,
        status: section.status,
        sec: section.section,
        class_number: classNumber,
        component_type: section.component_type,
        days: section.days,
        time_range: section.time_range,
        location: section.location,
        open_seats: section.open_seats,
        capacity: section.capacity,
        notes: null,
        crn: section.class_number ? String(section.class_number) : null,
      },
    ],
    { onConflict: "id" }
  );

  return error;
}

export async function addSectionWithChecks(params: {
  scheduleId: number;
  sectionId: number;
  existingBlocks: MeetingBlock[];
  term?: string;
}): Promise<AddResult> {
  const { scheduleId, sectionId, existingBlocks, term = "Spring 2026" } = params;

  const duplicate = await sectionExistsInSchedule(scheduleId, sectionId);
  if (duplicate.error) return { ok: false, msg: `Check failed: ${duplicate.error}` };
  if (duplicate.exists) return { ok: false, msg: `Section ${sectionId} is already in your schedule.` };

  const candidate = await fetchSectionMeeting(sectionId, term);
  if (candidate.error || !candidate.section) {
    return { ok: false, msg: `Section not found: ${candidate.error ?? ""}` };
  }

  const label = candidate.section.course_code_full ?? `SEC ${candidate.section.id}`;
  const candidateBlocks = buildBlocks(candidate.section.days, candidate.section.time_range, label);
  if (candidateBlocks.length === 0) {
    return {
      ok: false,
      msg: "This course cannot be selected because its meeting time has not been confirmed.",
    };
  }

  const conflict = findConflict(candidateBlocks, existingBlocks);
  if (conflict) {
    const candidateBlock = conflict.candidate;
    const hit = conflict.hit;
    return {
      ok: false,
      msg: `Time conflict: ${DAY_NAME[candidateBlock.day]} ${minToTimeStr(candidateBlock.startMin)}-${minToTimeStr(candidateBlock.endMin)} overlaps with ${hit.label ?? "another section"} (${DAY_NAME[hit.day]} ${minToTimeStr(hit.startMin)}-${minToTimeStr(hit.endMin)}).`,
    };
  }

  let insertError = await insertScheduleItem({
    scheduleId,
    sectionId,
    sectionUid: candidate.section.section_uid,
  });

  if (insertError?.message.toLowerCase().includes("foreign key")) {
    const mirrorError = await ensureLegacySectionMirror(candidate.section);
    if (!mirrorError) {
      insertError = await insertScheduleItem({
        scheduleId,
        sectionId,
        sectionUid: candidate.section.section_uid,
      });
    }
  }

  if (insertError) {
    if (insertError.message.toLowerCase().includes("duplicate")) {
      return { ok: false, msg: `Section ${sectionId} is already in your schedule.` };
    }
    return { ok: false, msg: `Add failed: ${insertError.message}` };
  }

  return { ok: true, msg: `Added section ${sectionId}.` };
}

export async function removeSection(params: { scheduleId: number; sectionId: number }) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("schedule_items")
    .delete()
    .eq("schedule_id", params.scheduleId)
    .eq("section_id", params.sectionId);

  if (error) return { ok: false as const, msg: error.message };
  return { ok: true as const, msg: "Section removed." };
}
