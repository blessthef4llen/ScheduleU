"use client";

import { useEffect, useState } from "react";
import InfoBadge from "@/components/ui/InfoBadge";
import { SecondaryButton } from "@/components/ui/Buttons";
import type { NotificationRecord } from "@/components/notifications/types";
import { getSupabase } from "@/lib/supabaseClient";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [open, setOpen] = useState(false);

  // 🔹 Get logged-in user
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function getUser() {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getUser();
      // #region agent log
      fetch("http://127.0.0.1:7680/ingest/09abfa1e-0ca2-4235-a673-180a60d980ca", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9abcf7" },
        body: JSON.stringify({
          sessionId: "9abcf7",
          runId: "pre-fix",
          hypothesisId: "H2",
          location: "components/NotificationBell.tsx:24",
          message: "auth user fetched",
          data: { hasUser: Boolean(data.user), userIdLength: data.user?.id?.length ?? 0 },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (data.user) setUserId(data.user.id);
    }
    getUser();
  }, []);

  // 🔹 Fetch notifications (INITIAL LOAD)
  useEffect(() => {
    if (!userId) return;

    async function fetchNotifications() {
      const { data, error } = await supabase
        .from("notification_center")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // #region agent log
      fetch("http://127.0.0.1:7680/ingest/09abfa1e-0ca2-4235-a673-180a60d980ca", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9abcf7" },
        body: JSON.stringify({
          sessionId: "9abcf7",
          runId: "pre-fix",
          hypothesisId: "H3",
          location: "components/NotificationBell.tsx:48",
          message: "client notification fetch result",
          data: { userIdPresent: Boolean(userId), count: data?.length ?? 0, hasError: Boolean(error), errorCode: error?.code ?? null },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (data) setNotifications(data);
    }

    fetchNotifications();
  }, [userId]);

  // 🔥 REAL-TIME LISTENER (NO MORE POLLING)
  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_center",
        },
        (payload) => {
          // #region agent log
          fetch("http://127.0.0.1:7680/ingest/09abfa1e-0ca2-4235-a673-180a60d980ca", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9abcf7" },
            body: JSON.stringify({
              sessionId: "9abcf7",
              runId: "pre-fix",
              hypothesisId: "H4",
              location: "components/NotificationBell.tsx:78",
              message: "realtime insert payload observed",
              data: { payloadUserId: payload.new.user_id ?? null, currentUserId: userId, matched: payload.new.user_id === userId },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          if (payload.new.user_id === userId) {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 🔹 Unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // 🔹 Mark as read
  const markRead = async (id: string) => {
    await supabase
      .from("notification_center")
      .update({ is_read: true })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
    );
  };

  // 🔹 Delete notification
  const deleteNotif = async (id: string) => {
    const supabase = getSupabase();
    await supabase
      .from("notification_center")
      .delete()
      .eq("id", id);

    setNotifications((prev) =>
      prev.filter((n) => n.id !== id)
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", position: "relative", fontSize: "22px", userSelect: "none" }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: "-8px", right: "-10px" }}>
            <InfoBadge variant="urgent">{unreadCount}</InfoBadge>
          </span>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: "10px",
            width: "340px",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #bfdbfe",
            boxShadow: "0 18px 34px rgba(37,99,235,0.15)",
            padding: "12px",
            zIndex: 100,
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          <p style={{ margin: "2px 0 10px", fontWeight: 700, color: "#0b1c4d" }}>Notification Center</p>
          {notifications.length === 0 && (
            <div style={{ textAlign: "center", padding: "18px 10px", color: "#475569" }}>
              No notifications yet
            </div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "12px",
                marginBottom: "10px",
                background: n.is_read ? "#f8fbff" : "#ecfeff",
                color: "#0f172a",
                border: "1px solid #dbeafe",
                borderRadius: "10px",
                transition: "transform 0.2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-3px)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <div style={{ fontSize: "14px", fontWeight: "600" }}>
                {n.messages}
              </div>

              <small style={{ color: "#64748b" }}>
                {new Date(n.created_at).toLocaleString()}
              </small>

              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  gap: "8px",
                }}
              >
                {!n.is_read && (
                  <SecondaryButton type="button" onClick={() => markRead(n.id)}>
                    Mark Read
                  </SecondaryButton>
                )}
                <SecondaryButton type="button" onClick={() => deleteNotif(n.id)}>
                  Delete
                </SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}