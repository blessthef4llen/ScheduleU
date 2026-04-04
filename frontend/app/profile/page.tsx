'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { buildMajorGroups, MAJOR_GROUPS, type MajorGroup, type MajorRow } from '@/data/majors'

const CURRENT_YEAR = new Date().getFullYear()
const TERM_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'] as const

const TERM_OPTIONS = Array.from({ length: 7 }, (_, offset) => CURRENT_YEAR + offset).flatMap((year) =>
  TERM_NAMES.map((term) => `${term} ${year}`)
)

export default function ProfilePage() {
  const [major, setMajor] = useState('')
  const [gradTerm, setGradTerm] = useState('')
  const [message, setMessage] = useState('')
  const [majorGroups, setMajorGroups] = useState<MajorGroup[]>(MAJOR_GROUPS)

  useEffect(() => {
    const loadMajors = async () => {
      const { data, error } = await supabase
        .from('majors')
        .select('college,major_name,college_sort_order,major_sort_order')
        .eq('is_active', true)
        .order('college_sort_order', { ascending: true })
        .order('major_sort_order', { ascending: true })

      if (error || !data) return

      const groups = buildMajorGroups(data as MajorRow[])
      if (groups.length > 0) {
        setMajorGroups(groups)
      }
    }

    void loadMajors()
  }, [])

  const updateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('❌ You must be logged in!')
      return
    }

    const payload = {
      id: user.id,
      major,
      grad_year: Number.parseInt(gradTerm.split(' ').at(-1) ?? '', 10) || null,
      grad_term: gradTerm || null,
      email: user.email,
    }

    let { error } = await supabase
      .from('profiles')
      .upsert(payload)

    if (error?.message?.includes('grad_term')) {
      const fallbackPayload = {
        id: user.id,
        major,
        grad_year: Number.parseInt(gradTerm.split(' ').at(-1) ?? '', 10) || null,
        email: user.email,
      }

      const fallbackResult = await supabase
        .from('profiles')
        .upsert(fallbackPayload)

      error = fallbackResult.error
    }

    if (error) setMessage(`❌ Error: ${error.message}`)
    else setMessage('✅ Profile updated successfully!')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-black p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-blue-600">Profile Setup</h1>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>
        <select
          className="w-full border p-3 rounded mb-4 bg-white"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
        >
          <option value="">Select your major</option>
          {majorGroups.map((group) => (
            <optgroup key={group.college} label={group.college}>
              {group.majors.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          className="w-full border p-3 rounded mb-4 bg-white"
          value={gradTerm}
          onChange={(e) => setGradTerm(e.target.value)}
        >
          <option value="">Select expected graduation term</option>
          {TERM_OPTIONS.map((term) => (
            <option key={term} value={term}>
              {term}
            </option>
          ))}
        </select>
        <button
          onClick={updateProfile}
          className="w-full bg-blue-600 text-white py-3 rounded font-bold"
        >
          Save Profile
        </button>
        {message && <p className="mt-4 text-center font-medium">{message}</p>}
      </div>
    </div>
  )
}
