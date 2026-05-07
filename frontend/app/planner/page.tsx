"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AlertBanner from "@/components/ui/AlertBanner";
import PageLayout from "@/components/ui/PageLayout";
import SectionCard from "@/components/ui/SectionCard";
import { GradientButton, SecondaryButton } from "@/components/ui/Buttons";
import PlannerLayout from "@/components/planner/PlannerLayout";
import type { CalendarEvent, MeetingBlock, SectionLite } from "@/lib/planner/types";
import { buildBlocks } from "@/lib/planner/conflict";
import {
  addSectionWithChecks,
  fetchScheduleSectionIds,
  fetchSectionCatalog,
  fetchSectionsByIds,
  getAuthedAppUser,
  getOrCreateSchedule,
  removeSection,
} from "@/lib/planner/plannerService";
import { getScheduleCrns } from "@/lib/exportCrn";
import { sectionToCalendarEvents } from "@/utils/sectionToEvents";

const TERM = "Spring 2026";

export default function PlannerPage() {
  const [status, setStatus] = useState("Loading planner...");
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [existingBlocks, setExistingBlocks] = useState<MeetingBlock[]>([]);
  const [catalog, setCatalog] = useState<SectionLite[]>([]);
  const [search, setSearch] = useState("");
  const [exportedCrns, setExportedCrns] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [showCrnPanel, setShowCrnPanel] = useState(true);

  const selectedSectionCount = useMemo(() => {
    const ids = new Set(events.map((event) => event.extendedProps?.section_id).filter(Boolean));
    return ids.size;
  }, [events]);

  async function reloadSchedule() {
    setStatus("Loading your saved schedule...");

    const auth = await getAuthedAppUser();
    if (!auth.appUser) {
      setScheduleId(null);
      setEvents([]);
      setExistingBlocks([]);
      setStatus(auth.error ?? "Please sign in to save a schedule.");
      return;
    }

    if (!auth.appUser.auth_uid) {
      setScheduleId(null);
      setEvents([]);
      setExistingBlocks([]);
      setStatus("Schedule error: missing Supabase auth user id.");
      return;
    }

    const scheduleResult = await getOrCreateSchedule({ userId: auth.appUser.auth_uid, term: TERM });
    if (!scheduleResult.schedule) {
      setStatus(`Schedule error: ${scheduleResult.error ?? "unknown error"}`);
      return;
    }

    setScheduleId(scheduleResult.schedule.id);

    const itemResult = await fetchScheduleSectionIds(scheduleResult.schedule.id);
    if (itemResult.error) {
      setStatus(`Schedule items error: ${itemResult.error}`);
      return;
    }

    if (itemResult.sectionIds.length === 0) {
      setEvents([]);
      setExistingBlocks([]);
      setStatus("No saved sections yet.");
      return;
    }

    const sectionResult = await fetchSectionsByIds(itemResult.sectionIds, TERM);
    if (sectionResult.error) {
      setStatus(`Sections error: ${sectionResult.error}`);
      return;
    }

    const blocks: MeetingBlock[] = [];
    const nextEvents: CalendarEvent[] = [];

    for (const section of sectionResult.sections) {
      const label = section.course_code_full ?? `SEC ${section.id}`;
      blocks.push(...buildBlocks(section.days, section.time_range, label));
      nextEvents.push(...sectionToCalendarEvents(section));
    }

    setExistingBlocks(blocks);
    setEvents(nextEvents);
    setStatus(`Loaded ${sectionResult.sections.length} saved section${sectionResult.sections.length === 1 ? "" : "s"}.`);
  }

  async function reloadCatalog() {
    const result = await fetchSectionCatalog({ term: TERM, limit: 9000 });
    if (result.error) {
      setStatus((current) => `${current} Catalog error: ${result.error}`);
      return;
    }
    setCatalog(result.sections);
  }

  useEffect(() => {
    const initialLoad = Promise.resolve().then(async () => {
      try {
        await Promise.all([reloadSchedule(), reloadCatalog()]);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load planner.");
      }
    });

    void initialLoad;
  }, []);

  async function handleDropSection(sectionId: number) {
    if (!scheduleId) {
      setStatus("Please sign in before saving sections.");
      return;
    }

    setStatus("Checking conflicts...");
    const result = await addSectionWithChecks({ scheduleId, sectionId, existingBlocks, term: TERM });
    setStatus(result.msg);

    if (result.ok) {
      setExportedCrns([]);
      await reloadSchedule();
    } else {
      alert(result.msg);
    }
  }

  async function handleRemoveSection(sectionId: number) {
    if (!scheduleId) return;

    const result = await removeSection({ scheduleId, sectionId });
    if (!result.ok) {
      alert(`Delete failed: ${result.msg}`);
      return;
    }

    setExportedCrns([]);
    setStatus(result.msg);
    await reloadSchedule();
  }

  async function loadScheduleCrns() {
    if (!scheduleId) {
      setExportMessage("No schedule loaded yet.");
      return [];
    }

    setExportLoading(true);
    setExportMessage("");

    try {
      const result = await getScheduleCrns(scheduleId);
      setExportedCrns(result.crns);

      if (result.missingCount > 0) {
        setExportMessage(`${result.missingCount} section${result.missingCount === 1 ? "" : "s"} missing a class number.`);
      } else if (result.crns.length === 0) {
        setExportMessage("No CRNs found for this schedule.");
      } else {
        setExportMessage("CRNs are ready.");
      }

      return result.crns;
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Failed to export CRNs.");
      return [];
    } finally {
      setExportLoading(false);
    }
  }

  async function handleExportCrns() {
    await loadScheduleCrns();
  }

  async function handleCopyCrns() {
    const crns = exportedCrns.length > 0 ? exportedCrns : await loadScheduleCrns();

    if (crns.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(crns.join(", "));
      setExportMessage("CRNs copied.");
    } catch {
      setExportMessage("Failed to copy CRNs.");
    }
  }

  return (
    <PageLayout
      label="ScheduleU Student Portal"
      title="Interactive Planner"
      subtitle="Build a Spring 2026 weekly schedule from live course sections, with duplicate and time-conflict checks before registration."
    >
      <SectionCard className="planner-hero-card">
        <div className="planner-hero-layout">
          <div className="planner-hero-main">
            <p className="page-label">Registration Prep</p>
            <h2 className="planner-hero-title">Schedule Builder</h2>
            <p className="planner-hero-text">
              Selected sections stay connected to your ScheduleU account and can be exported as class numbers when registration opens.
            </p>
          </div>

          <div className="planner-stat-row" aria-label="Planner summary">
            <div className="planner-stat">
              <span className="planner-stat__value">{selectedSectionCount}</span>
              <span className="planner-stat__label">Selected</span>
            </div>
            <div className="planner-stat">
              <span className="planner-stat__value">{catalog.length}</span>
              <span className="planner-stat__label">Catalog</span>
            </div>
            <div className="planner-stat">
              <span className="planner-stat__value">{TERM.replace("Spring ", "")}</span>
              <span className="planner-stat__label">Term</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="planner-builder-card">
        <div className="reg-hero-row">
          <div>
            <p className="page-label">Schedule Builder</p>
            <h2 className="reg-hero-message">Generate another schedule option</h2>
            <p className="reg-hero-subtext">
              Return to Schedule Builder when you want to compare generated combinations before placing sections on the calendar.
            </p>
          </div>
          <div className="controls-row">
            <Link href="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
            <Link href="/schedule-builder" className="btn btn-secondary">
              Open Schedule Builder
            </Link>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="planner-crn-card">
        <div className="reg-hero-row">
          <div>
            <p className="page-label">CRN Export</p>
            <h2 className="reg-hero-message">Registration Numbers</h2>
            <p className="reg-hero-subtext">
              Export class numbers from the Spring 2026 semester table for your selected sections.
            </p>
          </div>
          <SecondaryButton type="button" onClick={() => setShowCrnPanel((value) => !value)}>
            {showCrnPanel ? "Hide" : "Show"}
          </SecondaryButton>
        </div>

        {showCrnPanel ? (
          <div className="planner-crn-panel">
            <div className="controls-row">
              <GradientButton type="button" onClick={handleExportCrns} disabled={exportLoading}>
                {exportLoading ? "Loading..." : "Export CRNs"}
              </GradientButton>
              <SecondaryButton type="button" onClick={handleCopyCrns} disabled={exportLoading || !scheduleId}>
                Copy CRNs
              </SecondaryButton>
            </div>

            {exportMessage ? <AlertBanner>{exportMessage}</AlertBanner> : null}

            {exportedCrns.length > 0 ? (
              <div className="planner-crn-list" aria-label="Exported CRNs">
                {exportedCrns.map((crn) => (
                  <span key={crn}>{crn}</span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <PlannerLayout
        catalogSections={catalog}
        catalogSearch={search}
        onCatalogSearchChange={setSearch}
        events={events}
        status={status}
        onDropSection={handleDropSection}
        onRemoveSection={handleRemoveSection}
      />
    </PageLayout>
  );
}
