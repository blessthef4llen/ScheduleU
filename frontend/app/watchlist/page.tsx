"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HeaderMenu from "@/components/HeaderMenu";
import { supabase } from "@/utils/supabase";
import { listWatchlistItems, removeWatchlistItem, type WatchlistItem } from "@/lib/watchlist";

export default function WatchlistPage() {
  const menuItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/courses", label: "Courses" },
    { href: "/notifications", label: "Notifications" },
  ];

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const authUserId = data.user?.id ?? null;
      if (!authUserId) {
        setItems([]);
        setMessage("Sign in to view watched sections.");
        return;
      }

      const nextItems = listWatchlistItems(authUserId);
      setItems(nextItems);
      setMessage(nextItems.length === 0 ? "You have no watched sections yet." : "");
    };

    void load();
  }, []);

  const handleRemove = async (item: WatchlistItem) => {
    removeWatchlistItem({
      authUserId: item.authUserId,
      termTable: item.termTable,
      classNumber: item.classNumber,
    });
    const nextItems = listWatchlistItems(item.authUserId);
    setItems(nextItems);
    setMessage(nextItems.length === 0 ? "You have no watched sections yet." : "");
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <header className="flex items-center justify-between bg-schu-teal px-4 py-3 shadow-md sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight hover:opacity-80">
          ScheduleU
        </Link>
        <HeaderMenu items={menuItems} title="Watchlist" />
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Watchlist</h1>
          <p className="font-medium text-[var(--text-secondary)]">
            Track waitlisted or full classes here, then open Notification Center when you want to sync seat changes.
          </p>
        </header>

        <section className="rounded-2xl border bg-[var(--bg-elevated)] border-[var(--border-soft)] shadow-sm">
          <div className="border-b px-4 py-3 bg-[var(--bg-soft)] border-[var(--border-soft)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{items.length} watched section{items.length === 1 ? "" : "s"}</p>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-sm text-[var(--text-secondary)]">{message || "No watched sections yet."}</div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <article key={item.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-black text-[var(--text-strong)]">{item.courseCodeFull}</h2>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Section {item.section} • Class #{item.classNumber} • {item.termTable.replaceAll("_", " ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      className="rounded-xl border px-4 py-2 text-sm font-bold bg-[var(--bg-surface)] border-[var(--border-soft)] hover:bg-[var(--bg-soft)]"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div className="rounded-xl border px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)]">
                      <p className="text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">Status</p>
                      <p>{item.status || item.openSeats || "Unknown"}</p>
                    </div>
                    <div className="rounded-xl border px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)]">
                      <p className="text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">Instructor</p>
                      <p>{item.instructor || "TBA"}</p>
                    </div>
                    <div className="rounded-xl border px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)]">
                      <p className="text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">Meeting</p>
                      <p>{item.days} {item.time}</p>
                    </div>
                    <div className="rounded-xl border px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)]">
                      <p className="text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">Location</p>
                      <p>{item.location || "TBA"}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
