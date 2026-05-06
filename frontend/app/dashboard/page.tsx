"use client";
import Link from 'next/link';

type ToolCard = {
  name: string
  icon: string
  href: string
  subtitle: string
}

export default function DashboardPage() {
  const tools: ToolCard[] = [
    { name: "Schedule Planner", icon: "📅", href: "/schedule-builder", subtitle: "Build class combinations" },
    { name: "AI Workload", icon: "🤖", href: "/ai-workload-scorer", subtitle: "Estimate semester intensity" },
    { name: "Progress Tracker", icon: "📈", href: "/transcript-import", subtitle: "Import transcript progress" },
    { name: "Notification Center", icon: "🔔", href: "/notifications", subtitle: "See live academic alerts" },
    { name: "Registration Timer", icon: "⏳", href: "/registration-countdown", subtitle: "Track your appointment window" },
    { name: "Travel Alerts", icon: "🚌", href: "/travelalerts", subtitle: "Monitor campus commute updates" },
    { name: "Marketplace", icon: "🛒", href: "/marketplace", subtitle: "Browse student listings" },
    { name: "Social Hub", icon: "👥", href: "/social-hub", subtitle: "Connect with your campus community" },
    { name: "Parking Tracker", icon: "🚗", href: "/parking", subtitle: "Find and verify open lots" },
    { name: "Browse Courses", icon: "🔍", href: "/courses", subtitle: "Search sections and filters" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="bg-schu-teal px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          ScheduleU
        </Link>

        <nav className="flex items-center gap-6 text-white">
          <Link href="/notifications" className="text-sm font-medium hover:opacity-80">Notifications</Link>
          <Link href="/registration-countdown" className="text-sm font-medium hover:opacity-80">Registration</Link>
          <Link href="/user-profile" className="text-sm font-medium hover:opacity-80">Profile</Link>
          <Link href="/profile" className="text-sm font-medium hover:opacity-80">Setup</Link>
          <Link href="/user-profile" className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            <span className="text-schu-teal text-xs">👤</span>
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
            <Link href="/travelalerts" className="hover:text-schu-teal transition-colors">Travel Alerts</Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {tools.map((tool) => {
            const isParking = tool.name === "Parking Tracker";

            const cardContent = (
              <>
                <div className={`w-full aspect-square border-2 rounded-sm p-6 mb-3 transition-all bg-white flex items-center justify-center border-slate-100 group-hover:shadow-xl ${isParking ? 'group-hover:border-pink-400' : 'group-hover:border-schu-teal/30'}`}>
                  <span className="text-5xl">{tool.icon}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-800 uppercase text-center tracking-tight">
                  {tool.name}
                </p>
                <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase text-center tracking-wide">
                  {tool.subtitle}
                </p>
              </>
            );

            return (
              <Link key={tool.name} href={tool.href} className="flex flex-col items-center group cursor-pointer">
                {cardContent}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
