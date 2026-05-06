import { NextResponse } from "next/server";
import { deleteNotificationForUser } from "@/lib/services/notifications";
import { requireAuthUser } from "@/lib/supabaseRoute";
import { jsonError } from "@/lib/apiJson";

/** @deprecated Prefer DELETE /api/notifications */
export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!auth.user) {
    return jsonError("Unauthorized", 401, auth.error);
  }

  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const id = (body.id ?? "").trim();
  if (!id) {
    return jsonError("id is required", 400);
  }

  const { data, error } = await deleteNotificationForUser(auth.supabase, auth.user.id, id);
  if (error) {
    return jsonError("Failed to delete notification", 500, error.message);
  }
  if (!data?.length) {
    return jsonError("Forbidden", 403, "Notification not found or not owned by user");
  }

  return NextResponse.json({ success: true });
}
