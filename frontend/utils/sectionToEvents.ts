import type { CalendarEvent, SectionLite } from "@/lib/planner/types";
import { parseDays, parseTimeRange } from "@/lib/planner/conflict";

function minutesToEventTime(mins: number) {
  const hours = Math.floor(mins / 60).toString().padStart(2, "0");
  const minutes = (mins % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:00`;
}

export function sectionToCalendarEvents(section: SectionLite): CalendarEvent[] {
  const parsedDays = parseDays(section.days);
  const parsedTime = parseTimeRange(section.time_range);
  if (!parsedDays.length || !parsedTime.ok) return [];

  const events: CalendarEvent[] = [];
  const label = section.course_code_full ?? `SEC ${section.id}`;
  const startTime = minutesToEventTime(parsedTime.startMin!);
  const endTime = minutesToEventTime(parsedTime.endMin!);

  for (const day of parsedDays) {
    events.push({
      id: `${section.id}-${day}`,
      title: label,
      daysOfWeek: [day],
      startTime,
      endTime,
      extendedProps: { section_id: section.id, raw: section },
    });
  }

  return events;
}
