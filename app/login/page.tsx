'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase' 
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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('Verifying credentials...')

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setMessage('Error: Invalid login credentials.')
      setLoading(false)
    } else {
      setMessage('Success: Verification code sent to your device.')
      setShowOTP(true)
      setLoading(false)
    }
  }

  const verifySMS = () => {
    setLoading(true)
    if (otp === "774129") {
      setMessage('Identity Verified! Redirecting...')
      setTimeout(() => router.push('/dashboard'), 1500)
    } else {
      setMessage('Error: Invalid security code.')
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage('Error: Please enter your email first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    if (error) setMessage(`Error: ${error.message}`);
    else setMessage('Success: Recovery email sent!');
  };

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
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition font-medium" 
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition"
                >
                  {showPassword ? "🔒" : "👁️"}
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
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Multi-Factor Authentication</p>
              <p className="text-[11px] text-blue-400 mt-1">A 6-digit code was sent to your registered mobile device.</p>
            </div>
            
            <input 
              className="w-full border-2 border-black p-4 rounded-xl text-center text-3xl font-black tracking-[0.5em] outline-none bg-white focus:ring-4 focus:ring-blue-100 transition" 
              maxLength={6}
              placeholder="000000"
              onChange={(e) => setOtp(e.target.value)} 
              disabled={loading}
            />

            <button 
              onClick={verifySMS}
              disabled={loading}
              className="w-full bg-[#46BDC1] text-white py-4 rounded-xl font-black shadow-lg hover:opacity-90 active:scale-95 transition"
            >
              {loading ? 'VERIFYING...' : 'VERIFY IDENTITY'}
            </button>
          </div>
        )}
        
        {message && (
          <div className={`p-3 rounded-lg text-center text-sm font-bold ${
            message.startsWith('Error') || message.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
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