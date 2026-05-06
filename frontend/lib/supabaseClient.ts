import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase client per browser tab (window) to avoid multiple GoTrueClient instances
 * when Next/Turbopack loads the same module in more than one client chunk.
 */
const globalNode = globalThis as typeof globalThis & {
  __scheduleu_supabase_server?: SupabaseClient;
};

function createBrowserClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function getSupabase(): SupabaseClient {
  if (typeof window !== "undefined") {
    const w = window as typeof window & { __scheduleu_supabase?: SupabaseClient };
    if (!w.__scheduleu_supabase) {
      w.__scheduleu_supabase = createBrowserClient();
    }
    return w.__scheduleu_supabase;
  }
  if (!globalNode.__scheduleu_supabase_server) {
    globalNode.__scheduleu_supabase_server = createBrowserClient();
  }
  return globalNode.__scheduleu_supabase_server;
}
