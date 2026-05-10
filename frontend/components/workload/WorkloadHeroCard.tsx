// Reusable Workloadherocard component for ScheduleU.
﻿import type { CSSProperties } from "react";
import InfoBadge from "@/components/ui/InfoBadge";

type WorkloadHeroCardProps = {
  score: number;
  label: string;
  explanation: string;
};

function badgeVariant(label: string): "info" | "urgent" | "unread" | "read" {
  if (label === "Very Heavy" || label === "Heavy") return "urgent";
  if (label === "Moderate") return "unread";
  return "info";
}

export default function WorkloadHeroCard({ score, label, explanation }: WorkloadHeroCardProps) {
  const percent = Math.min(100, Math.max(0, Math.round((score / 10) * 100)));
  const ringStyle = { "--workload-score-pct": percent } as CSSProperties;

  return (
    <section className="workload-hero-card" aria-label={`Workload overview: ${label}`}>
      <div className="workload-hero-layout">
        <div className="workload-hero-ring" style={ringStyle} aria-hidden>
          <div className="workload-hero-ring__inner">
            <span className="workload-hero-ring__value">{score.toFixed(1)}</span>
            <span className="workload-hero-ring__unit">/ 10</span>
          </div>
        </div>

        <div className="workload-hero-body">
          <p className="workload-hero-eyebrow">Semester workload</p>
          <div className="workload-hero-heading-row">
            <InfoBadge variant={badgeVariant(label)}>{label}</InfoBadge>
          </div>
          <p className="workload-hero-text">{explanation}</p>
          <div className="workload-meter-wrap">
            <div className="workload-meter-labels">
              <span>Light</span>
              <span>Heavy</span>
            </div>
            <div className="workload-meter" aria-label={`Workload score ${score.toFixed(1)} out of 10`}>
              <div className="workload-meter__bar" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
