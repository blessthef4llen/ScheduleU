// Shared Notifications helpers for ScheduleU.
import { pool } from "@/lib/db";
import type { NotificationRecord } from "@/components/notifications/types";

type NotificationsQueryResult = {
  notifications: NotificationRecord[];
  isDataUnavailable: boolean;
};

export async function getNotificationsSafe(): Promise<NotificationsQueryResult> {
  try {
    const result = await pool.query("SELECT * FROM notification_center ORDER BY created_at DESC");
    return {
      notifications: result.rows as NotificationRecord[],
      isDataUnavailable: false,
    };
  } catch (error) {
    console.error("Unable to fetch notification_center:", error);
    return {
      notifications: [],
      isDataUnavailable: true,
    };
  }
}
