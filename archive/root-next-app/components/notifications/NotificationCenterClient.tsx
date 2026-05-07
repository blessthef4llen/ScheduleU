"use client";

import { useEffect, useMemo, useState } from "react";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/ui/EmptyState";
import PageLayout from "@/components/ui/PageLayout";
import SectionCard from "@/components/ui/SectionCard";
import NotificationFilters from "./NotificationFilters";
import NotificationItem from "./NotificationItem";
import NotificationStatsRow from "./NotificationStatsRow";
import { buildDemoNotifications } from "./demoNotifications";
import { getCategory, isUrgent } from "./helpers";
import type { NotificationFilter, NotificationRecord } from "./types";
import { getSupabase } from "@/lib/supabaseClient";

type NotificationCenterClientProps = {
  initialNotifications: NotificationRecord[];
  isDataUnavailable?: boolean;
};

export default function NotificationCenterClient({
  initialNotifications,
  isDataUnavailable = false,
}: NotificationCenterClientProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>(initialNotifications);
  const [userId, setUserId] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [clientFetchError, setClientFetchError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "priority" | "unread">("newest");

  useEffect(() => {
    async function getUserAndNotifications() {
      const supabase = getSupabase();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setNotifications(buildDemoNotifications());
        setIsDemoMode(true);
        setClientFetchError(false);
        return;
      }
      setIsDemoMode(false);
      const id = userData.user.id;
      setUserId(id);

      let res: Response;
      try {
        res = await fetch("/api/notifications");
      } catch {
        setNotifications(buildDemoNotifications());
        setIsDemoMode(true);
        setClientFetchError(true);
        return;
      }
      const json = (await res.json()) as { notifications?: NotificationRecord[]; error?: string };
      if (!res.ok) {
        setNotifications(buildDemoNotifications());
        setIsDemoMode(true);
        setClientFetchError(true);
      } else if (json.notifications?.length) {
        setNotifications(json.notifications);
        setIsDemoMode(false);
        setClientFetchError(false);
      } else {
        setNotifications(buildDemoNotifications());
        setIsDemoMode(true);
        setClientFetchError(false);
      }
    }

    getUserAndNotifications();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel("notifications-center")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_center" },
        (payload) => {
          const matches = payload.new.user_id === userId;
          if (matches) {
            setNotifications((prev) => [payload.new as NotificationRecord, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    const filtered = notifications.filter((notification) => {
      if (activeFilter === "unread" && notification.is_read) return false;
      if (activeFilter !== "all" && activeFilter !== "unread" && getCategory(notification.type) !== activeFilter) {
        return false;
      }
      if (!normalizedSearch) return true;
      return `${notification.messages} ${notification.type ?? ""}`.toLowerCase().includes(normalizedSearch);
    });

    return filtered.sort((a, b) => {
      if (sortBy === "priority") {
        const aPriority = Number(isUrgent(a) || !a.is_read);
        const bPriority = Number(isUrgent(b) || !b.is_read);
        if (aPriority !== bPriority) return bPriority - aPriority;
      }
      if (sortBy === "unread") {
        const aUnread = Number(!a.is_read);
        const bUnread = Number(!b.is_read);
        if (aUnread !== bUnread) return bUnread - aUnread;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notifications, activeFilter, searchValue, sortBy]);

  const markAsRead = async (id: string) => {
    if (isDemoMode) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      return;
    }
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const dismissNotification = async (id: string) => {
    if (isDemoMode) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      return;
    }
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <PageLayout
      label="ScheduleU Student Portal"
      title="Notification Center"
      subtitle="Receive real-time academic and campus updates, including seat openings, registration milestones, and travel advisories."
    >
      <SectionCard>
        <NotificationStatsRow notifications={notifications} />
      </SectionCard>

      <SectionCard>
        <NotificationFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </SectionCard>

      <AlertBanner>
        Stay proactive: unread and urgent notifications are prioritized so you can act on schedule changes quickly.
      </AlertBanner>
      {isDemoMode ? <AlertBanner>Preview Notifications: showing realistic demo data.</AlertBanner> : null}
      {isDataUnavailable ? (
        <AlertBanner>
          Server database is unavailable right now. Loading notifications directly from Supabase client session.
        </AlertBanner>
      ) : null}
      {clientFetchError ? (
        <AlertBanner>
          Notifications are temporarily unavailable from the server API. Showing demo preview data.
        </AlertBanner>
      ) : null}

      <section className="notification-list">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No notifications yet"
            text="You are all caught up. We'll notify you when new academic or campus alerts arrive."
          />
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
              onDismiss={dismissNotification}
            />
          ))
        )}
      </section>
    </PageLayout>
  );
}
