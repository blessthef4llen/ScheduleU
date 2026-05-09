import { pool } from "@/frontend/lib/db";
import type { NotificationRecord } from "@/components/notifications/types";

type NotificationsQueryResult = {
  notifications: NotificationRecord[];
  isDataUnavailable: boolean;
};

export async function getNotificationsSafe(): Promise<NotificationsQueryResult> {
  // #region agent log
  fetch("http://127.0.0.1:7680/ingest/09abfa1e-0ca2-4235-a673-180a60d980ca", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9abcf7" },
    body: JSON.stringify({
      sessionId: "9abcf7",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "lib/notifications.ts:10",
      message: "getNotificationsSafe entry",
      data: { hasDatabaseUrl: Boolean(process.env.DATABASE_URL) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  try {
    const result = await pool.query("SELECT * FROM notification_center ORDER BY created_at DESC");
    // #region agent log
    fetch("http://127.0.0.1:7680/ingest/09abfa1e-0ca2-4235-a673-180a60d980ca", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9abcf7" },
      body: JSON.stringify({
        sessionId: "9abcf7",
        runId: "pre-fix",
        hypothesisId: "H3",
        location: "lib/notifications.ts:23",
        message: "server query success",
        data: { count: result.rows.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return {
      notifications: result.rows as NotificationRecord[],
      isDataUnavailable: false,
    };
  } catch (error) {
    // #region agent log
    const e = error as {
      code?: string;
      errors?: Array<{ code?: string; address?: string; port?: number }>;
    };
    fetch("http://127.0.0.1:7680/ingest/09abfa1e-0ca2-4235-a673-180a60d980ca", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9abcf7" },
      body: JSON.stringify({
        sessionId: "9abcf7",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "lib/notifications.ts:41",
        message: "server query failed",
        data: {
          code: e.code ?? null,
          nestedErrors: (e.errors ?? []).map((item) => ({ code: item.code, address: item.address, port: item.port })),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error("Unable to fetch notification_center:", error);
    return {
      notifications: [],
      isDataUnavailable: true,
    };
  }
}
