"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import HeaderMenu from "@/components/HeaderMenu";
import { supabase } from "@/utils/supabase";
import { analyzeWorkload, type CourseDifficultyProfile, type StudentPlannedCourse } from "@/lib/workloadScorer";
import { TRAVEL_MOCK_ALERTS } from "@/lib/travelAlertsMock";

type DailyTip = {
  title: string;
  body: string;
  source: string;
};

const campusEvents = [
  {
    title: "Beach Women in Engineering Conference",
    when: "April 10, 2026",
    note: "Networking and workshops for engineering students.",
  },
  {
    title: "Engineering Graduation Ceremonies",
    when: "May 21, 2026",
    note: "Plan parking and arrival time early if you have campus commitments that day.",
  },
];

export default function DailyTipsPage() {
  const menuItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/travelalerts", label: "Travel Alerts" },
    { href: "/ai-workload-scorer", label: "AI Workload" },
  ];

  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [studentName, setStudentName] = useState("Student");

  useEffect(() => {
    const loadTips = async () => {
      setLoading(true);
      const builtTips: DailyTip[] = [];

      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id ?? null;
      setStudentName(authData.user?.email?.split("@")[0] ?? "Student");

      if (authUserId) {
        const [{ data: plannedRows }, { data: profileRows }, { data: profile }] = await Promise.all([
          supabase.from("student_planned_courses").select("*").eq("user_id", authUserId).eq("is_active", true),
          supabase.from("course_difficulty_profiles").select("*"),
          supabase.from("profiles").select("major, grad_term").eq("id", authUserId).maybeSingle(),
        ]);

        const plannedCourses = (plannedRows ?? []) as StudentPlannedCourse[];
        const profilesByCode: Record<string, CourseDifficultyProfile> = {};
        for (const row of (profileRows ?? []) as CourseDifficultyProfile[]) {
          profilesByCode[row.course_code] = row;
        }

        if (plannedCourses.length > 0) {
          const workload = analyzeWorkload(plannedCourses, profilesByCode);
          builtTips.push({
            title: "Study load check",
            body: `Your active plan looks ${workload.label.toLowerCase()} right now. ${workload.explanation}`,
            source: "AI workload + planned courses",
          });
        }

        if (profile?.major) {
          builtTips.push({
            title: "Major-aware planning",
            body: `Your saved major is ${profile.major}. Keep an eye on upper-division sequencing and prerequisite-heavy classes before registration.`,
            source: "Profile settings",
          });
        }
      }

      const highestPriorityTravel = TRAVEL_MOCK_ALERTS.find((alert) => alert.priority === "high") ?? TRAVEL_MOCK_ALERTS[0];
      if (highestPriorityTravel) {
        builtTips.push({
          title: "Commute snapshot",
          body: `${highestPriorityTravel.title}: ${highestPriorityTravel.message}`,
          source: "Travel alerts",
        });
      }

      for (const event of campusEvents.slice(0, 2)) {
        builtTips.push({
          title: event.title,
          body: `${event.when}. ${event.note}`,
          source: "Campus events",
        });
      }

      if (builtTips.length === 0) {
        builtTips.push({
          title: "Daily planning baseline",
          body: "Open your profile, planner, and travel alerts to generate more personalized campus tips.",
          source: "ScheduleU",
        });
      }

      setTips(builtTips);
      setLoading(false);
    };

    void loadTips();
  }, []);

  const featuredTip = useMemo(() => tips[0] ?? null, [tips]);

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <header className="flex items-center justify-between bg-schu-teal px-4 py-3 shadow-md sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight hover:opacity-80">
          ScheduleU
        </Link>
        <HeaderMenu items={menuItems} title="Daily Tips" />
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--hero-gradient)] p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-schu-blue">Daily Tips & Campus Insights</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tighter text-[var(--text-strong)]">
            Personalized guidance for {studentName}
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-[var(--text-secondary)]">
            Tips combine your saved academic context, active planned courses, travel alerts, and upcoming campus events.
          </p>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-4 py-6 text-sm text-[var(--text-secondary)] shadow-sm">
            Generating today&apos;s campus insights...
          </section>
        ) : null}

        {featuredTip && !loading ? (
          <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-schu-teal">Featured insight</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text-strong)]">{featuredTip.title}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{featuredTip.body}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Source: {featuredTip.source}</p>
          </section>
        ) : null}

        {!loading ? (
          <section className="grid gap-4 md:grid-cols-2">
            {tips.slice(1).map((tip) => (
              <article key={`${tip.title}-${tip.source}`} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{tip.source}</p>
                <h3 className="mt-2 text-lg font-black text-[var(--text-strong)]">{tip.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{tip.body}</p>
              </article>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
