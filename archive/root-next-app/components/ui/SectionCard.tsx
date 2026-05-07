import type { ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  hover?: boolean;
  className?: string;
};

export default function SectionCard({ children, hover = false, className }: SectionCardProps) {
  return (
    <section className={`section-card${hover ? " section-card--hover" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </section>
  );
}
