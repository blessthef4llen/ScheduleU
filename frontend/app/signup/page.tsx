// frontend/app/signup/page.tsx
'use client' 

import { useState } from 'react'
import { supabase } from '@/lib/supabase' 
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault()
    
    // 1. Client-Side Validation
    if (password !== confirmPassword) {
      setMessage('Error: Passwords do not match.')
      return
    }

    setLoading(true)
    setMessage('Signing up...')

    // 2. Supabase Sign-Up Call (UC2: Registration Function)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      // You can add options here, like redirect to dashboard after confirmation
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    } else if (data.user) {
      setMessage('Success! Check your email for a confirmation link.')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-xl">
        
        <h1 className="text-3xl font-bold text-center text-blue-600">ScheduleU</h1>
        <h2 className="text-xl font-semibold text-center text-gray-800">Create an Account</h2>

        <form onSubmit={handleSignUp} className="space-y-4">
          
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

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm password:</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" disabled={loading}
            />
          </div>

          {/* Sign Up Button */}
          <button type="submit" disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? 'Processing...' : 'SIGN-UP'}
          </button>
        </form>
        
        {/* Status Message */}
        {message && (<p className={`text-center text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>)}

        {/* 'Already Have an Account?' Link */}
        <div className="text-center text-sm">
          <p className="text-gray-600">Already Have an Account?
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 ml-1">SIGN-IN</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
