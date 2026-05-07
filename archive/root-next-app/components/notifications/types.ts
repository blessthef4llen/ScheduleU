export type NotificationRecord = {
  id: string;
  messages: string;
  created_at: string;
  is_read: boolean;
  type: string | null;
  title?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  user_id?: string;
};

export type NotificationFilter =
  | "all"
  | "unread"
  | "seats"
  | "registration"
  | "travel"
  | "planning";
