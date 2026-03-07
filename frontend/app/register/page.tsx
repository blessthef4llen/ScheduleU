'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignUp = async () => {
    if (!email.endsWith('.edu')) {
      setMessage('❌ Error: Only .edu emails allowed.')
      return
    }
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(`❌ ${error.message}`)
    else {
      setMessage('✅ Success! Redirecting...')
      setTimeout(() => router.push('/profile'), 2000)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-black">
      <div className="p-8 bg-white shadow-2xl rounded-3xl w-full max-w-md border">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Join ScheduleU</h1>
        <input type="email" placeholder="email@school.edu" className="border p-4 rounded-xl w-full mb-4" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="border p-4 rounded-xl w-full mb-4" onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleSignUp} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">Create Account</button>
        {message && <p className="mt-4 text-center font-medium">{message}</p>}
      </div>
    </div>
  )
}