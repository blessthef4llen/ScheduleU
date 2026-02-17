// frontend/app/login/page.tsx
'use client' 

import { useState } from 'react'
import { supabase } from '@/lib/supabase' 
import Link from 'next/link'
import { useRouter } from 'next/navigation' 

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('Logging in...')

    // Supabase Sign-In Call (UC3: Login Function)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setMessage('Error: Invalid login credentials.')
      setLoading(false)
      console.error('Supabase Login Error:', error.message)
    } else {
      setMessage('Login successful! Redirecting...')
      // Redirect to the Dashboard page upon success
      router.push('/dashboard') 
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-xl">
        
        <h1 className="text-3xl font-bold text-center text-blue-600">ScheduleU</h1>
        <h2 className="text-xl font-semibold text-center text-gray-800">Sign In to Your Account</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Username/E-mail:</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="you@example.com" disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password:</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot password?
              </Link>
            </div>
          </div>

          {/* SIGN-IN Button */}
          <button type="submit" disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? 'Authenticating...' : 'SIGN-IN'}
          </button>
        </form>
        
        {/* Status Message */}
        {message && (<p className={`text-center text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>)}

        {/* 'Don't have an account yet?' Link */}
        <div className="text-center text-sm pt-4 border-t border-gray-200">
          <p className="text-gray-600">Don't have an account yet?
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 ml-1">SIGN-UP</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
