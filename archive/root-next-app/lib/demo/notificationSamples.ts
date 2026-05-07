type NotificationSample = {
  type: string;
  messages: string;
  is_read: boolean;
  created_at: string;
};

const DEMO_MARKER = "[demo-seed]";

export function getDemoNotificationMarker() {
  return DEMO_MARKER;
}

/**
 * Build realistic notifications ordered newest first.
 */
export function buildDemoNotifications(now = new Date()): NotificationSample[] {
  const baseMs = now.getTime();
  const minutesAgo = (m: number) => new Date(baseMs - m * 60_000).toISOString();

  return [
    {
      type: "registration_reminder",
      messages: `${DEMO_MARKER} Registration Reminder: Your registration opens in 24 hours.`,
      is_read: false,
      created_at: minutesAgo(10),
    },
    {
      type: "seat_alert",
      messages: `${DEMO_MARKER} Seat Available: CECS 328 section 01 has an open seat.`,
      is_read: false,
      created_at: minutesAgo(25),
    },
    {
      type: "waitlist_update",
      messages: `${DEMO_MARKER} Waitlist Update: You moved from position 5 to position 2 in MATH 224.`,
      is_read: false,
      created_at: minutesAgo(40),
    },
    {
      type: "schedule_conflict_warning",
      messages: `${DEMO_MARKER} Schedule Conflict Warning: CECS 343 and CECS 447 overlap on Tuesday at 11:00 AM.`,
      is_read: false,
      created_at: minutesAgo(55),
    },
    {
      type: "travel_alert",
      messages: `${DEMO_MARKER} Travel Alert: Beachside Shuttle delayed by 4 minutes.`,
      is_read: true,
      created_at: minutesAgo(75),
    },
    {
      type: "system_notification",
      messages: `${DEMO_MARKER} System Update: New ScheduleU planning insights are now available in your dashboard.`,
      is_read: true,
      created_at: minutesAgo(120),
    },
    {
      type: "registration_checklist",
      messages: `${DEMO_MARKER} Registration Checklist: Verify holds and backup sections before your window opens.`,
      is_read: false,
      created_at: minutesAgo(180),
    },
    {
      type: "workload_advisory",
      messages: `${DEMO_MARKER} Workload Advisory: Your planned term intensity is trending high. Consider balancing labs and writing-heavy courses.`,
      is_read: true,
      created_at: minutesAgo(260),
    },
  ];
}
