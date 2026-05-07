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
    <div className="min-h-screen font-sans text-[var(--text-primary)]">
      <header className="flex items-center justify-between bg-schu-teal px-4 py-3 shadow-md sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight">ScheduleU</Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated)] font-black text-schu-teal">BH</div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
        {/* SIDEBAR DIRECTORY */}
        <aside className="lg:col-span-3">
          <div className="bg-schu-teal text-white font-bold p-2 text-center text-xs uppercase">Directory</div>
          <div className="border-2 bg-[var(--bg-elevated)] border-[var(--border-soft)]">
            {['POST', 'EVENTS', 'STUDY GROUPS', 'CLASS REVIEWS', 'ASK A QUESTION'].map((item) => (
              <button 
                key={item} 
                onClick={() => setActiveTab(item)}
                className={`w-full border-b px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest last:border-0 border-[var(--border-soft)] ${activeTab === item ? 'border-l-4 border-l-schu-teal bg-[var(--bg-soft)] text-schu-teal' : 'text-[var(--text-muted)]'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        {/* DYNAMIC CONTENT AREA */}
        <section className="space-y-6 lg:col-span-9">
          <div className="rounded-2xl border-2 p-4 sm:p-6 bg-[var(--bg-soft)] border-[var(--border-soft)]">
            <h2 className="mb-4 text-xs font-black uppercase text-[var(--text-muted)]">Create {activeTab}</h2>
            <textarea 
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={`Write your ${activeTab.toLowerCase()} here...`}
              className="h-24 w-full rounded-xl border p-4 text-sm bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
            />
            <div className="flex justify-end mt-3">
              <button onClick={handlePost} className="bg-schu-teal text-white px-6 py-2 rounded font-black text-[10px] uppercase tracking-widest">Submit to Hub</button>
            </div>
          </div>

          <div className="pt-4">
            {/* VIEW: POSTS / ACTIVITY THREAD */}
            {activeTab === 'POST' || activeTab === 'ASK A QUESTION' ? (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-strong)]">My Activity Thread</h3>
                {myActivity.map(post => (
                  <div key={post.id} className="rounded-2xl border p-4 shadow-sm sm:p-6 bg-[var(--bg-elevated)] border-[var(--border-soft)]">
                    <p className="font-bold text-[var(--text-primary)]">{post.text}</p>
                    <div className="mt-3 flex gap-4 text-[10px] font-black text-schu-teal uppercase">
                      <span>❤️ {post.likes} Likes</span>
                      <span>💬 {post.replies.length} Responses</span>
                    </div>
                    {post.replies.map((r, i) => (
                      <div key={i} className="mt-2 ml-2 border-l-2 border-schu-teal bg-[var(--bg-soft)] p-2 text-xs italic sm:ml-4">{r}</div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {/* VIEW: EVENTS */}
            {activeTab === 'EVENTS' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Upcoming Campus Events</h3>
                {events.map((e, idx) => (
                  <div key={idx} className="rounded-2xl border-l-4 border-schu-teal p-4 shadow-sm sm:p-6 bg-[var(--bg-elevated)]">
                    <h4 className="font-black uppercase text-[var(--text-strong)]">{e.name}</h4>
                    <p className="mt-1 text-[10px] font-bold uppercase text-[var(--text-muted)]">{e.date} @ {e.time}</p>
                    <p className="mt-1 text-xs italic text-[var(--text-secondary)]">📍 {e.venue}</p>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW: STUDY GROUPS */}
            {activeTab === 'STUDY GROUPS' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {studyGroups.map((g, idx) => (
                  <div key={idx} className="rounded-2xl border-2 p-6 text-center shadow-sm bg-[var(--bg-elevated)] border-[var(--border-soft)]">
                    <span className="text-3xl block mb-2">🤝</span>
                    <h4 className="font-black text-[var(--text-strong)]">{g.class}</h4>
                    <p className="mt-1 text-[10px] font-bold uppercase text-[var(--text-muted)]">{g.schedule}</p>
                    <p className="text-xs text-schu-teal font-black mt-1 uppercase">{g.loc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW: CLASS REVIEWS */}
            {activeTab === 'CLASS REVIEWS' && (
              <div className="rounded-2xl border-2 p-6 text-center shadow-sm bg-[var(--bg-elevated)] border-[var(--border-soft)]">
                <div className="text-yellow-400 text-2xl mb-2">⭐⭐⭐⭐⭐</div>
                <h4 className="font-black uppercase text-[var(--text-strong)]">CECS 491A - Senior Project</h4>
                <p className="mt-2 text-sm italic text-[var(--text-secondary)]">"Great professor, very clear expectations for the final project!"</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
