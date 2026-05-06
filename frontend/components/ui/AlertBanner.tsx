import type { ReactNode } from "react";

type AlertBannerProps = {
  children: ReactNode;
};

export default function AlertBanner({ children }: AlertBannerProps) {
  return <div className="alert-banner">{children}</div>;
}
