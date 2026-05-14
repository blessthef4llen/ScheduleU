"use client";
// Planner page for ScheduleU.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { syncPlannerSideEffects, type PlannerSyncMode } from "@/lib/planner/sync";
import {
  builderHrefForTerm,
  getInitialSelectedTermTable,
  loadSelectedTermTable,
  normalizeTermTable,
  plannerHrefForTerm,
  PLANNER_TERM_OPTIONS,
  saveSelectedTermTable,
  tableToTermLabel,
  TERM_SELECTION_EVENT,
} from "@/lib/planner/terms";
import { getScheduleCrns } from "@/lib/exportCrn";
import { sectionToCalendarEvents } from "@/utils/sectionToEvents";

function formatSyncStatus(baseMessage: string, mode: PlannerSyncMode, warnings: string[]) {
  const cartMessage = mode === "schedule_and_cart" ? " Cart updated." : " Cart left unchanged.";
  if (warnings.length === 0) {
    return `${baseMessage} Schedule Builder and workload plan updated.${cartMessage}`;
  }
  return `${baseMessage} Saved to planner, with sync warning: ${warnings.join(" ")}`;
}

export default function PlannerPage() {
  const [status, setStatus] = useState("Loading planner...");
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [existingBlocks, setExistingBlocks] = useState<MeetingBlock[]>([]);
  const [selectedSections, setSelectedSections] = useState<SectionLite[]>([]);
  const [catalog, setCatalog] = useState<SectionLite[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTermTable, setSelectedTermTable] = useState<string>(getInitialSelectedTermTable);
  const [exportedCrns, setExportedCrns] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [syncMode, setSyncMode] = useState<PlannerSyncMode>("schedule_and_cart");
  const selectedTerm = useMemo(() => tableToTermLabel(selectedTermTable), [selectedTermTable]);
  const builderHref = useMemo(() => builderHrefForTerm(selectedTermTable), [selectedTermTable]);

  const selectedSectionCount = useMemo(() => {
    const ids = new Set(events.map((event) => event.extendedProps?.section_id).filter(Boolean));
    return ids.size;
  }, [events]);

  const reloadSchedule = useCallback(async (): Promise<SectionLite[]> => {
    setStatus(`Loading your saved ${selectedTerm} schedule...`);

    const auth = await getAuthedAppUser();
    if (!auth.appUser) {
      setScheduleId(null);
      setAuthUserId(null);
      setEvents([]);
      setExistingBlocks([]);
      setSelectedSections([]);
      setStatus(auth.error ?? "Please sign in to save a schedule.");
      return [];
    }

    if (!auth.appUser.auth_uid) {
      setScheduleId(null);
      setAuthUserId(null);
      setEvents([]);
      setExistingBlocks([]);
      setSelectedSections([]);
      setStatus("Schedule error: missing Supabase auth user id.");
      return [];
    }

    setAuthUserId(auth.appUser.auth_uid);

    const scheduleResult = await getOrCreateSchedule({ userId: auth.appUser.auth_uid, term: selectedTerm });
    if (!scheduleResult.schedule) {
      setStatus(`Schedule error: ${scheduleResult.error ?? "unknown error"}`);
      return [];
    }

    setScheduleId(scheduleResult.schedule.id);

    const itemResult = await fetchScheduleSectionIds(scheduleResult.schedule.id);
    if (itemResult.error) {
      setStatus(`Schedule items error: ${itemResult.error}`);
      return [];
    }

    if (itemResult.sectionIds.length === 0) {
      setEvents([]);
      setExistingBlocks([]);
      setSelectedSections([]);
      setStatus(`No saved sections yet for ${selectedTerm}.`);
      return [];
    }

    const sectionResult = await fetchSectionsByIds(itemResult.sectionIds, selectedTerm);
    if (sectionResult.error) {
      setStatus(`Sections error: ${sectionResult.error}`);
      return [];
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
    setSelectedSections(sectionResult.sections);
    setStatus(
      `Loaded ${sectionResult.sections.length} saved section${sectionResult.sections.length === 1 ? "" : "s"} for ${selectedTerm}.`
    );
    return sectionResult.sections;
  }, [selectedTerm]);

  const reloadCatalog = useCallback(async () => {
    const result = await fetchSectionCatalog({ term: selectedTerm, limit: 9000 });
    if (result.error) {
      setStatus((current) => `${current} Catalog error: ${result.error}`);
      return;
    }
    setCatalog(result.sections);
  }, [selectedTerm]);

  const syncPlannerSections = useCallback(async (sections: SectionLite[], baseMessage: string, mode = syncMode) => {
    let targetAuthUserId = authUserId;
    if (!targetAuthUserId) {
      const auth = await getAuthedAppUser();
      targetAuthUserId = auth.appUser?.auth_uid ?? null;
      if (targetAuthUserId) setAuthUserId(targetAuthUserId);
    }

    if (!targetAuthUserId) {
      setStatus(`${baseMessage} Sign in again to sync Schedule Builder and cart.`);
      return;
    }

    const syncResult = await syncPlannerSideEffects({
      authUserId: targetAuthUserId,
      term: selectedTerm,
      sections,
      mode,
    });
    setStatus(formatSyncStatus(baseMessage, mode, syncResult.warnings));
  }, [authUserId, selectedTerm, syncMode]);

  function handleTermTableChange(termTableOrLabel: string) {
    const nextTermTable = normalizeTermTable(termTableOrLabel);
    setSelectedTermTable(nextTermTable);
    saveSelectedTermTable(nextTermTable);
    setSearch("");
    setExportedCrns([]);
    setExportMessage("");
    setStatus(`Switching to ${tableToTermLabel(nextTermTable)}...`);

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", plannerHrefForTerm(nextTermTable));
    }
  }

  async function handleManualSync() {
    setStatus("Syncing current planner...");
    await syncPlannerSections(selectedSections, "Current planner synced.");
  }

  function handleSyncModeChange(nextMode: PlannerSyncMode) {
    setSyncMode(nextMode);

    if (nextMode === "schedule_and_cart") {
      setStatus("Future planner edits will update the saved schedule and shopping cart.");
      return;
    }

    setStatus("Future planner edits will update the saved schedule without changing the cart.");
  }

  useEffect(() => {
    saveSelectedTermTable(selectedTermTable);
  }, [selectedTermTable]);

  useEffect(() => {
    const syncTermFromStorage = () => {
      const nextTermTable = loadSelectedTermTable();
      setSelectedTermTable((current) => (current === nextTermTable ? current : nextTermTable));
    };

    window.addEventListener(TERM_SELECTION_EVENT, syncTermFromStorage);
    window.addEventListener("storage", syncTermFromStorage);

    return () => {
      window.removeEventListener(TERM_SELECTION_EVENT, syncTermFromStorage);
      window.removeEventListener("storage", syncTermFromStorage);
    };
  }, []);

  useEffect(() => {
    const loadPlanner = Promise.resolve().then(async () => {
      try {
        await Promise.all([reloadSchedule(), reloadCatalog()]);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to load planner.");
      }
    });

    void loadPlanner;
  }, [reloadCatalog, reloadSchedule]);

  async function handleDropSection(sectionId: number) {
    if (!scheduleId) {
      setStatus("Please sign in before saving sections.");
      return;
    }

    setStatus("Checking conflicts...");
    const result = await addSectionWithChecks({ scheduleId, sectionId, existingBlocks, term: selectedTerm });
    setStatus(result.msg);

    if (result.ok) {
      setExportedCrns([]);
      const sections = await reloadSchedule();
      await syncPlannerSections(sections, result.msg);
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
    const sections = await reloadSchedule();
    await syncPlannerSections(sections, result.msg);
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

  const plannerTools = (
    <>
      <div className="planner-tool-group planner-tool-group--term">
        <label className="planner-sync-field">
          <span>Term</span>
          <select
            className="field"
            value={selectedTermTable}
            onChange={(event) => handleTermTableChange(event.target.value)}
          >
            {PLANNER_TERM_OPTIONS.map((option) => {
              const disabled = "disabled" in option ? Boolean(option.disabled) : false;
              return (
                <option key={option.table} value={option.table} disabled={disabled}>
                  {option.label}
                  {disabled ? " (Coming Soon)" : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <div className="planner-tool-group planner-tool-group--sync">
        <label className="planner-sync-field">
          <span>Save changes to</span>
          <select
            className="field"
            value={syncMode}
            onChange={(event) => handleSyncModeChange(event.target.value as PlannerSyncMode)}
          >
            <option value="schedule_and_cart">Schedule + Cart</option>
            <option value="schedule_only">Schedule Only</option>
          </select>
        </label>
        <SecondaryButton type="button" onClick={handleManualSync} disabled={!authUserId}>
          Sync Now
        </SecondaryButton>
      </div>

      <div className="planner-tool-group planner-tool-group--crn">
        <div>
          <p className="planner-tool-label">Registration numbers</p>
          <p className="planner-tool-text">Export CRNs for selected sections.</p>
        </div>
        <div className="controls-row">
          <GradientButton type="button" onClick={handleExportCrns} disabled={exportLoading}>
            {exportLoading ? "Loading..." : "Export CRNs"}
          </GradientButton>
          <SecondaryButton type="button" onClick={handleCopyCrns} disabled={exportLoading || !scheduleId}>
            Copy CRNs
          </SecondaryButton>
        </div>
        {exportMessage ? <p className="planner-tool-message">{exportMessage}</p> : null}
        {exportedCrns.length > 0 ? (
          <div className="planner-crn-list planner-crn-list--compact" aria-label="Exported CRNs">
            {exportedCrns.map((crn) => (
              <span key={crn}>{crn}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="planner-tool-group planner-tool-group--links">
        <p className="planner-tool-label">Builder</p>
        <Link href={builderHref} className="btn btn-secondary">
          Open Schedule Builder
        </Link>
      </div>
    </>
  );

  return (
    <PageLayout
      label="ScheduleU Student Portal"
      title="Interactive Planner"
      subtitle={`Arrange ${selectedTerm} sections on a weekly calendar, keep conflict checks intact, and export class numbers when you're ready to register.`}
    >
      <div className="planner-page-stack">
        <SectionCard className="planner-hero-card planner-hero-card--compact">
          <div className="planner-hero-layout">
            <div className="planner-hero-main">
              <p className="page-label">Registration Prep</p>
              <h2 className="planner-hero-title">Planner Workspace</h2>
              <p className="planner-hero-text">
                Drag {selectedTerm} sections into the calendar, keep conflict checks intact, and sync edits back to Builder.
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
                <span className="planner-stat__value">{selectedTerm}</span>
                <span className="planner-stat__label">Term</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <PlannerLayout
          catalogSections={catalog}
          catalogSearch={search}
          onCatalogSearchChange={setSearch}
          events={events}
          status={status}
          calendarTools={plannerTools}
          onDropSection={handleDropSection}
          onRemoveSection={handleRemoveSection}
        />
      </div>
    </PageLayout>
  );
}
