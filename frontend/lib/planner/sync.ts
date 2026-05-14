"use client";
// Shared planner/builder sync helpers for ScheduleU.

import { loadStoredJson, saveStoredJson } from "@/lib/browserStorage";
import { getSupabase } from "@/lib/supabaseClient";
import { minToTimeStr, parseDays, parseTimeRange } from "./conflict";
import { termTableForTerm } from "./terms";
import type { SectionLite } from "./types";

export const ACCEPTED_SCHEDULES_KEY = "scheduleu.acceptedSchedules";
export const SCHEDULE_SYNC_EVENT = "scheduleu:schedule-sync";

export type PlannerSyncMode = "schedule_only" | "schedule_and_cart";

export type ScheduleBuilderMeeting = {
  type?: string | null;
  day: string;
  start: string;
  end: string;
  location?: string | null;
  instructor?: string | null;
  comments?: string | null;
};

export type ScheduleBuilderSection = {
  course: string;
  section_id: string;
  meetings: ScheduleBuilderMeeting[];
};

export type AcceptedScheduleSnapshot = {
  term: string;
  selectedAt: string;
  selectedSections: ScheduleBuilderSection[];
};

const BUILDER_DAY_LABEL: Record<number, string> = {
  0: "Su",
  1: "M",
  2: "T",
  3: "W",
  4: "Th",
  5: "F",
  6: "Sa",
};

function toComparableMinutes(value: string) {
  const match = value.trim().match(/(\d{1,2}):?(\d{2})?(AM|PM)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const suffix = match[3].toUpperCase();
  if (suffix === "AM" && hour === 12) hour = 0;
  if (suffix === "PM" && hour !== 12) hour += 12;
  return hour * 60 + minute;
}

function notifyScheduleSync(authUserId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCHEDULE_SYNC_EVENT, { detail: { authUserId } }));
}

function sectionMeetingsForBuilder(section: SectionLite): ScheduleBuilderMeeting[] {
  const parsedDays = parseDays(section.days);
  const parsedTime = parseTimeRange(section.time_range);

  if (parsedDays.length > 0 && parsedTime.ok) {
    return parsedDays.map((day) => ({
      type: section.component_type ?? null,
      day: BUILDER_DAY_LABEL[day] ?? String(day),
      start: minToTimeStr(parsedTime.startMin!),
      end: minToTimeStr(parsedTime.endMin!),
      location: section.location ?? null,
      instructor: section.instructor ?? null,
      comments: section.status ?? null,
    }));
  }

  if (!section.days && !section.time_range) return [];

  return [
    {
      type: section.component_type ?? null,
      day: section.days ?? "TBA",
      start: section.time_range ?? "",
      end: "",
      location: section.location ?? null,
      instructor: section.instructor ?? null,
      comments: section.status ?? null,
    },
  ];
}

export function sectionsToBuilderSections(sections: SectionLite[]): ScheduleBuilderSection[] {
  return sections.map((section) => ({
    course: section.course_code_full ?? `SEC ${section.id}`,
    section_id: String(section.section ?? section.class_number ?? section.id),
    meetings: sectionMeetingsForBuilder(section),
  }));
}

export function loadAcceptedScheduleSnapshot(authUserId: string): AcceptedScheduleSnapshot | null {
  const acceptedSchedules = loadStoredJson<Record<string, AcceptedScheduleSnapshot>>(ACCEPTED_SCHEDULES_KEY, {});
  return acceptedSchedules[authUserId] ?? null;
}

export function saveAcceptedScheduleSnapshot(params: {
  authUserId: string;
  term: string;
  selectedSections: ScheduleBuilderSection[];
}) {
  const acceptedSchedules = loadStoredJson<Record<string, AcceptedScheduleSnapshot>>(ACCEPTED_SCHEDULES_KEY, {});
  acceptedSchedules[params.authUserId] = {
    term: params.term,
    selectedAt: new Date().toISOString(),
    selectedSections: params.selectedSections,
  };
  saveStoredJson(ACCEPTED_SCHEDULES_KEY, acceptedSchedules);
  notifyScheduleSync(params.authUserId);
}

export async function syncPlannedCoursesFromBuilderSections(params: {
  authUserId: string;
  term: string;
  sections: ScheduleBuilderSection[];
}) {
  const supabase = getSupabase();
  const deactivateExisting = await supabase
    .from("student_planned_courses")
    .update({ is_active: false })
    .eq("user_id", params.authUserId)
    .eq("term", params.term);

  if (deactivateExisting.error) {
    throw new Error(deactivateExisting.error.message);
  }

  if (params.sections.length === 0) return;

  const plannedRows = params.sections.map((section) => {
    const orderedMeetings = [...section.meetings].sort(
      (a, b) => toComparableMinutes(a.start) - toComparableMinutes(b.start)
    );
    const meetingDays = orderedMeetings.map((meeting) => meeting.day).filter(Boolean).join("/");

    return {
      user_id: params.authUserId,
      term: params.term,
      course_code: section.course,
      section_code: section.section_id,
      meeting_days: meetingDays || null,
      start_time: orderedMeetings[0]?.start || null,
      end_time: orderedMeetings[orderedMeetings.length - 1]?.end || null,
      is_active: true,
    };
  });

  const insertPlanned = await supabase.from("student_planned_courses").insert(plannedRows);
  if (insertPlanned.error) {
    throw new Error(insertPlanned.error.message);
  }
}

export async function syncCartFromSections(params: {
  authUserId: string;
  term: string;
  sections: SectionLite[];
}) {
  const supabase = getSupabase();
  const termTable = params.sections.find((section) => section.term_table)?.term_table ?? termTableForTerm(params.term);

  const deleteExisting = await supabase
    .from("shopping_cart")
    .delete()
    .eq("user_id", params.authUserId)
    .eq("term_table", termTable);

  if (deleteExisting.error) {
    throw new Error(deleteExisting.error.message);
  }

  if (params.sections.length === 0) return;

  const payload = params.sections.map((section) => ({
    user_id: params.authUserId,
    term_table: section.term_table ?? termTable,
    section: section.section,
    class_number: section.class_number ? String(section.class_number) : null,
    course_code_full: section.course_code_full,
    course_title: section.course_title ?? null,
    units: section.units ?? null,
    course_info: null,
    type: section.component_type ?? null,
    days: section.days ?? null,
    time: section.time_range ?? null,
    location: section.location ?? null,
    instructor: section.instructor ?? null,
    comment: null,
  }));

  const insertCart = await supabase.from("shopping_cart").insert(payload);
  if (insertCart.error) {
    throw new Error(insertCart.error.message);
  }
}

export async function syncPlannerSideEffects(params: {
  authUserId: string;
  term: string;
  sections: SectionLite[];
  mode: PlannerSyncMode;
}): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  const builderSections = sectionsToBuilderSections(params.sections);

  try {
    saveAcceptedScheduleSnapshot({
      authUserId: params.authUserId,
      term: params.term,
      selectedSections: builderSections,
    });
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Could not update Schedule Builder snapshot.");
  }

  try {
    await syncPlannedCoursesFromBuilderSections({
      authUserId: params.authUserId,
      term: params.term,
      sections: builderSections,
    });
  } catch (error) {
    warnings.push(error instanceof Error ? `AI workload plan: ${error.message}` : "Could not update AI workload plan.");
  }

  if (params.mode === "schedule_and_cart") {
    try {
      await syncCartFromSections({
        authUserId: params.authUserId,
        term: params.term,
        sections: params.sections,
      });
    } catch (error) {
      warnings.push(error instanceof Error ? `Shopping cart: ${error.message}` : "Could not update shopping cart.");
    }
  }

  return { warnings };
}
