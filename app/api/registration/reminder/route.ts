import { NextResponse } from "next/server";
import { getRegistrationWindowForUser } from "@/lib/services/registration";
import { requireAuthUser } from "@/lib/supabaseRoute";
import { createServerSupabase } from "@/lib/supabaseServer";

type ReminderRequest = {
  registration_at?: string;
};

function jsonError(message: string, status: number, details?: string) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthUser();
    if (!auth.user) {
      return jsonError("Unauthorized", 401, auth.error);
    }

    const userId = auth.user.id;
    let body: ReminderRequest;
    try {
      body = (await req.json()) as ReminderRequest;
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const registrationAtIso = (body.registration_at ?? "").trim();
    if (!registrationAtIso) {
      return jsonError("Invalid payload", 400, "registration_at is required");
    }

    const registrationAt = new Date(registrationAtIso);
    if (Number.isNaN(registrationAt.getTime())) {
      return jsonError("Invalid registration_at", 400);
    }

    const { data: appt, error: apptError } = await getRegistrationWindowForUser(auth.supabase, userId);
    if (apptError) {
      console.error("[registration-reminder] appointment lookup failed", apptError.message);
      return jsonError("Failed to verify appointment", 500, apptError.message);
    }
    if (!appt?.registration_time) {
      return jsonError("No registration appointment found for user", 400);
    }

    const stored = new Date(appt.registration_time).getTime();
    if (Number.isNaN(stored) || Math.abs(stored - registrationAt.getTime()) > 60_000) {
      return jsonError("registration_at does not match your stored appointment", 400);
    }

    const supabase = createServerSupabase();
    const type = "registration_reminder_24h";
    const signature = `[registration_at=${registrationAt.toISOString()}]`;
    const message = `Registration Reminder: Your registration opens in 24 hours. ${signature}`;

    const { data: existing, error: existsError } = await supabase
      .from("notification_center")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .ilike("messages", `%${signature}%`)
      .limit(1);

    if (existsError) {
      console.error("[registration-reminder] check failed", existsError.message);
      return jsonError("Failed to check reminder status", 500, existsError.message);
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ created: false, reason: "already_exists" });
    }

    const { error: insertError } = await supabase.from("notification_center").insert({
      user_id: userId,
      messages: message,
      type,
      created_at: new Date().toISOString(),
      is_read: false,
    });

    if (insertError) {
      console.error("[registration-reminder] insert failed", insertError.message);
      return jsonError("Failed to create reminder", 500, insertError.message);
    }

    return NextResponse.json({ created: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[registration-reminder] unexpected", message);
    return jsonError("Request failed", 500, message);
  }
}
