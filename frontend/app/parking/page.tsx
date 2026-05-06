"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../utils/supabase';

export default function ParkingPage() {
  const [lots, setLots] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [closestLot, setClosestLot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState<{ [key: string]: string }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchParkingData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('parking_status')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) setLots(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchParkingData();
  }, []);

  const handleBuildingSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toUpperCase();
    if (!query) return;

    let { data } = await supabase.from('campus_locations').select('closest_lot').eq('code', query).maybeSingle();
    
    if (!data) {
      const { data: fuzzy } = await supabase.from('campus_locations').select('closest_lot').ilike('code', `%${query}%`).limit(1);
      if (fuzzy && fuzzy.length > 0) data = fuzzy[0];
    }

    setClosestLot(data ? data.closest_lot : "Not found. Try LIB or ECS.");
  };

  // The Waze-style "Report/Verify" Logic
  const handleReport = async (lotName: string, status: 'Full' | 'Empty') => {
    const note = userInput[lotName] || ""; // Get the specific text input for this lot
    
    const updates = status === 'Full' 
      ? { status: 'Full', color: 'bg-red-500', occupancy: '100%' }
      : { status: 'Open', color: 'bg-emerald-400', occupancy: '15%' };

    const { error } = await supabase
      .from('parking_status')
      .update(updates)
      .eq('name', lotName);

    if (!error) {
      setSuccessMessage(`Thanks! Verified ${lotName} is ${status}. ${note ? 'Note saved.' : ''}`);
      setUserInput(prev => ({ ...prev, [lotName]: '' })); // Clear input for this lot
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchParkingData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {successMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl z-50 animate-bounce font-bold border-2 border-pink-500">
          ✨ {successMessage}
        </div>
      )}

      <header className="bg-[#4FD1C5] px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/dashboard" className="text-2xl font-bold text-white uppercase tracking-tighter">ScheduleU</Link>
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#4FD1C5] font-black">BH</div>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        {/* Search Bar (Same as before) */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 mb-10">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-pink-500 mb-4 text-center italic">Find Closest Parking</h2>
          <form onSubmit={handleBuildingSearch} className="flex gap-3">
            <input 
              type="text" 
              placeholder="Enter Building (LIB, ECS)..."
              className="flex-1 bg-slate-100 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-pink-300 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase">Find</button>
          </form>
          {closestLot && <div className="mt-6 p-4 bg-pink-50 rounded-2xl border border-pink-100 flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Recommended:</span><span className="text-lg font-black text-pink-600">{closestLot}</span></div>}
        </div>

        {/* Live Status + User Input Feature */}
        <div className="grid gap-6">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-4">Live Community Feed</h2>
          {lots.map((lot) => (
            <div key={lot.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col gap-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${lot.color} animate-pulse`}></div>
                  <div>
                    <h3 className="font-black text-xl text-slate-800">{lot.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{lot.lot_type} • {lot.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-700">{lot.occupancy}</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Fullness</p>
                </div>
              </div>

              {/* --- NEW: USER INPUT FEATURE (Apple Maps Style) --- */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Is this lot currently full?</p>
                <div className="flex gap-2 mb-3">
                  <button 
                    onClick={() => handleReport(lot.name, 'Full')}
                    className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-[10px] font-black hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                  >
                    YES, IT'S FULL
                  </button>
                  <button 
                    onClick={() => handleReport(lot.name, 'Empty')}
                    className="flex-1 bg-white border border-slate-200 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all"
                  >
                    NO, SPOTS OPEN
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Add a quick note (e.g. 'Long line at entrance')"
                  className="w-full bg-transparent border-b border-slate-200 py-1 text-[11px] outline-none focus:border-pink-300 transition-all"
                  value={userInput[lot.name] || ''}
                  onChange={(e) => setUserInput({ ...userInput, [lot.name]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}