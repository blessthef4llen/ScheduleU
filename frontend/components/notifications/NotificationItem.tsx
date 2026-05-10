// Reusable Notificationitem component for ScheduleU.
import { GradientButton, SecondaryButton } from "@/components/ui/Buttons";
import InfoBadge from "@/components/ui/InfoBadge";
import type { NotificationRecord } from "./types";
import { getCategory, getNotificationTitle, getPriority, getRelativeTimeLabel, isUrgent } from "./helpers";

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
  const cardStateClass = urgent ? "notification-item--urgent" : notification.is_read ? "" : "notification-item--unread";
  const priority = getPriority(notification);

  const statusVariant = urgent ? "urgent" : notification.is_read ? "read" : "unread";
  const statusLabel = urgent ? "Urgent" : notification.is_read ? "Read" : "Unread";
  const accentClass = urgent ? "notif-accent--urgent" : `notif-accent--${category}`;

  return (
    <article className={`notification-item notif-accent ${accentClass} ${cardStateClass}`.trim()}>
      <div className="notification-item__top">
        <div>
          <h3 className="notification-item__title">
            {iconByCategory[category]} {getNotificationTitle(notification)}
          </h3>
          <p className="notification-item__message">{notification.messages}</p>
        </div>
        <div className="notification-item__badges">
          <InfoBadge variant={statusVariant}>{statusLabel}</InfoBadge>
          <span className={`notification-priority notification-priority--${priority}`}>{priority}</span>
        </div>
      </div>

      <div className="notification-item__meta">
        <span className="notification-item__time">{getRelativeTimeLabel(notification.created_at)}</span>
        <div className="notification-item__actions">
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
