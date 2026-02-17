import Link from 'next/link';

export default function Dashboard() {
  const cards = [
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
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header Area */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-slate-700 uppercase tracking-tight">Dashboard</h1>
        
        <div className="flex items-center gap-6">
          <div className="flex gap-4 text-sm text-gray-500 font-medium">
            {/* This links to your new folder */}
            <Link href="/user-profile" className="hover:text-blue-600 transition-colors cursor-pointer">
              Edit
            </Link>
            <span className="cursor-default">Create collection</span>
          </div>

          {/* Profile Circle Icon from your design */}
          <Link href="/user-profile">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl shadow-md hover:bg-blue-700 transition-all cursor-pointer">
              👤
            </div>
          </Link>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {cards.map((card) => (
          <div 
            key={card.name} 
            className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          >
            {/* Icon Box */}
            <div className="w-24 h-24 bg-blue-50 rounded-xl mb-6 flex items-center justify-center text-5xl group-hover:bg-blue-100 transition-colors">
              {card.icon}
            </div>
            
            {/* Card Label */}
            <span className="font-bold text-slate-800 text-lg text-center tracking-tight">
              {card.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}