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
      if (data.user) setUserId(data.user.id);
    }
    getUser();
  }, []);

  // 🔹 Fetch notifications (INITIAL LOAD)
  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabase();
    async function fetchNotifications() {
      const { data, error } = await supabase
        .from("notification_center")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
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
          if (payload.new.user_id === userId) {
            setNotifications((prev) => [payload.new as NotificationRecord, ...prev]);
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
    const supabase = getSupabase();
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
            width: "min(340px, calc(100vw - 24px))",
            background: "var(--bg-elevated)",
            borderRadius: "16px",
            border: "1px solid var(--border-strong)",
            boxShadow: "var(--shadow-hover)",
            padding: "12px",
            zIndex: 100,
            maxHeight: "400px",
            overflowY: "auto",
            color: "var(--text-primary)",
          }}
        >
          <p style={{ margin: "2px 0 10px", fontWeight: 700, color: "var(--text-strong)" }}>Notification Center</p>
          {notifications.length === 0 && (
            <div style={{ textAlign: "center", padding: "18px 10px", color: "var(--text-secondary)" }}>
              No notifications yet
            </div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "12px",
                marginBottom: "10px",
                background: n.is_read
                  ? "color-mix(in srgb, var(--bg-soft) 78%, var(--bg-surface))"
                  : "color-mix(in srgb, #cffafe 40%, var(--bg-surface))",
                color: "var(--text-primary)",
                border: "1px solid var(--border-soft)",
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

              <small style={{ color: "var(--text-muted)" }}>
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
