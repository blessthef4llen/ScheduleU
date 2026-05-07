'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'

type TranscriptCourse = {
  course_code: string
  subject: string
  course_number: string
  title: string | null
  term: string | null
  grade: string | null
  units: number | null
  raw_line: string
  matched_catalog: boolean
  confidence: number
}

type TranscriptTermGroup = {
  term: string
  courses: TranscriptCourse[]
}

type TranscriptParseResponse = {
  student: {
    name: string | null
    student_id: string | null
  }
  extracted_courses: TranscriptCourse[]
  grouped_by_term: TranscriptTermGroup[]
  unmatched_lines: string[]
  warnings: string[]
  total_pages: number
  extracted_text_chars: number
}

type SemesterOption = {
  label: string
  table: string
  disabled?: boolean
}

type ManualCatalogRow = {
  subject: string | null
  course_number: string | null
  course_code_full: string | null
  course_title: string | null
  units: string | null
}

const backendBaseUrl = process.env.NEXT_PUBLIC_SCHEDULER_API_URL ?? 'http://localhost:8000'
const MANUAL_TERM_TABLE_OPTIONS: readonly SemesterOption[] = [
  { label: 'Spring 2026', table: 'spring_2026' },
  { label: 'Summer 2026', table: 'summer_2026' },
]

export default function TranscriptImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [result, setResult] = useState<TranscriptParseResponse | null>(null)
  const [manualCourseCode, setManualCourseCode] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [manualTerm, setManualTerm] = useState('')
  const [manualGrade, setManualGrade] = useState('')
  const [manualUnits, setManualUnits] = useState('')
  const [manualCatalogTable, setManualCatalogTable] = useState(MANUAL_TERM_TABLE_OPTIONS[0].table)
  const [manualCatalogRows, setManualCatalogRows] = useState<ManualCatalogRow[]>([])
  const [manualCatalogLoading, setManualCatalogLoading] = useState(false)
  const [manualSubjectFilter, setManualSubjectFilter] = useState('all')
  const [manualSelectedCourse, setManualSelectedCourse] = useState('')

  useEffect(() => {
    const loadCatalogCourses = async () => {
      setManualCatalogLoading(true)
      setManualCatalogRows([])
      setManualSelectedCourse('')
      setManualSubjectFilter('all')

      try {
        const { data, error: queryError } = await supabase
          .from(manualCatalogTable)
          .select('subject,course_number,course_code_full,course_title,units')
          .limit(5000)

        if (queryError) {
          throw new Error(queryError.message)
        }

        const deduped = new Map<string, ManualCatalogRow>()
        for (const row of (data ?? []) as ManualCatalogRow[]) {
          const code = String(row.course_code_full ?? '').trim()
          const subject = String(row.subject ?? '').trim()
          const number = String(row.course_number ?? '').trim()
          const title = String(row.course_title ?? '').trim()
          const key = `${code}|${subject}|${number}|${title}`
          deduped.set(key, row)
        }

        setManualCatalogRows(Array.from(deduped.values()))
      } catch (err) {
        setError(err instanceof Error ? `Could not load course catalog: ${err.message}` : 'Could not load course catalog.')
      } finally {
        setManualCatalogLoading(false)
      }
    }

    void loadCatalogCourses()
  }, [manualCatalogTable])

  const manualSubjects = useMemo(() => {
    const subjects = new Set<string>()
    for (const row of manualCatalogRows) {
      const subject = String(row.subject ?? '').trim()
      if (subject) subjects.add(subject)
    }
    return Array.from(subjects).sort((a, b) => a.localeCompare(b))
  }, [manualCatalogRows])

  const manualCourseOptions = useMemo(() => {
    const filtered = manualCatalogRows.filter((row) => {
      if (manualSubjectFilter === 'all') return true
      return String(row.subject ?? '').trim() === manualSubjectFilter
    })

    return filtered
      .map((row) => ({
        courseCode: String(row.course_code_full ?? '').trim(),
        subject: String(row.subject ?? '').trim(),
        courseNumber: String(row.course_number ?? '').trim(),
        title: String(row.course_title ?? '').trim(),
        units: String(row.units ?? '').trim(),
      }))
      .filter((row) => row.courseCode)
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode))
  }, [manualCatalogRows, manualSubjectFilter])

  useEffect(() => {
    if (!manualSelectedCourse) return

    const syncSelectedCourse = Promise.resolve().then(() => {
      const selected = manualCourseOptions.find((option) => option.courseCode === manualSelectedCourse)
      if (!selected) return

      setManualCourseCode(selected.courseCode)
      setManualTitle(selected.title)
      setManualUnits(selected.units)
    })

    void syncSelectedCourse
  }, [manualCourseOptions, manualSelectedCourse])

  const addManualCourse = () => {
    const normalizedCode = manualCourseCode.trim().toUpperCase().replace(/\s+/g, ' ')
    if (!normalizedCode) {
      setError('Enter a course code to add a manual course.')
      return
    }

    const codeMatch = normalizedCode.match(/^([A-Z/& ]+)\s+(.+)$/)
    const subject = codeMatch?.[1]?.trim() ?? normalizedCode
    const courseNumber = codeMatch?.[2]?.trim() ?? ''
    const parsedUnits = manualUnits.trim() ? Number(manualUnits.trim()) : null

    if (manualUnits.trim() && Number.isNaN(parsedUnits)) {
      setError('Units must be a number.')
      return
    }

    const manualCourse: TranscriptCourse = {
      course_code: normalizedCode,
      subject,
      course_number: courseNumber,
      title: manualTitle.trim() || null,
      term: manualTerm.trim() || 'Manual Entry',
      grade: manualGrade.trim() || null,
      units: parsedUnits,
      raw_line: `MANUAL ENTRY: ${normalizedCode}`,
      matched_catalog: false,
      confidence: 1,
    }

    setResult((prev) => {
      const nextCourses = [...(prev?.extracted_courses ?? []), manualCourse]
      const nextGroupsMap = new Map<string, TranscriptCourse[]>()

      for (const course of nextCourses) {
        const key = course.term || 'Unknown Term'
        const existing = nextGroupsMap.get(key) ?? []
        existing.push(course)
        nextGroupsMap.set(key, existing)
      }

      const groupedByTerm = Array.from(nextGroupsMap.entries()).map(([term, courses]) => ({
        term,
        courses,
      }))

      return {
        student: prev?.student ?? { name: null, student_id: null },
        extracted_courses: nextCourses,
        grouped_by_term: groupedByTerm,
        unmatched_lines: prev?.unmatched_lines ?? [],
        warnings: prev?.warnings ?? [],
        total_pages: prev?.total_pages ?? 0,
        extracted_text_chars: prev?.extracted_text_chars ?? 0,
      }
    })

    setError('')
    setSaveMessage(`Added ${normalizedCode} to the review list.`)
    setManualCourseCode('')
    setManualTitle('')
    setManualTerm('')
    setManualGrade('')
    setManualUnits('')
    setManualSelectedCourse('')
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Choose a PDF transcript first.')
      return
    }

    setLoading(true)
    setError('')
    setSaveMessage('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${backendBaseUrl}/transcript/parse`, {
        method: 'POST',
        body: formData,
      })

      const raw = await response.json()
      if (!response.ok) {
        throw new Error(raw?.detail ?? 'Transcript parsing failed.')
      }

      setResult(raw as TranscriptParseResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcript parsing failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCourses = async () => {
    if (!result || result.extracted_courses.length === 0) {
      setError('Parse a transcript before saving courses.')
      return
    }

    setSaving(true)
    setError('')
    setSaveMessage('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('You must be logged in to save completed courses.')

      const rows = result.extracted_courses.map((course) => ({
        auth_user_id: authData.user!.id,
        course_code: course.course_code,
        subject: course.subject,
        course_number: course.course_number,
        title: course.title,
        term: course.term ?? '',
        grade: course.grade,
        units: course.units,
        raw_line: course.raw_line,
        matched_catalog: course.matched_catalog,
        confidence: course.confidence,
        source: 'completed_courses',
      }))

      const { error: upsertError } = await supabase
        .from('completed_courses')
        .upsert(rows, {
          onConflict: 'auth_user_id,course_code,term',
        })

      if (upsertError) throw new Error(upsertError.message)

      setSaveMessage(`Saved ${rows.length} completed course row(s) to your account.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save completed courses.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="bg-schu-teal px-8 py-3 flex justify-between items-center shadow-md">
        <Link href="/dashboard" className="text-2xl font-bold text-white tracking-tight hover:opacity-80">
          ScheduleU
        </Link>
        <nav className="flex items-center gap-6 text-white">
          <Link href="/courses" className="text-sm font-medium hover:opacity-80">Courses</Link>
          <Link href="/user-profile" className="text-sm font-medium hover:opacity-80">Profile</Link>
        </nav>
      </header>
      <div className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-700 uppercase tracking-tighter">Progress Tracker</h1>
            <p className="text-slate-500 font-medium">
              Upload completed coursework, then visualize how it applies to your degree plan.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </header>

        <section className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50 to-blue-50 p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#1e4e8c]">Degree Visualizer</p>
              <h2 className="mt-1 text-xl font-black text-slate-800">See your progress by requirement group</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Open the visualizer after importing courses to compare completed units, remaining courses, and what-if major options.
              </p>
            </div>
            <Link href="/planner/degree-audit" className="inline-flex items-center justify-center rounded-xl bg-[#1e4e8c] px-4 py-2 text-sm font-black text-white shadow-sm transition-opacity hover:opacity-90">
              Open Degree Visualizer
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="transcript-file" className="block text-xs font-black text-slate-500 uppercase tracking-wider">
              Transcript PDF
            </label>
            <input
              id="transcript-file"
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500">
              First pass only: this works best on text-based PDFs. Scanned image PDFs will likely need OCR.
            </p>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            className="rounded-xl schu-gradient px-4 py-2 text-sm font-black text-white transition-colors hover:opacity-90 disabled:opacity-60 shadow-sm"
          >
            {loading ? 'Parsing Transcript...' : 'Upload and Parse'}
          </button>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {saveMessage && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {saveMessage}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Add Completed Course Manually</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use this when a transcript course is missing or you want to demo progress tracking without a PDF.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <select
              value={manualCatalogTable}
              onChange={(event) => setManualCatalogTable(event.target.value)}
              className="rounded-xl border-2 border-gray-100 px-3 py-2 text-sm bg-white"
            >
              {MANUAL_TERM_TABLE_OPTIONS.map((option) => (
                <option key={option.table} value={option.table}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={manualSubjectFilter}
              onChange={(event) => {
                setManualSubjectFilter(event.target.value)
                setManualSelectedCourse('')
                setManualCourseCode('')
                setManualTitle('')
                setManualUnits('')
              }}
              className="rounded-xl border-2 border-gray-100 px-3 py-2 text-sm bg-white"
              disabled={manualCatalogLoading}
            >
              <option value="all">All subjects</option>
              {manualSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <select
              value={manualSelectedCourse}
              onChange={(event) => setManualSelectedCourse(event.target.value)}
              className="rounded-xl border-2 border-gray-100 px-3 py-2 text-sm bg-white"
              disabled={manualCatalogLoading || manualCourseOptions.length === 0}
            >
              <option value="">
                {manualCatalogLoading
                  ? 'Loading catalog courses...'
                  : manualCourseOptions.length === 0
                    ? 'No courses found'
                    : 'Select a course from the database'}
              </option>
              {manualCourseOptions.map((option) => (
                <option key={option.courseCode} value={option.courseCode}>
                  {option.courseCode} - {option.title || 'Untitled Course'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              value={manualCourseCode}
              onChange={(event) => setManualCourseCode(event.target.value)}
              placeholder="CECS 274"
              className="rounded-xl border-2 border-gray-100 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              placeholder="Course title"
              className="rounded-xl border-2 border-gray-100 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={manualTerm}
              onChange={(event) => setManualTerm(event.target.value)}
              placeholder="Spring 2026"
              className="rounded-xl border-2 border-gray-100 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={manualGrade}
              onChange={(event) => setManualGrade(event.target.value)}
              placeholder="A"
              className="rounded-xl border-2 border-gray-100 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={manualUnits}
              onChange={(event) => setManualUnits(event.target.value)}
              placeholder="3"
              className="rounded-xl border-2 border-gray-100 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={addManualCourse}
            className="rounded-xl bg-[#1e4e8c] px-4 py-2 text-sm font-black text-white transition-colors hover:opacity-90 shadow-sm"
          >
            Add Manual Course
          </button>
        </section>

        {result && (
          <>
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Parse Summary</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveCourses}
                  disabled={saving || result.extracted_courses.length === 0}
                  className="rounded-xl bg-[#1e4e8c] px-4 py-2 text-sm font-black text-white transition-colors hover:opacity-90 disabled:opacity-60 shadow-sm"
                >
                  {saving ? 'Saving Courses...' : 'Save Courses to My Account'}
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                  <p className="text-sm text-slate-900">{result.student.name || 'Not detected'}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Student ID</p>
                  <p className="text-sm text-slate-900">{result.student.student_id || 'Not detected'}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pages</p>
                  <p className="text-sm text-slate-900">{result.total_pages}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-gray-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Extracted Courses</p>
                  <p className="text-sm text-slate-900">{result.extracted_courses.length}</p>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                  <h3 className="text-sm font-semibold text-amber-900">Warnings</h3>
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Courses By Term</h2>
              <div className="mt-4 space-y-4">
                {result.grouped_by_term.length === 0 ? (
                  <p className="text-sm text-slate-600">No courses were extracted.</p>
                ) : (
                  result.grouped_by_term.map((group) => (
                    <div key={group.term} className="rounded-xl border border-slate-100 bg-gray-50 p-3">
                      <h3 className="text-base font-semibold text-slate-900">{group.term}</h3>
                      <div className="mt-3 grid gap-3">
                        {group.courses.map((course) => (
                          <div key={`${group.term}-${course.course_code}-${course.raw_line}`} className="rounded-xl border border-slate-100 bg-white p-3">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <p className="font-semibold text-slate-900">{course.course_code}</p>
                              <p className="text-xs text-slate-500">
                                Confidence {Math.round(course.confidence * 100)}%
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-slate-700">{course.title || 'Untitled course line'}</p>
                            <p className="mt-2 text-xs text-slate-600">
                              Grade: {course.grade || 'N/A'} | Units: {course.units ?? 'N/A'} | Catalog match: {course.matched_catalog ? 'Yes' : 'No'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {result.unmatched_lines.length > 0 && (
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
                <h2 className="text-lg font-semibold text-slate-900">Unmatched Lines</h2>
                <p className="mt-1 text-sm text-slate-600">
                  These lines looked course-like but were not confidently parsed.
                </p>
                <div className="mt-3 space-y-2">
                  {result.unmatched_lines.map((line, index) => (
                    <div key={`${index}-${line}`} className="rounded-xl border border-slate-100 bg-gray-50 px-3 py-2 text-sm text-slate-700">
                      {line}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  )
}
