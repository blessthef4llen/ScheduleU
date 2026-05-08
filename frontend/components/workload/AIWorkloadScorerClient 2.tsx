"use client";

import { useEffect, useMemo, useState } from "react";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/ui/EmptyState";
import PageLayout from "@/components/ui/PageLayout";
import SectionCard from "@/components/ui/SectionCard";
import { getDemoWorkloadResult } from "@/frontend/lib/workloadDemo";
import { getSupabase } from "@/frontend/lib/supabaseClient";
import {
  analyzeWorkload,
  type CourseDifficultyProfile,
  type StudentPlannedCourse,
  type WorkloadResult,
} from "@/frontend/lib/workloadScorer";
import DemoModeBanner from "./DemoModeBanner";
import WorkloadAnalysisView from "./WorkloadAnalysisView";

function parseTerm(term: string): { year: number; seasonRank: number; valid: boolean } {
  const m = term.trim().match(/(spring|summer|fall|winter)\s*(\d{4})/i);
  if (!m) return { year: 0, seasonRank: 0, valid: false };
  const season = m[1].toLowerCase();
  const year = Number(m[2]);
  const seasonRank = season === "winter" ? 1 : season === "spring" ? 2 : season === "summer" ? 3 : 4;
  return { year, seasonRank, valid: Number.isFinite(year) };
}

function pickMostRecentTerm(terms: string[]): string | null {
  if (terms.length === 0) return null;
  return [...terms].sort((a, b) => {
    const pa = parseTerm(a);
    const pb = parseTerm(b);
    if (pa.valid && pb.valid) {
      if (pa.year !== pb.year) return pb.year - pa.year;
      return pb.seasonRank - pa.seasonRank;
    }
    if (pa.valid) return -1;
    if (pb.valid) return 1;
    return b.localeCompare(a);
  })[0];
}

const DEMO_SECTION_SUBTITLE =
  "Spring 2026 sample plan: CECS 328, MATH 370A, ENGL 100, and PHYS 151 — illustrative only, not your enrolled courses.";

export default function AIWorkloadScorerClient() {
  const [loading, setLoading] = useState(true);
  const [notSignedIn, setNotSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [result, setResult] = useState<WorkloadResult | null>(null);

  const demoResult = useMemo(() => getDemoWorkloadResult(), []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setNotSignedIn(true);
        setLoading(false);
        return;
      }
      setNotSignedIn(false);

      const { data: plannedRows, error: plannedError } = await supabase
        .from("student_planned_courses")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("is_active", true);

      if (plannedError) {
        setError(plannedError.message);
        setLoading(false);
        return;
      }

      const planned = (plannedRows ?? []) as StudentPlannedCourse[];
      if (planned.length === 0) {
        setSelectedTerm(null);
        setResult(null);
        setLoading(false);
        return;
      }

      const terms = Array.from(new Set(planned.map((p) => p.term).filter(Boolean)));
      const term = pickMostRecentTerm(terms);
      const termCourses = term ? planned.filter((p) => p.term === term) : planned;
      setSelectedTerm(term);

      const courseCodes = Array.from(new Set(termCourses.map((p) => p.course_code).filter(Boolean)));
      if (courseCodes.length === 0) {
        setResult(analyzeWorkload(termCourses, {}));
        setLoading(false);
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .from("course_difficulty_profiles")
        .select("*")
        .in("course_code", courseCodes);

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const profilesByCode: Record<string, CourseDifficultyProfile> = {};
      for (const row of (profileRows ?? []) as CourseDifficultyProfile[]) {
        profilesByCode[row.course_code] = row;
      }

      setResult(analyzeWorkload(termCourses, profilesByCode));
      setLoading(false);
    }

    load();
  }, []);

  const hasNoData = !loading && !error && !notSignedIn && !result;

  const sectionSubtitle = useMemo(() => {
    if (!selectedTerm) return "Based on your most recent active planned courses.";
    return `Based on your active planned courses for ${selectedTerm}.`;
  }, [selectedTerm]);

  const showDemoDashboard = !loading && !error && notSignedIn;
  const showRealDashboard = !loading && !error && !notSignedIn && result !== null;

  return (
    <PageLayout
      label="ScheduleU Student Portal"
      title="AI Workload Scorer"
      subtitle="Estimate how demanding your semester may be before registration."
    >
      {error ? <AlertBanner>Unable to analyze workload right now: {error}</AlertBanner> : null}

      {loading ? (
        <SectionCard>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>Analyzing your semester workload…</p>
        </SectionCard>
      ) : null}

      {hasNoData ? (
        <EmptyState
          icon="📚"
          title="No active planned courses found for workload analysis yet."
          text="Add planned courses for your upcoming term to generate your personalized workload score."
        />
      ) : null}

      {showDemoDashboard ? (
        <>
          <DemoModeBanner />
          <WorkloadAnalysisView result={demoResult} sectionSubtitle={DEMO_SECTION_SUBTITLE} />
        </>
      ) : null}

      {showRealDashboard && result ? (
        <WorkloadAnalysisView result={result} sectionSubtitle={sectionSubtitle} />
      ) : null}
    </PageLayout>
  );
}
