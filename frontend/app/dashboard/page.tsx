"use client";

import Link from "next/link";

type IconName =
  | "schedule"
  | "planner"
  | "ai"
  | "progress"
  | "notifications"
  | "timer"
  | "travel"
  | "market"
  | "social"
  | "parking"
  | "courses";

type ToolCard = {
  name: string;
  icon: IconName;
  href: string;
  subtitle: string;
};

function ToolIcon({ name, className }: { name: IconName; className?: string }) {
  const commonProps = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  switch (name) {
    case "schedule":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M7.5 2.75v4M16.5 2.75v4M3 9h18M12 12.5v5M9.5 15h5" />
        </svg>
      );
    case "planner":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4.5" width="14.5" height="15.5" rx="2.5" />
          <path d="M7 2.75v4M14 2.75v4M3 9h14.5M7 13h4M7 16h3" />
          <path d="m14 13 6 5.2-3.2.6-1 3.2-2.7-7.8Z" />
        </svg>
      );
    case "ai":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3.2" />
          <circle cx="5.5" cy="5.5" r="2" />
          <circle cx="18.5" cy="5.5" r="2" />
          <circle cx="5.5" cy="18.5" r="2" />
          <circle cx="18.5" cy="18.5" r="2" />
          <path d="m7 7 2.7 2.7M17 7l-2.7 2.7M7 17l2.7-2.7M17 17l-2.7-2.7" />
        </svg>
      );
    case "progress":
      return (
        <svg {...commonProps}>
          <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
          <path d="M9 3.5h6M8.5 9.5h7M8.5 13h4" />
          <path d="m8.5 16.5 2 2 4.5-5" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...commonProps}>
          <path d="M18 9.8c0-3.3-2.2-5.8-6-5.8S6 6.5 6 9.8c0 6-2.2 6.2-2.2 7.4h16.4C20.2 16 18 15.8 18 9.8Z" />
          <path d="M9.6 20a2.7 2.7 0 0 0 4.8 0" />
        </svg>
      );
    case "timer":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="13" r="7.5" />
          <path d="M9.5 2.75h5M12 5.5V3M12 13V8.8M12 13l3.2 2.1" />
        </svg>
      );
    case "travel":
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="16" height="13" rx="3" />
          <path d="M7 17v2M17 17v2M7.5 8h9M7.5 12h2.5M14 12h2.5" />
          <circle cx="8" cy="17" r="1" />
          <circle cx="16" cy="17" r="1" />
        </svg>
      );
    case "market":
      return (
        <svg {...commonProps}>
          <path d="M4.5 10h15l-1.4-5.5H5.9L4.5 10Z" />
          <path d="M6 10v8.5h12V10M8.5 18.5v-5h7v5M4.5 10c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5" />
        </svg>
      );
    case "social":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9.5" r="2.3" />
          <path d="M3.8 19c.8-3.3 2.8-5 5.2-5s4.4 1.7 5.2 5M14.2 15.3c2.6.2 4.5 1.5 5.5 3.7" />
        </svg>
      );
    case "parking":
      return (
        <svg {...commonProps}>
          <path d="M5.5 14.5h13l-1.3-4.2a2.3 2.3 0 0 0-2.2-1.6H9a2.3 2.3 0 0 0-2.2 1.6l-1.3 4.2Z" />
          <path d="M7 14.5v3M17 14.5v3M8.4 8.7l.8-2.1h5.6l.8 2.1M8 12h1.5M14.5 12H16" />
          <circle cx="8" cy="17" r="1.2" />
          <circle cx="16" cy="17" r="1.2" />
        </svg>
      );
    case "courses":
      return (
        <svg {...commonProps}>
          <path d="M4 5.5c2.8 0 5.4.6 8 2.2 2.6-1.6 5.2-2.2 8-2.2v13c-2.8 0-5.4.6-8 2.2-2.6-1.6-5.2-2.2-8-2.2v-13Z" />
          <path d="M12 7.7v13M7 10h2.5M7 13h2.5M14.5 10H17M14.5 13H17" />
        </svg>
      );
    default:
      return null;
  }
}

export default function DashboardPage() {
  const tools: ToolCard[] = [
    { name: "Schedule Builder", icon: "schedule", href: "/schedule-builder", subtitle: "Generate class combinations" },
    { name: "Interactive Planner", icon: "planner", href: "/planner", subtitle: "Drag sections into calendar" },
    { name: "AI Workload", icon: "ai", href: "/ai-workload-scorer", subtitle: "Estimate semester intensity" },
    { name: "Progress Tracker", icon: "progress", href: "/transcript-import", subtitle: "Import transcript progress" },
    { name: "Notification Center", icon: "notifications", href: "/notifications", subtitle: "See live academic alerts" },
    { name: "Registration Timer", icon: "timer", href: "/registration-countdown", subtitle: "Track your appointment window" },
    { name: "Travel Alerts", icon: "travel", href: "/travelalerts", subtitle: "Monitor campus commute updates" },
    { name: "Marketplace", icon: "market", href: "/marketplace", subtitle: "Browse student listings" },
    { name: "Social Hub", icon: "social", href: "/social-hub", subtitle: "Connect with your campus community" },
    { name: "Parking Tracker", icon: "parking", href: "/parking", subtitle: "Find and verify open lots" },
    { name: "Browse Courses", icon: "courses", href: "/courses", subtitle: "Search sections and filters" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="bg-schu-teal px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          ScheduleU
        </Link>

        <nav className="flex items-center gap-6 text-white">
          <Link href="/planner" className="text-sm font-medium hover:opacity-80">Planner</Link>
          <Link href="/notifications" className="text-sm font-medium hover:opacity-80">Notifications</Link>
          <Link href="/registration-countdown" className="text-sm font-medium hover:opacity-80">Registration</Link>
          <Link href="/user-profile" className="text-sm font-medium hover:opacity-80">Profile</Link>
          <Link href="/profile" className="text-sm font-medium hover:opacity-80">Setup</Link>
          <Link href="/user-profile" className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            <span className="text-schu-teal text-xs">ME</span>
          </Link>
          <div className="flex flex-col gap-1 cursor-pointer group">
            <div className="w-6 h-0.5 bg-white group-hover:bg-slate-200"></div>
            <div className="w-6 h-0.5 bg-white group-hover:bg-slate-200"></div>
            <div className="w-6 h-0.5 bg-white group-hover:bg-slate-200"></div>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-12">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-4xl font-black text-slate-700 uppercase tracking-tighter">Dashboard</h2>
          <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase">
            <Link href="/courses" className="hover:text-schu-teal transition-colors">Browse Courses</Link>
            <Link href="/schedule-builder" className="hover:text-schu-teal transition-colors">Build Schedule</Link>
            <Link href="/planner" className="hover:text-schu-teal transition-colors">Planner</Link>
            <Link href="/travelalerts" className="hover:text-schu-teal transition-colors">Travel Alerts</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {tools.map((tool) => {
            const isParking = tool.name === "Parking Tracker";
            const isPlanner = tool.name === "Interactive Planner";

            return (
              <Link key={tool.name} href={tool.href} className="flex flex-col items-center group cursor-pointer">
                <div
                  className={`w-full aspect-square border-2 rounded-sm p-6 mb-3 transition-all bg-white flex items-center justify-center border-slate-100 group-hover:shadow-xl ${
                    isParking
                      ? "group-hover:border-pink-400"
                      : isPlanner
                        ? "group-hover:border-blue-400"
                        : "group-hover:border-schu-teal/30"
                  }`}
                >
                  <ToolIcon
                    name={tool.icon}
                    className={`h-16 w-16 transition-colors ${
                      isParking
                        ? "text-slate-700 group-hover:text-pink-500"
                        : isPlanner
                          ? "text-slate-700 group-hover:text-blue-500"
                          : "text-slate-700 group-hover:text-schu-teal"
                    }`}
                  />
                </div>
                <p className="text-[11px] font-bold text-slate-800 uppercase text-center tracking-tight">
                  {tool.name}
                </p>
                <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase text-center tracking-wide">
                  {tool.subtitle}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
