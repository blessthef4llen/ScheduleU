'use client'
import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'

export default function ProfilePage() {
  const [major, setMajor] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [message, setMessage] = useState('')

  const updateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('❌ You must be logged in!')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        major,
        grad_year: parseInt(gradYear),
        email: user.email,
      })

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
        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Major (e.g. CS)"
          onChange={(e) => setMajor(e.target.value)}
        />
        <input
          className="w-full border p-3 rounded mb-4"
          type="number"
          placeholder="Grad Year"
          onChange={(e) => setGradYear(e.target.value)}
        />
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
