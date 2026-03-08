'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'

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
  'ACCT',
  'AFRS',
  'ASLD',
  'AIS',
  'AMST',
  'ANTH',
  'ARAB',
  'ART',
  'AH',
  'AAAS',
  'ASAM',
  'A/ST',
  'ASTR',
  'AT',
  'ATHL',
  'BIOL',
  'BME',
  'BLAW',
  'CBA',
  'OLNE',
  'KHMR',
  'CH E',
  'CHEM',
  'CHLS',
  'CDFS',
  'CHIN',
  'CINE',
  'C E',
  'CLSC',
  'COMM',
  'CWL',
  'CECS',
  'XYZ',
  'CEM',
  'CAFF',
  'COUN',
  'CRJU',
  'DANC',
  'DESN',
  'DPT',
  'ERTH',
  'ECON',
  'EDLD',
  'EDCI',
  'EDEC',
  'EDEL',
  'EDSE',
  'EDSS',
  'EDSP',
  'EDAD',
  'ED P',
  'ETEC',
  'E E',
  'EMER',
  'ENGR',
  'E T',
  'ENGL',
  'ES',
  'ENV',
  'ES P',
  'EESJ',
  'FMD',
  'FIL',
  'FIN',
  'FSCI',
  'FREN',
  'GEOG',
  'GERM',
  'GERN',
  'GLST',
  'GBA',
  'GK',
  'HCA',
  'H SC',
  'HEBW',
  'HIST',
  'HM',
  'HDEV',
  'HRM',
  'I S',
  'IB',
  'INTL',
  'ITAL',
  'JAPN',
  'JOUR',
  'KIN',
  'KOR',
  'LAT',
  'C/LA',
  'L/ST',
  'LING',
  'MGMT',
  'MKTG',
  'MATH',
  'MTED',
  'MAE',
  'M S',
  'MUS',
  'NSCI',
  'NRSG',
  'NUTR',
  'PHIL',
  'PHSC',
  'PHYS',
  'POSC',
  'PSY',
  'PPA',
  'REC',
  'R/ST',
  'RGR',
  'RUSS',
  'SCED',
  'S W',
  'SOC',
  'SPAN',
  'SLP',
  'STAT',
  'SDHE',
  'SRL',
  'S/I',
  'SCM',
  'THEA',
  'TRST',
  'UNIV',
  'UHP',
  'UDCP',
  'VIET',
  'WGSS',
] as const

function asText(value: unknown, fallback = 'N/A'): string {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text.length ? text : fallback
}

function splitCode(code: string): { subject: string; courseNumber: string } {
  const match = code.trim().match(/^([A-Za-z_]+)\s*[-]?\s*(.+)$/)
  if (!match) return { subject: '', courseNumber: '' }
  return { subject: match[1].toUpperCase(), courseNumber: match[2].trim() }
}

function normalizeCourseNumber(subject: string, courseNumber: string): string {
  const normalizedSubject = subject.trim().toUpperCase()
  const normalizedNumber = courseNumber.trim()
  if (normalizedSubject === 'UHP') {
    return normalizedNumber.replace(/H$/i, '')
  }
  return normalizedNumber
}

function normalizeCourseCode(rawCode: string): string {
  const cleaned = rawCode.replace(/\s+/g, ' ').trim()
  const { subject, courseNumber } = splitCode(cleaned)
  if (!subject || !courseNumber) return cleaned
  return `${subject} ${normalizeCourseNumber(subject, courseNumber)}`.trim()
}

function courseCodeFromRow(row: RawCourseRow): string {
  const codeRaw =
    asText(row.course_code_full, '') ||
    `${asText(row.subject, '')} ${asText(row.course_number, '')}`.trim() ||
    `${asText(row.subject, '')} ${asText(row.number, '')}`.trim() ||
    asText(row.course_code, '') ||
    asText(row.course, '') ||
    'Unknown Course'
  return normalizeCourseCode(codeRaw)
}

function sectionSortParts(section: string): [number, string] {
  const normalized = section.trim()
  const match = normalized.match(/^(\d+)(.*)$/)
  if (!match) return [Number.MAX_SAFE_INTEGER, normalized]
  return [Number(match[1]), (match[2] || '').trim()]
}

function isHonorsCourse(subject: string, courseNumber: string): boolean {
  return subject.trim().toUpperCase() === 'UHP' || /H$/i.test(courseNumber.trim())
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
    const code = normalizeCourseCode(codeRaw)
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
      courseNumber: normalizeCourseNumber(parsed.subject, parsed.courseNumber),
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
  const [honorsOnly, setHonorsOnly] = useState(false)
  const [courseNumberOptions, setCourseNumberOptions] = useState<string[]>([])
  const [loadingCourseNumbers, setLoadingCourseNumbers] = useState(false)
  const [courseNumberLoadError, setCourseNumberLoadError] = useState('')
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
      const matchesSubject =
        subjectFilter === 'all' ||
        (subjectFilter === 'UHP' ? course.subject === 'UHP' : course.subject === subjectFilter)
      const matchesCode =
        !codeQuery || course.courseNumber.toLowerCase() === codeQuery
      const matchesTitle = !titleQuery || course.title.toLowerCase().includes(titleQuery)
      const matchesUnits = !unitsQuery || course.units.toLowerCase().includes(unitsQuery)
      const matchesHonors =
        subjectFilter === 'UHP' || !honorsOnly || isHonorsCourse(course.subject, course.courseNumber)

      return (
        matchesSubject &&
        matchesCode &&
        matchesTitle &&
        matchesUnits &&
        matchesHonors
      )
    })
  }, [courses, courseCodeFilter, honorsOnly, subjectFilter, titleFilter, unitsFilter])

  useEffect(() => {
    const loadCourseNumbersForSubject = async () => {
      setCourseCodeFilter('')
      setCourseNumberOptions([])
      setCourseNumberLoadError('')

      if (subjectFilter === 'all' || !semesterTable) return

      setLoadingCourseNumbers(true)
      try {
        const subjectUpper = subjectFilter.trim().toUpperCase()
        const [{ data: bySubject, error: bySubjectError }, { data: byCode, error: byCodeError }] =
          await Promise.all([
            supabase
              .from(semesterTable)
              .select('subject,course_number,course_code_full')
              .eq('subject', subjectUpper)
              .limit(5000),
            supabase
              .from(semesterTable)
              .select('subject,course_number,course_code_full')
              .ilike('course_code_full', `${subjectUpper}%`)
              .limit(5000),
          ])

        if (bySubjectError) throw new Error(bySubjectError.message)
        if (byCodeError) throw new Error(byCodeError.message)

        const mergedRows = [...(bySubject ?? []), ...(byCode ?? [])]
        const deduped = new Map<string, Record<string, unknown>>()
        for (const row of mergedRows) {
          const key = `${String((row as Record<string, unknown>).subject ?? '')}|${String((row as Record<string, unknown>).course_number ?? '')}|${String((row as Record<string, unknown>).course_code_full ?? '')}`
          deduped.set(key, row as Record<string, unknown>)
        }
        const numbers = new Set<string>()
        for (const row of deduped.values()) {
          const rowSubject = String((row as Record<string, unknown>).subject ?? '')
            .trim()
            .toUpperCase()
          const codeFull = String((row as Record<string, unknown>).course_code_full ?? '')
            .trim()
            .toUpperCase()
          const parsedFromCode = splitCode(codeFull)
          const codeSubject = parsedFromCode.subject
          const codeNumber = parsedFromCode.courseNumber

          const belongsToSubject =
            subjectFilter === 'UHP'
              ? rowSubject === 'UHP' || codeSubject === 'UHP'
              : rowSubject === subjectUpper || codeSubject === subjectUpper
          if (!belongsToSubject) continue

          const number =
            String((row as Record<string, unknown>).course_number ?? '').trim() ||
            codeNumber

          if (!number) continue
          const normalizedNumber = normalizeCourseNumber(subjectFilter, number)
          if (!normalizedNumber) continue
          if (honorsOnly && subjectFilter !== 'UHP' && !/H$/i.test(normalizedNumber)) continue
          numbers.add(normalizedNumber)
        }

        setCourseNumberOptions(
          Array.from(numbers).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
          )
        )
      } catch (err) {
        setCourseNumberOptions([])
        setCourseNumberLoadError(
          err instanceof Error ? `Could not load course numbers: ${err.message}` : 'Could not load course numbers.'
        )
      } finally {
        setLoadingCourseNumbers(false)
      }
    }

    void loadCourseNumbersForSubject()
  }, [honorsOnly, semesterTable, subjectFilter])

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
  }, [subjectFilter, courseCodeFilter, titleFilter, unitsFilter, honorsOnly, semesterTable, pageSize])

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
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-blue-700">Course Search</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                title="Back to dashboard"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 10.5L12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                </svg>
              </Link>
              <Link
                href="/schedule-builder"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Open Schedule Builder
              </Link>
            </div>
          </div>
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
                Course Number
              </label>
              <select
                id="courseCodeFilter"
                value={courseCodeFilter}
                onChange={(event) => setCourseCodeFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                disabled={loading || subjectFilter === 'all' || loadingCourseNumbers}
              >
                <option value="">
                  {subjectFilter === 'all'
                    ? 'Pick subject first'
                    : loadingCourseNumbers
                      ? 'Loading course numbers...'
                      : 'Select course number'}
                </option>
                {courseNumberOptions.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
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

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                id="honorsOnly"
                type="checkbox"
                checked={honorsOnly}
                onChange={(event) => setHonorsOnly(event.target.checked)}
                className="h-4 w-4"
                disabled={loading}
              />
              <label htmlFor="honorsOnly" className="text-sm font-medium text-slate-700">
                Honors only (UHP or course number ending in H)
              </label>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              Error loading courses: {error}
            </p>
          )}

          {courseNumberLoadError && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-sm">
              {courseNumberLoadError}
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
                <span className="font-semibold">{filteredCourses.length}</span> courses
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
                  className="w-full rounded-lg p-2 text-left transition-colors hover:bg-slate-200 focus-visible:bg-slate-200"
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
                        <div key={`${course.code}-${section.class_number}-${idx}`} className="rounded-lg border border-slate-300 bg-slate-50 p-3 transition-all hover:border-slate-400 hover:shadow-sm">
                          <div className="mb-2 text-sm font-semibold text-slate-800">
                            Section {section.section || 'N/A'} • Class #{section.class_number || 'N/A'}
                          </div>
                          <div className="grid gap-2 lg:grid-cols-3 text-sm">
                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Code</p><p className="text-slate-900 break-words">{section.course_code_full}</p></div>
                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Type</p><p className="text-slate-900 break-words">{section.type}</p></div>
                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Location</p><p className="text-slate-900 break-words">{section.location}</p></div>

                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Title</p><p className="text-slate-900 break-words">{section.course_title}</p></div>
                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Info</p><p className="text-slate-900 break-words">{section.course_info}</p></div>
                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Days</p><p className="text-slate-900 break-words">{section.days}</p></div>

                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Units</p><p className="text-slate-900 break-words">{section.units}</p></div>
                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Instructor</p><p className="text-slate-900 break-words">{section.instructor}</p></div>
                            <div className="rounded border border-slate-300 bg-slate-200 px-2 py-1.5"><p className="text-xs uppercase tracking-wide text-slate-600">Time</p><p className="text-slate-900 break-words">{section.time}</p></div>
                          </div>

                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => addSectionToCart(section)}
                              disabled={savingKey === `${section.course_code_full}|${section.class_number}|${section.section}`}
                              className="rounded bg-emerald-600 px-3 py-1.5 text-white text-sm font-medium transition-colors hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed"
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
