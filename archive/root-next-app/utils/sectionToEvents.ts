import type { CalendarEvent, SectionLite } from "@/lib/planner/types";
import { parseDays, parseTimeRange } from "@/lib/planner/conflict";

export function sectionToCalendarEvents(section: SectionLite, termStartDate: string): CalendarEvent[] {
  const parsedDays = parseDays(section.days);
  const parsedTime = parseTimeRange(section.time_range);
  if (!parsedDays.length || !parsedTime.ok) return [];

  const baseDate = new Date(termStartDate);
  const events: CalendarEvent[] = [];

  for (const day of parsedDays) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + (day - baseDate.getDay()));

    const start = new Date(date);
    start.setHours(Math.floor(parsedTime.startMin! / 60), parsedTime.startMin! % 60, 0, 0);

    const end = new Date(date);
    end.setHours(Math.floor(parsedTime.endMin! / 60), parsedTime.endMin! % 60, 0, 0);

    const label = section.course_code_full ?? `SEC ${section.id}`;
    events.push({
      id: `${section.id}-${day}`,
      title: label,
      start: start.toISOString(),
      end: end.toISOString(),
      extendedProps: { section_id: section.id, raw: section },
    });
  }

  return events;
}
