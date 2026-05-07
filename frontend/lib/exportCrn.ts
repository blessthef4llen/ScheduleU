"use client";

import { getSupabase } from "@/lib/supabaseClient";

type ScheduleItemCrnRow = {
  section_id: number | string;
  section_uid?: string | null;
};

type SemesterCrnRow = {
  section_uid?: string | null;
  class_number?: string | number | null;
};

type LegacySectionCrnRow = {
  id: number | string;
  class_number?: string | number | null;
};

const TERM_TABLES: Record<string, string> = {
  "spring 2026": "spring_2026",
  spring_2026: "spring_2026",
  "summer 2026": "summer_2026",
  summer_2026: "summer_2026",
};

function semesterTableForTerm(term?: string | null): string {
  const key = (term ?? "Spring 2026").trim().toLowerCase().replace(/\s+/g, " ");
  return TERM_TABLES[key] ?? TERM_TABLES[key.replaceAll(" ", "_")] ?? "spring_2026";
}

function normalizeCrn(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function uniqueSortedCrns(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

async function getScheduleTerm(scheduleId: string | number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("schedules")
    .select("term")
    .eq("id", scheduleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch schedule term: ${error.message}`);
  }

  return (data as { term?: string | null } | null)?.term ?? "Spring 2026";
}

export async function getScheduleCrns(
  scheduleId: string | number
): Promise<{ crns: string[]; missingCount: number }> {
  const supabase = getSupabase();
  const term = await getScheduleTerm(scheduleId);
  const semesterTable = semesterTableForTerm(term);

  const { data: scheduleItems, error: scheduleItemsError } = await supabase
    .from("schedule_items")
    .select("section_id, section_uid")
    .eq("schedule_id", scheduleId);

  if (scheduleItemsError) {
    throw new Error(`Failed to fetch schedule sections: ${scheduleItemsError.message}`);
  }

  const rows = (scheduleItems ?? []) as ScheduleItemCrnRow[];
  if (rows.length === 0) {
    return { crns: [], missingCount: 0 };
  }

  const sectionUids = rows
    .map((row) => normalizeCrn(row.section_uid))
    .filter((uid): uid is string => Boolean(uid));
  const sectionIds = rows
    .map((row) => normalizeCrn(row.section_id))
    .filter((id): id is string => Boolean(id));

  const semesterRowsByUid =
    sectionUids.length > 0
      ? await supabase
          .from(semesterTable)
          .select("section_uid, class_number")
          .in("section_uid", sectionUids)
      : { data: [] as SemesterCrnRow[], error: null };

  if (semesterRowsByUid.error) {
    throw new Error(`Failed to fetch CRNs from ${semesterTable}: ${semesterRowsByUid.error.message}`);
  }

  const semesterRowsByClassNumber =
    sectionIds.length > 0
      ? await supabase
          .from(semesterTable)
          .select("section_uid, class_number")
          .in("class_number", sectionIds)
      : { data: [] as SemesterCrnRow[], error: null };

  if (semesterRowsByClassNumber.error) {
    throw new Error(`Failed to fetch CRNs from ${semesterTable}: ${semesterRowsByClassNumber.error.message}`);
  }

  const semesterRows = [
    ...((semesterRowsByUid.data ?? []) as SemesterCrnRow[]),
    ...((semesterRowsByClassNumber.data ?? []) as SemesterCrnRow[]),
  ];
  const semesterCrns = uniqueSortedCrns(semesterRows.map((row) => normalizeCrn(row.class_number)));

  const foundCrnSet = new Set(semesterCrns);
  const missingSectionIds = sectionIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && !foundCrnSet.has(String(id)));

  let legacyCrns: string[] = [];
  if (missingSectionIds.length > 0) {
    const { data: legacySections, error: legacyError } = await supabase
      .from("sections")
      .select("id, class_number")
      .in("id", missingSectionIds);

    if (legacyError) {
      throw new Error(`Failed to fetch legacy section class numbers: ${legacyError.message}`);
    }

    legacyCrns = uniqueSortedCrns(
      ((legacySections ?? []) as LegacySectionCrnRow[]).map((row) => normalizeCrn(row.class_number))
    );
  }

  const crns = uniqueSortedCrns([...semesterCrns, ...legacyCrns]);
  return { crns, missingCount: Math.max(rows.length - crns.length, 0) };
}
