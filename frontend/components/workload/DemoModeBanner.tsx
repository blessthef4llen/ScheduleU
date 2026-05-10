// Reusable Demomodebanner component for ScheduleU.
﻿import Link from "next/link";

export default function DemoModeBanner() {
  return (
    <div className="workload-demo-banner" role="status" aria-live="polite">
      <div className="workload-demo-banner__accent" aria-hidden />
      <div className="workload-demo-banner__inner">
        <div className="workload-demo-banner__title-row">
          <span className="workload-demo-banner__badge">Demo preview</span>
          <span className="workload-demo-banner__hint">Sample schedule analysis</span>
        </div>
        <p className="workload-demo-banner__text">
          You are viewing a presentation-ready example. The same scoring pipeline runs on your real plan after{" "}
          <Link href="/login" className="workload-demo-banner__link">
            sign-in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
