"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadStoredJson, saveStoredJson } from "./browserStorage";

const WATCHLIST_KEY = "scheduleu.watchlist.items";

export type WatchlistItem = {
  id: string;
  authUserId: string;
  termTable: string;
  classNumber: string;
  section: string;
  courseCodeFull: string;
  courseTitle: string;
  instructor: string;
  days: string;
  time: string;
  location: string;
  status: string;
  openSeats: string;
  addedAt: string;
  lastKnownStatus: string;
  lastNotifiedStatus: string | null;
};

export type WatchlistNotification = {
  id: string;
  messages: string;
  created_at: string;
  is_read: boolean;
  type: string;
  title?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  user_id?: string;
};

type RawSectionStatusRow = Record<string, unknown>;

function readAllWatchlistItems() {
  return loadStoredJson<WatchlistItem[]>(WATCHLIST_KEY, []);
}

function writeAllWatchlistItems(items: WatchlistItem[]) {
  saveStoredJson(WATCHLIST_KEY, items);
}

export function listWatchlistItems(authUserId?: string | null) {
  const items = readAllWatchlistItems();
  if (!authUserId) return items;
  return items.filter((item) => item.authUserId === authUserId);
}

export function isSectionWatched(params: {
  authUserId?: string | null;
  termTable: string;
  classNumber: string;
}) {
  if (!params.authUserId) return false;

  return listWatchlistItems(params.authUserId).some(
    (item) => item.termTable === params.termTable && item.classNumber === params.classNumber
  );
}

export function saveWatchlistItem(item: WatchlistItem) {
  const items = readAllWatchlistItems();
  const existingIndex = items.findIndex(
    (entry) =>
      entry.authUserId === item.authUserId &&
      entry.termTable === item.termTable &&
      entry.classNumber === item.classNumber
  );

  if (existingIndex >= 0) {
    items[existingIndex] = {
      ...items[existingIndex],
      ...item,
    };
  } else {
    items.unshift(item);
  }

  writeAllWatchlistItems(items);
}

export function removeWatchlistItem(params: {
  authUserId?: string | null;
  termTable: string;
  classNumber: string;
}) {
  if (!params.authUserId) return;

  writeAllWatchlistItems(
    readAllWatchlistItems().filter(
      (item) =>
        !(
          item.authUserId === params.authUserId &&
          item.termTable === params.termTable &&
          item.classNumber === params.classNumber
        )
    )
  );
}

function normalizeSeatStatus(row: RawSectionStatusRow): string {
  const explicitStatus = String(row.status ?? "").trim().toLowerCase();
  const openSeats = String(row.open_seats ?? "").trim().toLowerCase();
  const comment = String(row.comment ?? "").trim().toLowerCase();
  const combined = `${explicitStatus} ${openSeats} ${comment}`;

  const numericSeats = Number(openSeats);
  if (Number.isFinite(numericSeats)) {
    return numericSeats > 0 ? "open" : "closed";
  }
  if (combined.includes("wait")) return "waitlist";
  if (combined.includes("open") || combined.includes("available")) return "open";
  if (combined.includes("closed") || combined.includes("full")) return "closed";
  return explicitStatus || openSeats || "unknown";
}

function buildSeatOpenMessage(item: WatchlistItem, row: RawSectionStatusRow) {
  const seats = String(row.open_seats ?? item.openSeats).trim();
  const seatSuffix = seats ? ` Seats: ${seats}.` : "";
  return `${item.courseCodeFull} section ${item.section} is now open.${seatSuffix} ${item.days} ${item.time} ${item.location}`.trim();
}

export async function syncWatchlistNotifications(params: {
  supabase: SupabaseClient;
  authUserId: string;
}) {
  const items = listWatchlistItems(params.authUserId);
  if (items.length === 0) {
    return { notifications: [] as WatchlistNotification[], updatedItems: items };
  }

  const updatedItems = [...items];
  const notifications: WatchlistNotification[] = [];
  const itemsByTerm = new Map<string, WatchlistItem[]>();

  for (const item of items) {
    const current = itemsByTerm.get(item.termTable) ?? [];
    current.push(item);
    itemsByTerm.set(item.termTable, current);
  }

  for (const [termTable, termItems] of itemsByTerm.entries()) {
    const classNumbers = Array.from(new Set(termItems.map((item) => item.classNumber).filter(Boolean)));
    if (classNumbers.length === 0) continue;

    const { data } = await params.supabase.from(termTable).select("*").in("class_number", classNumbers);
    const rows = (data ?? []) as RawSectionStatusRow[];
    const rowsByClass = new Map<string, RawSectionStatusRow>();
    for (const row of rows) {
      const classNumber = String(row.class_number ?? "").trim();
      if (classNumber) rowsByClass.set(classNumber, row);
    }

    for (const item of termItems) {
      const row = rowsByClass.get(item.classNumber);
      if (!row) continue;

      const currentStatus = normalizeSeatStatus(row);
      const idx = updatedItems.findIndex((entry) => entry.id === item.id);
      if (idx < 0) continue;

      updatedItems[idx] = {
        ...updatedItems[idx],
        status: String(row.status ?? item.status).trim(),
        openSeats: String(row.open_seats ?? item.openSeats).trim(),
        instructor: String(row.instructor ?? item.instructor).trim() || item.instructor,
        days: String(row.days ?? item.days).trim() || item.days,
        time: String(row.time ?? item.time).trim() || item.time,
        location: String(row.location ?? item.location).trim() || item.location,
        lastKnownStatus: currentStatus,
      };

      if (currentStatus === "open" && item.lastNotifiedStatus !== "open") {
        const createdAt = new Date().toISOString();
        const notification: WatchlistNotification = {
          id: `watchlist-${item.classNumber}-${createdAt}`,
          user_id: params.authUserId,
          created_at: createdAt,
          is_read: false,
          type: "seat_open_watchlist",
          title: "Seat Availability Update",
          priority: "urgent",
          messages: buildSeatOpenMessage(item, row),
        };
        notifications.push(notification);
        updatedItems[idx].lastNotifiedStatus = "open";
      }
    }
  }

  writeAllWatchlistItems(updatedItems);
  return { notifications, updatedItems };
}
