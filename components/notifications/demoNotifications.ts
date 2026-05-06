import type { NotificationRecord } from "./types";

const demoRows: Array<{
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: "low" | "normal" | "high" | "urgent";
  minutesAgo: number;
}> = [
  {
    id: "demo-1",
    type: "registration_reminder",
    title: "Registration Reminder",
    message: "Your registration opens in 24 hours.",
    is_read: false,
    priority: "high",
    minutesAgo: 2,
  },
  {
    id: "demo-2",
    type: "seat_alert",
    title: "Seat Available",
    message: "CECS 328 section 01 has an open seat.",
    is_read: false,
    priority: "urgent",
    minutesAgo: 8,
  },
  {
    id: "demo-3",
    type: "waitlist_update",
    title: "Waitlist Update",
    message: "You moved from position 5 to position 2 in MATH 224.",
    is_read: false,
    priority: "high",
    minutesAgo: 22,
  },
  {
    id: "demo-4",
    type: "schedule_conflict_warning",
    title: "Schedule Conflict",
    message: "Two selected classes overlap on Tuesday at 11:00 AM.",
    is_read: false,
    priority: "urgent",
    minutesAgo: 46,
  },
  {
    id: "demo-5",
    type: "travel_alert",
    title: "Travel Alert",
    message: "Beachside Shuttle delayed by 4 minutes.",
    is_read: true,
    priority: "normal",
    minutesAgo: 61,
  },
  {
    id: "demo-6",
    type: "system_notification",
    title: "System Update",
    message: "New features added to ScheduleU.",
    is_read: true,
    priority: "low",
    minutesAgo: 95,
  },
  {
    id: "demo-7",
    type: "ai_insight",
    title: "AI Insight",
    message: "Your schedule is considered heavy this semester.",
    is_read: false,
    priority: "normal",
    minutesAgo: 130,
  },
];

export function buildDemoNotifications(now = new Date()): NotificationRecord[] {
  const nowMs = now.getTime();
  return demoRows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    messages: row.message,
    is_read: row.is_read,
    priority: row.priority,
    created_at: new Date(nowMs - row.minutesAgo * 60_000).toISOString(),
    user_id: "demo-user",
  }));
}
