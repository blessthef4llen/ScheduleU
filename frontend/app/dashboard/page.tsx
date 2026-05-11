"use client";
// Dashboard page for ScheduleU.

import Link from "next/link";
import HeaderMenu from "@/components/HeaderMenu";

type ToolCard = {
  name: string;
  icon: string;
  href: string;
  subtitle: string;
};

export default function DashboardPage() {
  const menuItems = [
    { href: "/courses", label: "Courses" },
    { href: "/schedule-builder", label: "Builder" },
    { href: "/planner", label: "Planner" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/notifications", label: "Notifications" },
    { href: "/registration-countdown", label: "Registration" },
    { href: "/daily-tips", label: "Daily Tips" },
  ];

  const tools: ToolCard[] = [
    { name: "Browse Courses", icon: "🔍", href: "/courses", subtitle: "Search sections and filters" },
    { name: "Schedule Builder", icon: "📅", href: "/schedule-builder", subtitle: "Generate class combinations" },
    { name: "Interactive Planner", icon: "🗓️", href: "/planner", subtitle: "Drag sections into calendar" },
    { name: "Watchlist", icon: "👀", href: "/watchlist", subtitle: "Track seat openings" },
    { name: "Notification Center", icon: "🔔", href: "/notifications", subtitle: "See live academic alerts" },
    { name: "Registration Timer", icon: "⏳", href: "/registration-countdown", subtitle: "Track your appointment window" },
    { name: "Daily Tips", icon: "💡", href: "/daily-tips", subtitle: "Personalized campus insights" },
    { name: "AI Workload", icon: "🤖", href: "/ai-workload-scorer", subtitle: "Estimate semester intensity" },
    { name: "Progress Tracker", icon: "📈", href: "/transcript-import", subtitle: "Import transcript progress" },
    { name: "Travel Alerts", icon: "🚌", href: "/travelalerts", subtitle: "Monitor campus commute updates" },
    { name: "Parking Tracker", icon: "🚗", href: "/parking", subtitle: "Find and verify open lots" },
    { name: "Marketplace", icon: "🛒", href: "/marketplace", subtitle: "Browse student listings" },
    { name: "Social Hub", icon: "👥", href: "/social-hub", subtitle: "Connect with your campus community" },
  ];

  return (
    <div className="min-h-screen font-sans text-[var(--text-primary)]">
      <header className="flex items-center justify-between bg-schu-teal px-4 py-3 shadow-md sm:px-6 lg:px-8">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          ScheduleU
        </Link>
        <HeaderMenu items={menuItems} title="Dashboard" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl text-[var(--text-strong)]">Dashboard</h2>
          <div className="flex flex-wrap gap-3 text-xs font-bold uppercase text-[var(--text-muted)]">
            <Link href="/courses" className="hover:text-schu-teal transition-colors">Browse Courses</Link>
            <Link href="/schedule-builder" className="hover:text-schu-teal transition-colors">Build Schedule</Link>
            <Link href="/planner" className="hover:text-schu-teal transition-colors">Planner</Link>
            <Link href="/watchlist" className="hover:text-schu-teal transition-colors">Watchlist</Link>
            <Link href="/notifications" className="hover:text-schu-teal transition-colors">Notifications</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {tools.map((tool) => {
            const isParking = tool.name === "Parking Tracker";
            const isPlanner = tool.name === "Interactive Planner";

            return (
              <Link key={tool.name} href={tool.href} className="flex flex-col items-center group cursor-pointer">
                <div
                  className={`mb-3 flex aspect-square w-full items-center justify-center rounded-2xl border p-5 transition-all bg-[var(--bg-elevated)] border-[var(--border-soft)] shadow-sm group-hover:shadow-xl sm:p-6 ${
                    isParking
                      ? "group-hover:border-pink-400"
                      : isPlanner
                        ? "group-hover:border-blue-400"
                        : "group-hover:border-schu-teal/30"
                  }`}
                >
                  <span className="text-5xl leading-none" aria-hidden="true">
                    {tool.icon}
                  </span>
                </div>
                <p className="text-center text-[11px] font-bold uppercase tracking-tight text-[var(--text-strong)]">
                  {tool.name}
                </p>
                <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
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
