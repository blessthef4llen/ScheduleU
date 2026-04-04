"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState('Profile Information');
  const [status, setStatus] = useState('Junior');
  const [creditLoad, setCreditLoad] = useState(12);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('phone_number, student_status, credit_load')
          .eq('email', 'ES@student.csulb.edu')
          .single();

        if (data) {
          setPhoneNumber(data.phone_number || '');
          setStatus(data.student_status || 'Junior');
          setCreditLoad(data.credit_load || 12);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleSaveAcademic = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ 
        student_status: status, 
        credit_load: creditLoad 
      })
      .eq('email', 'ES@student.csulb.edu');

    setIsSaving(false);
    if (error) {
      alert("Error saving: " + error.message);
    } else {
      alert("Success! Academic details updated.");
    }
  };

  const tabs = [
    { name: 'Profile Information', icon: '👤' },
    { name: 'Academic Details', icon: '🎓' },
    { name: 'Schedule Preferences', icon: '📅' },
    { name: 'Notification Settings', icon: '🔔' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="bg-[#46BDC1] h-12 flex items-center justify-between px-8 text-white">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl uppercase italic">ScheduleU</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span>About us</span>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">👤</div>
          <div className="flex flex-col gap-1 cursor-pointer">
            <div className="w-6 h-0.5 bg-white"></div>
            <div className="w-6 h-0.5 bg-white"></div>
            <div className="w-6 h-0.5 bg-white"></div>
          </div>
        </div>
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
                  ? 'bg-gradient-to-r from-[#46BDC1] to-blue-600 text-white shadow-lg scale-[1.02]' 
                  : 'text-slate-500 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                {tab.name}
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
              <ProfileInfo 
                phoneNumber={phoneNumber} 
                setPhoneNumber={setPhoneNumber} 
              />
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
  );
}

function ProfileInfo({ phoneNumber, setPhoneNumber }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleUpdateProfile = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ phone_number: phoneNumber })
      .eq('email', 'ES@student.csulb.edu');

    setIsSaving(false);
    if (error) {
      alert("Update failed: " + error.message);
    } else {
      setIsEditing(false);
      alert("Database updated successfully!");
    }
  };

  const info = [
    { label: "Name", value: "Elbe Shark", editable: false },
    { label: "Email", value: "ES@student.csulb.edu", editable: false },
    { label: "MFA Phone", value: phoneNumber, editable: true },
    { label: "Graduation Year", value: "2026", editable: false },
    { label: "Major", value: "Computer Science", editable: false },
  ];

  return (
    <div className="flex gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-6">
        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center text-5xl text-gray-400 overflow-hidden border-4 border-white shadow-xl">👤</div>
        <div className="flex flex-col gap-2 w-full">
          <button 
            onClick={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
            disabled={isSaving}
            className={`w-full py-3 px-6 rounded-xl font-black text-xs tracking-widest transition-all shadow-md active:scale-95 uppercase ${
              isEditing ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white border-2 border-gray-100 text-[#1D4E5F] hover:bg-gray-50'
            }`}
          >
            {isSaving ? "SAVING..." : isEditing ? "SAVE CHANGES" : "EDIT PROFILE"}
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
        {info.map((item, i) => (
          <div key={i} className="flex border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
            <div className="w-48 p-5 font-bold text-slate-500 bg-gray-50/50 border-r border-gray-50 text-sm uppercase tracking-tight">
              {item.label}
            </div>
            <div className="flex-1 p-5 text-slate-700 font-bold">
              {isEditing && item.editable ? (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <input 
                    type="text"
                    value={item.value}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-blue-50/50 border-b-2 border-[#46BDC1] outline-none px-3 py-1 text-blue-700 font-black rounded-t-lg"
                    autoFocus
                  />
                  <p className="text-[10px] text-blue-400 mt-1 italic">Updating security field...</p>
                </div>
              ) : (
                <span className={item.label === 'MFA Phone' ? 'text-blue-600' : ''}>
                  {item.value || "Not Enrolled"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AcademicDetails({ status, setStatus, creditLoad, setCreditLoad, onSave, isSaving }) {
  return (
    <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center mb-10">
        <span className="bg-[#46BDC1] text-white px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest shadow-sm">Academic Settings</span>
        <button 
          onClick={onSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl px-8 py-3 hover:opacity-90 font-black shadow-lg disabled:opacity-50 active:scale-95 transition-all uppercase text-sm"
        >
          {isSaving ? "SAVING..." : "Save Academic Settings"}
        </button>
      </div>
      
      <div className="space-y-10">
        <div className="flex items-center gap-8">
          <span className="font-bold text-slate-500 w-48 uppercase text-xs">Student Status</span>
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border-2 border-gray-100 rounded-xl px-4 py-3 text-slate-700 font-bold bg-white outline-none focus:border-[#46BDC1] transition-all cursor-pointer shadow-sm"
          >
            <option>Freshman</option>
            <option>Sophomore</option>
            <option>Junior</option>
            <option>Senior</option>
            <option>Graduate</option>
          </select>
        </div>

        <div className="flex items-center gap-8">
          <span className="font-bold text-slate-500 w-48 uppercase text-xs">Planned Credit Load</span>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              value={creditLoad}
              onChange={(e) => setCreditLoad(parseInt(e.target.value))}
              className="border-2 border-blue-400 rounded-xl px-4 py-2 text-blue-600 font-black w-24 text-center outline-none bg-blue-50/50 shadow-inner"
            />
            <span className="text-sm font-black text-slate-400 uppercase italic">Units</span>
          </div>
        </div>

        <div className="border-t border-gray-50 pt-10">
          <div className="flex items-center gap-8">
            <span className="font-bold text-slate-500 w-48 uppercase text-xs">Preferred Days</span>
            <div className="flex gap-5">
              {['MW', 'TTH', 'F', 'SAT', 'ONLINE'].map(day => (
                <label key={day} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 border-2 rounded-md border-gray-200 checked:bg-[#46BDC1] transition-all" />
                  <span className="text-sm font-bold text-slate-600 group-hover:text-blue-500 transition-colors">{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchedulePrefs() {
  const prefs = [
    "Enable AI Workload Balancer",
    "Notify me if a class becomes available",
    "Auto-Sync with Google Calendar",
    "Suggest alternative instructors"
  ];

  return (
    <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center mb-10">
        <span className="bg-[#46BDC1] text-white px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest shadow-sm">AI Preferences</span>
        <button className="border-2 border-gray-100 rounded-xl px-6 py-2 hover:bg-gray-50 font-black text-xs text-slate-500 uppercase tracking-wider">Update Prefs</button>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {prefs.map(pref => (
          <label key={pref} className="flex items-center gap-6 p-5 hover:bg-gray-50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-gray-100">
            <div className="relative flex items-center">
              <input type="checkbox" className="w-8 h-8 border-2 border-gray-200 rounded-lg checked:bg-[#46BDC1] transition-all appearance-none checked:border-[#46BDC1]" defaultChecked />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white font-bold opacity-0 peer-checked:opacity-100">✓</div>
            </div>
            <span className="text-lg font-bold text-slate-700 tracking-tight">{pref}</span>
          </label>
        ))}
      </div>
    </div>
  );
}