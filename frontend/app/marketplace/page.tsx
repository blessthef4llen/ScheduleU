"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../utils/supabase';

export default function MarketplacePage() {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FETCH DATA FROM SUPABASE
  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setListings(data || []);
      } catch (err) {
        console.error('Error fetching Supabase listings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, []);

  // Filter logic - matching your SQL Seed Data categories
  const filteredListings = listings.filter(item => {
    const matchesFilter = filter === 'All' || item.category === filter;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.course_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header using your signature teal #4FD1C5 */}
      <header className="bg-[#4FD1C5] px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/dashboard" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity uppercase tracking-tighter">
          ScheduleU <span className="font-light text-lg italic">Market</span>
        </Link>
        <div className="flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#4FD1C5] shadow-inner font-black">BH</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full md:w-64 space-y-8">
          <button className="w-full bg-pink-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-pink-200 hover:-translate-y-1 transition-all uppercase tracking-widest text-[10px]">
            + Create New Listing
          </button>

          <div className="flex flex-col gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
            <h3 className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mb-2">
              Category Filter
            </h3>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="w-full border-none bg-slate-50 p-3 rounded-xl text-slate-700 font-bold text-xs outline-none focus:ring-2 focus:ring-pink-200"
            >
              <option value="All">All Items</option>
              <option value="Textbooks">Textbooks</option>
              <option value="Electronics">Electronics</option>
              <option value="Apparel">Apparel</option>
              <option value="Tutors">Tutors</option>
            </select>
          </div>
        </aside>

        {/* Listings Section */}
        <section className="flex-1">
          <div className="relative mb-10">
            <input 
              type="text" 
              placeholder="Search textbooks or course codes (e.g. CECS 326)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none bg-white p-5 rounded-[24px] pl-14 text-slate-700 font-medium shadow-sm focus:ring-4 focus:ring-[#4fd1c51a] transition-all"
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest animate-pulse">
                Syncing with Database...
              </div>
            ) : filteredListings.length > 0 ? (
              filteredListings.map((item) => (
                <div key={item.id} className="group bg-white hover:shadow-2xl hover:shadow-slate-200 transition-all p-8 rounded-[40px] border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex gap-8 items-center w-full">
                    <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shadow-inner">
                      {item.category === "Textbooks" ? "📚" : item.category === "Electronics" ? "⚡" : "👕"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                         <span className="bg-[#4FD1C5] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                           {item.course_code || 'General'}
                         </span>
                         <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest">{item.category}</span>
                      </div>
                      <h4 className="font-black text-slate-800 text-2xl tracking-tighter">
                        {item.title} — <span className="text-[#4FD1C5]">${item.price}</span>
                      </h4>
                      <p className="text-slate-400 text-[11px] font-bold italic mb-3">Posted by: {item.seller_name}</p>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-md">{item.description}</p>
                    </div>
                  </div>
                  <button className="w-full sm:w-auto whitespace-nowrap bg-slate-800 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                    Message Seller
                  </button>
                </div>
              ))
            ) : (
              <div className="p-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
                <p className="text-slate-400 font-bold">No listings found matching your criteria.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}