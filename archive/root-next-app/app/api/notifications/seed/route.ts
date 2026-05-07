import { NextResponse } from "next/server";
import { jsonError } from "@/lib/apiJson";
import { buildDemoNotifications, getDemoNotificationMarker } from "@/lib/demo/notificationSamples";
import { requireAuthUser } from "@/lib/supabaseRoute";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return jsonError("Seed route is disabled in production", 403);
  }

  const auth = await requireAuthUser();
  if (!auth.user) {
    return jsonError("Unauthorized", 401, auth.error);
  }

  const userId = auth.user.id;
  const marker = getDemoNotificationMarker();

  const { error: deleteError } = await auth.supabase
    .from("notification_center")
    .delete()
    .eq("user_id", userId)
    .ilike("messages", `%${marker}%`);
  if (deleteError) {
    return jsonError("Failed to clear previous demo notifications", 500, deleteError.message);
  }

  const rows = buildDemoNotifications().map((n) => ({ ...n, user_id: userId }));
  const { error: insertError } = await auth.supabase.from("notification_center").insert(rows);
  if (insertError) {
    return jsonError("Failed to seed demo notifications", 500, insertError.message);
  }

  return NextResponse.json({
    success: true,
    insertedCount: rows.length,
    userId,
  });
}
