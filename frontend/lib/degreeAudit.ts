// Shared Degreeaudit helpers for ScheduleU.
import { supabase } from "@/utils/supabase";

export async function getDegreeAudit(userId: string, programId: number) {

  const { data, error } = await supabase
    .from("degree_audit_summary")
    .select("*")
    .eq("user_id", userId)
    .eq("program_id", programId)
    .order("group_id")

  if (error) {
    console.error("Degree audit error:", error)
    return []
  }

  return data
}