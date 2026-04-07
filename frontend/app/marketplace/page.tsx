"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function MarketplacePage() {
  const [filter, setFilter] = useState('Textbooks');

  const listings = [
    { id: 1, title: "CECS 325 Textbook", price: 25, seller: "Tanjiro Kamado", desc: "Lightly used, 3rd edition", category: "Textbooks" },
    { id: 2, title: "Python Tutoring", price: 10, seller: "Giyu Tomioka", desc: "1-on-1 Zoom tutoring", category: "Tutors", perHour: true },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Shared Header */}
      <header className="bg-schu-teal px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/dashboard" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity">
          ScheduleU <span className="font-light text-lg">Marketplace</span>
        </Link>
        <div className="flex items-center gap-4 text-white">
          <span className="text-sm font-medium italic underline decoration-white/30 underline-offset-4">About us</span>
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-schu-teal shadow-inner">👤</div>
          <div className="space-y-1 cursor-pointer group">
            <div className="w-6 h-0.5 bg-white group-hover:bg-slate-200"></div>
            <div className="w-6 h-0.5 bg-white group-hover:bg-slate-200"></div>
            <div className="w-6 h-0.5 bg-white group-hover:bg-slate-200"></div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 flex gap-12">
        {/* Left Sidebar Filters */}
        <aside className="w-64 space-y-8">
          <div className="flex flex-col gap-4">
            <h3 className="text-slate-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
              <span>🔍</span> Filter by
            </h3>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="border-2 border-schu-teal p-2 rounded text-slate-700 font-medium focus:ring-2 focus:ring-schu-teal outline-none"
            >
              <option>Textbooks</option>
              <option>Tutors</option>
              <option>Study Supplies</option>
              <option>Tech</option>
            </select>

            <label className="text-slate-500 font-bold uppercase text-xs tracking-widest">Price Range</label>
            <input type="text" placeholder="$10 - $50" className="border-2 border-schu-teal p-2 rounded text-slate-700" />
            
            <button className="bg-slate-100 text-slate-500 py-2 rounded text-xs font-bold uppercase tracking-tighter hover:bg-slate-200 transition-colors">
              Reset Filters
            </button>
          </div>
        </aside>

        {/* Listings Area */}
        <section className="flex-1 space-y-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search listings..." 
              className="w-full border-2 border-slate-700 p-4 rounded-full pl-12 text-slate-700 focus:border-schu-teal outline-none transition-all"
            />
            <span className="absolute left-5 top-4.5 text-slate-400">🔍</span>
          </div>

          <div className="space-y-4">
            {listings.map((item) => (
              <div key={item.id} className="flex justify-between items-start border-b border-slate-100 pb-6 hover:bg-slate-50 transition-colors p-4 rounded-lg">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-schu-teal/10 rounded flex items-center justify-center text-2xl">
                    {item.category === "Textbooks" ? "📚" : "💻"}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-700 text-lg uppercase tracking-tight">
                      {item.title} - <span className="text-schu-teal">${item.price}{item.perHour ? '/hr' : ''}</span>
                    </h4>
                    <p className="text-slate-400 text-sm font-medium italic">Seller: {item.seller}</p>
                    <p className="text-slate-600 mt-1">{item.desc}</p>
                    <button className="mt-3 text-schu-teal font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                      View Details <span className="w-4 h-4 bg-schu-teal rounded-full text-white text-[10px] flex items-center justify-center">→</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}