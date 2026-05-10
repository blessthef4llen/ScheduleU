"use client";
// Reusable Sectioncatalog component for ScheduleU.

import { useEffect, useMemo, useRef, useState } from "react";
import { Draggable } from "@fullcalendar/interaction";
import EmptyState from "@/components/ui/EmptyState";
import type { SectionLite } from "@/lib/planner/types";

type Props = {
  sections: SectionLite[];
  search: string;
  onSearchChange: (value: string) => void;
};

const MAX_VISIBLE_SECTIONS = 250;

type CourseNumberRange = "all" | "0-100" | "100-200" | "200-300" | "300-400" | "400+";
type MeetingFilter = "all" | "scheduled" | "tba";

const COURSE_NUMBER_RANGES: Array<{ label: string; value: CourseNumberRange }> = [
  { label: "All numbers", value: "all" },
  { label: "0-100", value: "0-100" },
  { label: "100-200", value: "100-200" },
  { label: "200-300", value: "200-300" },
  { label: "300-400", value: "300-400" },
  { label: "400+", value: "400+" },
];

function formatSeats(section: SectionLite) {
  if (section.open_seats_label) return section.open_seats_label;
  if (section.open_seats === null || section.open_seats === undefined) return null;
  if (section.capacity === null || section.capacity === undefined) return `${section.open_seats} open`;
  return `${section.open_seats}/${section.capacity} open`;
}

function parseSubject(section: SectionLite) {
  if (section.subject) return String(section.subject).trim().toUpperCase();
  const match = section.course_code_full?.match(/^([A-Z/& ]+)\s+\d/i);
  return match?.[1]?.trim().toUpperCase() ?? "";
}

function parseCourseNumber(section: SectionLite) {
  const raw = section.course_number ?? section.course_code_full?.match(/\d+/)?.[0];
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function courseNumberInRange(courseNumber: number | null, range: CourseNumberRange) {
  if (range === "all") return true;
  if (courseNumber === null) return false;

  switch (range) {
    case "0-100":
      return courseNumber >= 0 && courseNumber <= 100;
    case "100-200":
      return courseNumber > 100 && courseNumber < 200;
    case "200-300":
      return courseNumber >= 200 && courseNumber < 300;
    case "300-400":
      return courseNumber >= 300 && courseNumber < 400;
    case "400+":
      return courseNumber >= 400;
    default:
      return true;
  }
}

function hasScheduledMeeting(section: SectionLite) {
  return Boolean(section.days && section.time_range);
}

export default function SectionCatalog({ sections, search, onSearchChange }: Props) {
  const draggableRef = useRef<HTMLDivElement | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [courseNumberRange, setCourseNumberRange] = useState<CourseNumberRange>("all");
  const [componentFilter, setComponentFilter] = useState("all");
  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>("all");

  useEffect(() => {
    if (!draggableRef.current) return;

    const draggable = new Draggable(draggableRef.current, {
      itemSelector: ".draggable-section",
      eventData(eventEl) {
        const sectionId = Number((eventEl as HTMLElement).dataset.sectionId);
        return {
          title: `SEC ${sectionId}`,
          extendedProps: { section_id: sectionId },
        };
      },
    });

    return () => draggable.destroy();
  }, []);

  const subjectOptions = useMemo(() => {
    const subjects = new Set<string>();

    for (const section of sections) {
      const subject = parseSubject(section);
      if (subject) subjects.add(subject);
    }

    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  }, [sections]);

  const componentOptions = useMemo(() => {
    const components = new Set<string>();

    for (const section of sections) {
      const component = section.component_type?.trim().toUpperCase();
      if (component) components.add(component);
    }

    return Array.from(components).sort((a, b) => a.localeCompare(b));
  }, [sections]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => {
      const sectionSubject = parseSubject(section);
      const sectionComponent = section.component_type?.trim().toUpperCase() ?? "";
      const scheduled = hasScheduledMeeting(section);

      if (subjectFilter !== "all" && sectionSubject !== subjectFilter) return false;
      if (!courseNumberInRange(parseCourseNumber(section), courseNumberRange)) return false;
      if (componentFilter !== "all" && sectionComponent !== componentFilter) return false;
      if (meetingFilter === "scheduled" && !scheduled) return false;
      if (meetingFilter === "tba" && scheduled) return false;
      if (!query) return true;

      const blob = [
        section.id,
        section.subject,
        section.course_number,
        section.course_code_full,
        section.course_title,
        section.component_type,
        section.class_number,
        section.section,
        section.instructor,
        section.days,
        section.time_range,
        section.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(query);
    });
  }, [componentFilter, courseNumberRange, meetingFilter, search, sections, subjectFilter]);

  const visibleSections = filtered.slice(0, MAX_VISIBLE_SECTIONS);
  const hiddenCount = Math.max(filtered.length - visibleSections.length, 0);
  const filtersActive =
    subjectFilter !== "all" ||
    courseNumberRange !== "all" ||
    componentFilter !== "all" ||
    meetingFilter !== "all";

  function resetFilters() {
    setSubjectFilter("all");
    setCourseNumberRange("all");
    setComponentFilter("all");
    setMeetingFilter("all");
  }

  return (
    <div className="planner-panel__inner planner-catalog">
      <div className="planner-section-header">
        <div>
          <p className="page-label">Course Catalog</p>
          <h2 className="planner-title">Available Sections</h2>
        </div>
        <span className="planner-count-badge">{filtered.length}</span>
      </div>

      <label className="planner-search-label" htmlFor="planner-section-search">
        Search sections
      </label>
      <input
        id="planner-section-search"
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Course, instructor, class number..."
        className="field input-search planner-search"
      />

      <div className="planner-filter-grid" aria-label="Section filters">
        <label className="planner-filter-field">
          <span>Subject</span>
          <select className="field" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
            <option value="all">All subjects</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>

        <label className="planner-filter-field">
          <span>Course Number</span>
          <select
            className="field"
            value={courseNumberRange}
            onChange={(event) => setCourseNumberRange(event.target.value as CourseNumberRange)}
          >
            {COURSE_NUMBER_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </label>

        <label className="planner-filter-field">
          <span>Component</span>
          <select className="field" value={componentFilter} onChange={(event) => setComponentFilter(event.target.value)}>
            <option value="all">All types</option>
            {componentOptions.map((component) => (
              <option key={component} value={component}>
                {component}
              </option>
            ))}
          </select>
        </label>

        <label className="planner-filter-field">
          <span>Meeting Time</span>
          <select
            className="field"
            value={meetingFilter}
            onChange={(event) => setMeetingFilter(event.target.value as MeetingFilter)}
          >
            <option value="all">All meetings</option>
            <option value="scheduled">Scheduled only</option>
            <option value="tba">TBA only</option>
          </select>
        </label>
      </div>

      {filtersActive ? (
        <button type="button" className="planner-filter-reset" onClick={resetFilters}>
          Reset filters
        </button>
      ) : null}

      {hiddenCount > 0 ? (
        <p className="planner-result-note">
          Showing first {visibleSections.length} of {filtered.length}. Search by course, instructor, or class number to narrow results.
        </p>
      ) : null}

      <div ref={draggableRef} className="planner-course-list">
        {filtered.length === 0 ? (
          <EmptyState icon="" title="No sections found" text="Try a different course, instructor, or class number." />
        ) : (
          visibleSections.map((section) => {
            const seats = formatSeats(section);
            return (
              <div
                key={section.id}
                className="planner-course-card draggable-section"
                data-section-id={section.id}
                title="Drag into the calendar"
              >
                <div className="planner-course-card__top">
                  <div>
                    <p className="planner-course-code">{section.course_code_full ?? `SEC ${section.id}`}</p>
                    <h3 className="planner-course-name">{section.course_title ?? "Course section"}</h3>
                  </div>
                  <span className="planner-section-chip">SEC {section.section ?? section.id}</span>
                </div>

                <div className="planner-course-meta-grid">
                  <span>{section.days ?? "TBA"}</span>
                  <span>{section.time_range ?? "TBA"}</span>
                  <span>{section.location ?? "Location TBA"}</span>
                  <span>{section.instructor ?? "Staff"}</span>
                </div>

                <div className="planner-course-footer">
                  {section.class_number ? <span>Class #{section.class_number}</span> : <span>Class number TBA</span>}
                  {seats ? <span>{seats}</span> : section.status ? <span>{section.status}</span> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
