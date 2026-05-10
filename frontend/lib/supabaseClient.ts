"use client";
// Shared Supabaseclient helpers for ScheduleU.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase client per browser tab (window) to avoid multiple GoTrueClient instances
 * when Next/Turbopack loads the same module in more than one client chunk.
 */
function getBrowserSupabaseEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `ScheduleU Supabase browser client is missing ${missing.join(
        " and "
      )}. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart npm run dev.`
    );
  }

  return { supabaseUrl: supabaseUrl!, supabaseAnonKey: supabaseAnonKey! };
}

function createScheduleUBrowserClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = getBrowserSupabaseEnv();
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("ScheduleU browser Supabase client must only be used from client components or browser effects.");
  }

  const w = window as typeof window & { __scheduleu_supabase?: SupabaseClient };
  if (!w.__scheduleu_supabase) {
    w.__scheduleu_supabase = createScheduleUBrowserClient();
  }
  return w.__scheduleu_supabase;
}
