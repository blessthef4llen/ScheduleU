import NotificationCenterClient from "@/components/notifications/NotificationCenterClient";

export default function NotificationsPage() {
  return <NotificationCenterClient initialNotifications={[]} isDataUnavailable={false} />;
}
