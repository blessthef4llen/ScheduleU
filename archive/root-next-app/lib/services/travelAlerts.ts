import type { SupabaseClient } from "@supabase/supabase-js";
import type { TravelAlert, TravelCategory, TravelPriority, TravelShuttleStatus } from "@/lib/types/travelAlert";
import { TRAVEL_MOCK_ALERTS } from "@/lib/travelAlertsMock";

type TravelAlertRow = {
  id: string;
  category: string;
  title: string;
  message: string;
  route: string | null;
  location: string | null;
  shuttle_status: string | null;
  priority: string;
  sort_index: number;
  is_active: boolean;
  updated_at: string;
};

function formatUpdatedLabel(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Recently updated";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Updated just now";
  if (m < 60) return `Updated ${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Updated ${h} hr ago`;
  return `Updated ${Math.floor(h / 24)} day(s) ago`;
}

function mapRow(r: TravelAlertRow): TravelAlert {
  const category = r.category as TravelCategory;
  const shuttleRaw = r.shuttle_status;
  const shuttleStatus =
    shuttleRaw === "on-time" || shuttleRaw === "delayed" ? (shuttleRaw as TravelShuttleStatus) : undefined;
  return {
    id: r.id,
    category,
    title: r.title,
    message: r.message,
    route: r.route ?? undefined,
    location: r.location ?? undefined,
    shuttleStatus,
    updatedLabel: formatUpdatedLabel(r.updated_at),
    priority: (r.priority === "high" ? "high" : "normal") as TravelPriority,
    sortIndex: r.sort_index,
  };
}

/**
 * Reads active travel_alerts using the provided client (typically service role for reliable public reads).
 * Falls back to TRAVEL_MOCK_ALERTS if the table is missing or query fails.
 */
export async function listActiveTravelAlerts(supabase: SupabaseClient): Promise<{ alerts: TravelAlert[]; source: "database" | "fallback" }> {
  const { data, error } = await supabase
    .from("travel_alerts")
    .select("*")
    .eq("is_active", true)
    .order("sort_index", { ascending: true });

  if (error || !data?.length) {
    return { alerts: TRAVEL_MOCK_ALERTS, source: "fallback" };
  }

  try {
    const alerts = (data as TravelAlertRow[]).map(mapRow);
    return { alerts, source: "database" };
  } catch {
    return { alerts: TRAVEL_MOCK_ALERTS, source: "fallback" };
  }
}
