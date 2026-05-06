"use client";
import Link from 'next/link';

type ToolCard = {
  name: string
  icon: string
  href?: string
  status?: string
}

export default function DashboardPage() {
  const tools: ToolCard[] = [
    { name: "Schedule Planner", icon: "📅", href: "/schedule-builder" },
    { name: "AI Scheduler", icon: "🤖", href: "/schedule-builder" },
    { name: "Progress Tracker", icon: "📈", href: "/transcript-import" },
    { name: "Notification Center", icon: "🔔", href: "/NotificationCenter" },
    { name: "Marketplace", icon: "🛒", href: "/marketplace" },
    { name: "Social Hub", icon: "👥", href: "/social-hub" },
    { name: "Parking Tracker", icon: "🚗", href: "/parking" }, // NOW ACTIVE!
    { name: "Browse and Search", icon: "🔍", href: "/courses" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="bg-schu-teal px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80 transition-opacity">
          ScheduleU
        </Link>

        <nav className="flex items-center gap-6 text-white">
          <Link href="/user-profile" className="text-sm font-medium hover:opacity-80">Profile</Link>
          <Link href="/profile" className="text-sm font-medium hover:opacity-80">Setup</Link>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
            <span className="text-schu-teal text-xs font-bold">BH</span>
          </div>
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
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {tools.map((tool) => {
            const isParking = tool.name === "Parking Tracker";
            
            const cardContent = (
              <>
                <div className={`w-full aspect-square border-2 rounded-sm p-6 mb-3 transition-all bg-white flex items-center justify-center ${
                  tool.href
                    ? `border-slate-100 group-hover:shadow-xl ${isParking ? 'group-hover:border-pink-400' : 'group-hover:border-schu-teal/30'}`
                    : 'border-slate-200 opacity-70 cursor-not-allowed'
                }`}>
                  <span className="text-5xl">{tool.icon}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-800 uppercase text-center tracking-tight">
                  {tool.name}
                </p>
                {tool.status && (
                  <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase text-center tracking-wide">
                    {tool.status}
                  </p>
                )}
              </>
            );

            return tool.href ? (
              <Link key={tool.name} href={tool.href} className="flex flex-col items-center group cursor-pointer">
                {cardContent}
              </Link>
            ) : (
              <div key={tool.name} className="flex flex-col items-center">
                {cardContent}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}