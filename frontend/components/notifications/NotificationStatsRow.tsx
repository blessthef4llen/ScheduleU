// Reusable Notificationstatsrow component for ScheduleU.
import StatBadge from "@/components/ui/StatBadge";
import type { NotificationRecord } from "./types";
import { getCategory } from "./helpers";

type NotificationStatsRowProps = {
  notifications: NotificationRecord[];
};

export default function NotificationStatsRow({ notifications }: NotificationStatsRowProps) {
  const unread = notifications.filter((n) => !n.is_read).length;
  const seat = notifications.filter((n) => getCategory(n.type) === "seats").length;
  const registration = notifications.filter((n) => getCategory(n.type) === "registration").length;
  const travel = notifications.filter((n) => getCategory(n.type) === "travel").length;

  return (
    <div className="stats-grid">
      <StatBadge label="Unread Notifications" value={unread} />
      <StatBadge label="Seat Alerts" value={seat} />
      <StatBadge label="Registration Reminders" value={registration} />
      <StatBadge label="Shuttle / Travel Alerts" value={travel} />
    </div>
  );
}
