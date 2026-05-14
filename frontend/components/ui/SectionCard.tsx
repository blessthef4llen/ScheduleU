// Reusable Sectioncard component for ScheduleU.
import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  hover?: boolean;
  className?: string;
  style?: CSSProperties;
};

const SectionCard = forwardRef<HTMLElement, SectionCardProps>(function SectionCard(
  { children, hover = false, className, style },
  ref
) {
  return (
    <section
      ref={ref}
      style={style}
      className={`section-card${hover ? " section-card--hover" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </section>
  );
});

export default SectionCard;
