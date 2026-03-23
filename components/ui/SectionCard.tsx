import type { ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  hover?: boolean;
};

export default function SectionCard({ children, hover = false }: SectionCardProps) {
  return <section className={`section-card${hover ? " section-card--hover" : ""}`}>{children}</section>;
}
