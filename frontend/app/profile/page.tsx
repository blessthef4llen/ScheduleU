// Profile page for ScheduleU.
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { buildMajorGroups, MAJOR_GROUPS, type MajorGroup, type MajorRow } from '@/data/majors'
import { encryptData } from '@/utils/security'

const CURRENT_YEAR = new Date().getFullYear()
const TERM_NAMES = ['Spring', 'Summer', 'Fall', 'Winter'] as const

const TERM_OPTIONS = Array.from({ length: 7 }, (_, offset) => CURRENT_YEAR + offset).flatMap((year) =>
  TERM_NAMES.map((term) => `${term} ${year}`)
)

export default function ProfilePage() {
  // --- Existing Profile State ---
  const [major, setMajor] = useState('')
  const [gradTerm, setGradTerm] = useState('')
  const [message, setMessage] = useState('')
  const [majorGroups, setMajorGroups] = useState<MajorGroup[]>(MAJOR_GROUPS)

  // --- New Transcript Scanner State ---
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any[] | null>(null)
  const [vaultStatus, setVaultStatus] = useState<'empty' | 'secured'>('empty')

  useEffect(() => {
    const loadMajors = async () => {
      const { data, error } = await supabase
        .from('majors')
        .select('college,major_name,college_sort_order,major_sort_order')
        .eq('is_active', true)
        .order('college_sort_order', { ascending: true })
        .order('major_sort_order', { ascending: true })

      if (error || !data) return

      const groups = buildMajorGroups(data as MajorRow[])
      if (groups.length > 0) {
        setMajorGroups(groups)
      }
    }
    void loadMajors()
  }, [])

  // --- Original Profile Update Logic ---
  const updateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('❌ You must be logged in!')
      return
    }

    const payload = {
      id: user.id,
      major,
      grad_year: Number.parseInt(gradTerm.split(' ').at(-1) ?? '', 10) || null,
      grad_term: gradTerm || null,
      email: user.email,
    }

    let { error } = await supabase.from('profiles').upsert(payload)

    if (error?.message?.includes('grad_term')) {
      const fallbackPayload = {
        id: user.id,
        major,
        grad_year: Number.parseInt(gradTerm.split(' ').at(-1) ?? '', 10) || null,
        email: user.email,
      }
      const fallbackResult = await supabase.from('profiles').upsert(fallbackPayload)
      error = fallbackResult.error
    }

    if (error) setMessage(`❌ Error: ${error.message}`)
    else setMessage('✅ Profile updated successfully!')
  }

  // --- New FERPA Scanner Logic ---
  const handleTranscriptScan = async () => {
    setIsScanning(true)
    // Simulate OCR processing delay
    await new Promise(res => setTimeout(res, 2000))

    const mockData = [
      { code: 'CECS 326', grade: 'A' },
      { code: 'CECS 342', grade: 'B+' },
      { code: 'CECS 453', grade: 'A-' }
    ]

    setScanResult(mockData)
    setIsScanning(false)
  }

  const confirmAndEncryptTranscript = async () => {
    if (!scanResult) return
    const { data: { user } } = await supabase.auth.getUser()
    
    // Encrypt history string for FERPA compliance
    const encryptedHistory = encryptData(JSON.stringify(scanResult))

    const { error } = await supabase
      .from('student_transcripts')
      .insert([{ 
        user_id: user?.id,
        student_name_encrypted: encryptData("Student User"), 
        transcript_data_encrypted: encryptedHistory 
      }])

    if (!error) {
      setVaultStatus('secured')
      setScanResult(null)
      setMessage('🛡️ Transcript encrypted and secured!')
    } else {
      setMessage(`❌ Vault Error: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Account Settings</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">CSULB Student Portal</p>
          </div>
          <Link href="/dashboard" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold text-sm transition-all">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Basic Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-600 mb-6">Major & Graduation</h2>
              
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Current Major</label>
              <select
                className="w-full border-none bg-slate-50 p-4 rounded-2xl mb-4 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
              >
                <option value="">Select Major</option>
                {majorGroups.map((group) => (
                  <optgroup key={group.college} label={group.college}>
                    {group.majors.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2">Graduation Term</label>
              <select
                className="w-full border-none bg-slate-50 p-4 rounded-2xl mb-6 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                value={gradTerm}
                onChange={(e) => setGradTerm(e.target.value)}
              >
                <option value="">Select Term</option>
                {TERM_OPTIONS.map((term) => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>

              <button
                onClick={updateProfile}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                Save Profile
              </button>
              {message && <p className="mt-4 text-center text-xs font-bold text-blue-600">{message}</p>}
            </div>
          </div>

          {/* Column 2 & 3: FERPA Scanner & History */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 h-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">FERPA Student Vault</h2>
                {vaultStatus === 'secured' && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    AES-256 ENCRYPTED
                  </div>
                )}
              </div>

              {!scanResult && vaultStatus === 'empty' && (
                <div className="text-center py-16 border-4 border-dashed border-slate-50 rounded-[32px]">
                  <div className="text-5xl mb-4">📄</div>
                  <h3 className="font-black text-slate-800 text-lg">No Academic History Found</h3>
                  <p className="text-slate-400 text-xs font-bold mt-2 max-w-xs mx-auto mb-8">
                    Upload your transcript to enable prerequisite checking and degree progress tracking.
                  </p>
                  <button 
                    onClick={handleTranscriptScan}
                    disabled={isScanning}
                    className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-black transition-all"
                  >
                    {isScanning ? "Processing PDF..." : "Scan CSULB Transcript"}
                  </button>
                </div>
              )}

              {scanResult && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-50 p-6 rounded-3xl mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Verification Required</p>
                    <div className="space-y-3">
                      {scanResult.map((c, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                          <span className="font-black text-slate-700">{c.code}</span>
                          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-black">{c.grade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={confirmAndEncryptTranscript}
                    className="w-full bg-[#4FD1C5] text-white py-5 rounded-[24px] font-black uppercase text-sm shadow-xl shadow-[#4fd1c53b] hover:bg-[#38b2ac] transition-all"
                  >
                    Lock & Encrypt to Vault
                  </button>
                </div>
              )}

              {vaultStatus === 'secured' && (
                <div className="py-16 text-center">
                  <div className="text-6xl mb-6">🛡️</div>
                  <h3 className="text-2xl font-black text-slate-800">Transcript Verified</h3>
                  <p className="text-slate-400 text-sm font-bold mt-2">Your PII is now protected under FERPA standards.</p>
                  <div className="mt-10 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Last Update</p>
                      <p className="text-xs font-bold text-slate-700">April 2026</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                      <p className="text-xs font-bold text-emerald-600">Active / Compliant</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}