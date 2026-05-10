// Reusable Helpers component for ScheduleU.
import type { NotificationFilter, NotificationRecord } from "./types";

export function getCategory(type: string | null): Exclude<NotificationFilter, "all" | "unread"> {
  const value = (type ?? "").toLowerCase();

  if (value.includes("seat") || value.includes("waitlist")) return "seats";
  if (value.includes("register") || value.includes("schedule")) return "registration";
  if (value.includes("travel") || value.includes("shuttle") || value.includes("campus")) return "travel";
  return "planning";
}

export function isUrgent(notification: NotificationRecord): boolean {
  if (notification.priority === "urgent") return true;
  const text = `${notification.type ?? ""} ${notification.messages}`.toLowerCase();
  return text.includes("urgent") || text.includes("warning") || text.includes("conflict");
}

export function getNotificationTitle(notification: NotificationRecord): string {
  if (notification.title?.trim()) return notification.title.trim();
  const category = getCategory(notification.type);
  if (isUrgent(notification)) return "Schedule Alert";
  if (category === "seats") return "Seat Availability Update";
  if (category === "registration") return "Registration Reminder";
  if (category === "travel") return "Campus Travel Alert";
  return "AI Planning Insight";
}

export function getPriority(notification: NotificationRecord): "low" | "normal" | "high" | "urgent" {
  if (notification.priority) return notification.priority;
  if (isUrgent(notification)) return "urgent";
  if (!notification.is_read) return "high";
  return "normal";
}

export function getRelativeTimeLabel(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "Recently";
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
