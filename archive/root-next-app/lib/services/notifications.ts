import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationRecord } from "@/components/notifications/types";

export async function listNotificationsForUser(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("notification_center")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

export async function markNotificationReadForUser(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
) {
  return supabase
    .from("notification_center")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
}

export async function deleteNotificationForUser(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string
) {
  return supabase.from("notification_center").delete().eq("id", notificationId).eq("user_id", userId).select("id");
}

export function toNotificationRecords(data: unknown): NotificationRecord[] {
  return (data ?? []) as NotificationRecord[];
}
