"use client";
// Reusable Plannercalendar component for ScheduleU.

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarEvent } from "@/lib/planner/types";

type Props = {
  events: CalendarEvent[];
  status: string;
  onDropSection: (sectionId: number) => Promise<void>;
  onRemoveSection: (sectionId: number) => Promise<void>;
};

type EventReceiveInfo = {
  event: {
    extendedProps?: { section_id?: number | string };
    remove: () => void;
  };
};

type EventClickInfo = {
  event: {
    title: string;
    extendedProps?: { section_id?: number | string };
  };
};

export default function PlannerCalendar({ events, status, onDropSection, onRemoveSection }: Props) {
  async function handleEventReceive(info: EventReceiveInfo) {
    const sectionId = Number(info.event.extendedProps?.section_id);
    if (!Number.isFinite(sectionId)) return;

    info.event.remove();
    await onDropSection(sectionId);
  }

  async function handleEventClick(info: EventClickInfo) {
    const sectionId = info.event.extendedProps?.section_id;
    if (!sectionId) return;

    const ok = confirm(`Remove ${info.event.title} from your schedule?`);
    if (!ok) return;

    await onRemoveSection(Number(sectionId));
  }

  return (
    <div className="planner-panel__inner planner-calendar-wrap">
      <div className="planner-section-header">
        <div>
          <p className="page-label">Weekly Schedule</p>
          <h2 className="planner-title">Planner Calendar</h2>
        </div>
        <span className="planner-count-badge">{events.length}</span>
      </div>

      {status ? <div className="planner-status-bar">{status}</div> : null}

      <div className="planner-fullcalendar">
        <FullCalendar
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          height="auto"
          allDaySlot={false}
          nowIndicator={true}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          events={events}
          editable={false}
          droppable={true}
          eventReceive={handleEventReceive}
          eventClick={handleEventClick}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          buttonText={{ today: "This week" }}
          dayHeaderFormat={{ weekday: "short", month: "numeric", day: "numeric" }}
          slotLabelFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
        />
      </div>
    </div>
  );
}
