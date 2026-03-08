'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'

type RawCourseRow = Record<string, unknown>

type CourseItem = {
  code: string
  subject: string
  courseNumber: string
  title: string
  units: string
  sectionCount: number
}

type SectionItem = {
  section: string
  class_number: string
  course_code_full: string
  course_title: string
  units: string
  course_info: string
  type: string
  days: string
  time: string
  location: string
  instructor: string
  comment: string
}

const SEMESTER_OPTIONS = [
  { label: 'Spring 2026', table: 'spring_2026' },
  { label: 'Summer 2026', table: 'summer_2026' },
  { label: 'Fall 2026', table: 'fall_2026', disabled: true },
  { label: 'Winter 2027', table: 'winter_2027', disabled: true },
  // Add additional semester tables here, e.g.:
  // { label: 'Fall 2026', table: 'fall_2026' },
]

const SUBJECT_OPTIONS = [
  'AAAS',
  'ACCT',
  'AFRS',
  'AH',
  'AIS',
  'AMST',
  'ANTH',
  'ARAB',
  'ART',
  'ASAM',
  'ASLD',
  'AT',
  'ATHL',
  'AXST_CLASSES',
  'BLAW',
  'BME',
  'C E',
  'CAFF',
  'CBA',
  'CDFS',
  'CECS',
  'CEM',
  'CH E',
  'CHIN',
  'CHLS',
  'CINE',
  'CLA_CLASSES',
  'CLSC',
  'COMM',
  'COUN',
  'CRJU',
  'CWL',
  'DANC',
  'DESN',
  'DPT',
  'E E',
  'ECON',
  'ED P',
  'EDAD',
  'EDCI',
  'EDEC',
  'EDEL',
  'EDLD',
  'EDSE',
  'EDSP',
  'EDSS',
  'EESJ',
  'EMER',
  'ENGR',
  'ENGL',
  'ENV',
  'ES',
  'ES P',
  'ETEC',
  'FIL',
  'FIN',
  'FMD',
  'FREN',
  'FSCI',
  'G S',
  'GBA',
  'GEOG',
  'GERM',
  'GERN',
  'GK',
  'GLST',
  'H SC',
  'HCA',
  'HDEV',
  'HEBW',
  'HIST',
  'HM',
  'HRM',
  'I S',
  'IB',
  'ITAL',
  'JAPN',
  'JOUR',
  'KHMR',
  'KIN',
  'KOR',
  'LAT',
  'LXSTCLASSES',
  'M S',
  'MAE',
  'MGMT',
  'MKTG',
  'MUS',
  'NRSG',
  'NUTR',
  'PPA',
  'REC',
  'S W',
  'SCM',
  'SDHE',
  'SI_CLASSES',
  'SLP',
  'SRL',
  'THEA',
  'UDCP',
  'UHP',
  'UNIV',
] as const

function asText(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text.length ? text : fallback
}

function splitCode(code: string): { subject: string; courseNumber: string } {
  const match = code.match(/^([A-Za-z]+)\s*(.+)$/)
  if (!match) return { subject: '', courseNumber: '' }
  return { subject: match[1].toUpperCase(), courseNumber: match[2].trim() }
}

function courseCodeFromRow(row: RawCourseRow): string {
  const codeRaw =
    asText(row.course_code_full, '') ||
    `${asText(row.subject, '')} ${asText(row.course_number, '')}`.trim() ||
    `${asText(row.subject, '')} ${asText(row.number, '')}`.trim() ||
    asText(row.course_code, '') ||
    asText(row.course, '') ||
    'Unknown Course'
  return codeRaw.replace(/\s+/g, ' ').trim()
}

function sectionSortParts(section: string): [number, string] {
  const normalized = section.trim()
  const match = normalized.match(/^(\d+)(.*)$/)
  if (!match) return [Number.MAX_SAFE_INTEGER, normalized]
  return [Number(match[1]), (match[2] || '').trim()]
}

function normalizeCourses(rows: RawCourseRow[]): CourseItem[] {
  const byCourse = new Map<string, CourseItem>()

  for (const row of rows) {
    const codeRaw =
      asText(row.course_code_full, '') ||
      `${asText(row.subject, '')} ${asText(row.course_number, '')}`.trim() ||
      `${asText(row.subject, '')} ${asText(row.number, '')}`.trim() ||
      asText(row.course_code, '') ||
      asText(row.course, '') ||
      'Unknown Course'
    const code = codeRaw.replace(/\s+/g, ' ').trim()
    const title =
      asText(row.course_title, '') ||
      asText(row.title, '') ||
      'Untitled Course'
    const units = asText(row.units, '')
    const parsed = splitCode(code)

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
      subject: parsed.subject,
      courseNumber: parsed.courseNumber,
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
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [courseCodeFilter, setCourseCodeFilter] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [unitsFilter, setUnitsFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [expandedCourseCode, setExpandedCourseCode] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')

  const courses = useMemo(() => normalizeCourses(rows), [rows])
  const sectionsByCourseCode = useMemo(() => {
    const map = new Map<string, SectionItem[]>()

    for (const row of rows) {
      const code = courseCodeFromRow(row)
      const section: SectionItem = {
        section: asText(row.sec, ''),
        class_number: asText(row.class_number, ''),
        course_code_full: asText(row.course_code_full, code),
        course_title: asText(row.course_title, asText(row.title, 'Untitled Course')),
        units: asText(row.units, ''),
        course_info: asText(row.course_info, ''),
        type: asText(row.type, ''),
        days: asText(row.days, ''),
        time: asText(row.time, ''),
        location: asText(row.location, ''),
        instructor: asText(row.instructor, ''),
        comment: asText(row.comment, ''),
      }

      const current = map.get(code) ?? []
      current.push(section)
      map.set(code, current)
    }

    for (const [code, sectionList] of map.entries()) {
      sectionList.sort((a, b) => {
        const [aNum, aSuffix] = sectionSortParts(a.section)
        const [bNum, bSuffix] = sectionSortParts(b.section)

        if (aNum !== bNum) return aNum - bNum
        if (aSuffix !== bSuffix) return aSuffix.localeCompare(bSuffix)

        const aClass = Number.parseInt(a.class_number, 10)
        const bClass = Number.parseInt(b.class_number, 10)
        const aClassSafe = Number.isNaN(aClass) ? Number.MAX_SAFE_INTEGER : aClass
        const bClassSafe = Number.isNaN(bClass) ? Number.MAX_SAFE_INTEGER : bClass

        return aClassSafe - bClassSafe
      })

      map.set(code, sectionList)
    }

    return map
  }, [rows])

  const filteredCourses = useMemo(() => {
    const codeQuery = courseCodeFilter.trim().toLowerCase()
    const titleQuery = titleFilter.trim().toLowerCase()
    const unitsQuery = unitsFilter.trim().toLowerCase()

    return courses.filter((course) => {
      const matchesSubject = subjectFilter === 'all' || course.subject === subjectFilter
      const matchesCode =
        !codeQuery ||
        course.code.toLowerCase().includes(codeQuery) ||
        course.courseNumber.toLowerCase().includes(codeQuery)
      const matchesTitle = !titleQuery || course.title.toLowerCase().includes(titleQuery)
      const matchesUnits = !unitsQuery || course.units.toLowerCase().includes(unitsQuery)

      return (
        matchesSubject &&
        matchesCode &&
        matchesTitle &&
        matchesUnits
      )
    })
  }, [courses, courseCodeFilter, subjectFilter, titleFilter, unitsFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize))
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredCourses.slice(start, start + pageSize)
  }, [currentPage, filteredCourses, pageSize])

  const visiblePages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
    return Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  }, [currentPage, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [subjectFilter, courseCodeFilter, titleFilter, unitsFilter, semesterTable, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

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
      setExpandedCourseCode(null)
      if (allRows.length === 0) {
        setError(
          `Table "${semesterTable}" returned 0 rows. Confirm the table name and anon SELECT policy (RLS) in Supabase.`
        )
      }
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

  const addSectionToCart = async (section: SectionItem) => {
    setSaveMessage('')
    const key = `${section.course_code_full}|${section.class_number}|${section.section}`
    setSavingKey(key)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)

      const user = authData.user
      if (!user) {
        throw new Error('You must be logged in to add courses to your cart.')
      }

      const payload = {
        user_id: user.id,
        term_table: semesterTable,
        section: section.section,
        class_number: section.class_number,
        course_code_full: section.course_code_full,
        course_title: section.course_title,
        units: section.units,
        course_info: section.course_info,
        type: section.type,
        days: section.days,
        time: section.time,
        location: section.location,
        instructor: section.instructor,
        comment: section.comment,
      }

      const { error: insertError } = await supabase.from('shopping_cart').insert(payload)
      if (insertError) throw new Error(insertError.message)

      setSaveMessage(`Added ${section.course_code_full} (section ${section.section}) to cart.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add course to cart.'
      setSaveMessage(`Cart error: ${message}`)
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-black p-4 md:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-blue-700">Course Search</h1>
          <p className="text-slate-700">
            Set filters, then load a semester and browse matching courses.
          </p>
        </header>

        <section className="bg-white border rounded-2xl shadow-sm p-4 md:p-5 space-y-3">
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
                  <option key={option.table} value={option.table} disabled={option.disabled}>
                    {option.label}{option.disabled ? ' (Coming Soon)' : ''}
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

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="subjectFilter" className="block text-sm font-medium text-slate-700 mb-1">
                Subject
              </label>
              <select
                id="subjectFilter"
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                disabled={loading}
              >
                <option value="all">All subjects</option>
                {SUBJECT_OPTIONS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="unitsFilter" className="block text-sm font-medium text-slate-700 mb-1">
                Units
              </label>
              <select
                id="unitsFilter"
                value={unitsFilter}
                onChange={(event) => setUnitsFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                disabled={loading}
              >
                <option value="">All units</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </select>
            </div>

            <div>
              <label htmlFor="courseCodeFilter" className="block text-sm font-medium text-slate-700 mb-1">
                Course code
              </label>
              <input
                id="courseCodeFilter"
                type="text"
                value={courseCodeFilter}
                onChange={(event) => setCourseCodeFilter(event.target.value)}
                placeholder="e.g. 342 or 123"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="titleFilter" className="block text-sm font-medium text-slate-700 mb-1">
                Course title
              </label>
              <input
                id="titleFilter"
                type="text"
                value={titleFilter}
                onChange={(event) => setTitleFilter(event.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              Error loading courses: {error}
            </p>
          )}

          {saveMessage && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-3 py-2 text-sm">
              {saveMessage}
            </p>
          )}
        </section>

        <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b px-4 py-3 text-sm text-slate-700">
            {loaded ? (
              <>
                Showing <span className="font-semibold">{paginatedCourses.length}</span> of{' '}
                <span className="font-semibold">{courses.length}</span> courses
              </>
            ) : (
              'Load a semester to see available courses.'
            )}
          </div>

          <div className="divide-y">
            {paginatedCourses.map((course) => (
              <article key={course.code} className="px-4 py-2">
                <button
                  type="button"
                  className="w-full rounded-lg p-2 text-left hover:bg-slate-50"
                  onClick={() =>
                    setExpandedCourseCode((prev) => (prev === course.code ? null : course.code))
                  }
                >
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h2 className="font-semibold text-slate-900">{course.code}</h2>
                    <div className="text-sm text-slate-600">
                      {course.units} units • {course.sectionCount} section
                      {course.sectionCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <p className="text-slate-700 mt-1">{course.title}</p>
                </button>

                {expandedCourseCode === course.code && (
                  <div className="mt-2">
                    <div className="mb-2 text-sm font-medium text-slate-700">
                      Sections ({sectionsByCourseCode.get(course.code)?.length ?? 0})
                    </div>

                    <div className="flex flex-col gap-3">
                      {(sectionsByCourseCode.get(course.code) ?? []).map((section, idx) => (
                        <div key={`${course.code}-${section.class_number}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="mb-2 text-sm font-semibold text-slate-800">
                            Section {section.section || 'N/A'} • Class #{section.class_number || 'N/A'}
                          </div>
                          <div className="grid gap-2 lg:grid-cols-3 text-sm">
                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Code</p><p className="text-slate-800 break-words">{section.course_code_full}</p></div>
                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Type</p><p className="text-slate-800 break-words">{section.type}</p></div>
                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Location</p><p className="text-slate-800 break-words">{section.location}</p></div>

                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Title</p><p className="text-slate-800 break-words">{section.course_title}</p></div>
                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Info</p><p className="text-slate-800 break-words">{section.course_info}</p></div>
                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Days</p><p className="text-slate-800 break-words">{section.days}</p></div>

                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Units</p><p className="text-slate-800 break-words">{section.units}</p></div>
                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Instructor</p><p className="text-slate-800 break-words">{section.instructor}</p></div>
                            <div className="rounded bg-slate-50 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-500">Time</p><p className="text-slate-800 break-words">{section.time}</p></div>
                          </div>

                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => addSectionToCart(section)}
                              disabled={savingKey === `${section.course_code_full}|${section.class_number}|${section.section}`}
                              className="rounded bg-emerald-600 px-3 py-1.5 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {savingKey === `${section.course_code_full}|${section.class_number}|${section.section}`
                                ? 'Adding...'
                                : 'Add to Shopping Cart'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}

            {loaded && !loading && courses.length === 0 && (
              <p className="px-4 py-6 text-slate-600">
                No rows were returned from <span className="font-semibold">{semesterTable}</span>.
              </p>
            )}

            {loaded && !loading && courses.length > 0 && filteredCourses.length === 0 && (
              <p className="px-4 py-6 text-slate-600">No courses matched your search.</p>
            )}
          </div>

          {loaded && filteredCourses.length > 0 && (
            <div className="border-t px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span>Courses per page:</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded border border-slate-300 px-2 py-1 bg-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Prev
                </button>

                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`rounded border px-3 py-1 text-sm ${
                      page === currentPage
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 text-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
