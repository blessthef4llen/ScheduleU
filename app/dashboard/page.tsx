"use client";
import Link from 'next/link';

export default function DashboardPage() {
  const tools = [
    { name: "Schedule Planner", icon: "📅" },
    { name: "AI Scheduler", icon: "🤖" },
    { name: "Progress Tracker", icon: "📈" },
    { name: "Notification Center", icon: "🔔" },
    { name: "Marketplace", icon: "🛒" },
    { name: "Social Hub", icon: "👥" },
    { name: "Daily Tips", icon: "💡" },
    { name: "Browse and Search", icon: "🔍" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="bg-schu-teal px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight hover:opacity-80">
          ScheduleU
        </Link>
        
        <nav className="flex items-center gap-6 text-white">
          <Link href="/about" className="text-sm font-medium hover:opacity-80">About us</Link>
          <Link href="/user-profile" className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            <span className="text-schu-teal text-xs">👤</span>
          </Link>
          <div className="flex flex-col gap-1 cursor-pointer">
            <div className="w-6 h-0.5 bg-white"></div>
            <div className="w-6 h-0.5 bg-white"></div>
            <div className="w-6 h-0.5 bg-white"></div>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-12">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-4xl font-black text-slate-700 uppercase tracking-tighter">Dashboard</h2>
          <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase">
            <button className="hover:text-schu-teal transition-colors">Edit</button>
            <button className="hover:text-schu-teal transition-colors">Create collection</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {tools.map((tool) => (
            <div key={tool.name} className="flex flex-col items-center group cursor-pointer">
              <div className="w-full aspect-square border-2 border-slate-100 rounded-sm p-6 mb-3 group-hover:shadow-xl transition-all bg-white flex items-center justify-center">
                <span className="text-5xl">{tool.icon}</span>
              </div>
              <p className="text-[11px] font-bold text-slate-800 uppercase text-center tracking-tight">
                {tool.name}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}