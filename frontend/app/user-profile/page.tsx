'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState({
    apiLinked: true,
    lastSync: 'Just now',
    channel: 'University Email (@student.csulb.edu)'
  })

  useEffect(() => {
    // Simulate connection to your internal notification backend
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with ScheduleU Services...</p>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Status Indicator */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight uppercase italic">
            Notification Center
          </h1>
          <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-tighter">
            Internal Automated Student Success Pipeline
          </p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-emerald-700 uppercase">System Active</span>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Delivery Channel</p>
          <p className="text-lg font-black text-slate-700">{systemStatus.channel}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">Managed by District Office IT</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Last Database Sync</p>
          <p className="text-lg font-black text-slate-700">{systemStatus.lastSync}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">Real-time schedule monitoring active</p>
        </div>
      </div>

      {/* Automated Features List */}
      <div className="mt-10 p-8 bg-blue-50 rounded-[32px] border border-blue-100">
        <h3 className="text-sm font-black text-blue-800 uppercase mb-4">Automated Alerts Configured:</h3>
        <ul className="space-y-4">
          <li className="flex items-center gap-3 text-sm font-bold text-blue-600">
            <span className="text-lg">📅</span> Prerequisite Bottleneck Warnings
          </li>
          <li className="flex items-center gap-3 text-sm font-bold text-blue-600">
            <span className="text-lg">🛡️</span> FERPA Vault Security Updates
          </li>
          <li className="flex items-center gap-3 text-sm font-bold text-blue-600">
            <span className="text-lg">🎓</span> Graduation Eligibility Reminders
          </li>
        </ul>
      </div>

      {/* System Footer */}
      <div className="mt-10 pt-8 border-t border-slate-100 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          ScheduleU Internal Notification System v2.0
        </p>
      </div>
    </div>
  )
}