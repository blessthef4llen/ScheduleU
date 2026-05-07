"use client";

import SectionCard from "@/components/ui/SectionCard";
import type { CalendarEvent, SectionLite } from "@/lib/planner/types";
import SectionCatalog from "./SectionCatalog";
import PlannerCalendar from "./PlannerCalendar";

type Props = {
  catalogSections: SectionLite[];
  catalogSearch: string;
  onCatalogSearchChange: (value: string) => void;
  events: CalendarEvent[];
  status: string;
  initialDate: string;
  onDropSection: (sectionId: number) => Promise<void>;
  onRemoveSection: (sectionId: number) => Promise<void>;
};

export default function PlannerLayout(props: Props) {
  return (
    <div className="planner-grid">
      <SectionCard className="planner-panel planner-panel--catalog">
        <SectionCatalog
          sections={props.catalogSections}
          search={props.catalogSearch}
          onSearchChange={props.onCatalogSearchChange}
        />
      </SectionCard>

      <SectionCard className="planner-panel planner-panel--calendar">
        <PlannerCalendar
          events={props.events}
          status={props.status}
          initialDate={props.initialDate}
          onDropSection={props.onDropSection}
          onRemoveSection={props.onRemoveSection}
        />
      </SectionCard>
    </div>
  );
}
