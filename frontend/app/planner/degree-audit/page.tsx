"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import AlertBanner from "@/components/ui/AlertBanner";
import { SecondaryButton } from "@/components/ui/Buttons";
import EmptyState from "@/components/ui/EmptyState";
import PageLayout from "@/components/ui/PageLayout";
import SectionCard from "@/components/ui/SectionCard";
import { getDegreeAudit } from "@/lib/degreeAudit";
import {
  AuditCourseDetail,
  getCompletedCourseDetails,
  getRemainingCourseDetails,
} from "@/lib/degreeAuditDetails";
import { getPrograms, Program } from "@/lib/programs";
import { supabase } from "@/utils/supabase";

type AuditGroup = {
  user_id: string;
  program_id: number;
  group_id: number;
  group_name: string;
  min_units_required: number;
  completed_units: number;
  status: string;
};

function formatUnits(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getProgressPercent(completed: number, required: number) {
  if (required === 0) return 0;
  return Math.min((completed / required) * 100, 100);
}

function getStatusVariant(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "completed") return "completed";
  if (normalized === "in progress") return "progress";
  return "remaining";
}

function CourseList({
  courses,
  emptyText,
}: {
  courses: AuditCourseDetail[];
  emptyText: string;
}) {
  if (courses.length === 0) {
    return <p className="degree-course-empty">{emptyText}</p>;
  }

  return (
    <ul className="degree-course-list">
      {courses.map((course, index) => (
        <li key={`${course.group_id}-${course.course_code_full}-${index}`}>
          <div>
            <strong>{course.course_code_full}</strong>
            <span>{course.title}</span>
          </div>
          <small>
            {formatUnits(Number(course.units ?? 0))} units
            {course.grade ? ` | ${course.grade}` : ""}
            {course.term ? ` | ${course.term}` : ""}
          </small>
        </li>
      ))}
    </ul>
  );
}

export default function DegreeAuditPage() {
  const [userId, setUserId] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState(1);
  const [auditData, setAuditData] = useState<AuditGroup[]>([]);
  const [completedDetails, setCompletedDetails] = useState<AuditCourseDetail[]>([]);
  const [remainingDetails, setRemainingDetails] = useState<AuditCourseDetail[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCurrentUser() {
    setAuthLoading(true);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      if (error) console.error("Failed to get current user:", error);
      setUserId("");
      setAuthLoading(false);
      return;
    }

    setUserId(data.user.id);
    setAuthLoading(false);
  }

  async function loadPrograms() {
    const data = await getPrograms();
    setPrograms(data ?? []);

    if (data?.length) {
      setProgramId((current) =>
        data.some((program) => program.id === current) ? current : data[0].id
      );
    }
  }

  useEffect(() => {
    const initialLoad = Promise.resolve().then(async () => {
      await Promise.all([loadCurrentUser(), loadPrograms()]);
    });

    void initialLoad;
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const auditLoad = Promise.resolve().then(async () => {
      setLoading(true);

      const [audit, completed, remaining] = await Promise.all([
        getDegreeAudit(userId, programId),
        getCompletedCourseDetails(userId, programId),
        getRemainingCourseDetails(userId, programId),
      ]);

      if (cancelled) return;

      setAuditData((audit as AuditGroup[]) ?? []);
      setCompletedDetails(completed);
      setRemainingDetails(remaining);
      setExpandedGroups([]);
      setLoading(false);
    });

    void auditLoad;
    return () => {
      cancelled = true;
    };
  }, [programId, userId]);

  const selectedProgram = programs.find((program) => program.id === programId);

  const totalRequiredUnits = useMemo(() => {
    return auditData.reduce((sum, group) => sum + Number(group.min_units_required || 0), 0);
  }, [auditData]);

  const totalCompletedUnits = useMemo(() => {
    return auditData.reduce((sum, group) => sum + Number(group.completed_units || 0), 0);
  }, [auditData]);

  const overallProgress = useMemo(() => {
    return getProgressPercent(totalCompletedUnits, totalRequiredUnits);
  }, [totalCompletedUnits, totalRequiredUnits]);

  const completedGroupCount = useMemo(() => {
    return auditData.filter((group) => getStatusVariant(group.status) === "completed").length;
  }, [auditData]);

  const completedByGroup = useMemo(() => {
    const groups = new Map<number, AuditCourseDetail[]>();

    for (const course of completedDetails) {
      const current = groups.get(course.group_id) ?? [];
      current.push(course);
      groups.set(course.group_id, current);
    }

    return groups;
  }, [completedDetails]);

  const remainingByGroup = useMemo(() => {
    const groups = new Map<number, AuditCourseDetail[]>();

    for (const course of remainingDetails) {
      const current = groups.get(course.group_id) ?? [];
      current.push(course);
      groups.set(course.group_id, current);
    }

    return groups;
  }, [remainingDetails]);

  function toggleGroup(groupId: number) {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }

  function isExpanded(groupId: number) {
    return expandedGroups.includes(groupId);
  }

  if (authLoading) {
    return (
      <PageLayout
        label="Progress Tracker"
        title="Degree Visualizer"
        subtitle="Checking your ScheduleU account before loading requirement progress."
      >
        <SectionCard>
          <p className="degree-loading">Loading account details...</p>
        </SectionCard>
      </PageLayout>
    );
  }

  if (!userId) {
    return (
      <PageLayout
        label="Progress Tracker"
        title="Degree Visualizer"
        subtitle="Sign in to compare your completed coursework with program requirements."
      >
        <SectionCard className="degree-hero-card">
          <div className="degree-hero-layout">
            <div>
              <p className="page-label">Account Required</p>
              <h2 className="degree-hero-title">Your audit is tied to saved completed courses.</h2>
              <p className="degree-hero-text">
                Log in first, then return here from Progress Tracker to view completed units and remaining courses.
              </p>
            </div>
            <Link href="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </div>
        </SectionCard>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      label="Progress Tracker"
      title="Degree Visualizer"
      subtitle="Compare completed coursework against each requirement group and preview what-if program progress."
    >
      <SectionCard className="degree-hero-card">
        <div className="degree-hero-layout">
          <div className="degree-hero-main">
            <p className="page-label">What-If Audit</p>
            <h2 className="degree-hero-title">
              {selectedProgram?.program_name ?? "Select a program to visualize progress"}
            </h2>
            <p className="degree-hero-text">
              Imported transcript courses and manual entries from Progress Tracker appear here as completed requirements.
            </p>
          </div>

          <div
            className="degree-hero-ring"
            aria-label={`Overall progress ${overallProgress.toFixed(0)} percent`}
            style={{ "--degree-progress": `${overallProgress}%` } as CSSProperties}
          >
            <div className="degree-hero-ring__inner">
              <span className="degree-hero-ring__value">{overallProgress.toFixed(0)}%</span>
              <span className="degree-hero-ring__label">Overall</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="degree-toolbar">
          <div>
            <label className="degree-select-label" htmlFor="program-select">
              Program
            </label>
            <select
              id="program-select"
              className="field degree-select"
              value={programId}
              onChange={(event) => setProgramId(Number(event.target.value))}
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.program_name} ({program.program_type})
                </option>
              ))}
            </select>
          </div>

          <div className="controls-row">
            <Link href="/transcript-import" className="btn btn-secondary">
              Progress Tracker
            </Link>
            <Link href="/planner" className="btn btn-secondary">
              Planner
            </Link>
          </div>
        </div>
      </SectionCard>

      <div className="stats-grid degree-stats-grid" aria-label="Degree progress summary">
        <div className="stat-badge">
          <p className="stat-badge__label">Completed Units</p>
          <p className="stat-badge__value">{formatUnits(totalCompletedUnits)}</p>
        </div>
        <div className="stat-badge">
          <p className="stat-badge__label">Required Units</p>
          <p className="stat-badge__value">{formatUnits(totalRequiredUnits)}</p>
        </div>
        <div className="stat-badge">
          <p className="stat-badge__label">Groups Complete</p>
          <p className="stat-badge__value">
            {completedGroupCount}/{auditData.length}
          </p>
        </div>
        <div className="stat-badge">
          <p className="stat-badge__label">Remaining Courses</p>
          <p className="stat-badge__value">{remainingDetails.length}</p>
        </div>
      </div>

      {programs.length === 0 ? (
        <AlertBanner>No programs were found. Check the programs table before running the degree visualizer.</AlertBanner>
      ) : null}

      <SectionCard>
        <div className="degree-section-head">
          <div>
            <p className="page-label">Requirement Groups</p>
            <h2 className="degree-section-title">Audit Breakdown</h2>
          </div>
          {loading ? <span className="badge badge-info">Refreshing</span> : null}
        </div>

        {loading ? (
          <p className="degree-loading">Loading degree audit...</p>
        ) : auditData.length === 0 ? (
          <EmptyState
            icon="DV"
            title="No audit rows yet"
            text="Import or add completed courses in Progress Tracker, then choose a program to generate the visualizer."
          />
        ) : (
          <div className="degree-group-list">
            {auditData.map((group) => {
              const requiredUnits = Number(group.min_units_required || 0);
              const completedUnits = Number(group.completed_units || 0);
              const progressPercent = getProgressPercent(completedUnits, requiredUnits);
              const variant = getStatusVariant(group.status);
              const completedCourses = completedByGroup.get(group.group_id) ?? [];
              const remainingCourses = remainingByGroup.get(group.group_id) ?? [];

              return (
                <article key={group.group_id} className="degree-group-card">
                  <div className="degree-group-head">
                    <div>
                      <h3 className="degree-group-title">{group.group_name}</h3>
                      <p className="degree-group-meta">
                        {formatUnits(completedUnits)} / {formatUnits(requiredUnits)} units completed
                      </p>
                    </div>

                    <span className={`degree-status degree-status--${variant}`}>
                      {group.status}
                    </span>
                  </div>

                  <div
                    className="degree-progress"
                    role="progressbar"
                    aria-label={`${group.group_name} progress`}
                    aria-valuenow={Math.round(progressPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`degree-progress__bar degree-progress__bar--${variant}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="degree-group-actions">
                    <span className="degree-group-count">
                      {completedCourses.length} completed | {remainingCourses.length} remaining
                    </span>
                    <SecondaryButton type="button" onClick={() => toggleGroup(group.group_id)}>
                      {isExpanded(group.group_id) ? "Hide Details" : "Show Details"}
                    </SecondaryButton>
                  </div>

                  {isExpanded(group.group_id) ? (
                    <div className="degree-course-columns">
                      <div className="degree-course-panel degree-course-panel--completed">
                        <h4>Completed Courses</h4>
                        <CourseList
                          courses={completedCourses}
                          emptyText="No completed courses are matched to this group yet."
                        />
                      </div>

                      <div className="degree-course-panel degree-course-panel--remaining">
                        <h4>Remaining Courses</h4>
                        <CourseList
                          courses={remainingCourses}
                          emptyText="No remaining courses for this group."
                        />
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </PageLayout>
  );
}
