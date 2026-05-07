'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('') 
  const [showPassword, setShowPassword] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  // 1. Send the numerical OTP to the user's email
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('Sending your 8-digit security code...')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // DEPLOYMENT FIX: Set to true so new students can sign up 
        // through this form without manual dashboard entry.
        shouldCreateUser: true, 
      },
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    } else {
      setMessage('Success: Check your university email for your 8-digit code.')
      setShowOTP(true)
      setLoading(false)
    }
  }

  // 2. Verify the 8-digit code
  const verifyOTP = async () => {
    setLoading(true)
    setMessage('Verifying security code...')

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
      setLoading(false)
    } else {
      setMessage('Identity Verified! Redirecting...')
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  const handleResetPassword = async (event: React.MouseEvent) => {
    event.preventDefault()
    if (!email) {
      setMessage('Error: Please enter your email first.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setLoading(false)
    if (error) setMessage(`Error: ${error.message}`)
    else setMessage('Success: Recovery email sent!')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl rounded-2xl border border-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-black text-blue-600 tracking-tight uppercase italic">ScheduleU</h1>
          <p className="text-gray-500 mt-2 font-medium">University Secure Portal</p>
        </div>

        {!showOTP ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">University Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition font-medium"
                placeholder="you@student.csulb.edu"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition font-medium"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition"
                >
                  {showPassword ? '🔒' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="text-sm font-semibold text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl text-white font-black shadow-lg transition-all active:scale-[0.98] ${
                loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'AUTHENTICATING...' : 'SIGN-IN'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Multi-Factor Authentication</p>
              <p className="text-[11px] text-blue-400 mt-1">An 8-digit code was sent to your email.</p>
            </div>

            <input
              className="w-full border-2 border-black p-4 rounded-xl text-center text-3xl font-black tracking-[0.2em] outline-none bg-white focus:ring-4 focus:ring-blue-100 transition"
              maxLength={8}
              placeholder="00000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
            />

            <button
              onClick={verifyOTP}
              disabled={loading}
              className="w-full bg-[#46BDC1] text-white py-4 rounded-xl font-black shadow-lg hover:opacity-90 active:scale-95 transition"
            >
              {loading ? 'VERIFYING...' : 'VERIFY IDENTITY'}
            </button>
            
            <button 
              onClick={() => setShowOTP(false)}
              className="w-full text-xs font-bold text-gray-400 uppercase tracking-tighter hover:text-blue-600 transition"
            >
              Back to Login
            </button>
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-lg text-center text-sm font-bold ${
            message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}>
            {message}
          </div>
        )}

        <div className="text-center text-sm pt-6 border-t border-gray-100">
          <p className="text-gray-600 font-medium">
            Don't have an account yet?
            <Link href="/signup" className="font-bold text-blue-600 hover:underline ml-1">SIGN-UP</Link>
          </p>
        </div>
      </div>
    </div>
  )
}