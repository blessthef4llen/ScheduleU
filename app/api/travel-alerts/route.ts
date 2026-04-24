import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { listActiveTravelAlerts } from "@/lib/services/travelAlerts";

function jsonError(message: string, status: number, details?: string) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

/**
 * Public read of campus-wide alerts. Uses service-role server client; RLS on `travel_alerts` still applies
 * when using the anon key — prefer service role here so the API matches seeded data without per-user policies.
 */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { alerts } = await listActiveTravelAlerts(supabase);
    return NextResponse.json({ alerts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return jsonError("Failed to load travel alerts", 500, message);
  }
}
