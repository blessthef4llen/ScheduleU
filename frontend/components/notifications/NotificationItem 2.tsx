import { GradientButton, SecondaryButton } from "@/components/ui/Buttons";
import InfoBadge from "@/components/ui/InfoBadge";
import type { NotificationRecord } from "./types";
import { getCategory, getNotificationTitle, isUrgent } from "./helpers";

type NotificationItemProps = {
  notification: NotificationRecord;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
};

const iconByCategory = {
  seats: "🎓",
  registration: "🗓️",
  travel: "🚌",
  planning: "🤖",
};

export default function NotificationItem({ notification, onMarkRead, onDismiss }: NotificationItemProps) {
  const category = getCategory(notification.type);
  const urgent = isUrgent(notification);

  const statusVariant = urgent ? "urgent" : notification.is_read ? "read" : "unread";
  const statusLabel = urgent ? "Urgent" : notification.is_read ? "Read" : "Unread";
  const accentClass = urgent ? "notif-accent--urgent" : `notif-accent--${category}`;

  return (
    <article className={`notification-item notif-accent ${accentClass}`}>
      <div className="notification-item__top">
        <div>
          <h3 className="notification-item__title">
            {iconByCategory[category]} {getNotificationTitle(notification)}
          </h3>
          <p className="notification-item__message">{notification.messages}</p>
        </div>
        <InfoBadge variant={statusVariant}>{statusLabel}</InfoBadge>
      </div>

      <div className="notification-item__meta">
        <span className="notification-item__time">{new Date(notification.created_at).toLocaleString()}</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SecondaryButton type="button">View</SecondaryButton>
          {!notification.is_read && onMarkRead ? (
            <GradientButton type="button" onClick={() => onMarkRead(notification.id)}>
              Mark as read
            </GradientButton>
          ) : null}
          {onDismiss ? (
            <SecondaryButton type="button" onClick={() => onDismiss(notification.id)}>
              Dismiss
            </SecondaryButton>
          ) : null}
        </div>
      </div>
    </article>
  );
}
