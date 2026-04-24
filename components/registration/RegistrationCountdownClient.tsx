"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import PageLayout from "@/components/ui/PageLayout";
import SectionCard from "@/components/ui/SectionCard";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import InfoBadge from "@/components/ui/InfoBadge";
import { SecondaryButton } from "@/components/ui/Buttons";
import { getSupabase } from "@/lib/supabaseClient";
import FlipCountdown from "./FlipCountdown";
import type { RegistrationWindowRow } from "./types";

type StatusTone = "info" | "urgent" | "unread" | "read";

const DEMO_ALWAYS = process.env.NEXT_PUBLIC_REGISTRATION_DEMO_ALWAYS !== "false";
const DEMO_SECONDS_FROM_NOW = 30;

function formatAppointment(d: Date): { dayText: string; timeText: string } {
  const dayText = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const timeText = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { dayText, timeText };
}

function msToDays(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}

export default function RegistrationCountdownClient() {
  const [userId, setUserId] = useState("");
  const [notSignedIn, setNotSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registrationAt, setRegistrationAt] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const confettiFiredRef = useRef(false);
  const reminderAttemptedRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    async function load() {
      if (DEMO_ALWAYS) {
        setLoading(true);
        setLoadError(null);
        setNotSignedIn(false);
        setUserId("demo");
        setRegistrationAt(new Date(Date.now() + DEMO_SECONDS_FROM_NOW * 1000));
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      const supabase = getSupabase();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setNotSignedIn(true);
        setLoading(false);
        return;
      }
      setNotSignedIn(false);
      setUserId(userData.user.id);

      const res = await fetch("/api/registration-appointment");
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = typeof errBody.error === "string" ? errBody.error : res.statusText;
        setLoadError(msg);
        setRegistrationAt(null);
        setLoading(false);
        return;
      }

      const json = (await res.json()) as { appointment?: RegistrationWindowRow | null };
      const row = json.appointment ?? null;
      const ts = row?.registration_time ?? null;
      if (!ts) {
        setRegistrationAt(null);
        setLoading(false);
        return;
      }

      setRegistrationAt(new Date(ts));
      setLoading(false);
    }

    load();
  }, []);

  const diffMs = useMemo(() => (registrationAt ? registrationAt.getTime() - nowMs : null), [registrationAt, nowMs]);
  const isOpen = diffMs !== null ? diffMs <= 0 : false;
  const within10Days = diffMs !== null ? msToDays(diffMs) <= 10 : false;
  const within24Hours = diffMs !== null ? diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000 : false;

  const status = useMemo(() => {
    if (!registrationAt) return { label: "Missing", tone: "unread" as StatusTone };
    if (isOpen) return { label: "Open", tone: "info" as StatusTone };
    if (within24Hours) return { label: "Within 24 Hours", tone: "urgent" as StatusTone };
    if (within10Days) return { label: "Within 10 Days", tone: "info" as StatusTone };
    return { label: "Upcoming", tone: "read" as StatusTone };
  }, [registrationAt, isOpen, within10Days, within24Hours]);

  const appointmentText = useMemo(() => {
    if (!registrationAt) return null;
    const { dayText, timeText } = formatAppointment(registrationAt);
    return { dayText, timeText, headline: `Your registration day is ${dayText} at ${timeText}` };
  }, [registrationAt]);

  // 24-hour reminder: call server route once, server also dedupes.
  useEffect(() => {
    if (DEMO_ALWAYS) return;
    if (!within24Hours) return;
    if (!userId || !registrationAt) return;
    if (reminderAttemptedRef.current) return;
    reminderAttemptedRef.current = true;

    fetch("/api/registration/reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, registration_at: registrationAt.toISOString() }),
    }).catch(() => {});
  }, [within24Hours, userId, registrationAt]);

  // Confetti once when open.
  useEffect(() => {
    if (!isOpen) return;
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    const base = { spread: 70, origin: { y: 0.64 } };
    confetti({ ...base, particleCount: 60, startVelocity: 32, ticks: 180 });
    window.setTimeout(() => confetti({ ...base, particleCount: 45, startVelocity: 26, ticks: 160 }), 180);
    window.setTimeout(() => confetti({ ...base, particleCount: 35, startVelocity: 22, ticks: 140 }), 360);
  }, [isOpen]);

  return (
    <PageLayout
      label="ScheduleU Student Portal"
      title="Registration Countdown"
      subtitle="Track your personalized registration appointment window with a live countdown and reminders."
    >
      {DEMO_ALWAYS ? (
        <AlertBanner>Demo mode: showing a mock registration appointment so you can preview the countdown animation.</AlertBanner>
      ) : null}

      {notSignedIn ? (
        <AlertBanner>
          You are not signed in.{" "}
          <Link href="/login" style={{ fontWeight: 700, color: "#1e3a8a" }}>
            Go to Login
          </Link>{" "}
          to see your registration appointment.
        </AlertBanner>
      ) : null}

      {loadError ? (
        <AlertBanner>Unable to load registration appointment: {loadError}</AlertBanner>
      ) : null}

      {loading ? (
        <SectionCard>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>Loading your registration appointment…</p>
        </SectionCard>
      ) : null}

      {!loading && !registrationAt ? (
        <EmptyState
          icon="🗓️"
          title="We couldn't find your registration appointment yet."
          text="Once your registration window is available, it will appear here automatically."
        />
      ) : null}

      {!loading && registrationAt && appointmentText ? (
        <SectionCard className="reg-hero-card">
          <div className="reg-hero-row">
            <div style={{ minWidth: 240 }}>
              <p className="reg-hero-message">{appointmentText.headline}</p>
              <div className="reg-hero-meta">
                <span className="reg-hero-chip">📅 {appointmentText.dayText}</span>
                <span className="reg-hero-chip">⏰ {appointmentText.timeText}</span>
              </div>
              <p className="reg-hero-subtext">
                Keep this page handy during peak registration season—ScheduleU will surface reminders as your window
                approaches.
              </p>
            </div>
            <div className="reg-status-row">
              <InfoBadge variant={status.tone}>{status.label}</InfoBadge>
              <SecondaryButton type="button" onClick={() => location.reload()}>
                Refresh
              </SecondaryButton>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {!loading && registrationAt && !isOpen && !within10Days ? (
        <SectionCard>
          <div className="reg-status-row">
            <InfoBadge variant="read">Countdown Pending</InfoBadge>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Your countdown will begin 10 days before your registration window opens.
            </p>
          </div>
        </SectionCard>
      ) : null}

      {!loading && registrationAt && within10Days && !isOpen ? (
        <SectionCard>
          <div className="reg-status-row" style={{ marginBottom: 14 }}>
            <InfoBadge variant={within24Hours ? "urgent" : "info"}>
              {within24Hours ? "24-hour reminder active" : "Countdown active"}
            </InfoBadge>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Your registration window is approaching. The Notification Center will remind you when it’s 24 hours away.
            </p>
          </div>
          <FlipCountdown target={registrationAt} />
        </SectionCard>
      ) : null}

      {!loading && registrationAt && isOpen ? (
        <SectionCard>
          <div className="reg-status-row">
            <InfoBadge variant="info">Open</InfoBadge>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Your registration window is now open! Head to your student portal to register.
            </p>
          </div>
        </SectionCard>
      ) : null}

      {!loading && registrationAt ? (
        <SectionCard className="reg-highlight">
          <p style={{ margin: "0 0 10px", fontWeight: 800, color: "#0b1c4d" }}>Quick checklist</p>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <li>Double-check for registration holds (payments, advising, immunizations).</li>
            <li>Prepare backup classes and sections in case seats fill quickly.</li>
            <li>Watch the Notification Center for reminders and seat availability alerts.</li>
          </ul>
        </SectionCard>
      ) : null}
    </PageLayout>
  );
}

