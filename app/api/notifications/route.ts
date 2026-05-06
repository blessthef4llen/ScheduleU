import { NextResponse } from "next/server";
import {
  deleteNotificationForUser,
  listNotificationsForUser,
  markNotificationReadForUser,
  toNotificationRecords,
} from "@/lib/services/notifications";
import { requireAuthUser } from "@/lib/supabaseRoute";
import { jsonError } from "@/lib/apiJson";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.user) {
    return jsonError("Unauthorized", 401, auth.error);
  }

  const { data, error } = await listNotificationsForUser(auth.supabase, auth.user.id);
  if (error) {
    return jsonError("Failed to load notifications", 500, error.message);
  }

  return NextResponse.json({ notifications: toNotificationRecords(data) });
}

export async function PATCH(req: Request) {
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

  return NextResponse.json({ success: true, id: data.id });
}

export async function DELETE(req: Request) {
  const auth = await requireAuthUser();
  if (!auth.user) {
    return jsonError("Unauthorized", 401, auth.error);
  }

  const url = new URL(req.url);
  let id = (url.searchParams.get("id") ?? "").trim();

  if (!id && req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    try {
      const body = (await req.json()) as { id?: string };
      id = (body.id ?? "").trim();
    } catch {
      // ignore invalid JSON when id may be in query string only
    }
  }

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

  return NextResponse.json({ success: true, id });
}
