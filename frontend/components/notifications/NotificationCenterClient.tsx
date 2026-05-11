"use client";
// Reusable Notificationcenterclient component for ScheduleU.

import { useEffect, useMemo, useState } from "react";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import NotificationFilters from "./NotificationFilters";
import NotificationItem from "./NotificationItem";
import NotificationStatsRow from "./NotificationStatsRow";
import { getCategory, isUrgent } from "./helpers";
import type { NotificationFilter, NotificationRecord } from "./types";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { syncWatchlistNotifications } from "@/lib/watchlist";
import HeaderMenu from "@/components/HeaderMenu";

type NotificationCenterClientProps = {
  initialNotifications: NotificationRecord[];
  isDataUnavailable?: boolean;
};

export default function NotificationCenterClient({
  initialNotifications,
  isDataUnavailable = false,
}: NotificationCenterClientProps) {
  const menuItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/planner", label: "Planner" },
    { href: "/registration-countdown", label: "Registration" },
    { href: "/travelalerts", label: "Travel Alerts" },
    { href: "/watchlist", label: "Watchlist" },
  ];
  const [notifications, setNotifications] = useState<NotificationRecord[]>(initialNotifications);
  const [userId, setUserId] = useState("");
  const [notSignedIn, setNotSignedIn] = useState(false);
  const [clientFetchError, setClientFetchError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "priority" | "unread">("newest");

  useEffect(() => {
    async function getUserAndNotifications() {
      const supabase = getSupabase();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setNotSignedIn(true);
        return;
      }
      setNotSignedIn(false);
      const id = userData.user.id;
      setUserId(id);

      const watchlistSync = await syncWatchlistNotifications({
        supabase,
        authUserId: id,
      });
      if (watchlistSync.notifications.length > 0) {
        await Promise.all(
          watchlistSync.notifications.map((notification) =>
            supabase.from("notification_center").insert({
              user_id: id,
              messages: notification.messages,
              type: notification.type,
              is_read: false,
            })
          )
        );
      }

      const { data, error } = await supabase
        .from("notification_center")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (error) {
        setClientFetchError(true);
      } else if (data) {
        const dbNotifications = data as NotificationRecord[];
        const existingMessages = new Set(dbNotifications.map((item) => `${item.type}|${item.messages}`));
        const localOnly = watchlistSync.notifications.filter(
          (item) => !existingMessages.has(`${item.type}|${item.messages}`)
        );
        setNotifications([...localOnly, ...dbNotifications]);
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
    const supabase = getSupabase();
    await supabase.from("notification_center").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const dismissNotification = async (id: string) => {
    const supabase = getSupabase();
    await supabase.from("notification_center").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <header className="flex items-center justify-between bg-schu-teal px-4 py-3 shadow-md sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          ScheduleU
        </Link>
        <HeaderMenu items={menuItems} title="Notifications" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="page-label">ScheduleU Student Portal</p>
            <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl text-[var(--text-strong)]">
              Notification Center
            </h1>
            <p className="max-w-3xl text-sm font-medium text-[var(--text-secondary)]">
              Receive real-time academic and campus updates, including seat openings, registration milestones, and travel advisories.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-bold uppercase text-[var(--text-muted)]">
            <Link href="/watchlist" className="hover:text-schu-teal transition-colors">Watchlist</Link>
            <Link href="/planner" className="hover:text-schu-teal transition-colors">Planner</Link>
            <Link href="/travelalerts" className="hover:text-schu-teal transition-colors">Travel Alerts</Link>
          </div>
        </div>

        <div className="space-y-4">
          <SectionCard hover>
            <p className="page-label">Overview</p>
            <p className="section-intro">
              Monitor the alerts that matter most before classes fill up, registration windows shift, or campus travel changes.
            </p>
            <NotificationStatsRow notifications={notifications} />
          </SectionCard>

          <SectionCard hover>
            <p className="page-label">Inbox controls</p>
            <p className="section-intro">Filter, search, and sort the live feed the same way you would triage a planner dashboard.</p>
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
          {isDataUnavailable ? (
            <AlertBanner>
              Server database is unavailable right now. Loading notifications directly from Supabase client session.
            </AlertBanner>
          ) : null}
          {notSignedIn ? (
            <AlertBanner>
              You are not signed in.{" "}
              <Link href="/login" className="alert-banner__link">
                Go to Login
              </Link>{" "}
              to load notifications tied to your account.
            </AlertBanner>
          ) : null}
          {clientFetchError ? (
            <AlertBanner>
              Notifications are temporarily unavailable from Supabase. Please verify your session and table access policy.
            </AlertBanner>
          ) : null}

          <SectionCard hover className="notification-feed-card">
            <div className="section-heading-block">
              <p className="page-label">Live feed</p>
              <h2 id="notification-feed-heading" className="section-heading">
                Recent notifications
              </h2>
              <p className="section-intro section-intro--compact">
                Urgent and unread items stay visually elevated so you can act on schedule changes faster.
              </p>
            </div>
            <div className="notification-feed-meta">
              <span className="notification-feed-count">
                {filteredNotifications.length} item{filteredNotifications.length === 1 ? "" : "s"}
              </span>
              <span className="notification-feed-note">Seat alerts, registration updates, and planner activity in one inbox.</span>
            </div>
            <div className="notification-list notification-feed-list" aria-labelledby="notification-feed-heading">
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
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
