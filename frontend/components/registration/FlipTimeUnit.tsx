"use client";

import { useMemo } from "react";

type FlipTimeUnitProps = {
  label: string;
  value: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function FlipTimeUnit({ label, value }: FlipTimeUnitProps) {
  const formatted = useMemo(() => (label === "Days" ? String(value) : pad2(value)), [label, value]);

  return (
    <div className="reg-flip-unit">
      {/* Keyed remount replays the split-flap animation on each value change. */}
      <div key={formatted} className="reg-flap reg-flap--animate" aria-label={`${label} ${formatted}`}>
        <div className="reg-flap__frame">
          <div className="reg-flap__top">
            <span className="reg-flap__text">{formatted}</span>
          </div>
          <div className="reg-flap__bottom">
            <span className="reg-flap__text">{formatted}</span>
          </div>
          <div className="reg-flap__hinge" aria-hidden />
        </div>

        {/* Animated flaps */}
        <div className="reg-flap__flip reg-flap__flip--top" aria-hidden>
          <span className="reg-flap__text">{formatted}</span>
        </div>
        <div className="reg-flap__flip reg-flap__flip--bottom" aria-hidden>
          <span className="reg-flap__text">{formatted}</span>
        </div>
      </div>
      <div className="reg-flip-unit__label">{label}</div>
    </div>
  );
}

