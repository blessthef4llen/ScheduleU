"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { loadStoredJson, saveStoredJson } from '@/lib/browserStorage';

type HubTab = 'POST' | 'EVENTS' | 'STUDY GROUPS' | 'CLASS REVIEWS' | 'ASK A QUESTION'

type HubPost = {
  id: number
  tab: HubTab
  text: string
  likes: number
  replies: string[]
}

const POSTS_KEY = 'scheduleu.socialHub.posts'

const defaultPosts: HubPost[] = [
  {
    id: 1,
    tab: 'ASK A QUESTION',
    text: 'Is anyone selling grad tickets for engineering 2?',
    likes: 3,
    replies: ['I have 2 extra!', 'Check the Marketplace row.'],
  },
  {
    id: 2,
    tab: 'CLASS REVIEWS',
    text: 'CECS 491A Review: 5/5 stars. The professor is nice!',
    likes: 10,
    replies: ['I agree!', 'Super helpful for senior project.'],
  },
]

export default function SocialHubPage() {
  const [activeTab, setActiveTab] = useState<HubTab>('POST');
  const [newContent, setNewContent] = useState('');
  const [posts, setPosts] = useState<HubPost[]>(defaultPosts);

  const events = [
    {
      name: 'Beach Women in Engineering Conference',
      date: '4/10/2026',
      time: '9:00am - 3:30pm',
      venue: 'LB Airport Marriott, 4700 Airport Plaza Dr.',
      desc: 'Networking and workshops for engineering students.',
    },
    { name: 'Engineering 1 Graduation', date: 'May 21st', time: '8:00am', venue: 'CSULB Campus', desc: 'Morning graduation ceremony.' },
    { name: 'Engineering 2 Graduation', date: 'May 21st', time: '1:30pm', venue: 'CSULB Campus', desc: 'Afternoon graduation ceremony.' },
  ];

  const studyGroups = [
    { class: 'CECS 451', schedule: 'Tuesdays 3:00pm - 5:00pm', loc: 'Library' },
    { class: 'CECS 329', schedule: 'Thursdays 9:00am - 10:00am', loc: 'Horn Center' },
  ];

  useEffect(() => {
    setPosts(loadStoredJson<HubPost[]>(POSTS_KEY, defaultPosts));
  }, []);

  useEffect(() => {
    saveStoredJson(POSTS_KEY, posts);
  }, [posts]);

  const visiblePosts = useMemo(() => {
    if (activeTab === 'POST') {
      return posts.filter((post) => post.tab === 'POST' || post.tab === 'ASK A QUESTION' || post.tab === 'CLASS REVIEWS');
    }
    return posts.filter((post) => post.tab === activeTab);
  }, [activeTab, posts]);

  const handlePost = () => {
    if (!newContent.trim()) return;

    const nextPost: HubPost = {
      id: Date.now(),
      tab: activeTab,
      text: newContent.trim(),
      likes: 0,
      replies: [],
    };

    setPosts((prev) => [nextPost, ...prev]);
    setNewContent('');
  };

  return (
    <div className="min-h-screen font-sans text-[var(--text-primary)]">
      <header className="flex items-center justify-between bg-schu-teal px-4 py-3 shadow-md sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight">ScheduleU</Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated)] font-black text-schu-teal">BH</div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
        <aside className="lg:col-span-3">
          <div className="bg-schu-teal p-2 text-center text-xs font-bold uppercase text-white">Directory</div>
          <div className="border-2 border-[var(--border-soft)] bg-[var(--bg-elevated)]">
            {(['POST', 'EVENTS', 'STUDY GROUPS', 'CLASS REVIEWS', 'ASK A QUESTION'] as HubTab[]).map((item) => (
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

        <section className="space-y-6 lg:col-span-9">
          {activeTab !== 'EVENTS' && activeTab !== 'STUDY GROUPS' ? (
            <div className="rounded-2xl border-2 border-[var(--border-soft)] bg-[var(--bg-soft)] p-4 sm:p-6">
              <h2 className="mb-4 text-xs font-black uppercase text-[var(--text-muted)]">Create {activeTab}</h2>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={`Write your ${activeTab.toLowerCase()} here...`}
                className="h-24 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-primary)]"
              />
              <div className="mt-3 flex justify-end">
                <button onClick={handlePost} className="rounded bg-schu-teal px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white">Submit to Hub</button>
              </div>
            </div>
          ) : null}

          <div className="pt-4">
            {(activeTab === 'POST' || activeTab === 'ASK A QUESTION' || activeTab === 'CLASS REVIEWS') ? (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Community Feed</h3>
                {visiblePosts.map((post) => (
                  <div key={post.id} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-4 shadow-sm sm:p-6">
                    <p className="font-bold text-[var(--text-primary)]">{post.text}</p>
                    <div className="mt-3 flex gap-4 text-[10px] font-black uppercase text-schu-teal">
                      <span>❤️ {post.likes} Likes</span>
                      <span>💬 {post.replies.length} Responses</span>
                    </div>
                    {post.replies.map((reply, index) => (
                      <div key={index} className="mt-2 ml-2 border-l-2 border-schu-teal bg-[var(--bg-soft)] p-2 text-xs italic sm:ml-4">{reply}</div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === 'EVENTS' && (
              <div className="space-y-4">
                <h3 className="text-xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Upcoming Campus Events</h3>
                {events.map((event, idx) => (
                  <div key={idx} className="rounded-2xl border-l-4 border-schu-teal bg-[var(--bg-elevated)] p-4 shadow-sm sm:p-6">
                    <h4 className="font-black uppercase text-[var(--text-strong)]">{event.name}</h4>
                    <p className="mt-1 text-[10px] font-bold uppercase text-[var(--text-muted)]">{event.date} @ {event.time}</p>
                    <p className="mt-1 text-xs italic text-[var(--text-secondary)]">📍 {event.venue}</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{event.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'STUDY GROUPS' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {studyGroups.map((group, idx) => (
                  <div key={idx} className="rounded-2xl border-2 border-[var(--border-soft)] bg-[var(--bg-elevated)] p-6 text-center shadow-sm">
                    <span className="mb-2 block text-3xl">🤝</span>
                    <h4 className="font-black text-[var(--text-strong)]">{group.class}</h4>
                    <p className="mt-1 text-[10px] font-bold uppercase text-[var(--text-muted)]">{group.schedule}</p>
                    <p className="mt-1 text-xs font-black uppercase text-schu-teal">{group.loc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
