"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState('Profile Information');

  const tabs = [
    { name: 'Profile Information', icon: '👤' },
    { name: 'Academic Details', icon: '🎓' },
    { name: 'Schedule Preferences', icon: '📅' },
    { name: 'Notification Settings', icon: '🔔' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-[#46BDC1] h-12 flex items-center justify-between px-8 text-white">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl">ScheduleU</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span>About us</span>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600">👤</div>
          <div className="flex flex-col gap-1">
            <div className="w-6 h-0.5 bg-white"></div>
            <div className="w-6 h-0.5 bg-white"></div>
            <div className="w-6 h-0.5 bg-white"></div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-72 bg-white min-h-[calc(100vh-48px)] p-6 border-r">
          <div className="flex flex-col gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`flex items-center gap-4 p-4 rounded-xl font-medium transition-all ${
                  activeTab === tab.name 
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-gray-100 border border-gray-100'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-12">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-[#1D4E5F] mb-8 tracking-wide uppercase">
              Manage Your Profile & Preferences
            </h1>

            {/* Dynamic Content Switching */}
            {activeTab === 'Profile Information' && <ProfileInfo />}
            {activeTab === 'Academic Details' && <AcademicDetails />}
            {activeTab === 'Schedule Preferences' && <SchedulePrefs />}
            
            {activeTab === 'Notification Settings' && (
              <div className="bg-white p-8 rounded-xl border italic text-gray-400">
                Notification settings coming soon...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- SECTION 1: PROFILE INFO --- */
function ProfileInfo() {
  const info = [
    { label: "Name", value: "Elbe Shark" },
    { label: "Email", value: "ES@student.csulb.edu" },
    { label: "Graduation Year", value: "2026" },
    { label: "Major", value: "Computer Science" },
    { label: "Minor", value: "Business Admin" },
    { label: "Profile Bio", value: "Interested in technology" },
  ];

  return (
    <div className="flex gap-12 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-5xl text-gray-500 overflow-hidden border-4 border-white shadow">👤</div>
        <button className="text-xs border rounded-lg px-4 py-2 hover:bg-gray-50">Change profile Picture</button>
      </div>
      <div className="flex-1 bg-white border rounded shadow-sm overflow-hidden">
        {info.map((item, i) => (
          <div key={i} className="flex border-b last:border-b-0 hover:bg-gray-50 transition">
            <div className="w-48 p-4 font-semibold text-slate-700 bg-gray-50 border-r">{item.label}</div>
            <div className="p-4 text-slate-600">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- SECTION 2: ACADEMIC DETAILS --- */
function AcademicDetails() {
  return (
    <div className="bg-white p-10 rounded-xl border shadow-sm animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center mb-8">
        <span className="bg-[#46BDC1] text-white px-4 py-1 rounded font-bold">Academic Settings</span>
        <button className="border rounded px-6 py-2 hover:bg-gray-50 font-medium">Save Academic Settings</button>
      </div>
      
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <span className="font-bold text-slate-700 w-48">Preferred Class Days</span>
          <div className="flex gap-4">
            {['MW', 'TTH', 'F', 'SAT', 'ONLINE'].map(day => (
              <label key={day} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 border-2 rounded border-black" />
                <span className="text-sm font-medium">{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <span className="font-bold text-slate-700 w-48">Earliest Start Time</span>
          <select className="border-2 border-blue-400 rounded px-3 py-1 text-blue-600 font-bold bg-white">
            <option>8:00 AM</option>
            <option>9:00 AM</option>
          </select>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500 italic mt-12">
           {/* Add your commute icons here */}
           <span>Commute Mode: 🚗 Driving | 🚶 Walking | 🚌 Bus</span>
        </div>
      </div>
    </div>
  );
}

/* --- SECTION 3: SCHEDULE PREFERENCES --- */
function SchedulePrefs() {
  const prefs = [
    "Enable AI Workload Balancer",
    "Notify me if a class becomes available",
    "Auto-Sync with Google Calendar",
    "Suggest alternative instructors"
  ];

  return (
    <div className="bg-white p-10 rounded-xl border shadow-sm animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center mb-8">
        <span className="bg-[#46BDC1] text-white px-4 py-1 rounded font-bold">Scheduling & AI Preferences</span>
        <button className="border rounded px-6 py-2 hover:bg-gray-50 font-medium">Update Preferences</button>
      </div>
      
      <div className="space-y-6">
        {prefs.map(pref => (
          <label key={pref} className="flex items-center gap-6 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition">
            <input type="checkbox" className="w-8 h-8 border-4 border-black rounded" defaultChecked />
            <span className="text-xl font-medium text-slate-700">{pref}</span>
          </label>
        ))}
      </div>
    </div>
  );
}