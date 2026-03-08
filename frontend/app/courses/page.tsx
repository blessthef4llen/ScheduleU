'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'

type RawCourseRow = Record<string, unknown>

type CourseItem = {
  code: string
  title: string
  units: string
  sectionCount: number
}

const SEMESTER_OPTIONS = [
  { label: 'Spring 2026', table: 'spring_2026' },
  // Add additional semester tables here, e.g.:
  // { label: 'Fall 2026', table: 'fall_2026' },
]

function asText(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text.length ? text : fallback
}

function normalizeCourses(rows: RawCourseRow[]): CourseItem[] {
  const byCourse = new Map<string, CourseItem>()

  for (const row of rows) {
    const code =
      asText(row.course_code_full, '') ||
      `${asText(row.subject, '')} ${asText(row.number, '')}`.trim() ||
      asText(row.course_code, '') ||
      asText(row.course, '') ||
      'Unknown Course'
    const title =
      asText(row.course_title, '') ||
      asText(row.title, '') ||
      'Untitled Course'
    const units = asText(row.units, '')

    const existing = byCourse.get(code)
    if (existing) {
      existing.sectionCount += 1
      if (existing.title === 'Untitled Course' && title !== 'Untitled Course') {
        existing.title = title
      }
      if (existing.units === 'N/A' && units !== 'N/A') {
        existing.units = units
      }
      continue
    }

    byCourse.set(code, {
      code,
      title,
      units,
      sectionCount: 1,
    })
  }

  return Array.from(byCourse.values()).sort((a, b) => a.code.localeCompare(b.code))
}

export default function CoursesPage() {
  const [semesterTable, setSemesterTable] = useState(SEMESTER_OPTIONS[0].table)
  const [rows, setRows] = useState<RawCourseRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const courses = useMemo(() => normalizeCourses(rows), [rows])

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return courses
    return courses.filter((course) => {
      return (
        course.code.toLowerCase().includes(query) ||
        course.title.toLowerCase().includes(query)
      )
    })
  }, [courses, search])

  const loadCourses = async () => {
    setLoading(true)
    setError('')

    try {
      // Direct semester-table query (e.g., spring_2026, fall_2026).
      const pageSize = 1000
      let from = 0
      let allRows: RawCourseRow[] = []

      while (true) {
        const { data, error: queryError } = await supabase
          .from(semesterTable)
          .select('*')
          .range(from, from + pageSize - 1)

        if (queryError) {
          throw new Error(queryError.message)
        }

        const page = data ?? []
        allRows = allRows.concat(page)

        if (page.length < pageSize) break
        from += pageSize

        // Guard rail to avoid runaway queries if the table is very large.
        if (from > 50000) break
      }

      setRows(allRows)
      setLoaded(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load courses.'
      setError(message)
      setRows([])
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-black p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-blue-700">Course Search</h1>
          <p className="text-slate-700">
            Load a semester to browse all available courses, then search by course code or title.
          </p>
        </header>

        <section className="bg-white border rounded-2xl shadow-sm p-4 md:p-6 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-slate-700 mb-1">
                Semester
              </label>
              <select
                id="semester"
                value={semesterTable}
                onChange={(event) => setSemesterTable(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {SEMESTER_OPTIONS.map((option) => (
                  <option key={option.table} value={option.table}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadCourses}
              disabled={loading}
              className="rounded-lg bg-blue-600 text-white font-semibold px-5 py-2.5 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Load Courses'}
            </button>
          </div>

          <div>
            <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-1">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. CECS 342 or Data Structures"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              disabled={!loaded || loading}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              Error loading courses: {error}
            </p>
          )}
        </section>

        <section className="bg-white border rounded-2xl shadow-sm">
          <div className="border-b px-4 py-3 text-sm text-slate-700">
            {loaded ? (
              <>
                Showing <span className="font-semibold">{filteredCourses.length}</span> of{' '}
                <span className="font-semibold">{courses.length}</span> courses
              </>
            ) : (
              'Load a semester to see available courses.'
            )}
          </div>

          <div className="divide-y">
            {filteredCourses.map((course) => (
              <article key={course.code} className="px-4 py-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <h2 className="font-semibold text-slate-900">{course.code}</h2>
                  <div className="text-sm text-slate-600">
                    {course.units} units • {course.sectionCount} section
                    {course.sectionCount === 1 ? '' : 's'}
                  </div>
                </div>
                <p className="text-slate-700 mt-1">{course.title}</p>
              </article>
            ))}

            {loaded && !loading && filteredCourses.length === 0 && (
              <p className="px-4 py-6 text-slate-600">No courses matched your search.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
