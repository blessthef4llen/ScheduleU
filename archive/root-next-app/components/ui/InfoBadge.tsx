import type { ReactNode } from "react";

type InfoBadgeProps = {
  children: ReactNode;
  variant?: "info" | "unread" | "read" | "urgent";
};

export default function InfoBadge({ children, variant = "info" }: InfoBadgeProps) {
  const className =
    variant === "unread"
      ? "badge badge-unread"
      : variant === "read"
        ? "badge badge-read"
        : variant === "urgent"
          ? "badge badge-urgent"
          : "badge badge-info";

  return <span className={className}>{children}</span>;
}
