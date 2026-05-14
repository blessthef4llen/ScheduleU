// Schedule Builder page for ScheduleU.
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import HeaderMenu from '@/components/HeaderMenu'
import { ProfessorRatingBadge } from '@/components/ProfessorRatingBadge'
import { supabase } from '@/utils/supabase'
import {
  addSectionWithChecks,
  fetchSectionsByIds,
  getAuthedAppUser,
  getOrCreateSchedule,
} from '@/lib/planner/plannerService'
import {
  loadAcceptedScheduleSnapshot,
  saveAcceptedScheduleSnapshot,
  SCHEDULE_SYNC_EVENT,
  syncCartFromSections,
  syncPlannedCoursesFromBuilderSections,
  type AcceptedScheduleSnapshot,
  type ScheduleBuilderSection,
} from '@/lib/planner/sync'
import {
  getInitialSelectedTermTable,
  loadSelectedTermTable,
  normalizeTermTable,
  plannerHrefForTerm,
  PLANNER_TERM_OPTIONS,
  saveSelectedTermTable,
  tableToTermLabel,
  TERM_SELECTION_EVENT,
} from '@/lib/planner/terms'

type CartRow = {
  term_table: string
  course_code_full: string
  course_title: string | null
  section: string | null
  class_number: string | null
}

type SelectedSection = ScheduleBuilderSection

type TermScheduleResponse = {
  term: string
  selected_sections: SelectedSection[]
  generated_schedules?: ScheduleCandidate[]
  unscheduled_courses: string[]
  warnings: string[]
}

type ScheduleCandidate = {
  rank: number
  score: number
  metrics: {
    days_used: number
    total_gap_minutes: number
    earliest_start: number
    latest_end: number
  }
  explanation_bullets?: string[]
  selected_sections: SelectedSection[]
}

const backendBaseUrl = process.env.NEXT_PUBLIC_SCHEDULER_API_URL ?? 'http://localhost:8000'
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

function isHonorsCourseCode(courseCode: string): boolean {
  const normalized = courseCode.trim().toUpperCase()
  if (!normalized) return false
  if (normalized === 'UHP' || normalized.startsWith('UHP ')) return true

  const parts = normalized.split(/\s+/)
  if (parts.length < 2) return false
  const numberPart = parts.slice(1).join('')
  return /H$/i.test(numberPart)
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

function flattenSelectedSections(termResult: TermScheduleResponse | null, selectedCandidateIndex: number | null) {
  if (!termResult) return [] as SelectedSection[]
  if (selectedCandidateIndex !== null) {
    return termResult.generated_schedules?.[selectedCandidateIndex]?.selected_sections ?? []
  }
  return termResult.selected_sections
}

export default function ScheduleBuilderPage() {
  const [loadingCart, setLoadingCart] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [cartRows, setCartRows] = useState<CartRow[]>([])
  const [selectedTermTable, setSelectedTermTable] = useState<string>(getInitialSelectedTermTable)
  const [result, setResult] = useState<TermScheduleResponse | null>(null)
  const [daysOffText, setDaysOffText] = useState('')
  const [earliestTime, setEarliestTime] = useState('')
  const [latestTime, setLatestTime] = useState('')
  const [bufferMinutes, setBufferMinutes] = useState(15)
  const [rankingPreference, setRankingPreference] = useState('compact')
  const [maxSchedules, setMaxSchedules] = useState(3)
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null)
  const [manualSubject, setManualSubject] = useState('')
  const [manualCourseNumber, setManualCourseNumber] = useState('')
  const [manualCourses, setManualCourses] = useState<string[]>([])
  const [manualNumberOptions, setManualNumberOptions] = useState<string[]>([])
  const [loadingNumbers, setLoadingNumbers] = useState(false)
  const [numberLoadError, setNumberLoadError] = useState('')
  const [honorsOnly, setHonorsOnly] = useState(false)
  const [showCartEditor, setShowCartEditor] = useState(false)
  const [removingCartKey, setRemovingCartKey] = useState<string | null>(null)
  const [acceptingSchedule, setAcceptingSchedule] = useState(false)
  const [syncBuilderCart, setSyncBuilderCart] = useState(true)
  const [syncedSchedule, setSyncedSchedule] = useState<AcceptedScheduleSnapshot | null>(null)
  const hasPrereqWarnings = result?.warnings.some((warning) =>
    warning.toLowerCase().includes('prerequisite')
  ) ?? false
  const selectedSections = useMemo(
    () => flattenSelectedSections(result, selectedCandidateIndex),
    [result, selectedCandidateIndex]
  )
  const plannerHref = useMemo(() => plannerHrefForTerm(selectedTermTable), [selectedTermTable])
  const menuItems = useMemo(
    () => [
      { href: '/dashboard', label: 'Dashboard' },
      { href: plannerHref, label: 'Planner' },
      { href: '/courses', label: 'Courses' },
      { href: '/user-profile', label: 'Profile' },
    ],
    [plannerHref]
  )

  const handleSelectedTermChange = (termTableOrLabel: string) => {
    const nextTermTable = normalizeTermTable(termTableOrLabel)
    setSelectedTermTable(nextTermTable)
    saveSelectedTermTable(nextTermTable)
    setResult(null)
    setSelectedCandidateIndex(null)
    setManualNumberOptions([])
    setNumberLoadError('')
  }

  const requestedCourses = useMemo(() => {
    const uniq = new Set<string>()
    for (const row of cartRows) {
      if (selectedTermTable && row.term_table !== selectedTermTable) continue
      if (honorsOnly && !isHonorsCourseCode(row.course_code_full)) continue
      if (row.course_code_full) uniq.add(row.course_code_full)
    }
    for (const course of manualCourses) {
      if (honorsOnly && !isHonorsCourseCode(course)) continue
      if (course) uniq.add(course)
    }
    return Array.from(uniq).sort()
  }, [cartRows, honorsOnly, manualCourses, selectedTermTable])

  useEffect(() => {
    saveSelectedTermTable(selectedTermTable)
  }, [selectedTermTable])

  useEffect(() => {
    const syncTermFromStorage = () => {
      const nextTermTable = loadSelectedTermTable()
      if (selectedTermTable === nextTermTable) return

      setSelectedTermTable(nextTermTable)
      setResult(null)
      setSelectedCandidateIndex(null)
      setManualNumberOptions([])
      setNumberLoadError('')
    }

    window.addEventListener(TERM_SELECTION_EVENT, syncTermFromStorage)
    window.addEventListener('storage', syncTermFromStorage)

    return () => {
      window.removeEventListener(TERM_SELECTION_EVENT, syncTermFromStorage)
      window.removeEventListener('storage', syncTermFromStorage)
    }
  }, [selectedTermTable])

  useEffect(() => {
    let cancelled = false

    const refreshSyncedSchedule = async () => {
      const { data } = await supabase.auth.getUser()
      const authUserId = data.user?.id
      if (!authUserId || cancelled) return
      setSyncedSchedule(loadAcceptedScheduleSnapshot(authUserId))
    }

    void refreshSyncedSchedule()

    const handleSyncEvent = () => {
      void refreshSyncedSchedule()
    }

    window.addEventListener(SCHEDULE_SYNC_EVENT, handleSyncEvent)
    window.addEventListener('storage', handleSyncEvent)

    return () => {
      cancelled = true
      window.removeEventListener(SCHEDULE_SYNC_EVENT, handleSyncEvent)
      window.removeEventListener('storage', handleSyncEvent)
    }
  }, [])

  const lockedSections = useMemo(() => {
    const seen = new Set<string>()
    const locks: Array<{ course: string; section_id: string }> = []
    for (const row of cartRows) {
      if (selectedTermTable && row.term_table !== selectedTermTable) continue
      if (!row.course_code_full || !row.section) continue
      if (honorsOnly && !isHonorsCourseCode(row.course_code_full)) continue

      const course = row.course_code_full.trim()
      const sectionId = row.section.trim()
      if (!course || !sectionId) continue
      if (seen.has(course)) continue
      seen.add(course)
      locks.push({ course, section_id: sectionId })
    }
    return locks
  }, [cartRows, honorsOnly, selectedTermTable])

  const addManualCourse = () => {
    const subject = manualSubject.trim().toUpperCase()
    const number = normalizeCourseNumber(subject, manualCourseNumber.trim().toUpperCase())
    if (!subject || !number) return

    const courseCode = `${subject} ${number}`.replace(/\s+/g, ' ')
    setManualCourses((prev) => (prev.includes(courseCode) ? prev : [...prev, courseCode]))
    setManualSubject('')
    setManualCourseNumber('')
  }

  const removeManualCourse = (courseCode: string) => {
    setManualCourses((prev) => prev.filter((c) => c !== courseCode))
  }

  useEffect(() => {
    const loadCourseNumbersForSubject = async () => {
      setManualCourseNumber('')
      setManualNumberOptions([])
      setNumberLoadError('')

      const subject = manualSubject.trim().toUpperCase()
      if (!subject || !selectedTermTable) return

      setLoadingNumbers(true)
      try {
        const subjectUpper = subject.trim().toUpperCase()
        const [{ data: bySubject, error: bySubjectError }, { data: byCode, error: byCodeError }] =
          await Promise.all([
            supabase
              .from(selectedTermTable)
              .select('subject,course_number,course_code_full')
              .eq('subject', subjectUpper)
              .limit(5000),
            supabase
              .from(selectedTermTable)
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
            subject === 'UHP'
              ? rowSubject === 'UHP' || codeSubject === 'UHP'
              : rowSubject === subjectUpper || codeSubject === subjectUpper

          if (!belongsToSubject) continue

          const courseNumberRaw =
            String((row as Record<string, unknown>).course_number ?? '').trim() ||
            codeNumber

          if (!courseNumberRaw) continue
          const normalizedNumber = normalizeCourseNumber(subject, courseNumberRaw)
          if (!normalizedNumber) continue
          if (honorsOnly && subject !== 'UHP' && !/H$/i.test(normalizedNumber)) continue
          numbers.add(normalizedNumber)
        }

        const sorted = Array.from(numbers).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        )
        setManualNumberOptions(sorted)
      } catch (err) {
        setManualNumberOptions([])
        setNumberLoadError(
          err instanceof Error ? `Could not load course numbers: ${err.message}` : 'Could not load course numbers.'
        )
      } finally {
        setLoadingNumbers(false)
      }
    }

    void loadCourseNumbersForSubject()
  }, [honorsOnly, manualSubject, selectedTermTable])

  const loadCart = async () => {
    setLoadingCart(true)
    setError('')
    setMessage('')
    setResult(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('You must be logged in to load your shopping cart.')

      const { data, error: cartError } = await supabase
        .from('shopping_cart')
        .select('term_table, course_code_full, course_title, section, class_number')
        .eq('user_id', authData.user.id)

      if (cartError) throw new Error(cartError.message)

      const rows = (data ?? []) as CartRow[]
      setCartRows(rows)
      if (!rows.length) {
        setMessage('No cart items found. Add courses from the Courses page first.')
      } else {
        const firstTerm = rows.find((r) => r.term_table)?.term_table ?? ''
        if (!selectedTermTable && firstTerm) handleSelectedTermChange(firstTerm)
        setMessage(`Loaded ${rows.length} cart row(s).`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart.')
    } finally {
      setLoadingCart(false)
    }
  }

  const removeCartItem = async (row: CartRow, rowIndex: number) => {
    const key = `${row.term_table}|${row.course_code_full}|${row.section ?? ''}|${row.class_number ?? ''}|${rowIndex}`
    setRemovingCartKey(key)
    setError('')
    setMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('You must be logged in to edit your shopping cart.')

      let q = supabase
        .from('shopping_cart')
        .delete()
        .eq('user_id', authData.user.id)
        .eq('term_table', row.term_table)
        .eq('course_code_full', row.course_code_full)

      if (row.section?.trim()) q = q.eq('section', row.section.trim())
      else q = q.is('section', null)

      if (row.class_number?.trim()) q = q.eq('class_number', row.class_number.trim())
      else q = q.is('class_number', null)

      const { error: deleteError } = await q
      if (deleteError) throw new Error(deleteError.message)

      setCartRows((prev) =>
        prev.filter((item, idx) => {
          if (idx !== rowIndex) return true
          return !(
            item.term_table === row.term_table &&
            item.course_code_full === row.course_code_full &&
            (item.section ?? '') === (row.section ?? '') &&
            (item.class_number ?? '') === (row.class_number ?? '')
          )
        })
      )
      setMessage(`Removed ${row.course_code_full}${row.section ? ` (section ${row.section})` : ''} from cart.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove cart item.')
    } finally {
      setRemovingCartKey(null)
    }
  }

  const generateSchedule = async () => {
    setGenerating(true)
    setError('')
    setMessage('')
    setResult(null)

    try {
      if (!selectedTermTable) {
        throw new Error('Select a term before generating a schedule.')
      }
      if (!requestedCourses.length) {
        throw new Error('No courses found for this term in your shopping cart.')
      }

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('You must be logged in to generate a schedule.')

      const { data: completedData, error: completedError } = await supabase
        .from('completed_courses')
        .select('course_code')
        .eq('auth_user_id', authData.user.id)

      if (completedError) throw new Error(`Could not load completed courses: ${completedError.message}`)

      const completedCourses = Array.from(
        new Set(
          (completedData ?? [])
            .map((row) => String(row.course_code ?? '').trim())
            .filter(Boolean)
        )
      )

      const payload = {
        term: tableToTermLabel(selectedTermTable),
        requested_courses: requestedCourses,
        completed_courses: completedCourses,
        locked_sections: lockedSections,
        constraints: {
          earliest_time: earliestTime.trim() || null,
          latest_time: latestTime.trim() || null,
          days_off: daysOffText
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean),
          buffer_minutes: bufferMinutes,
          ranking_preference: rankingPreference,
          max_schedules: maxSchedules,
          blocked_times: [],
        },
      }

      const response = await fetch(`${backendBaseUrl}/term/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const raw = await response.json()
      if (!response.ok) {
        throw new Error(raw?.detail ? JSON.stringify(raw.detail) : 'Schedule generation failed.')
      }

      setResult(raw as TermScheduleResponse)
      setSelectedCandidateIndex(null)
      setMessage('Schedule generated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule.')
    } finally {
      setGenerating(false)
    }
  }

  const acceptSchedule = async () => {
    if (!result) {
      setError('Generate a schedule first.')
      return
    }
    if (selectedSections.length === 0) {
      setError('Select a schedule option before accepting it.')
      return
    }

    setAcceptingSchedule(true)
    setError('')
    setMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('You must be logged in to accept a schedule.')

      const syncWarnings: string[] = []
      const acceptedSnapshot: AcceptedScheduleSnapshot = {
        term: result.term,
        selectedAt: new Date().toISOString(),
        selectedSections,
      }
      saveSelectedTermTable(result.term)
      saveAcceptedScheduleSnapshot({
        authUserId: authData.user.id,
        term: result.term,
        selectedSections,
      })
      setSyncedSchedule(acceptedSnapshot)

      try {
        await syncPlannedCoursesFromBuilderSections({
          authUserId: authData.user.id,
          term: result.term,
          sections: selectedSections,
        })
      } catch (plannedError) {
        syncWarnings.push(
          plannedError instanceof Error
            ? `AI workload plan: ${plannedError.message}`
            : 'Could not update AI workload plan.'
        )
      }

      const auth = await getAuthedAppUser()
      if (!auth.appUser?.auth_uid) {
        throw new Error(auth.error ?? 'Unable to open planner schedule.')
      }

      const scheduleResult = await getOrCreateSchedule({ userId: auth.appUser.auth_uid, term: result.term })
      if (!scheduleResult.schedule) {
        throw new Error(scheduleResult.error ?? 'Unable to open planner schedule.')
      }

      const scheduleId = scheduleResult.schedule.id
      const existingDelete = await supabase.from('schedule_items').delete().eq('schedule_id', scheduleId)
      if (existingDelete.error) {
        throw new Error(existingDelete.error.message)
      }

      const resolvedSectionIds: number[] = []

      for (const section of selectedSections) {
        const exactMatch = await supabase
          .from(selectedTermTable)
          .select('class_number')
          .eq('course_code_full', section.course)
          .eq('sec', section.section_id)
          .limit(1)
          .maybeSingle()

        let classNumber = String(exactMatch.data?.class_number ?? '').trim()
        if (!classNumber) {
          const fallbackMatch = await supabase
            .from(selectedTermTable)
            .select('class_number')
            .eq('course_code_full', section.course)
            .eq('class_number', section.section_id)
            .limit(1)
            .maybeSingle()

          classNumber = String(fallbackMatch.data?.class_number ?? '').trim()
        }

        if (!classNumber) {
          throw new Error(`Could not resolve ${section.course} section ${section.section_id} into a planner section.`)
        }

        const sectionId = Number(classNumber)
        const addResult = await addSectionWithChecks({
          scheduleId,
          sectionId,
          existingBlocks: [],
          term: result.term,
        })
        if (!addResult.ok) {
          throw new Error(addResult.msg)
        }

        resolvedSectionIds.push(sectionId)
      }

      if (syncBuilderCart) {
        const sectionResult = await fetchSectionsByIds(resolvedSectionIds, result.term)
        if (sectionResult.error) {
          syncWarnings.push(`Shopping cart: ${sectionResult.error}`)
        } else {
          try {
            await syncCartFromSections({
              authUserId: authData.user.id,
              term: result.term,
              sections: sectionResult.sections,
            })
          } catch (cartError) {
            syncWarnings.push(
              cartError instanceof Error ? `Shopping cart: ${cartError.message}` : 'Could not update shopping cart.'
            )
          }
        }
      }

      const baseMessage = syncBuilderCart
        ? 'Schedule synced to the Interactive Planner and shopping cart.'
        : 'Schedule synced to the Interactive Planner.'
      setMessage(syncWarnings.length > 0 ? `${baseMessage} Sync warning: ${syncWarnings.join(' ')}` : baseMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept this schedule.')
    } finally {
      setAcceptingSchedule(false)
    }
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <header className="flex items-center justify-between bg-schu-teal px-4 py-3 shadow-md sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight hover:opacity-80">
          ScheduleU
        </Link>
        <HeaderMenu items={menuItems} title="Builder" />
      </header>
      <div className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-[var(--text-strong)]">Schedule Builder</h1>
            <p className="font-medium text-[var(--text-secondary)]">Generate a conflict-aware term schedule from your shopping cart.</p>
          </div>
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
            <Link href="/courses" className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold transition-colors bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-soft)]">
              Back to Courses
            </Link>
            <Link href={plannerHref} className="inline-flex items-center justify-center rounded-lg schu-gradient px-4 py-2 text-sm font-black text-white shadow-sm transition-opacity hover:opacity-90">
              Open Planner
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border p-4 shadow-sm md:p-5 bg-[var(--hero-gradient)] border-[var(--border-soft)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-schu-blue">Interactive Planner</p>
              <h2 className="mt-1 text-xl font-black text-[var(--text-strong)]">Need the drag-and-drop calendar?</h2>
              <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                Use the planner to place sections on a weekly calendar, check conflicts, and export class numbers.
              </p>
            </div>
            <Link href={plannerHref} className="inline-flex items-center justify-center rounded-xl bg-[#1e4e8c] px-4 py-2 text-sm font-black text-white shadow-sm transition-opacity hover:opacity-90">
              Launch Planner
            </Link>
          </div>
        </section>

        {syncedSchedule && (
          <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Synced Planner Schedule</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{syncedSchedule.term}</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Last synced {new Date(syncedSchedule.selectedAt).toLocaleString()}.
                </p>
              </div>
              <Link
                href={plannerHrefForTerm(syncedSchedule.term)}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                Open synced planner
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {syncedSchedule.selectedSections.slice(0, 8).map((section) => (
                <span
                  key={`${section.course}-${section.section_id}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  {section.course} - {section.section_id}
                </span>
              ))}
              {syncedSchedule.selectedSections.length > 8 && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  +{syncedSchedule.selectedSections.length - 8} more
                </span>
              )}
            </div>
          </section>
        )}

        <section className="space-y-4 rounded-2xl border p-4 shadow-sm md:p-5 bg-[var(--bg-elevated)] border-[var(--border-soft)]">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadCart}
              disabled={loadingCart}
              className="rounded-xl schu-gradient px-4 py-2 text-sm font-black text-white transition-colors hover:opacity-90 disabled:opacity-60 shadow-sm"
            >
              {loadingCart ? 'Loading Cart...' : 'Load Shopping Cart'}
            </button>

            <button
              type="button"
              onClick={generateSchedule}
              disabled={generating || !requestedCourses.length}
              className="rounded-xl bg-[#1e4e8c] px-4 py-2 text-sm font-black text-white transition-colors hover:opacity-90 disabled:opacity-60 shadow-sm"
            >
              {generating ? 'Generating...' : 'Generate Schedule'}
            </button>

            <button
              type="button"
              onClick={() => setShowCartEditor((prev) => !prev)}
              className="rounded-xl border px-4 py-2 text-sm font-bold transition-colors bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
            >
              {showCartEditor ? 'Hide Cart Editor' : 'Edit Cart'}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Term</label>
              <select
                value={selectedTermTable}
                onChange={(e) => handleSelectedTermChange(e.target.value)}
                className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
              >
                {PLANNER_TERM_OPTIONS.map((option) => {
                  const disabled = 'disabled' in option ? Boolean(option.disabled) : false
                  return (
                  <option key={option.table} value={option.table} disabled={disabled}>
                    {option.label}{disabled ? ' (Coming Soon)' : ''}
                  </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Earliest Time</label>
              <input
                value={earliestTime}
                onChange={(e) => setEarliestTime(e.target.value)}
                placeholder="09:00AM"
                className="w-full rounded-xl border-2 px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Latest Time</label>
              <input
                value={latestTime}
                onChange={(e) => setLatestTime(e.target.value)}
                placeholder="06:00PM"
                className="w-full rounded-xl border-2 px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Buffer Minutes</label>
              <select
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
                className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
              >
                <option value={0}>0</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Ranking Preference</label>
                <select
                  value={rankingPreference}
                  onChange={(e) => setRankingPreference(e.target.value)}
                  className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
                >
                  <option value="compact">Compact (few days + fewer gaps)</option>
                  <option value="fewest_days">Fewest days on campus</option>
                  <option value="latest_start">Latest start times</option>
                  <option value="earliest_end">Earliest end times</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Number of schedules</label>
                <select
                  value={maxSchedules}
                  onChange={(e) => setMaxSchedules(Number(e.target.value))}
                  className="w-full rounded-xl border-2 px-3 py-2 font-medium bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
                >
                  <option value={1}>1</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>
            </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">Days Off (comma-separated)</label>
            <input
              value={daysOffText}
              onChange={(e) => setDaysOffText(e.target.value)}
              placeholder="F or M,W"
              className="w-full rounded-xl border-2 px-3 py-2 bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-primary)]"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-[var(--bg-soft)] border-[var(--border-soft)]">
            <input
              id="honorsOnlyBuilder"
              type="checkbox"
              checked={honorsOnly}
              onChange={(e) => setHonorsOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="honorsOnlyBuilder" className="text-sm font-medium text-[var(--text-primary)]">
              Honors only (UHP or course number ending in H)
            </label>
          </div>

          <div className="rounded-xl border border-slate-100 bg-gray-50 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Manual Course Entry</p>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <select
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-100 px-3 py-2 bg-white font-medium"
              >
                <option value="">Select subject</option>
                {SUBJECT_OPTIONS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <select
                value={manualCourseNumber}
                onChange={(e) => setManualCourseNumber(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-100 px-3 py-2 bg-white font-medium"
                disabled={!manualSubject || loadingNumbers}
              >
                <option value="">
                  {!manualSubject
                    ? 'Pick subject first'
                    : loadingNumbers
                      ? 'Loading course numbers...'
                      : 'Select course number'}
                </option>
                {manualNumberOptions.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addManualCourse}
                className="rounded-xl schu-gradient px-4 py-2 text-sm font-black text-white transition-colors hover:opacity-90"
              >
                Add Course
              </button>
            </div>

            {numberLoadError && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {numberLoadError}
              </p>
            )}

            {manualCourses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {manualCourses.map((course) => (
                  <button
                    key={course}
                    type="button"
                    onClick={() => removeManualCourse(course)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                    title="Click to remove"
                  >
                    {course} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          {!!requestedCourses.length && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Requesting {requestedCourses.length} unique course(s): {requestedCourses.join(', ')}
            </div>
          )}

          {showCartEditor && (
            <div className="rounded-xl border border-slate-100 bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-800">Shopping Cart Editor</p>
              {cartRows.length === 0 ? (
                <p className="text-sm text-slate-600">No cart items loaded yet. Click Load Shopping Cart first.</p>
              ) : (
                <div className="space-y-2">
                  {cartRows.map((row, idx) => {
                    const key = `${row.term_table}|${row.course_code_full}|${row.section ?? ''}|${row.class_number ?? ''}|${idx}`
                    return (
                      <div
                        key={key}
                        className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="text-sm text-slate-800">
                          <span className="font-semibold">{row.course_code_full}</span>
                          <span className="text-slate-600"> • {row.term_table}</span>
                          {row.section ? <span className="text-slate-600"> • Section {row.section}</span> : null}
                          {row.class_number ? <span className="text-slate-600"> • Class #{row.class_number}</span> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(row, idx)}
                          disabled={removingCartKey === key}
                          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                        >
                          {removingCartKey === key ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {message && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        {result && (
          <section className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
            <div className="border-b px-4 py-3 text-sm text-slate-700 bg-gray-50/70">
              Generated term: <span className="font-semibold">{result.term}</span>
            </div>

            <div className="p-4 space-y-4">
              {(result.generated_schedules?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Schedule Options</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {result.generated_schedules!.map((candidate, idx) => (
                      <button
                        key={`candidate-${candidate.rank}-${idx}`}
                        type="button"
                        onClick={() => setSelectedCandidateIndex((prev) => (prev === idx ? null : idx))}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          selectedCandidateIndex === idx
                            ? 'border-[#46BDC1] bg-cyan-50 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">Option #{candidate.rank}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {candidate.metrics.days_used} day(s) • {candidate.metrics.total_gap_minutes} gap mins
                        </p>
                        {selectedCandidateIndex === idx && (
                          <ul className="mt-2 list-disc pl-5 text-xs text-slate-700 space-y-1">
                            {(candidate.explanation_bullets ?? []).slice(0, 3).map((b, i) => (
                              <li key={`${candidate.rank}-b-${i}`}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCandidateIndex === null ? (
                  <div className="rounded-xl border border-slate-100 bg-gray-50 px-3 py-2 text-sm text-slate-600">
                  Select a schedule option above to view details.
                </div>
              ) : (
              <div>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">Selected Sections</h2>
                {selectedSections.length === 0 ? (
                  <p className="text-sm text-slate-600">No conflict-free sections selected.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedSections.map((section) => (
                      <div key={`${section.course}-${section.section_id}`} className="rounded-xl border border-slate-100 bg-gray-50 p-3 transition-all hover:shadow-sm">
                        <p className="font-semibold text-slate-900">
                          {section.course} • Section {section.section_id}
                        </p>
                        <div className="mt-2 space-y-2 text-sm text-slate-700">
                          {section.meetings.map((meeting, idx) => (
                            <div
                              key={`${section.section_id}-${idx}`}
                              className="rounded-xl border border-slate-100 bg-white px-2 py-1.5 text-slate-900"
                            >
                              <div>
                                {meeting.day} {meeting.start}-{meeting.end} • {meeting.type ?? 'N/A'} • {meeting.location ?? 'N/A'} • {meeting.instructor ?? 'N/A'}
                              </div>
                              <div className="mt-1">
                                <ProfessorRatingBadge instructor={meeting.instructor ?? 'N/A'} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {selectedSections.length > 0 && (
                <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-gray-50 p-3 md:flex-row md:items-center md:justify-between">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={syncBuilderCart}
                      onChange={(event) => setSyncBuilderCart(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Also update shopping cart
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={acceptSchedule}
                      disabled={acceptingSchedule}
                      className="rounded-xl schu-gradient px-4 py-2 text-sm font-black text-white transition-colors hover:opacity-90 disabled:opacity-60"
                    >
                      {acceptingSchedule ? 'Syncing...' : 'Sync to Interactive Planner'}
                    </button>
                    <Link
                      href={plannerHref}
                      className="rounded-xl border px-4 py-2 text-sm font-bold bg-white border-slate-200 text-slate-800 transition-colors hover:bg-slate-50"
                    >
                      Open Planner
                    </Link>
                  </div>
                </div>
              )}

              {selectedCandidateIndex !== null && (result.generated_schedules?.[selectedCandidateIndex] ?? null) && (
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-slate-900">Weekly Schedule View</h2>
                  <div className="grid gap-3 md:grid-cols-5">
                    {['M', 'T', 'W', 'Th', 'F'].map((day) => {
                      const sections = (result.generated_schedules?.[selectedCandidateIndex]?.selected_sections ?? [])
                      const dayMeetings = sections
                        .flatMap((sec) =>
                          sec.meetings
                            .filter((m) => m.day === day)
                            .map((m) => ({ course: sec.course, section_id: sec.section_id, ...m }))
                        )
                        .sort((a, b) => a.start.localeCompare(b.start))
                      return (
                        <div key={day} className="rounded-xl border border-slate-100 bg-gray-50 p-2">
                          <p className="mb-2 text-sm font-semibold text-slate-800">{day}</p>
                          {dayMeetings.length === 0 ? (
                            <p className="text-xs text-slate-500">No classes</p>
                          ) : (
                            <div className="space-y-2">
                              {dayMeetings.map((m, idx) => (
                                <div key={`${day}-${m.course}-${m.section_id}-${idx}`} className="rounded-xl border border-slate-100 bg-white px-2 py-1 text-xs text-slate-900">
                                  <p className="font-semibold">{m.course} • {m.section_id}</p>
                                  <p>{m.start}-{m.end}</p>
                                  <p>{m.location ?? 'N/A'}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {result.unscheduled_courses.length > 0 && (
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-slate-900">Unscheduled Courses</h2>
                  <p className="text-sm text-amber-700">{result.unscheduled_courses.join(', ')}</p>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div>
                  <h2 className="mb-2 text-lg font-semibold text-slate-900">Warnings</h2>
                  <ul className="list-disc pl-5 text-sm text-amber-700">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                  {hasPrereqWarnings && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                      If this looks inaccurate, update your completed courses in your profile and transcript records, then generate the schedule again.
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          href="/transcript-import"
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white transition-colors hover:bg-blue-700"
                        >
                          Update Completed Courses
                        </Link>
                        <Link
                          href="/user-profile"
                          className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 font-bold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          Open Profile
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      </div>
    </div>
  )
}
