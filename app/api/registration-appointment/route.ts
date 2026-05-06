import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/supabaseRoute";
import { getRegistrationWindowForUser } from "@/lib/services/registration";
import { jsonError } from "@/lib/apiJson";

export async function GET() {
  const auth = await requireAuthUser();
  if (!auth.user) {
    return jsonError("Unauthorized", 401, auth.error);
  }

  const { data, error } = await getRegistrationWindowForUser(auth.supabase, auth.user.id);
  if (error) {
    return jsonError("Failed to load appointment", 500, error.message);
  }

  return NextResponse.json({ appointment: data ?? null });
}
