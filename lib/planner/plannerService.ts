"use client";

import { getSupabase } from "@/lib/supabaseClient";
import type { AddResult, AppUserRow, MeetingBlock, ScheduleRow, SectionLite } from "./types";
import { DAY_NAME, buildBlocks, findConflict, minToTimeStr } from "./conflict";

type CourseListingRow = {
  section_id: number | string;
  term?: string | null;
  subject?: string | null;
  number?: string | null;
  title?: string | null;
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
};

type SectionJoinRow = {
  id: number | string;
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
  courses?: {
    subject?: string | null;
    number?: string | null;
    title?: string | null;
  } | null;
};

function courseCode(subject?: string | null, number?: string | null): string | null {
  const code = `${subject ?? ""} ${number ?? ""}`.trim().replace(/\s+/g, " ");
  return code || null;
}

function listingToSection(row: CourseListingRow): SectionLite {
  return {
    id: Number(row.section_id),
    term: row.term ?? null,
    course_code_full: courseCode(row.subject, row.number),
    course_title: row.title ?? null,
    section: row.sec ?? null,
    component_type: row.component_type ?? null,
    class_number: row.class_number ?? null,
    days: row.days ?? null,
    time_range: row.time_range ?? null,
    location: row.location ?? null,
    instructor: row.instructor ?? null,
    status: row.status ?? null,
    open_seats: row.open_seats ?? null,
    capacity: row.capacity ?? null,
  };
}

function joinToSection(row: SectionJoinRow): SectionLite {
  return {
    id: Number(row.id),
    term: row.term ?? null,
    course_code_full: courseCode(row.courses?.subject, row.courses?.number),
    course_title: row.courses?.title ?? null,
    section: row.sec ?? null,
    component_type: row.component_type ?? null,
    class_number: row.class_number ?? null,
    days: row.days ?? null,
    time_range: row.time_range ?? null,
    location: row.location ?? null,
    instructor: row.instructor ?? null,
    status: row.status ?? null,
    open_seats: row.open_seats ?? null,
    capacity: row.capacity ?? null,
  };
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

export async function getOrCreateSchedule(params: { userId: number; term: string }) {
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
    .select("section_id")
    .eq("schedule_id", scheduleId);

  if (error) return { sectionIds: [] as number[], error: error.message };

  const sectionIds = ((data ?? []) as Array<{ section_id: number | string }>).map((row) => Number(row.section_id));
  return { sectionIds, error: null as string | null };
}

export async function fetchSectionsByIds(sectionIds: number[]) {
  if (sectionIds.length === 0) return { sections: [] as SectionLite[], error: null as string | null };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("v_course_listings")
    .select("section_id, term, subject, number, title, sec, class_number, component_type, days, time_range, location, instructor, status, open_seats, capacity")
    .in("section_id", sectionIds);

  if (!error) {
    const sections = ((data ?? []) as CourseListingRow[]).map(listingToSection);
    return { sections, error: null as string | null };
  }

  const fallback = await supabase
    .from("sections")
    .select("id, term, sec, class_number, component_type, days, time_range, location, instructor, status, open_seats, capacity, courses(subject, number, title)")
    .in("id", sectionIds);

  if (fallback.error) return { sections: [] as SectionLite[], error: fallback.error.message };
  return { sections: ((fallback.data ?? []) as SectionJoinRow[]).map(joinToSection), error: null as string | null };
}

export async function fetchSectionCatalog(params: { term: string; limit?: number }) {
  const { term, limit = 200 } = params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("v_course_listings")
    .select("section_id, term, subject, number, title, sec, class_number, component_type, days, time_range, location, instructor, status, open_seats, capacity")
    .eq("term", term)
    .order("subject", { ascending: true })
    .order("number", { ascending: true })
    .order("class_number", { ascending: true })
    .limit(limit);

  if (!error) {
    return { sections: ((data ?? []) as CourseListingRow[]).map(listingToSection), error: null as string | null };
  }

  const fallback = await supabase
    .from("sections")
    .select("id, term, sec, class_number, component_type, days, time_range, location, instructor, status, open_seats, capacity, courses(subject, number, title)")
    .eq("term", term)
    .order("class_number", { ascending: true })
    .limit(limit);

  if (fallback.error) return { sections: [] as SectionLite[], error: fallback.error.message };
  return { sections: ((fallback.data ?? []) as SectionJoinRow[]).map(joinToSection), error: null as string | null };
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

export async function fetchSectionMeeting(sectionId: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sections")
    .select("id, days, time_range")
    .eq("id", sectionId)
    .single();

  type SectionMeetingRow = { id: number; days: string | null; time_range: string | null };
  if (error || !data) {
    return { section: null as SectionMeetingRow | null, error: error?.message ?? "Section not found" };
  }

  return { section: data as SectionMeetingRow, error: null as string | null };
}

export async function addSectionWithChecks(params: {
  scheduleId: number;
  sectionId: number;
  existingBlocks: MeetingBlock[];
}): Promise<AddResult> {
  const { scheduleId, sectionId, existingBlocks } = params;

  const duplicate = await sectionExistsInSchedule(scheduleId, sectionId);
  if (duplicate.error) return { ok: false, msg: `Check failed: ${duplicate.error}` };
  if (duplicate.exists) return { ok: false, msg: `Section ${sectionId} is already in your schedule.` };

  const candidate = await fetchSectionMeeting(sectionId);
  if (candidate.error || !candidate.section) {
    return { ok: false, msg: `Section not found: ${candidate.error ?? ""}` };
  }

  const candidateBlocks = buildBlocks(candidate.section.days, candidate.section.time_range, `SEC ${candidate.section.id}`);
  if (candidateBlocks.length === 0) return { ok: false, msg: "Cannot parse this section's meeting time." };

  const conflict = findConflict(candidateBlocks, existingBlocks);
  if (conflict) {
    const candidateBlock = conflict.candidate;
    const hit = conflict.hit;
    return {
      ok: false,
      msg: `Time conflict: ${DAY_NAME[candidateBlock.day]} ${minToTimeStr(candidateBlock.startMin)}-${minToTimeStr(candidateBlock.endMin)} overlaps with ${hit.label ?? "another section"} (${DAY_NAME[hit.day]} ${minToTimeStr(hit.startMin)}-${minToTimeStr(hit.endMin)}).`,
    };
  }

  const supabase = getSupabase();
  const { error: insertError } = await supabase
    .from("schedule_items")
    .insert([{ schedule_id: scheduleId, section_id: sectionId }]);

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
