"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function SocialHubPage() {
  const [activeTab, setActiveTab] = useState('POST');
  const [newContent, setNewContent] = useState("");
  
  // 1. YOUR SPECIFIC CSULB EVENTS
  const events = [
    { 
      name: "Beach Women in Engineering Conference", 
      date: "4/10/2026", 
      time: "9:00am - 3:30pm", 
      venue: "LB Airport Marriott, 4700 Airport Plaza Dr.",
      desc: "Networking and workshops for engineering students."
    },
    { name: "Engineering 1 Graduation", date: "May 21st", time: "8:00am", venue: "CSULB Campus" },
    { name: "Engineering 2 Graduation", date: "May 21st", time: "1:30pm", venue: "CSULB Campus" },
  ];

  // 2. YOUR STUDY GROUPS
  const studyGroups = [
    { class: "CECS 451", schedule: "Tuesdays 3:00pm - 5:00pm", loc: "Library" },
    { class: "CECS 329", schedule: "Thursdays 9:00am - 10:00am", loc: "Horn Center" },
  ];

  // 3. YOUR POSTS & THREADS
  const [myActivity, setMyActivity] = useState([
    { 
      id: 1, 
      text: "Is anyone selling grad tickets for engineering 2?", 
      likes: 3, 
      replies: ["I have 2 extra!", "Check the Marketplace row."] 
    },
    {
      id: 2,
      text: "CECS 491A Review: 5/5 stars. The professor is nice!",
      likes: 10,
      replies: ["I agree!", "Super helpful for senior project."]
    }
  ]);

  const handlePost = () => {
    if (newContent.trim()) {
      setMyActivity([{ id: Date.now(), text: newContent, likes: 0, replies: [] }, ...myActivity]);
      setNewContent("");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-700">
      <header className="bg-schu-teal px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight">ScheduleU</Link>
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-schu-teal font-black">BH</div>
      </header>

      <main className="max-w-6xl mx-auto p-8 grid grid-cols-12 gap-8">
        {/* SIDEBAR DIRECTORY */}
        <aside className="col-span-3">
          <div className="bg-schu-teal text-white font-bold p-2 text-center text-xs uppercase">Directory</div>
          <div className="border-2 border-slate-100 bg-white">
            {['POST', 'EVENTS', 'STUDY GROUPS', 'CLASS REVIEWS', 'ASK A QUESTION'].map((item) => (
              <button 
                key={item} 
                onClick={() => setActiveTab(item)}
                className={`w-full text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest border-b border-slate-50 last:border-0 ${activeTab === item ? 'bg-slate-100 text-schu-teal border-l-4 border-l-schu-teal' : 'text-slate-400'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        {/* DYNAMIC CONTENT AREA */}
        <section className="col-span-9 space-y-6">
          <div className="bg-slate-50 p-6 rounded-sm border-2 border-slate-100">
            <h2 className="text-xs font-black text-slate-400 uppercase mb-4">Create {activeTab}</h2>
            <textarea 
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={`Write your ${activeTab.toLowerCase()} here...`}
              className="w-full p-4 border border-slate-200 rounded h-24 text-sm"
            />
            <div className="flex justify-end mt-3">
              <button onClick={handlePost} className="bg-schu-teal text-white px-6 py-2 rounded font-black text-[10px] uppercase tracking-widest">Submit to Hub</button>
            </div>
          </div>

          <div className="pt-4">
            {/* VIEW: POSTS / ACTIVITY THREAD */}
            {activeTab === 'POST' || activeTab === 'ASK A QUESTION' ? (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter">My Activity Thread</h3>
                {myActivity.map(post => (
                  <div key={post.id} className="bg-white border-2 border-slate-50 p-6 rounded shadow-sm">
                    <p className="font-bold text-slate-700">{post.text}</p>
                    <div className="mt-3 flex gap-4 text-[10px] font-black text-schu-teal uppercase">
                      <span>❤️ {post.likes} Likes</span>
                      <span>💬 {post.replies.length} Responses</span>
                    </div>
                    {post.replies.map((r, i) => (
                      <div key={i} className="mt-2 ml-4 p-2 bg-slate-50 text-xs italic border-l-2 border-schu-teal">{r}</div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {/* VIEW: EVENTS */}
            {activeTab === 'EVENTS' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter">Upcoming Campus Events</h3>
                {events.map((e, idx) => (
                  <div key={idx} className="bg-white p-6 border-l-4 border-schu-teal shadow-sm rounded">
                    <h4 className="font-black text-slate-800 uppercase">{e.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{e.date} @ {e.time}</p>
                    <p className="text-xs text-slate-500 mt-1 italic">📍 {e.venue}</p>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW: STUDY GROUPS */}
            {activeTab === 'STUDY GROUPS' && (
              <div className="grid grid-cols-2 gap-4">
                {studyGroups.map((g, idx) => (
                  <div key={idx} className="bg-white p-6 border-2 border-slate-100 rounded text-center shadow-sm">
                    <span className="text-3xl block mb-2">🤝</span>
                    <h4 className="font-black text-slate-800">{g.class}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{g.schedule}</p>
                    <p className="text-xs text-schu-teal font-black mt-1 uppercase">{g.loc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW: CLASS REVIEWS */}
            {activeTab === 'CLASS REVIEWS' && (
              <div className="bg-white p-6 border-2 border-slate-50 rounded shadow-sm text-center">
                <div className="text-yellow-400 text-2xl mb-2">⭐⭐⭐⭐⭐</div>
                <h4 className="font-black text-slate-800 uppercase">CECS 491A - Senior Project</h4>
                <p className="text-sm text-slate-600 italic mt-2">"Great professor, very clear expectations for the final project!"</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}