import type { NotificationFilter, NotificationRecord } from "./types";

export function getCategory(type: string | null): Exclude<NotificationFilter, "all" | "unread"> {
  const value = (type ?? "").toLowerCase();

  if (value.includes("seat") || value.includes("waitlist")) return "seats";
  if (value.includes("register") || value.includes("schedule")) return "registration";
  if (value.includes("travel") || value.includes("shuttle") || value.includes("campus")) return "travel";
  return "planning";
}

export function isUrgent(notification: NotificationRecord): boolean {
  const text = `${notification.type ?? ""} ${notification.messages}`.toLowerCase();
  return text.includes("urgent") || text.includes("warning") || text.includes("conflict");
}

export function getNotificationTitle(notification: NotificationRecord): string {
  const category = getCategory(notification.type);
  if (isUrgent(notification)) return "Schedule Alert";
  if (category === "seats") return "Seat Availability Update";
  if (category === "registration") return "Registration Reminder";
  if (category === "travel") return "Campus Travel Alert";
  return "AI Planning Insight";
}
