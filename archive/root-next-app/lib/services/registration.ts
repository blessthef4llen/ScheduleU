import type { SupabaseClient } from "@supabase/supabase-js";

export type RegistrationWindowRow = {
  id: string;
  user_id: string;
  registration_time: string;
};

export async function getRegistrationWindowForUser(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("registration_windows")
    .select("registration_time,user_id,id")
    .eq("user_id", userId)
    .order("registration_time", { ascending: true })
    .limit(1)
    .maybeSingle();
}
