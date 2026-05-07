import type { SupabaseClient } from "@supabase/supabase-js";
import {
  analyzeWorkload,
  type CourseDifficultyProfile,
  type StudentPlannedCourse,
  type WorkloadResult,
} from "@/lib/workloadScorer";

function parseTerm(term: string): { year: number; seasonRank: number; valid: boolean } {
  const m = term.trim().match(/(spring|summer|fall|winter)\s*(\d{4})/i);
  if (!m) return { year: 0, seasonRank: 0, valid: false };
  const season = m[1].toLowerCase();
  const year = Number(m[2]);
  const seasonRank = season === "winter" ? 1 : season === "spring" ? 2 : season === "summer" ? 3 : 4;
  return { year, seasonRank, valid: Number.isFinite(year) };
}

function pickMostRecentTerm(terms: string[]): string | null {
  if (terms.length === 0) return null;
  return [...terms].sort((a, b) => {
    const pa = parseTerm(a);
    const pb = parseTerm(b);
    if (pa.valid && pb.valid) {
      if (pa.year !== pb.year) return pb.year - pa.year;
      return pb.seasonRank - pa.seasonRank;
    }
    if (pa.valid) return -1;
    if (pb.valid) return 1;
    return b.localeCompare(a);
  })[0];
}

export async function getWorkloadDataForUser(supabase: SupabaseClient, userId: string) {
  const { data: plannedRows, error: plannedError } = await supabase
    .from("student_planned_courses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (plannedError) {
    return { plannedRows: null as StudentPlannedCourse[] | null, profileRows: null, error: plannedError };
  }

  const planned = (plannedRows ?? []) as StudentPlannedCourse[];
  const courseCodes = Array.from(new Set(planned.map((p) => p.course_code).filter(Boolean)));

  if (courseCodes.length === 0) {
    return { plannedRows: planned, profileRows: [] as CourseDifficultyProfile[], error: null };
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("course_difficulty_profiles")
    .select("*")
    .in("course_code", courseCodes);

  if (profileError) {
    return { plannedRows: planned, profileRows: null, error: profileError };
  }

  return {
    plannedRows: planned,
    profileRows: (profileRows ?? []) as CourseDifficultyProfile[],
    error: null,
  };
}

/** Same term selection and scoring as the client dashboard (single source of scoring rules in `analyzeWorkload`). */
export function computeWorkloadResultFromRows(
  planned: StudentPlannedCourse[],
  profiles: CourseDifficultyProfile[]
): { result: WorkloadResult | null; selectedTerm: string | null } {
  if (planned.length === 0) return { result: null, selectedTerm: null };
  const terms = Array.from(new Set(planned.map((p) => p.term).filter(Boolean)));
  const term = pickMostRecentTerm(terms);
  const termCourses = term ? planned.filter((p) => p.term === term) : planned;
  const courseCodes = Array.from(new Set(termCourses.map((p) => p.course_code).filter(Boolean)));
  const profilesByCode: Record<string, CourseDifficultyProfile> = {};
  for (const row of profiles) {
    if (courseCodes.includes(row.course_code)) profilesByCode[row.course_code] = row;
  }
  const result =
    courseCodes.length === 0 ? analyzeWorkload(termCourses, {}) : analyzeWorkload(termCourses, profilesByCode);
  return { result, selectedTerm: term };
}
