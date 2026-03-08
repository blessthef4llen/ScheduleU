'use client'

import Link from 'next/link'

const LINKS = [
  {
    href: '/courses',
    title: 'Course Search',
    description: 'Browse course offerings, filter by subject/course number, and add sections to cart.',
  },
  {
    href: '/schedule-builder',
    title: 'Schedule Builder',
    description: 'Generate a conflict-aware schedule from shopping cart or manual course selections.',
  },
  {
    href: '/profile',
    title: 'Profile',
    description: 'Update major and graduation year information.',
  },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-black p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl border bg-white p-5">
          <h1 className="text-3xl font-bold text-indigo-700">Dashboard</h1>
          <p className="mt-1 text-slate-700">
            Temporary navigation hub for ScheduleU pages.
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-300 bg-slate-100 p-4 transition-all hover:border-indigo-400 hover:bg-indigo-100 hover:shadow-sm"
            >
              <h2 className="font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-700">{item.description}</p>
              <p className="mt-2 text-xs text-indigo-700 font-medium">{item.href}</p>
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
