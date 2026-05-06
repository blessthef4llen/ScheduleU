"use client";
import { useState, useEffect, useMemo, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { buildMajorGroups, MAJOR_GROUPS, type MajorGroup, type MajorRow } from '@/data/majors';

type ProfileRow = {
  major: string | null
  grad_year: number | string | null
  grad_term?: string | null
}

type CompletedCourseRow = {
  id: number
  course_code: string
  title: string | null
  term: string | null
  grade: string | null
  units: number | null
}

type CatalogCourseOption = {
  courseCode: string
  title: string | null
  units: number | null
  subject: string
  courseNumber: string
}

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => String(CURRENT_YEAR + index));
const TERM_SEASON_OPTIONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
const COMPLETED_COURSE_YEAR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(CURRENT_YEAR - index + 1));
const GRADE_OPTIONS = [
  'A', 'B', 'C', 'D', 'F',
  'Pass', 'Fail', 'Non-Credit',
] as const;

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState('Profile Information');
  const [status, setStatus] = useState('Junior');
  const [creditLoad, setCreditLoad] = useState(12);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [major, setMajor] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [majorGroups, setMajorGroups] = useState<MajorGroup[]>(MAJOR_GROUPS);
  const [completedCourses, setCompletedCourses] = useState<CompletedCourseRow[]>([]);
  const [loadingCompletedCourses, setLoadingCompletedCourses] = useState(true);
  const [completedCoursesError, setCompletedCoursesError] = useState('');
  const [savedProfile, setSavedProfile] = useState({
    name: '',
    phoneNumber: '',
    major: '',
    gradYear: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);

        const { data } = await supabase
          .from('users')
          .select('name, phone_number, student_status, credit_load')
          .eq('email', user.email)
          .single();

        if (data) {
          const fetchedName = data.name || '';
          const fetchedPhoneNumber = data.phone_number || '';
          setName(fetchedName);
          setPhoneNumber(fetchedPhoneNumber);
          setStatus(data.student_status || 'Junior');
          setCreditLoad(data.credit_load || 12);
          setSavedProfile((current) => ({
            ...current,
            name: fetchedName,
            phoneNumber: fetchedPhoneNumber,
          }));
        }

        const primaryProfile = await supabase
          .from('profiles')
          .select('major, grad_year, grad_term')
          .eq('id', user.id)
          .single();
        let profileData = primaryProfile.data as ProfileRow | null;

        if (!profileData) {
          const fallback = await supabase
            .from('profiles')
            .select('major, grad_year')
            .eq('id', user.id)
            .single();

          profileData = (fallback.data as ProfileRow | null);
        }

        if (profileData) {
          const fetchedMajor = profileData.major || '';
          const fetchedGradYear =
            ('grad_term' in profileData && profileData.grad_term)
              ? String(profileData.grad_term).split(' ').at(-1) ?? ''
              : (profileData.grad_year ? String(profileData.grad_year) : '');

          setMajor(fetchedMajor);
          setGradYear(fetchedGradYear);
          setSavedProfile((current) => ({
            ...current,
            major: fetchedMajor,
            gradYear: fetchedGradYear,
          }));
        }
      }
    };

    const loadMajors = async () => {
      const { data, error } = await supabase
        .from('majors')
        .select('college,major_name,college_sort_order,major_sort_order')
        .eq('is_active', true)
        .order('college_sort_order', { ascending: true })
        .order('major_sort_order', { ascending: true });

      if (error || !data) return;

      const groups = buildMajorGroups(data as MajorRow[]);
      if (groups.length > 0) {
        setMajorGroups(groups);
      }
    };

    const loadCompletedCourses = async () => {
      setLoadingCompletedCourses(true);
      setCompletedCoursesError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCompletedCourses([]);
        setLoadingCompletedCourses(false);
        return;
      }

      const { data, error } = await supabase
        .from('completed_courses')
        .select('id, course_code, title, term, grade, units')
        .eq('auth_user_id', user.id)
        .order('term', { ascending: false })
        .order('course_code', { ascending: true });

      if (error) {
        setCompletedCoursesError(error.message);
        setCompletedCourses([]);
      } else {
        setCompletedCourses((data ?? []) as CompletedCourseRow[]);
      }

      setLoadingCompletedCourses(false);
    };

    void fetchUserData();
    void loadMajors();
    void loadCompletedCourses();
  }, []);

  const handleSaveAcademic = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        student_status: status,
        credit_load: creditLoad
      })
      .eq('email', user.email);

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
    { name: 'Completed Courses', icon: '📚' },
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
          <Link href="/dashboard" className="hover:opacity-80">Dashboard</Link>
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
                name={name}
                userEmail={userEmail}
                phoneNumber={phoneNumber}
                major={major}
                gradYear={gradYear}
                majorGroups={majorGroups}
                savedProfile={savedProfile}
                setName={setName}
                setPhoneNumber={setPhoneNumber}
                setMajor={setMajor}
                setGradYear={setGradYear}
                setSavedProfile={setSavedProfile}
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

            {activeTab === 'Completed Courses' && (
              <CompletedCourses
                courses={completedCourses}
                setCourses={setCompletedCourses}
                loading={loadingCompletedCourses}
                error={completedCoursesError}
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

function ProfileInfo({
  name,
  userEmail,
  phoneNumber,
  major,
  gradYear,
  majorGroups,
  savedProfile,
  setName,
  setPhoneNumber,
  setMajor,
  setGradYear,
  setSavedProfile,
}: {
  name: string
  userEmail: string
  phoneNumber: string
  major: string
  gradYear: string
  majorGroups: MajorGroup[]
  savedProfile: {
    name: string
    phoneNumber: string
    major: string
    gradYear: string
  }
  setName: (value: string) => void
  setPhoneNumber: (value: string) => void
  setMajor: (value: string) => void
  setGradYear: (value: string) => void
  setSavedProfile: Dispatch<SetStateAction<{
    name: string
    phoneNumber: string
    major: string
    gradYear: string
  }>>
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    setIsSaving(true);
    const { error: userError } = await supabase
      .from('users')
      .update({
        name: name || null,
        phone_number: phoneNumber || null,
      })
      .eq('email', user.email);

    let profileError = null;

    if (!userError) {
      const profilePayload = {
        id: user.id,
        email: user.email,
        major: major || null,
        grad_year: Number.parseInt(gradYear, 10) || null,
      };

      const upsertResult = await supabase
        .from('profiles')
        .upsert(profilePayload);

      profileError = upsertResult.error;
    }

    setIsSaving(false);
    if (userError || profileError) {
      alert("Update failed: " + (userError?.message || profileError?.message));
    } else {
      setSavedProfile({
        name,
        phoneNumber,
        major,
        gradYear,
      });
      setIsEditing(false);
      alert("Database updated successfully!");
    }
  };

  const handleCancel = () => {
    setName(savedProfile.name);
    setPhoneNumber(savedProfile.phoneNumber);
    setMajor(savedProfile.major);
    setGradYear(savedProfile.gradYear);
    setIsEditing(false);
  };

  return (
    <div className="flex gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-6">
        <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center text-5xl text-gray-400 overflow-hidden border-4 border-white shadow-xl">👤</div>
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => isEditing ? void handleUpdateProfile() : setIsEditing(true)}
            disabled={isSaving}
            className={`w-full py-3 px-6 rounded-xl font-black text-xs tracking-widest transition-all shadow-md active:scale-95 uppercase ${
              isEditing ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white border-2 border-gray-100 text-[#1D4E5F] hover:bg-gray-50'
            }`}
          >
            {isSaving ? "SAVING..." : isEditing ? "SAVE CHANGES" : "EDIT PROFILE"}
          </button>
          {isEditing && (
            <button
              onClick={handleCancel}
              className="text-[10px] text-gray-400 uppercase font-black hover:text-red-500 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <EditableProfileRow
          label="Name"
          isEditing={isEditing}
          editable
          helperText="Shown on your account profile."
          editor={(
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-blue-50/50 border-b-2 border-[#46BDC1] outline-none px-3 py-1 text-blue-700 font-black rounded-t-lg"
            />
          )}
          displayValue={name || "Not available"}
        />
        <EditableProfileRow
          label="Email"
          isEditing={isEditing}
          editable={false}
          displayValue={userEmail || "Not available"}
        />
        <EditableProfileRow
          label="MFA Phone"
          isEditing={isEditing}
          editable
          helperText="Used for account security."
          editor={(
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-blue-50/50 border-b-2 border-[#46BDC1] outline-none px-3 py-1 text-blue-700 font-black rounded-t-lg"
            />
          )}
          displayValue={phoneNumber || "Not Enrolled"}
          displayClassName="text-blue-600"
        />
        <EditableProfileRow
          label="Graduation Year"
          isEditing={isEditing}
          editable
          helperText="Used for planning and graduation tracking."
          editor={(
            <select
              value={gradYear}
              onChange={(e) => setGradYear(e.target.value)}
              className="w-full bg-blue-50/50 border-b-2 border-[#46BDC1] outline-none px-3 py-2 text-blue-700 font-black rounded-t-lg"
            >
              <option value="">Select year</option>
              {GRAD_YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
          displayValue={gradYear || "Not set"}
        />
        <EditableProfileRow
          label="Major"
          isEditing={isEditing}
          editable
          helperText="Used to tailor planning recommendations."
          editor={(
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full bg-blue-50/50 border-b-2 border-[#46BDC1] outline-none px-3 py-2 text-blue-700 font-black rounded-t-lg"
            >
              <option value="">Select your major</option>
              {majorGroups.map((group) => (
                <optgroup key={group.college} label={group.college}>
                  {group.majors.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          displayValue={major || "Not set"}
        />
      </div>
    </div>
  );
}

function EditableProfileRow({
  label,
  isEditing,
  editable,
  editor,
  displayValue,
  displayClassName,
  helperText,
}: {
  label: string
  isEditing: boolean
  editable: boolean
  editor?: ReactNode
  displayValue: string
  displayClassName?: string
  helperText?: string
}) {
  return (
    <div className="flex border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
      <div className="w-48 p-5 font-bold text-slate-500 bg-gray-50/50 border-r border-gray-50 text-sm uppercase tracking-tight">
        {label}
      </div>
      <div className="flex-1 p-5 text-slate-700 font-bold">
        {isEditing && editable ? (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            {editor}
            {helperText && <p className="text-[10px] text-blue-400 mt-1 italic">{helperText}</p>}
          </div>
        ) : (
          <span className={displayClassName}>{displayValue}</span>
        )}
      </div>
    </div>
  );
}

function AcademicDetails({
  status,
  setStatus,
  creditLoad,
  setCreditLoad,
  onSave,
  isSaving
}: {
  status: string
  setStatus: (value: string) => void
  creditLoad: number
  setCreditLoad: (value: number) => void
  onSave: () => void
  isSaving: boolean
}) {
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

function CompletedCourses({
  courses,
  setCourses,
  loading,
  error,
}: {
  courses: CompletedCourseRow[]
  setCourses: Dispatch<SetStateAction<CompletedCourseRow[]>>
  loading: boolean
  error: string
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formMessage, setFormMessage] = useState('');
  const [formMessageTone, setFormMessageTone] = useState<'info' | 'error' | 'success'>('info');
  const [catalogCourses, setCatalogCourses] = useState<CatalogCourseOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [draft, setDraft] = useState({
    subject: '',
    course_code: '',
    semester: 'Spring',
    year: CURRENT_YEAR.toString(),
    grade: '',
  });
  const [newCourse, setNewCourse] = useState({
    subject: '',
    course_code: '',
    semester: 'Spring',
    year: CURRENT_YEAR.toString(),
    grade: '',
  });

  useEffect(() => {
    const loadCatalogCourses = async () => {
      setCatalogLoading(true);
      setCatalogError('');

      const rows = await fetchFullCourseCatalog();
      if (!rows) {
        setCatalogCourses([]);
        setCatalogError('Could not load the full course catalog.');
        setCatalogLoading(false);
        return;
      }

      setCatalogCourses(rows);
      setCatalogLoading(false);
    };

    void loadCatalogCourses();
  }, []);

  const subjectOptions = useMemo(() => {
    return Array.from(new Set(catalogCourses.map((course) => course.subject))).sort((a, b) => a.localeCompare(b));
  }, [catalogCourses]);

  const availableNewCourses = useMemo(() => {
    return catalogCourses
      .filter((course) => !newCourse.subject || course.subject === newCourse.subject)
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [catalogCourses, newCourse.subject]);

  const availableDraftCourses = useMemo(() => {
    return catalogCourses
      .filter((course) => !draft.subject || course.subject === draft.subject)
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [catalogCourses, draft.subject]);

  const startEdit = (course: CompletedCourseRow) => {
    setEditingId(course.id);
    const { semester, year } = splitTermLabel(course.term);
    const parsed = parseCourseCodeParts(course.course_code);
    setDraft({
      subject: parsed?.subject || '',
      course_code: course.course_code,
      semester,
      year,
      grade: course.grade || '',
    });
    setFormMessage('');
    setFormMessageTone('info');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({
      subject: '',
      course_code: '',
      semester: 'Spring',
      year: CURRENT_YEAR.toString(),
      grade: '',
    });
  };

  const saveEdit = async (id: number) => {
    const validationError = validateCompletedCourseInput(draft);
    if (validationError) {
      setFormMessage(validationError);
      setFormMessageTone('error');
      return;
    }

    const parsed = parseCourseCodeParts(draft.course_code);
    if (!parsed) {
      setFormMessage('Invalid course code. Use a format like CECS 274.');
      setFormMessageTone('error');
      return;
    }

    const normalizedCourseCode = normalizeCourseCodeForDisplay(draft.course_code);
    const metadata = findCatalogCourseMetadata(catalogCourses, normalizedCourseCode);
    if (!metadata) {
      setFormMessage(`Invalid course: ${normalizedCourseCode} was not found in the full course catalog.`);
      setFormMessageTone('error');
      return;
    }

    setSavingRow(true);
    setFormMessage('');
    setFormMessageTone('info');
    const { error: updateError } = await supabase
      .from('completed_courses')
      .update({
        course_code: normalizedCourseCode,
        subject: parsed.subject,
        course_number: parsed.courseNumber,
        title: metadata.title,
        term: `${draft.semester} ${draft.year}`,
        grade: draft.grade.trim() || null,
        units: metadata.units,
      })
      .eq('id', id);

    setSavingRow(false);

    if (updateError) {
      setFormMessage(`Could not save course: ${updateError.message}`);
      setFormMessageTone('error');
      return;
    }

    setCourses((current) =>
      current.map((course) =>
        course.id === id
          ? {
              ...course,
              course_code: normalizedCourseCode,
              title: metadata.title,
              term: `${draft.semester} ${draft.year}`,
              grade: draft.grade.trim() || null,
              units: metadata.units,
            }
          : course
      )
    );
    setFormMessage('Completed course updated.');
    setFormMessageTone('success');
    cancelEdit();
  };

  const deleteCourse = async (id: number) => {
    setDeletingId(id);
    setFormMessage('');
    setFormMessageTone('info');
    const { error: deleteError } = await supabase
      .from('completed_courses')
      .delete()
      .eq('id', id);

    setDeletingId(null);

    if (deleteError) {
      setFormMessage(`Could not delete course: ${deleteError.message}`);
      setFormMessageTone('error');
      return;
    }

    setCourses((current) => current.filter((course) => course.id !== id));
    if (editingId === id) {
      cancelEdit();
    }
    setFormMessage('Completed course removed.');
    setFormMessageTone('success');
  };

  const addCourse = async () => {
    const validationError = validateCompletedCourseInput(newCourse);
    if (validationError) {
      setFormMessage(validationError);
      setFormMessageTone('error');
      return;
    }

    const parsed = parseCourseCodeParts(newCourse.course_code);
    if (!parsed) {
      setFormMessage('Invalid course code. Use a format like CECS 274.');
      setFormMessageTone('error');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setFormMessage(authError?.message || 'You must be logged in to add completed courses.');
      setFormMessageTone('error');
      return;
    }

    const normalizedCourseCode = normalizeCourseCodeForDisplay(newCourse.course_code);
    const metadata = findCatalogCourseMetadata(catalogCourses, normalizedCourseCode);
    if (!metadata) {
      setFormMessage(`Invalid course: ${normalizedCourseCode} was not found in the full course catalog.`);
      setFormMessageTone('error');
      return;
    }

    setSavingRow(true);
    setFormMessage('');
    setFormMessageTone('info');
    const payload = {
      auth_user_id: authData.user.id,
      course_code: normalizedCourseCode,
      subject: parsed.subject,
      course_number: parsed.courseNumber,
      title: metadata.title,
      term: `${newCourse.semester} ${newCourse.year}`,
      grade: newCourse.grade.trim() || null,
      units: metadata.units,
      raw_line: `PROFILE ENTRY: ${normalizedCourseCode}`,
      matched_catalog: false,
      confidence: 1,
      source: 'completed_courses',
    };

    const { data, error: insertError } = await supabase
      .from('completed_courses')
      .insert(payload)
      .select('id, course_code, title, term, grade, units')
      .single();

    setSavingRow(false);

    if (insertError || !data) {
      setFormMessage(`Could not add course: ${insertError?.message || 'Unknown error'}`);
      setFormMessageTone('error');
      return;
    }

    setCourses((current) => [data as CompletedCourseRow, ...current]);
    setNewCourse({
      subject: '',
      course_code: '',
      semester: 'Spring',
      year: CURRENT_YEAR.toString(),
      grade: '',
    });
    setFormMessage('Completed course added.');
    setFormMessageTone('success');
  };

  const groupedCourses = courses.reduce<Map<string, CompletedCourseRow[]>>((groups, course) => {
    const termKey = course.term?.trim() || 'Unknown Term';
    const existing = groups.get(termKey) ?? [];
    existing.push(course);
    groups.set(termKey, existing);
    return groups;
  }, new Map());

  const orderedGroups = Array.from(groupedCourses.entries()).sort(([termA], [termB]) => {
    return termSortValue(termB) - termSortValue(termA);
  });

  return (
    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-right duration-500 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="bg-[#46BDC1] text-white px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest shadow-sm">
            Completed Coursework
          </span>
          <h2 className="mt-4 text-2xl font-black text-slate-800">Completed Courses by Semester</h2>
          <p className="mt-1 text-sm text-slate-500">
            These records are used by the schedule builder when checking prerequisite eligibility.
          </p>
        </div>
        <Link
          href="/transcript-import"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-blue-700"
        >
          Manage Completed Courses
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
        <h3 className="text-base font-black text-slate-800">Add Completed Course</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[0.9fr_1.5fr_0.8fr_0.8fr_0.9fr_auto]">
          <select
            value={newCourse.subject}
            onChange={(e) =>
              setNewCourse((current) => ({
                ...current,
                subject: e.target.value,
                course_code: '',
              }))
            }
            className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
            disabled={catalogLoading}
          >
            <option value="">{catalogLoading ? 'Loading subjects...' : 'Select subject'}</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select
            value={newCourse.course_code}
            onChange={(e) => setNewCourse((current) => ({ ...current, course_code: e.target.value }))}
            className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
            disabled={catalogLoading || !newCourse.subject}
          >
            <option value="">
              {!newCourse.subject
                ? 'Select subject first'
                : catalogLoading
                  ? 'Loading courses...'
                  : 'Select course'}
            </option>
            {availableNewCourses.map((course) => (
              <option key={course.courseCode} value={course.courseCode}>
                {course.courseCode} - {course.title || 'Untitled course'}
              </option>
            ))}
          </select>
          <select
            value={newCourse.semester}
            onChange={(e) => setNewCourse((current) => ({ ...current, semester: e.target.value }))}
            className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
          >
            {TERM_SEASON_OPTIONS.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
          <select
            value={newCourse.year}
            onChange={(e) => setNewCourse((current) => ({ ...current, year: e.target.value }))}
            className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
          >
            {COMPLETED_COURSE_YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={newCourse.grade}
            onChange={(e) => setNewCourse((current) => ({ ...current, grade: e.target.value }))}
            className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
          >
            <option value="">Select grade</option>
            {GRADE_OPTIONS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addCourse}
            disabled={savingRow}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-60 md:col-span-2 xl:col-span-1"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Pick a subject and course directly from the full course catalog, then choose the semester, year completed, and grade.
        </p>
        {catalogError && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {catalogError}
          </p>
        )}
      </div>

      {formMessage && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          formMessageTone === 'error'
            ? 'border border-red-200 bg-red-50 text-red-700'
            : formMessageTone === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-blue-200 bg-blue-50 text-blue-800'
        }`}>
          {formMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading completed courses...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load completed courses: {error}
        </div>
      )}

      {!loading && !error && orderedGroups.length === 0 && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          No completed courses found yet. Add your completed courses here or sync them from your records so prerequisite checks stay accurate.
        </div>
      )}

      {!loading && !error && orderedGroups.length > 0 && (
        <div className="space-y-4">
          {orderedGroups.map(([term, termCourses]) => (
            <div key={term} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                <h3 className="text-lg font-black text-slate-800">{term}</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600">
                  {termCourses.length} course{termCourses.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {termCourses.map((course) => (
                  <div key={`${term}-${course.id}-${course.course_code}`} className="px-5 py-4">
                    {editingId === course.id ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[0.9fr_1.5fr_0.8fr_0.8fr_0.9fr_auto] md:items-center">
                        <select
                          value={draft.subject}
                          onChange={(e) =>
                            setDraft((current) => ({
                              ...current,
                              subject: e.target.value,
                              course_code: '',
                            }))
                          }
                          className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
                          disabled={catalogLoading}
                        >
                          <option value="">{catalogLoading ? 'Loading subjects...' : 'Select subject'}</option>
                          {subjectOptions.map((subject) => (
                            <option key={subject} value={subject}>
                              {subject}
                            </option>
                          ))}
                        </select>
                        <select
                          value={draft.course_code}
                          onChange={(e) => setDraft((current) => ({ ...current, course_code: e.target.value }))}
                          className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
                          disabled={catalogLoading || !draft.subject}
                        >
                          <option value="">
                            {!draft.subject
                              ? 'Select subject first'
                              : catalogLoading
                                ? 'Loading courses...'
                                : 'Select course'}
                          </option>
                          {availableDraftCourses.map((courseOption) => (
                            <option key={courseOption.courseCode} value={courseOption.courseCode}>
                              {courseOption.courseCode} - {courseOption.title || 'Untitled course'}
                            </option>
                          ))}
                        </select>
                        <select
                          value={draft.semester}
                          onChange={(e) => setDraft((current) => ({ ...current, semester: e.target.value }))}
                          className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
                        >
                          {TERM_SEASON_OPTIONS.map((season) => (
                            <option key={season} value={season}>
                              {season}
                            </option>
                          ))}
                        </select>
                        <select
                          value={draft.year}
                          onChange={(e) => setDraft((current) => ({ ...current, year: e.target.value }))}
                          className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
                        >
                          {COMPLETED_COURSE_YEAR_OPTIONS.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                        <select
                          value={draft.grade}
                          onChange={(e) => setDraft((current) => ({ ...current, grade: e.target.value }))}
                          className="min-w-0 rounded-xl border-2 border-gray-100 bg-white px-3 py-2 text-sm font-medium"
                        >
                          <option value="">Select grade</option>
                          {GRADE_OPTIONS.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2 md:col-span-2 xl:col-span-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(course.id)}
                            disabled={savingRow}
                            className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-[1.1fr_1.8fr_1fr_0.8fr_auto] md:items-center">
                        <div>
                          <p className="text-sm font-black text-slate-900">{course.course_code}</p>
                          <p className="text-xs uppercase tracking-wider text-slate-500">{term}</p>
                        </div>
                        <p className="text-sm font-medium text-slate-700">{course.title || 'Untitled course'}</p>
                        <p className="text-sm font-bold text-slate-600">Grade: {course.grade || 'N/A'}</p>
                        <p className="text-sm font-bold text-slate-600">Units: {course.units ?? 'N/A'}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(course)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCourse(course.id)}
                            disabled={deletingId === course.id}
                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingId === course.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function termSortValue(term: string): number {
  const normalized = term.trim();
  const match = normalized.match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/i);
  if (!match) return -1;

  const seasonWeight: Record<string, number> = {
    winter: 0,
    spring: 1,
    summer: 2,
    fall: 3,
  };

  const season = match[1].toLowerCase();
  const year = Number.parseInt(match[2], 10);
  return year * 10 + (seasonWeight[season] ?? 0);
}

function parseCourseCodeParts(courseCode: string): { subject: string; courseNumber: string } | null {
  const normalized = normalizeCourseCodeForDisplay(courseCode);
  const match = normalized.match(/^([A-Z/& ]+)\s+(.+)$/);
  if (!match) return null;

  const subject = match[1].trim();
  const courseNumber = match[2].trim();
  if (!subject || !courseNumber) return null;
  return { subject, courseNumber };
}

function normalizeCourseCodeForDisplay(courseCode: string): string {
  return courseCode.trim().toUpperCase().replace(/\s+/g, ' ');
}

function validateCompletedCourseInput(input: {
  course_code: string
  semester: string
  year: string
  grade: string
}): string | null {
  if (!input.course_code.trim()) {
    return 'Missing required field: course code.';
  }
  if (!input.grade.trim()) {
    return 'Missing required field: grade.';
  }
  if (!input.semester.trim()) {
    return 'Missing required field: semester.';
  }
  if (!input.year.trim()) {
    return 'Missing required field: year completed.';
  }
  if (!/^\d{4}$/.test(input.year.trim())) {
    return 'Invalid year. Use a 4-digit year like 2026.';
  }
  if (!parseCourseCodeParts(input.course_code)) {
    return 'Invalid course code. Use a format like CECS 326.';
  }
  return null;
}

function splitTermLabel(term: string | null | undefined): { semester: string; year: string } {
  const normalized = term?.trim() ?? '';
  const match = normalized.match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/i);
  if (!match) {
    return { semester: 'Spring', year: CURRENT_YEAR.toString() };
  }

  return {
    semester: capitalizeTerm(match[1]),
    year: match[2],
  };
}

function capitalizeTerm(term: string): string {
  const lower = term.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

async function fetchFullCourseCatalog(): Promise<CatalogCourseOption[] | null> {
  const fullCatalogTables = ['Course_dependency', 'course_dependencies'];

  for (const table of fullCatalogTables) {
    const { data, error } = await supabase
      .from(table)
      .select('course_code_full, course_title, units')
      .limit(5000);

    if (!error && data) {
      const rows = normalizeCatalogRows(data as Array<Record<string, unknown>>);
      if (rows.length > 0) return rows;
    }
  }

  const semesterFallbackTables = ['spring_2026', 'summer_2026'];
  const merged: Array<Record<string, unknown>> = [];
  for (const table of semesterFallbackTables) {
    const { data, error } = await supabase
      .from(table)
      .select('course_code_full, course_title, units')
      .limit(5000);

    if (!error && data) {
      merged.push(...(data as Array<Record<string, unknown>>));
    }
  }

  if (merged.length === 0) return null;
  return normalizeCatalogRows(merged);
}

function normalizeCatalogRows(rows: Array<Record<string, unknown>>): CatalogCourseOption[] {
  const deduped = new Map<string, CatalogCourseOption>();

  for (const row of rows) {
    const courseCode = normalizeCourseCodeForDisplay(String(row.course_code_full ?? ''));
    const parsed = parseCourseCodeParts(courseCode);
    if (!courseCode || !parsed) continue;

    deduped.set(courseCode, {
      courseCode,
      title: typeof row.course_title === 'string' ? row.course_title : null,
      units: row.units == null || row.units === '' ? null : Number(row.units),
      subject: parsed.subject,
      courseNumber: parsed.courseNumber,
    });
  }

  return Array.from(deduped.values()).sort((a, b) => a.courseCode.localeCompare(b.courseCode));
}

function findCatalogCourseMetadata(
  catalogCourses: CatalogCourseOption[],
  courseCode: string
): { title: string | null; units: number | null } | null {
  const normalizedCourseCode = normalizeCourseCodeForDisplay(courseCode);
  const match = catalogCourses.find((course) => course.courseCode === normalizedCourseCode);
  if (!match) return null;

  return {
    title: match.title,
    units: match.units,
  };
}

function SchedulePrefs() {
  const prefs = [
    "Enable AI Workload Balancer",
    "Notify me if a class becomes available",
    "Auto-Sync with Google Calendar",
    "Suggest alternative instructors"
  ];
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>(prefs);

  const togglePref = (pref: string) => {
    setSelectedPrefs((current) =>
      current.includes(pref)
        ? current.filter((item) => item !== pref)
        : [...current, pref]
    );
  };

  return (
    <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-right duration-500">
      <div className="flex justify-between items-center mb-10">
        <span className="bg-[#46BDC1] text-white px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest shadow-sm">AI Preferences</span>
        <button className="border-2 border-gray-100 rounded-xl px-6 py-2 hover:bg-gray-50 font-black text-xs text-slate-500 uppercase tracking-wider">Update Prefs</button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {prefs.map((pref) => {
          const isSelected = selectedPrefs.includes(pref);

          return (
          <label
            key={pref}
            className={`flex items-center gap-6 p-5 rounded-2xl cursor-pointer transition-all border ${
              isSelected
                ? 'bg-cyan-50 border-cyan-200'
                : 'border-transparent hover:border-gray-100 hover:bg-gray-50'
            }`}
          >
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => togglePref(pref)}
                className="sr-only"
              />
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 font-black transition-all ${
                  isSelected
                    ? 'border-[#46BDC1] bg-[#46BDC1] text-white'
                    : 'border-gray-200 bg-white text-transparent'
                }`}
              >
                ✓
              </div>
            </div>
            <span className="text-lg font-bold text-slate-700 tracking-tight">{pref}</span>
          </label>
        )})}
      </div>
    </div>
  );
}
