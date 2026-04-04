"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // This tells Supabase to update the password for the currently "token-authenticated" user
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    } else {
      setMessage("Success! Password updated. Redirecting to login...");
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl rounded-2xl border border-gray-100">
        
        <div className="text-center">
          <h1 className="text-3xl font-black text-blue-600 uppercase tracking-tight">Set New Password</h1>
          <p className="text-gray-500 mt-2">Enter your secure new credentials below.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-2 text-left">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
              >
                {showPassword ? "🔒" : "👁️"}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 rounded-xl text-white font-black transition shadow-lg ${
              loading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {loading ? "SAVING..." : "CONFIRM NEW PASSWORD"}
          </button>
        </form>

        {message && (
          <div className={`p-4 rounded-xl text-center text-sm font-bold animate-pulse ${
            message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}