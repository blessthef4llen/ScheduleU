"use client";

import { useEffect, useMemo, useRef } from "react";
import { Draggable } from "@fullcalendar/interaction";
import EmptyState from "@/components/ui/EmptyState";
import type { SectionLite } from "@/lib/planner/types";

type Props = {
  sections: SectionLite[];
  search: string;
  onSearchChange: (value: string) => void;
};

const MAX_VISIBLE_SECTIONS = 250;

function formatSeats(section: SectionLite) {
  if (section.open_seats_label) return section.open_seats_label;
  if (section.open_seats === null || section.open_seats === undefined) return null;
  if (section.capacity === null || section.capacity === undefined) return `${section.open_seats} open`;
  return `${section.open_seats}/${section.capacity} open`;
}

export default function SectionCatalog({ sections, search, onSearchChange }: Props) {
  const draggableRef = useRef<HTMLDivElement | null>(null);

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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sections;

    return sections.filter((section) => {
      const blob = [
        section.id,
        section.course_code_full,
        section.course_title,
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
  }, [sections, search]);

  const visibleSections = filtered.slice(0, MAX_VISIBLE_SECTIONS);
  const hiddenCount = Math.max(filtered.length - visibleSections.length, 0);

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
