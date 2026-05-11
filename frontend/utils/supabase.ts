"use client";
// Utility helpers for Supabase.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const STORAGE_KEY = "scheduleu-auth";
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

function createBrowserSupabase(): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: STORAGE_KEY,
    },
  });
}

const w = window as typeof window & { __scheduleu_supabase?: SupabaseClient };
export const supabase = w.__scheduleu_supabase ?? (w.__scheduleu_supabase = createBrowserSupabase());
