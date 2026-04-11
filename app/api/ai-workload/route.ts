import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/supabaseRoute";
import { computeWorkloadResultFromRows, getWorkloadDataForUser } from "@/lib/services/workload";

function jsonError(message: string, status: number, details?: string) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.user) {
    return jsonError("Unauthorized", 401, auth.error);
  }

  const { plannedRows, profileRows, error } = await getWorkloadDataForUser(auth.supabase, auth.user.id);
  if (error) {
    return jsonError("Failed to load workload data", 500, error.message);
  }
  if (!plannedRows?.length) {
    return NextResponse.json({ result: null, selectedTerm: null, plannedCourses: [], profilesByCode: {} });
  }

  const profiles = profileRows ?? [];
  const { result, selectedTerm } = computeWorkloadResultFromRows(plannedRows, profiles);
  const profilesByCode: Record<string, (typeof profiles)[number]> = {};
  for (const row of profiles) {
    profilesByCode[row.course_code] = row;
  }

  return NextResponse.json({
    result,
    selectedTerm,
    plannedCourses: plannedRows,
    profilesByCode,
  });
}
