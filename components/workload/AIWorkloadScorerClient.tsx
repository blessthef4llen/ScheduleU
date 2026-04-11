"use client";

import { useEffect, useMemo, useState } from "react";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/ui/EmptyState";
import PageLayout from "@/components/ui/PageLayout";
import SectionCard from "@/components/ui/SectionCard";
import { getDemoWorkloadResult } from "@/lib/workloadDemo";
import { getSupabase } from "@/lib/supabaseClient";
import type { WorkloadResult } from "@/lib/workloadScorer";
import DemoModeBanner from "./DemoModeBanner";
import WorkloadAnalysisView from "./WorkloadAnalysisView";

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

      const res = await fetch("/api/ai-workload");
      const json = (await res.json()) as {
        error?: string;
        details?: string;
        result?: WorkloadResult | null;
        selectedTerm?: string | null;
      };

      if (!res.ok) {
        setError(json.details ?? json.error ?? res.statusText);
        setLoading(false);
        return;
      }

      setSelectedTerm(json.selectedTerm ?? null);
      setResult(json.result ?? null);
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
