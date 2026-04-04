'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

export default function UserProfilePage() {
  const [activeTab, setActiveTab] = useState('Profile Information')
  const [status, setStatus] = useState('Junior')
  const [creditLoad, setCreditLoad] = useState(12)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) return

      const { data } = await supabase
        .from('users')
        .select('phone_number, student_status, credit_load')
        .eq('email', user.email)
        .single()

      if (data) {
        setPhoneNumber(data.phone_number || '')
        setStatus(data.student_status || 'Junior')
        setCreditLoad(data.credit_load || 12)
      }
    }

    void fetchUserData()
  }, [])

  const handleSaveAcademic = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    setIsSaving(true)
    const { error } = await supabase
      .from('users')
      .update({
        student_status: status,
        credit_load: creditLoad,
      })
      .eq('email', user.email)
    setIsSaving(false)

    if (error) {
      alert(`Error saving: ${error.message}`)
      return
    }

    alert('Success! Academic details updated.')
  }

  const tabs = [
    { name: 'Profile Information', icon: 'Profile' },
    { name: 'Academic Details', icon: 'Academic' },
    { name: 'Schedule Preferences', icon: 'Schedule' },
    { name: 'Notification Settings', icon: 'Alerts' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="schu-gradient h-12 flex items-center justify-between px-8 text-white">
        <span className="font-bold text-xl uppercase italic">ScheduleU</span>
        <span className="text-sm">User Profile</span>
      </div>

      <div className="flex">
        <div className="w-72 bg-white min-h-[calc(100vh-48px)] p-6 border-r border-gray-100">
          <div className="flex flex-col gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center gap-4 p-4 rounded-xl font-bold transition-all ${
                  activeTab === tab.name
                    ? 'schu-gradient text-white shadow-lg scale-[1.02]'
                    : 'text-slate-500 hover:bg-gray-50 border border-transparent'
                }`}
              >
                {tab.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-12">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-black text-[#1D4E5F] mb-8 tracking-wide uppercase italic">
              Manage Your Profile & Preferences
            </h1>

            {activeTab === 'Profile Information' && (
              <ProfileInfo phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} />
            )}

            {activeTab === 'Academic Details' && (
              <AcademicDetails
                status={status}
                setStatus={setStatus}
                creditLoad={creditLoad}
                setCreditLoad={setCreditLoad}
                onSave={handleSaveAcademic}
                isSaving={isSaving}
              />
            )}

            {activeTab === 'Schedule Preferences' && <SchedulePrefs />}

            {activeTab === 'Notification Settings' && (
              <div className="bg-white p-8 rounded-xl border border-gray-100 italic text-gray-400 font-medium">
                Notification settings coming soon...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileInfo({
  phoneNumber,
  setPhoneNumber,
}: {
  phoneNumber: string
  setPhoneNumber: (value: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleUpdateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    setIsSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ phone_number: phoneNumber })
      .eq('email', user.email)
    setIsSaving(false)

    if (error) {
      alert(`Update failed: ${error.message}`)
      return
    }

    setIsEditing(false)
    alert('Database updated successfully!')
  }

  const info = [
    { label: 'MFA Phone', value: phoneNumber, editable: true },
  ]

  return (
    <div className="flex gap-12">
      <div className="flex flex-col items-center gap-6">
        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center text-5xl text-gray-400 overflow-hidden border-4 border-white shadow-xl">
          User
        </div>
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => (isEditing ? void handleUpdateProfile() : setIsEditing(true))}
            disabled={isSaving}
            className={`w-full py-3 px-6 rounded-xl font-black text-xs tracking-widest transition-all shadow-md uppercase ${
              isEditing ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white border-2 border-gray-100 text-[#1D4E5F] hover:bg-gray-50'
            }`}
          >
            {isSaving ? 'SAVING...' : isEditing ? 'SAVE CHANGES' : 'EDIT PROFILE'}
          </button>
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="text-[10px] text-gray-400 uppercase font-black hover:text-red-500 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {info.map((item) => (
          <div key={item.label} className="flex border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
            <div className="w-48 p-5 font-bold text-slate-500 bg-gray-50/50 border-r border-gray-50 text-sm uppercase tracking-tight">
              {item.label}
            </div>
            <div className="flex-1 p-5 text-slate-700 font-bold">
              {isEditing && item.editable ? (
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-blue-50/50 border-b-2 border-[#46BDC1] outline-none px-3 py-1 text-blue-700 font-black rounded-t-lg"
                  autoFocus
                />
              ) : (
                <span className="text-blue-600">{item.value || 'Not Enrolled'}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AcademicDetails({
  status,
  setStatus,
  creditLoad,
  setCreditLoad,
  onSave,
  isSaving,
}: {
  status: string
  setStatus: (value: string) => void
  creditLoad: number
  setCreditLoad: (value: number) => void
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Student Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3"
        >
          <option>Freshman</option>
          <option>Sophomore</option>
          <option>Junior</option>
          <option>Senior</option>
          <option>Graduate</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Credit Load</label>
        <input
          type="number"
          value={creditLoad}
          onChange={(e) => setCreditLoad(Number(e.target.value))}
          className="w-full rounded-xl border border-gray-200 px-4 py-3"
        />
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="rounded-xl schu-gradient px-6 py-3 text-white font-bold disabled:opacity-60"
      >
        {isSaving ? 'SAVING...' : 'SAVE ACADEMIC DETAILS'}
      </button>
    </div>
  )
}

function SchedulePrefs() {
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-100 italic text-gray-400 font-medium">
      Schedule preferences coming soon...
    </div>
  )
}
