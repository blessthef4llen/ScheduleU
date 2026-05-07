"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CountdownParts } from "./types";
import FlipTimeUnit from "./FlipTimeUnit";

type FlipCountdownProps = {
  target: Date;
  onComplete?: () => void;
};

function computeParts(target: Date, nowMs: number): { parts: CountdownParts; remainingMs: number } {
  const remainingMs = Math.max(0, target.getTime() - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds / (60 * 60)) % 24);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const seconds = Math.floor(totalSeconds % 60);
  return { parts: { days, hours, minutes, seconds }, remainingMs };
}

export default function FlipCountdown({ target, onComplete }: FlipCountdownProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const didCompleteRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { parts, remainingMs } = useMemo(() => computeParts(target, nowMs), [target, nowMs]);

  useEffect(() => {
    if (remainingMs > 0) return;
    if (didCompleteRef.current) return;
    didCompleteRef.current = true;
    onComplete?.();
  }, [remainingMs, onComplete]);

  return (
    <div className="reg-flip-grid" role="timer" aria-label="Registration countdown">
      <FlipTimeUnit label="Days" value={parts.days} />
      <FlipTimeUnit label="Hours" value={parts.hours} />
      <FlipTimeUnit label="Minutes" value={parts.minutes} />
      <FlipTimeUnit label="Seconds" value={parts.seconds} />
    </div>
  );
}

