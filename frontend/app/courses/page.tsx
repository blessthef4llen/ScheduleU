// Courses page for ScheduleU.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { ProfessorRatingBadge } from '@/components/ProfessorRatingBadge'
import HeaderMenu from '@/components/HeaderMenu'
import Link from 'next/link'
import { isSectionWatched, removeWatchlistItem, saveWatchlistItem } from '@/lib/watchlist'

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
  status: string
  openSeats: string
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

function parseStartHour(timeRange: string): number | null {
  const match = timeRange.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
  if (!match) return null

  let hour = Number(match[1])
  const suffix = match[3].toUpperCase()
  if (suffix === 'AM' && hour === 12) hour = 0
  if (suffix === 'PM' && hour !== 12) hour += 12
  return Number.isFinite(hour) ? hour : null
}

function matchesTimeWindow(timeRange: string, timeFilter: string): boolean {
  if (!timeFilter) return true
  const startHour = parseStartHour(timeRange)
  if (timeFilter === 'tba') return startHour === null
  if (startHour === null) return false
  if (timeFilter === 'morning') return startHour < 12
  if (timeFilter === 'afternoon') return startHour >= 12 && startHour < 17
  if (timeFilter === 'evening') return startHour >= 17
  return true
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
  const menuItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/schedule-builder', label: 'Schedule Builder' },
    { href: '/watchlist', label: 'Watchlist' },
    { href: '/user-profile', label: 'Profile' },
    { href: '/profile', label: 'Settings' },
  ]

  const [semesterTable, setSemesterTable] = useState(SEMESTER_OPTIONS[0].table)
  const [rows, setRows] = useState<RawCourseRow[]>([])
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [courseCodeFilter, setCourseCodeFilter] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [unitsFilter, setUnitsFilter] = useState('')
  const [instructorFilter, setInstructorFilter] = useState('')
  const [timeFilter, setTimeFilter] = useState('')
  const [geKeywordFilter, setGeKeywordFilter] = useState('')
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
  const [watchingKey, setWatchingKey] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [watchedKeys, setWatchedKeys] = useState<string[]>([])

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
        status: asText(row.status, ''),
        openSeats: asText(row.open_seats, ''),
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
    const instructorQuery = instructorFilter.trim().toLowerCase()
    const geQuery = geKeywordFilter.trim().toLowerCase()

    return courses.filter((course) => {
      const sections = sectionsByCourseCode.get(course.code) ?? []
      const matchesSubject =
        subjectFilter === 'all' ||
        (subjectFilter === 'UHP' ? course.subject === 'UHP' : course.subject === subjectFilter)
      const matchesCode =
        !codeQuery || course.courseNumber.toLowerCase() === codeQuery
      const matchesTitle = !titleQuery || course.title.toLowerCase().includes(titleQuery)
      const matchesUnits = !unitsQuery || course.units.toLowerCase().includes(unitsQuery)
      const matchesHonors =
        subjectFilter === 'UHP' || !honorsOnly || isHonorsCourse(course.subject, course.courseNumber)
      const matchesInstructor =
        !instructorQuery || sections.some((section) => section.instructor.toLowerCase().includes(instructorQuery))
      const matchesTime =
        !timeFilter || sections.some((section) => matchesTimeWindow(section.time, timeFilter))
      const matchesGe =
        !geQuery ||
        sections.some((section) =>
          `${section.course_title} ${section.course_info} ${section.comment}`.toLowerCase().includes(geQuery)
        )

      return (
        matchesSubject &&
        matchesCode &&
        matchesTitle &&
        matchesUnits &&
        matchesHonors &&
        matchesInstructor &&
        matchesTime &&
        matchesGe
      )
    })
  }, [courses, courseCodeFilter, geKeywordFilter, honorsOnly, instructorFilter, sectionsByCourseCode, subjectFilter, timeFilter, titleFilter, unitsFilter])

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
  }, [subjectFilter, courseCodeFilter, titleFilter, unitsFilter, instructorFilter, timeFilter, geKeywordFilter, honorsOnly, semesterTable, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const loadWatchedState = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const authUserId = authData.user?.id
      if (!authUserId) {
        setWatchedKeys([])
        return
      }

      const keys = rows
        .map((row) => asText(row.class_number, ''))
        .filter((classNumber) => classNumber && classNumber !== 'N/A')
        .filter((classNumber) => isSectionWatched({ authUserId, termTable: semesterTable, classNumber }))
        .map((classNumber) => `${semesterTable}|${classNumber}`)

      setWatchedKeys(keys)
    }

    void loadWatchedState()
  }, [rows, semesterTable])

  useEffect(() => {
    if (!loaded) return

    const channel = supabase
      .channel(`course-results-${semesterTable}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: semesterTable },
        (payload) => {
          const newRow = (payload.new ?? null) as RawCourseRow | null
          const oldRow = (payload.old ?? null) as RawCourseRow | null
          setRows((prev) => {
            const classNumber = String(newRow?.class_number ?? oldRow?.class_number ?? '').trim()
            if (!classNumber) return prev

            if (payload.eventType === 'DELETE') {
              return prev.filter((row) => String(row.class_number ?? '').trim() !== classNumber)
            }

            const nextRows = [...prev]
            const index = nextRows.findIndex((row) => String(row.class_number ?? '').trim() === classNumber)
            if (!newRow) return prev
            if (index >= 0) nextRows[index] = newRow
            else nextRows.unshift(newRow)
            return nextRows
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loaded, semesterTable])

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

  const addSectionToWatchlist = async (section: SectionItem) => {
    setSaveMessage('')
    const key = `${semesterTable}|${section.class_number}`
    setWatchingKey(key)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      const authUserId = authData.user?.id ?? 'guest'
      if (!section.class_number || section.class_number === 'N/A') {
        throw new Error('This section is missing a class number, so it cannot be watched yet.')
      }

      saveWatchlistItem({
        id: `${authUserId}:${semesterTable}:${section.class_number}`,
        authUserId,
        termTable: semesterTable,
        classNumber: section.class_number,
        section: section.section,
        courseCodeFull: section.course_code_full,
        courseTitle: section.course_title,
        instructor: section.instructor,
        days: section.days,
        time: section.time,
        location: section.location,
        status: section.status,
        openSeats: section.openSeats,
        addedAt: new Date().toISOString(),
        lastKnownStatus: section.status || section.openSeats || 'unknown',
        lastNotifiedStatus: null,
      })

      setWatchedKeys((prev) => Array.from(new Set([...prev, key])))
      setSaveMessage(`Watching ${section.course_code_full} (section ${section.section}) for seat changes.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to watch section.'
      setSaveMessage(`Watchlist error: ${message}`)
    } finally {
      setWatchingKey(null)
    }
  }

  const removeSectionFromWatchlist = async (section: SectionItem) => {
    setSaveMessage('')
    const key = `${semesterTable}|${section.class_number}`
    setWatchingKey(key)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      const authUserId = authData.user?.id ?? 'guest'
      if (!section.class_number || section.class_number === 'N/A') {
        throw new Error('This section is missing a class number, so it cannot be updated.')
      }

      removeWatchlistItem({
        authUserId,
        termTable: semesterTable,
        classNumber: section.class_number,
      })

      setWatchedKeys((prev) => prev.filter((entry) => entry !== key))
      setSaveMessage(`Stopped watching ${section.course_code_full} (section ${section.section}).`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update watched section.'
      setSaveMessage(`Watchlist error: ${message}`)
    } finally {
      setWatchingKey(null)
    }
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <header className="flex items-center justify-between bg-schu-teal px-4 py-3 shadow-md sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight hover:opacity-80">
          ScheduleU
        </Link>
        <HeaderMenu items={menuItems} title="Courses" />
      </header>
      <div className="p-4 md:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="space-y-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Course Search</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                title="Back to dashboard"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 10.5L12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                </svg>
              </Link>
              <Link
                href="/schedule-builder"
                className="inline-flex items-center justify-center schu-gradient px-4 py-2 text-sm font-black text-white rounded-lg shadow-sm hover:opacity-90"
              >
                Open Schedule Builder
              </Link>
              <Link
                href="/watchlist"
                className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
              >
                Open Watchlist
              </Link>
            </div>
          </div>
          <p className="font-medium text-[var(--text-secondary)]">
            Set filters, then load a semester and browse matching courses.
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border p-4 shadow-sm md:p-5 bg-[var(--bg-elevated)] border-[var(--border-soft)]">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label htmlFor="semester" className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Semester
              </label>
              <select
                id="semester"
                value={semesterTable}
                onChange={(event) => setSemesterTable(event.target.value)}
                className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
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
              className="rounded-xl schu-gradient text-white font-black px-5 py-2.5 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Loading...' : 'Load Courses'}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="subjectFilter" className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Subject
              </label>
              <select
                id="subjectFilter"
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
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
              <label htmlFor="unitsFilter" className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Units
              </label>
              <select
                id="unitsFilter"
                value={unitsFilter}
                onChange={(event) => setUnitsFilter(event.target.value)}
                className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
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
              <label htmlFor="courseCodeFilter" className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Course Number
              </label>
              <select
                id="courseCodeFilter"
                value={courseCodeFilter}
                onChange={(event) => setCourseCodeFilter(event.target.value)}
                className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
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
              <label htmlFor="titleFilter" className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Course title
              </label>
              <input
                id="titleFilter"
                type="text"
                value={titleFilter}
                onChange={(event) => setTitleFilter(event.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full rounded-xl border-2 px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="instructorFilter" className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Instructor
              </label>
              <input
                id="instructorFilter"
                type="text"
                value={instructorFilter}
                onChange={(event) => setInstructorFilter(event.target.value)}
                placeholder="e.g. Smith"
                className="w-full rounded-xl border-2 px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="timeFilter" className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Time
              </label>
              <select
                id="timeFilter"
                value={timeFilter}
                onChange={(event) => setTimeFilter(event.target.value)}
                className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
                disabled={loading}
              >
                <option value="">Any time</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="tba">TBA / Online</option>
              </select>
            </div>

            <div>
              <label htmlFor="geKeywordFilter" className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                GE / keyword
              </label>
              <input
                id="geKeywordFilter"
                type="text"
                value={geKeywordFilter}
                onChange={(event) => setGeKeywordFilter(event.target.value)}
                placeholder="e.g. GE, Area A, Writing"
                className="w-full rounded-xl border-2 px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-[var(--bg-soft)] border-[var(--border-soft)]">
              <input
                id="honorsOnly"
                type="checkbox"
                checked={honorsOnly}
                onChange={(event) => setHonorsOnly(event.target.checked)}
                className="h-4 w-4"
                disabled={loading}
              />
              <label htmlFor="honorsOnly" className="text-sm font-medium text-[var(--text-primary)]">
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

        <section className="overflow-hidden rounded-2xl border shadow-sm bg-[var(--bg-elevated)] border-[var(--border-soft)]">
          <div className="border-b px-4 py-3 text-sm bg-[var(--bg-soft)] text-[var(--text-primary)] border-[var(--border-soft)]">
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
                  className="w-full rounded-xl p-3 text-left transition-colors hover:bg-[var(--bg-soft)] focus-visible:bg-[var(--bg-soft)]"
                  onClick={() =>
                    setExpandedCourseCode((prev) => (prev === course.code ? null : course.code))
                  }
                >
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h2 className="font-semibold text-[var(--text-strong)]">{course.code}</h2>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {course.units} units • {course.sectionCount} section
                      {course.sectionCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <p className="mt-1 text-[var(--text-primary)]">{course.title}</p>
                </button>

                {expandedCourseCode === course.code && (
                  <div className="mt-2">
                    <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                      Sections ({sectionsByCourseCode.get(course.code)?.length ?? 0})
                    </div>

                    <div className="flex flex-col gap-3">
                      {(sectionsByCourseCode.get(course.code) ?? []).map((section, idx) => (
                        <div key={`${course.code}-${section.class_number}-${idx}`} className="rounded-xl border p-4 transition-all hover:shadow-sm bg-[var(--bg-soft)] border-[var(--border-soft)]">
                          <div className="mb-2 text-sm font-semibold text-[var(--text-strong)]">
                            Section {section.section || 'N/A'} • Class #{section.class_number || 'N/A'}
                          </div>
                          <div className="grid gap-2 lg:grid-cols-3 text-sm">
                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Code</p><p className="break-words text-[var(--text-primary)]">{section.course_code_full}</p></div>
                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Type</p><p className="break-words text-[var(--text-primary)]">{section.type}</p></div>
                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Location</p><p className="break-words text-[var(--text-primary)]">{section.location}</p></div>

                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Title</p><p className="break-words text-[var(--text-primary)]">{section.course_title}</p></div>
                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Info</p><p className="break-words text-[var(--text-primary)]">{section.course_info}</p></div>
                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Days</p><p className="break-words text-[var(--text-primary)]">{section.days}</p></div>

                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Units</p><p className="break-words text-[var(--text-primary)]">{section.units}</p></div>
                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Instructor</p><p className="break-words text-[var(--text-primary)]">{section.instructor}</p><div className="mt-1"><ProfessorRatingBadge instructor={section.instructor} /></div></div>
                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Time</p><p className="break-words text-[var(--text-primary)]">{section.time}</p></div>
                            <div className="rounded-xl border px-2 py-1.5 bg-[var(--bg-surface)] border-[var(--border-soft)]"><p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Status</p><p className="break-words text-[var(--text-primary)]">{section.status || section.openSeats || 'Live status unavailable'}</p></div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => addSectionToCart(section)}
                              disabled={savingKey === `${section.course_code_full}|${section.class_number}|${section.section}`}
                              className="rounded-xl schu-gradient px-3 py-1.5 text-white text-sm font-black transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {savingKey === `${section.course_code_full}|${section.class_number}|${section.section}`
                                ? 'Adding...'
                                : 'Add to Shopping Cart'}
                            </button>
                            {(() => {
                              const watchKey = `${semesterTable}|${section.class_number}`
                              const isWatched = watchedKeys.includes(watchKey)
                              const watchPending = watchingKey === watchKey

                              return (
                            <button
                              type="button"
                              onClick={() =>
                                isWatched ? removeSectionFromWatchlist(section) : addSectionToWatchlist(section)
                              }
                              disabled={section.class_number === 'N/A' || watchPending}
                              className="rounded-xl border px-3 py-1.5 text-sm font-black transition-colors bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {section.class_number === 'N/A'
                                ? 'Class Number Required'
                                : watchPending
                                ? isWatched
                                  ? 'Updating...'
                                  : 'Saving...'
                                : isWatched
                                ? 'Watching Seats Open'
                                : 'Notify Me When Seat Opens'}
                            </button>
                              )
                            })()}
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
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <span>Courses per page:</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded border px-2 py-1 bg-[var(--bg-surface)] border-[var(--border-soft)]"
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
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50 border-[var(--border-soft)] text-[var(--text-primary)]"
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
                        : 'border-[var(--border-soft)] text-[var(--text-primary)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50 border-[var(--border-soft)] text-[var(--text-primary)]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  )
}
