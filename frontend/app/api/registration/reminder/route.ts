import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

type ReminderRequest = {
  user_id?: string;
  registration_at?: string;
};

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReminderRequest;
    const userId = (body.user_id ?? "").trim();
    const registrationAtIso = (body.registration_at ?? "").trim();

    if (!userId || !isUuid(userId) || !registrationAtIso) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const registrationAt = new Date(registrationAtIso);
    if (Number.isNaN(registrationAt.getTime())) {
      return NextResponse.json({ error: "Invalid registration_at" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Deterministic signature: type + user_id + appointment ISO in message.
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
      return NextResponse.json(
        { error: "Failed to check reminder status", details: existsError.message },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: "Failed to create reminder", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ created: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[registration-reminder] unexpected", message);
    return NextResponse.json({ error: "Request failed", details: message }, { status: 500 });
  }
}
