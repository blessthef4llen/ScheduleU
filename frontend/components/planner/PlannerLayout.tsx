"use client";
// Reusable Plannerlayout component for ScheduleU.

import SectionCard from "@/components/ui/SectionCard";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CalendarEvent, SectionLite } from "@/lib/planner/types";
import SectionCatalog from "./SectionCatalog";
import PlannerCalendar from "./PlannerCalendar";

type Props = {
  catalogSections: SectionLite[];
  catalogSearch: string;
  onCatalogSearchChange: (value: string) => void;
  events: CalendarEvent[];
  status: string;
  calendarTools?: ReactNode;
  onDropSection: (sectionId: number) => Promise<void>;
  onRemoveSection: (sectionId: number) => Promise<void>;
};

export default function PlannerLayout(props: Props) {
  const calendarPanelRef = useRef<HTMLElement | null>(null);
  const [catalogPanelHeight, setCatalogPanelHeight] = useState<number | null>(null);

  useEffect(() => {
    const calendarPanel = calendarPanelRef.current;
    if (!calendarPanel || typeof ResizeObserver === "undefined") return;

    const syncCatalogHeight = () => {
      const nextHeight = Math.ceil(calendarPanel.getBoundingClientRect().height);
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
      setCatalogPanelHeight((current) => (current !== null && Math.abs(current - nextHeight) < 2 ? current : nextHeight));
    };

    syncCatalogHeight();
    const observer = new ResizeObserver(syncCatalogHeight);
    observer.observe(calendarPanel);
    window.addEventListener("resize", syncCatalogHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncCatalogHeight);
    };
  }, []);

  return (
    <div className="planner-grid">
      <SectionCard
        className="planner-panel planner-panel--catalog"
        style={catalogPanelHeight ? { height: `${catalogPanelHeight}px` } : undefined}
      >
        <SectionCatalog
          sections={props.catalogSections}
          search={props.catalogSearch}
          onSearchChange={props.onCatalogSearchChange}
        />
      </SectionCard>

      <SectionCard ref={calendarPanelRef} className="planner-panel planner-panel--calendar">
        <PlannerCalendar
          events={props.events}
          status={props.status}
          tools={props.calendarTools}
          onDropSection={props.onDropSection}
          onRemoveSection={props.onRemoveSection}
        />
      </SectionCard>
    </div>
  );
}
