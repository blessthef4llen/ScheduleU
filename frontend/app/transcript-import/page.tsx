'use client'

import { useState } from 'react'
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

const backendBaseUrl = process.env.NEXT_PUBLIC_SCHEDULER_API_URL ?? 'http://localhost:8000'

export default function TranscriptImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [result, setResult] = useState<TranscriptParseResponse | null>(null)

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
        source: 'transcript_import',
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
    <div className="min-h-screen bg-slate-50 p-4 text-black md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-700">Transcript Import</h1>
            <p className="text-slate-700">
              Upload a transcript PDF to extract completed courses for review.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Back to Dashboard
          </Link>
        </header>

        <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-5 space-y-4">
          <div className="space-y-2">
            <label htmlFor="transcript-file" className="block text-sm font-medium text-slate-700">
              Transcript PDF
            </label>
            <input
              id="transcript-file"
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500">
              First pass only: this works best on text-based PDFs. Scanned image PDFs will likely need OCR.
            </p>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
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

        {result && (
          <>
            <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Parse Summary</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveCourses}
                  disabled={saving || result.extracted_courses.length === 0}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                >
                  {saving ? 'Saving Courses...' : 'Save Courses to My Account'}
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                  <p className="text-sm text-slate-900">{result.student.name || 'Not detected'}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Student ID</p>
                  <p className="text-sm text-slate-900">{result.student.student_id || 'Not detected'}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pages</p>
                  <p className="text-sm text-slate-900">{result.total_pages}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 px-3 py-2">
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

            <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-lg font-semibold text-slate-900">Courses By Term</h2>
              <div className="mt-4 space-y-4">
                {result.grouped_by_term.length === 0 ? (
                  <p className="text-sm text-slate-600">No courses were extracted.</p>
                ) : (
                  result.grouped_by_term.map((group) => (
                    <div key={group.term} className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                      <h3 className="text-base font-semibold text-slate-900">{group.term}</h3>
                      <div className="mt-3 grid gap-3">
                        {group.courses.map((course) => (
                          <div key={`${group.term}-${course.course_code}-${course.raw_line}`} className="rounded-lg border border-slate-300 bg-white p-3">
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
              <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-5">
                <h2 className="text-lg font-semibold text-slate-900">Unmatched Lines</h2>
                <p className="mt-1 text-sm text-slate-600">
                  These lines looked course-like but were not confidently parsed.
                </p>
                <div className="mt-3 space-y-2">
                  {result.unmatched_lines.map((line, index) => (
                    <div key={`${index}-${line}`} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
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
  )
}
