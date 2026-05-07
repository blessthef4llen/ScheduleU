"use client";

import { getSupabase } from "@/lib/supabaseClient";

export async function getScheduleCrns(
  scheduleId: string | number
): Promise<{ crns: string[]; missingCount: number }> {
  const supabase = getSupabase();

  const { data: scheduleItems, error: scheduleItemsError } = await supabase
    .from("schedule_items")
    .select("section_id")
    .eq("schedule_id", scheduleId);

  if (scheduleItemsError) {
    throw new Error(`Failed to fetch schedule sections: ${scheduleItemsError.message}`);
  }

  const sectionIds = ((scheduleItems ?? []) as Array<{ section_id: number | string }>).map((row) => Number(row.section_id));
  if (sectionIds.length === 0) {
    return { crns: [], missingCount: 0 };
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("id, class_number")
    .in("id", sectionIds);

  if (sectionsError) {
    throw new Error(`Failed to fetch CRNs: ${sectionsError.message}`);
  }

  let missingCount = 0;
  const crns = ((sections ?? []) as Array<{ class_number?: number | string | null }>)
    .map((row) => {
      if (row.class_number === null || row.class_number === undefined || row.class_number === "") {
        missingCount += 1;
        return null;
      }
      return String(row.class_number);
    })
    .filter((crn): crn is string => Boolean(crn))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return { crns, missingCount };
}
