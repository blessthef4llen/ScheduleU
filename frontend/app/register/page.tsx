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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-black p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl rounded-2xl border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black text-blue-600 tracking-tight uppercase italic">ScheduleU</h1>
          <p className="text-gray-500 mt-2 font-medium">Create your university account</p>
        </div>
        <input type="email" placeholder="email@school.edu" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition font-medium" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition font-medium" onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleSignUp} className="w-full py-4 rounded-xl text-white font-black shadow-lg transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700">Create Account</button>
        {message && <p className="mt-4 text-center font-medium">{message}</p>}
      </div>
    </div>
  )
}
