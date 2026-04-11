import { NextResponse } from "next/server";
import { markNotificationReadForUser } from "@/lib/services/notifications";
import { requireAuthUser } from "@/lib/supabaseRoute";

function jsonError(message: string, status: number, details?: string) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

/** @deprecated Prefer PATCH /api/notifications */
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

  const { data, error } = await markNotificationReadForUser(auth.supabase, auth.user.id, id);
  if (error) {
    return jsonError("Failed to update notification", 500, error.message);
  }
  if (!data) {
    return jsonError("Forbidden", 403, "Notification not found or not owned by user");
  }

  return NextResponse.json({ success: true });
}
