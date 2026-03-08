"use client";

import { useEffect, useMemo, useState } from "react";

type SavedCourse = {
  id: string;
  code: string;
  title: string;
  units: number;
  term: string;
  status: "Planned" | "In Progress" | "Completed";
};

type SemesterRecord = {
  id: string;
  term: string;
  gpa: string;
  notes: string;
  courses: string[];
};

type CourseListing = {
  course_id: number;
  subject: string;
  number: string;
  title: string;
  term: string;
  section_id: number;
};

type SocialSharedSection = {
  // Flattened section data returned from social sync API for friend cards.
  term: string;
  section_id: number;
  sec: string | null;
  class_number: number | null;
  component_type: string | null;
  days: string | null;
  time_range: string | null;
  location: string | null;
  instructor: string | null;
  status: string;
  code: string;
  title: string;
  is_same_section_as_me: boolean;
};

type SocialFriend = {
  // Friend metadata + shared section results for the selected term.
  user_id: number;
  name: string;
  email: string | null;
  opted_in: boolean;
  shared_sections: SocialSharedSection[];
  overlap_count: number;
};

type SocialSyncPayload = {
  // Top-level response shape from `/uc4/social/section-sync/{user_id}`.
  user_id: number;
  term: string | null;
  opted_in: boolean;
  can_view_friends: boolean;
  friends: SocialFriend[];
};

type DemoUser = {
  id: number;
  label: string;
};

const demoUsers: DemoUser[] = [
  { id: 1, label: "User 1 (Alex)" },
  { id: 2, label: "User 2 (Jordan)" },
  { id: 3, label: "User 3 (Taylor)" },
];

const activeUserKey = "scheduleu-active-user-id";
const savedCoursesKey = (userId: number) => `scheduleu-uc4-saved-courses-u${userId}`;
const semesterHistoryKey = (userId: number) => `scheduleu-semester-history-u${userId}`;
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

const starterSavedCourses: SavedCourse[] = [
  {
    id: "1",
    code: "CECS 323",
    title: "Database Fundamentals",
    units: 3,
    term: "Spring 2026",
    status: "In Progress",
  },
  {
    id: "2",
    code: "CECS 328",
    title: "Algorithms",
    units: 3,
    term: "Spring 2026",
    status: "In Progress",
  },
  {
    id: "3",
    code: "CECS 343",
    title: "Intro to Software Engineering",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
  {
    id: "4",
    code: "MATH 247",
    title: "Calculus III",
    units: 4,
    term: "Spring 2026",
    status: "Completed",
  },
];

const starterSemesters: SemesterRecord[] = [
  {
    id: "sem-1",
    term: "Fall 2024",
    gpa: "3.61",
    notes: "Completed lower-division foundation and writing requirements.",
    courses: ["CECS 174 - Intro Programming", "MATH 122 - Calculus I", "ENGL 100 - Composition"],
  },
  {
    id: "sem-2",
    term: "Spring 2025",
    gpa: "3.74",
    notes: "Progressed in core CECS prerequisites and discrete math.",
    courses: ["CECS 225 - Digital Logic", "CECS 228 - Discrete Structures", "MATH 123 - Calculus II"],
  },
  {
    id: "sem-3",
    term: "Fall 2025",
    gpa: "3.79",
    notes: "Built systems programming and software engineering foundation.",
    courses: ["CECS 274 - Data Structures", "CECS 277 - OOP App Development", "CECS 343 - Software Engineering"],
  },
  {
    id: "sem-4",
    term: "Winter 2026",
    gpa: "3.90",
    notes: "Focused short-term GE requirement.",
    courses: ["COMM 110 - Oral Communication"],
  },
  {
    id: "sem-5",
    term: "Spring 2026",
    gpa: "In Progress",
    notes: "Current CSE schedule archive term (manual + AI planner candidate set).",
    courses: ["CECS 323 - Database Fundamentals", "CECS 328 - Algorithms", "MATH 247 - Calculus III", "PHYS 152 - E&M"],
  },
];

const courseSuggestions: SavedCourse[] = [
  {
    id: "5",
    code: "CECS 326",
    title: "Operating Systems",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
  {
    id: "6",
    code: "CECS 327",
    title: "Networks and Distributed Computing",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
  {
    id: "7",
    code: "CECS 342",
    title: "Programming Languages",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
  {
    id: "8",
    code: "STAT 381",
    title: "Probability and Statistics",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
];

type ActiveView = "planner" | "semesters";

function toCourseLabel(course: SavedCourse): string {
  return `${course.code}: ${course.title}`;
}

function getUserLabel(userId: number): string {
  const user = demoUsers.find((entry) => entry.id === userId);
  return user ? user.label : `User ${userId}`;
}

export default function Home() {
  const [activeUserId, setActiveUserId] = useState<number>(() => {
    if (typeof window === "undefined") return demoUsers[0].id;
    const raw = localStorage.getItem(activeUserKey);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : demoUsers[0].id;
  });
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>(starterSavedCourses);
  const [semesters, setSemesters] = useState<SemesterRecord[]>(starterSemesters);
  const [statusMessage, setStatusMessage] = useState("Planner ready.");
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [activeView, setActiveView] = useState<ActiveView>("planner");
  const [selectedTermByCourse, setSelectedTermByCourse] = useState<Record<string, string>>({});
  const [selectedSavedBySemester, setSelectedSavedBySemester] = useState<Record<string, string>>({});
  const [customCourseBySemester, setCustomCourseBySemester] = useState<Record<string, string>>({});
  const [aiRequestedCourses, setAiRequestedCourses] = useState("CECS323, CECS328");
  const [aiTargetTerm, setAiTargetTerm] = useState("Spring 2026");
  const [aiWorking, setAiWorking] = useState(false);
  const [apiCourses, setApiCourses] = useState<CourseListing[]>([]);
  // Social Section Sync state: preference, friend list, and loading for the card section.
  const [socialSyncEnabled, setSocialSyncEnabled] = useState(false);
  const [socialFriends, setSocialFriends] = useState<SocialFriend[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const activeUserLabel = useMemo(() => getUserLabel(activeUserId), [activeUserId]);
  const socialFriendIds = useMemo(
    () => new Set(socialFriends.map((friend) => friend.user_id)),
    [socialFriends],
  );
  const candidateFriends = useMemo(
    () => demoUsers.filter((user) => user.id !== activeUserId),
    [activeUserId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedStored = localStorage.getItem(savedCoursesKey(activeUserId));
    const semesterStored = localStorage.getItem(semesterHistoryKey(activeUserId));

    try {
      const parsed = savedStored ? (JSON.parse(savedStored) as SavedCourse[]) : [];
      setSavedCourses(Array.isArray(parsed) && parsed.length > 0 ? parsed : starterSavedCourses);
    } catch {
      setSavedCourses(starterSavedCourses);
    }

    try {
      const parsed = semesterStored ? (JSON.parse(semesterStored) as SemesterRecord[]) : [];
      const nextSemesters = Array.isArray(parsed) && parsed.length > 0 ? parsed : starterSemesters;
      setSemesters(nextSemesters);
      setAiTargetTerm(nextSemesters[0]?.term ?? "Spring 2026");
    } catch {
      setSemesters(starterSemesters);
      setAiTargetTerm(starterSemesters[0]?.term ?? "Spring 2026");
    }

    localStorage.setItem(activeUserKey, String(activeUserId));
    setSelectedTermByCourse({});
    setSelectedSavedBySemester({});
    setCustomCourseBySemester({});
    setStatusMessage(`Switched to ${getUserLabel(activeUserId)}.`);
  }, [activeUserId]);

  useEffect(() => {
    let cancelled = false;

    async function syncSavedClassesFromServer() {
      try {
        const healthResponse = await fetch(`${backendBaseUrl}/health`);
        if (!healthResponse.ok) throw new Error("health check failed");

        const classesResponse = await fetch(
          `${backendBaseUrl}/uc4/demo/saved-classes?user_id=${activeUserId}`,
        );
        if (!classesResponse.ok) throw new Error("saved classes fetch failed");

        const data = (await classesResponse.json()) as { courses?: SavedCourse[] };
        if (cancelled) return;

        setBackendStatus("Connected");
        if (Array.isArray(data.courses) && data.courses.length > 0) {
          setSavedCourses(data.courses);
          setStatusMessage(`Loaded saved classes from server for ${getUserLabel(activeUserId)}.`);
        } else {
          setStatusMessage(`Connected to backend for ${getUserLabel(activeUserId)}.`);
        }
      } catch {
        if (cancelled) return;
        setBackendStatus("Offline (local fallback)");
      }
    }

    void syncSavedClassesFromServer();
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  useEffect(() => {
    // Keep social cards in sync when user or target term changes.
    void loadSocialSectionSync(aiTargetTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, aiTargetTerm]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(savedCoursesKey(activeUserId), JSON.stringify(savedCourses));
  }, [activeUserId, savedCourses]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(semesterHistoryKey(activeUserId), JSON.stringify(semesters));
  }, [activeUserId, semesters]);

  const totalUnits = useMemo(
    () => savedCourses.reduce((sum, course) => sum + course.units, 0),
    [savedCourses],
  );

  const semesterTerms = useMemo(() => semesters.map((semester) => semester.term), [semesters]);

  async function loadSocialSectionSync(term: string) {
    // Reads social sync payload from backend and updates local UI state.
    setSocialLoading(true);
    try {
      const response = await fetch(
        `${backendBaseUrl}/uc4/social/section-sync/${activeUserId}?term=${encodeURIComponent(term)}`,
      );
      if (!response.ok) throw new Error("social section sync fetch failed");
      const data = (await response.json()) as Partial<SocialSyncPayload>;
      setSocialSyncEnabled(Boolean(data.opted_in));
      setSocialFriends(Array.isArray(data.friends) ? data.friends : []);
      setBackendStatus("Connected");
    } catch {
      setSocialSyncEnabled(false);
      setSocialFriends([]);
      setBackendStatus("Offline (local fallback)");
    } finally {
      setSocialLoading(false);
    }
  }

  async function pushCourseToBackend(course: SavedCourse) {
    try {
      const response = await fetch(`${backendBaseUrl}/uc4/demo/saved-classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeUserId, course }),
      });
      if (!response.ok) throw new Error("push failed");
      setBackendStatus("Connected");
    } catch {
      setBackendStatus("Offline (local fallback)");
    }
  }

  async function removeCourseFromBackend(courseId: string) {
    try {
      const response = await fetch(
        `${backendBaseUrl}/uc4/demo/saved-classes/${encodeURIComponent(courseId)}?user_id=${activeUserId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("remove failed");
      setBackendStatus("Connected");
    } catch {
      setBackendStatus("Offline (local fallback)");
    }
  }

  async function resetBackendStore() {
    try {
      const response = await fetch(
        `${backendBaseUrl}/uc4/demo/saved-classes/reset?user_id=${activeUserId}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("reset failed");
      setBackendStatus("Connected");
    } catch {
      setBackendStatus("Offline (local fallback)");
    }
  }

  function mergeSavedCourses(base: SavedCourse[], incoming: SavedCourse[]): SavedCourse[] {
    const merged = new Map<string, SavedCourse>();
    for (const course of [...base, ...incoming]) {
      const key = `${course.term}|${course.code}|${course.id}`;
      merged.set(key, course);
    }
    return Array.from(merged.values());
  }

  async function syncDbSavedCoursesForTerm(term: string) {
    const response = await fetch(
      `${backendBaseUrl}/uc4/saved-classes/${activeUserId}?term=${encodeURIComponent(term)}`,
    );
    if (!response.ok) throw new Error("db saved classes fetch failed");

    const data = (await response.json()) as { courses?: SavedCourse[] };
    const incoming = Array.isArray(data.courses) ? data.courses : [];
    if (incoming.length === 0) return;

    setSavedCourses((prev) => mergeSavedCourses(prev, incoming));

    const labels = incoming.map((course) => toCourseLabel(course));
    setSemesters((prev) => {
      let found = false;
      const updated = prev.map((semester) => {
        if (semester.term !== term) return semester;
        found = true;
        return {
          ...semester,
          courses: Array.from(new Set([...semester.courses, ...labels])),
        };
      });

      if (found) return updated;
      return [
        ...updated,
        {
          id: `sem-${Date.now()}`,
          term,
          gpa: "In Progress",
          notes: "Created from AI builder output.",
          courses: Array.from(new Set(labels)),
        },
      ];
    });
  }

  async function handleToggleSocialSync(enabled: boolean) {
    // Saves opt-in preference first, then refreshes the social section cards.
    try {
      const response = await fetch(`${backendBaseUrl}/uc4/social/opt-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeUserId, enabled }),
      });
      if (!response.ok) throw new Error("social opt-in update failed");
      await loadSocialSectionSync(aiTargetTerm);
      setStatusMessage(
        enabled
          ? `Social section sync enabled for ${activeUserLabel}.`
          : `Social section sync disabled for ${activeUserLabel}.`,
      );
    } catch {
      setBackendStatus("Offline (local fallback)");
      setStatusMessage("Unable to update social sync preference.");
    }
  }

  async function handleAddFriend(friendUserId: number) {
    // Adds friend connection for current user and refreshes section sharing data.
    try {
      const response = await fetch(`${backendBaseUrl}/uc4/social/friends/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeUserId, friend_user_id: friendUserId }),
      });
      if (!response.ok) throw new Error("friend add failed");
      await loadSocialSectionSync(aiTargetTerm);
      setStatusMessage(`Friend connection added with ${getUserLabel(friendUserId)}.`);
    } catch {
      setBackendStatus("Offline (local fallback)");
      setStatusMessage("Unable to add friend for social section sync.");
    }
  }

  async function handleRemoveFriend(friendUserId: number) {
    // Removes friend connection and refreshes section sharing data.
    try {
      const response = await fetch(`${backendBaseUrl}/uc4/social/friends/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeUserId, friend_user_id: friendUserId }),
      });
      if (!response.ok) throw new Error("friend remove failed");
      await loadSocialSectionSync(aiTargetTerm);
      setStatusMessage(`Friend connection removed with ${getUserLabel(friendUserId)}.`);
    } catch {
      setBackendStatus("Offline (local fallback)");
      setStatusMessage("Unable to remove friend for social section sync.");
    }
  }

  async function handleLoadCoursesApi() {
    try {
      const response = await fetch(
        `${backendBaseUrl}/courses?term=${encodeURIComponent(aiTargetTerm)}&limit=120`,
      );
      if (!response.ok) throw new Error("courses fetch failed");
      const data = (await response.json()) as { courses?: CourseListing[] };
      setApiCourses(Array.isArray(data.courses) ? data.courses : []);
      setStatusMessage(`Loaded ${data.courses?.length ?? 0} course rows from /courses.`);
      setBackendStatus("Connected");
    } catch {
      setStatusMessage("Unable to load /courses from backend.");
      setBackendStatus("Offline (local fallback)");
    }
  }

  async function handleAiBuildAndSave() {
    const requested = aiRequestedCourses
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (requested.length === 0) {
      setStatusMessage("Enter at least one course code for AI scheduling.");
      return;
    }

    setAiWorking(true);
    try {
      const response = await fetch(`${backendBaseUrl}/ai/term/schedule-and-save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: activeUserId,
          term: aiTargetTerm,
          requested_courses: requested,
          constraints: {
            buffer_minutes: 15,
            days_off: [],
            blocked_times: [],
          },
        }),
      });
      if (!response.ok) throw new Error("AI schedule request failed");

      const data = (await response.json()) as {
        saved_count?: number;
        selected_sections?: Array<{ course: string }>;
        unscheduled_courses?: string[];
      };

      await syncDbSavedCoursesForTerm(aiTargetTerm);
      await loadSocialSectionSync(aiTargetTerm);
      setBackendStatus("Connected");
      setStatusMessage(
        `AI scheduled ${data.selected_sections?.length ?? 0} section(s), saved ${data.saved_count ?? 0} to ${aiTargetTerm}.`,
      );
    } catch {
      setBackendStatus("Offline (local fallback)");
      setStatusMessage("AI builder failed. Check backend DB connection and sections data.");
    } finally {
      setAiWorking(false);
    }
  }

  function handleAddSavedCourse(course: SavedCourse) {
    if (savedCourses.some((saved) => saved.code === course.code)) {
      setStatusMessage(`${course.code} is already in your saved classes.`);
      return;
    }

    setSavedCourses((prev) => [...prev, course]);
    setStatusMessage(`${course.code} added to saved classes.`);
    void pushCourseToBackend(course);
  }

  function handleRemoveSavedCourse(id: string) {
    setSavedCourses((prev) => prev.filter((course) => course.id !== id));
    setStatusMessage("Saved class removed.");
    void removeCourseFromBackend(id);
  }

  function handleResetSavedClasses() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(savedCoursesKey(activeUserId));
    }
    setSavedCourses(starterSavedCourses);
    setStatusMessage(`Saved classes reset for ${activeUserLabel}.`);
    void resetBackendStore();
  }

  function handleTermSelection(courseId: string, term: string) {
    setSelectedTermByCourse((prev) => ({ ...prev, [courseId]: term }));
  }

  function assignSavedCourseToSemester(course: SavedCourse) {
    const targetTerm = selectedTermByCourse[course.id] ?? semesterTerms[0];
    if (!targetTerm) {
      setStatusMessage("Create a semester first before assigning classes.");
      return;
    }

    const label = toCourseLabel(course);
    setSemesters((prev) =>
      prev.map((semester) =>
        semester.term === targetTerm && !semester.courses.includes(label)
          ? { ...semester, courses: [...semester.courses, label] }
          : semester,
      ),
    );
    setStatusMessage(`${label} added to ${targetTerm}.`);
  }

  function updateSemester(semesterId: string, updates: Partial<SemesterRecord>) {
    setSemesters((prev) =>
      prev.map((semester) => (semester.id === semesterId ? { ...semester, ...updates } : semester)),
    );
  }

  function addSemester() {
    const nextIndex = semesters.length + 1;
    const newSemester: SemesterRecord = {
      id: `sem-${Date.now()}`,
      term: `New Semester ${nextIndex}`,
      gpa: "",
      notes: "",
      courses: [],
    };
    setSemesters((prev) => [...prev, newSemester]);
    setStatusMessage("New semester created.");
  }

  function removeSemester(semesterId: string) {
    setSemesters((prev) => prev.filter((semester) => semester.id !== semesterId));
    setSelectedSavedBySemester((prev) => {
      const next = { ...prev };
      delete next[semesterId];
      return next;
    });
    setCustomCourseBySemester((prev) => {
      const next = { ...prev };
      delete next[semesterId];
      return next;
    });
    setStatusMessage("Semester removed.");
  }

  function addSavedCourseToSemesterByMenu(semesterId: string) {
    const selectedCourseId = selectedSavedBySemester[semesterId];
    if (!selectedCourseId) {
      setStatusMessage("Select a saved class first.");
      return;
    }

    const selectedCourse = savedCourses.find((course) => course.id === selectedCourseId);
    if (!selectedCourse) {
      setStatusMessage("Selected class not found.");
      return;
    }

    const label = toCourseLabel(selectedCourse);
    setSemesters((prev) =>
      prev.map((semester) =>
        semester.id === semesterId && !semester.courses.includes(label)
          ? { ...semester, courses: [...semester.courses, label] }
          : semester,
      ),
    );
    setStatusMessage(`${label} assigned to semester.`);
  }

  function addCustomCourseToSemester(semesterId: string) {
    const value = (customCourseBySemester[semesterId] ?? "").trim();
    if (!value) {
      setStatusMessage("Enter a class title before adding.");
      return;
    }

    setSemesters((prev) =>
      prev.map((semester) =>
        semester.id === semesterId && !semester.courses.includes(value)
          ? { ...semester, courses: [...semester.courses, value] }
          : semester,
      ),
    );
    setCustomCourseBySemester((prev) => ({ ...prev, [semesterId]: "" }));
    setStatusMessage(`Added "${value}" to semester.`);
  }

  function removeCourseFromSemester(semesterId: string, courseLabel: string) {
    setSemesters((prev) =>
      prev.map((semester) =>
        semester.id === semesterId
          ? { ...semester, courses: semester.courses.filter((course) => course !== courseLabel) }
          : semester,
      ),
    );
    setStatusMessage("Course removed from semester.");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Academic Planner
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Saved Classes + Semester Planning</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Save classes, assign them to semesters, and update previous term details in one place.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <label className="font-semibold text-cyan-700" htmlFor="active-user">
              Active User
            </label>
            <select
              id="active-user"
              value={activeUserId}
              onChange={(event) => setActiveUserId(Number(event.target.value))}
              className="rounded-md border border-cyan-200 bg-white px-2 py-1 text-sm"
            >
              {demoUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-cyan-800">
              Data scope: {activeUserLabel}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
              <span className="text-cyan-700">Saved classes:</span> {savedCourses.length}
            </div>
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
              <span className="text-cyan-700">Planned units:</span> {totalUnits}
            </div>
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
              <span className="text-cyan-700">Backend:</span> {backendStatus}
            </div>
            <button
              onClick={handleResetSavedClasses}
              className="rounded-lg border border-sky-300 bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-2 font-semibold text-white transition hover:from-cyan-500 hover:to-blue-700"
            >
              Reset Saved Classes
            </button>
          </div>
          <p className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
            {statusMessage}
          </p>
        </header>

        <section className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveView("planner")}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              activeView === "planner"
                ? "bg-gradient-to-r from-cyan-400 to-blue-600 text-white"
                : "border border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50"
            }`}
          >
            Planner
          </button>
          <button
            onClick={() => setActiveView("semesters")}
            className={`rounded-lg px-4 py-2 font-semibold transition ${
              activeView === "semesters"
                ? "bg-gradient-to-r from-cyan-400 to-blue-600 text-white"
                : "border border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50"
            }`}
          >
            Edit Semesters
          </button>
        </section>

        {activeView === "planner" ? (
          <>
            <section className="mb-8 rounded-xl border border-cyan-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-2xl font-semibold">AI Builder + Course API</h2>
              <p className="mb-3 text-sm text-slate-600">
                Uses `/courses` for current DB catalog rows and `/ai/term/schedule-and-save` to persist AI-selected sections.
              </p>
              <div className="mb-3 grid gap-3 md:grid-cols-3">
                <label className="text-sm text-slate-700">
                  Target Term
                  <select
                    value={aiTargetTerm}
                    onChange={(event) => setAiTargetTerm(event.target.value)}
                    className="mt-1 w-full rounded-md border border-cyan-200 px-2 py-1"
                  >
                    {semesterTerms.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  Requested Courses (comma-separated)
                  <input
                    value={aiRequestedCourses}
                    onChange={(event) => setAiRequestedCourses(event.target.value)}
                    placeholder="CECS323, CECS328, CECS343"
                    className="mt-1 w-full rounded-md border border-cyan-200 px-2 py-1"
                  />
                </label>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={handleLoadCoursesApi}
                  className="rounded-md border border-cyan-300 px-3 py-2 text-sm font-semibold text-cyan-800 hover:bg-cyan-50"
                >
                  Load /courses
                </button>
                <button
                  onClick={handleAiBuildAndSave}
                  disabled={aiWorking}
                  className="rounded-md bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-cyan-500 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {aiWorking ? "AI Scheduling..." : "AI Schedule + Save to History"}
                </button>
              </div>
              <p className="text-sm text-slate-600">
                Loaded course rows: <span className="font-semibold text-cyan-700">{apiCourses.length}</span>
              </p>
            </section>

            <section className="mb-8 rounded-xl border border-cyan-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-2xl font-semibold">Social Section Sync</h2>
              <p className="mb-3 text-sm text-slate-600">
                Opt in to share your planned sections, connect friends, and see where you overlap for study-group coordination.
              </p>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-800">
                  {/* Toggle for sharing your planned sections with friends. */}
                  <input
                    type="checkbox"
                    checked={socialSyncEnabled}
                    onChange={(event) => {
                      void handleToggleSocialSync(event.target.checked);
                    }}
                    disabled={socialLoading}
                    className="h-4 w-4 rounded border-cyan-300 text-cyan-600"
                  />
                  Share my planned sections
                </label>
                {socialLoading ? (
                  <span className="text-sm text-slate-600">Refreshing social sync...</span>
                ) : null}
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-700">Friends</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {candidateFriends.map((friend) => {
                    // Button state flips between add/remove based on existing connection.
                    const connected = socialFriendIds.has(friend.id);
                    return (
                      <button
                        key={`social-friend-${friend.id}`}
                        onClick={() => {
                          void (connected ? handleRemoveFriend(friend.id) : handleAddFriend(friend.id));
                        }}
                        className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                          connected
                            ? "border border-rose-300 text-rose-700 hover:bg-rose-50"
                            : "border border-cyan-300 text-cyan-800 hover:bg-cyan-50"
                        }`}
                      >
                        {connected ? `Remove ${friend.label}` : `Add ${friend.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!socialSyncEnabled ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Enable sharing to view friends&apos; planned sections.
                </p>
              ) : socialFriends.length === 0 ? (
                <p className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
                  No connected friends yet. Add one above to start section sync.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {socialFriends.map((friend) => (
                    // One card per friend showing opt-in status + term section details.
                    <article
                      key={`social-card-${friend.user_id}`}
                      className="rounded-lg border border-cyan-100 bg-cyan-50 p-3"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">{friend.name}</h3>
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            friend.opted_in ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {friend.opted_in ? "Sharing sections" : "Not sharing"}
                        </span>
                      </div>
                      <p className="mb-2 text-xs text-slate-600">
                        Same-section overlap with you: {friend.overlap_count}
                      </p>
                      {!friend.opted_in ? (
                        <p className="text-sm text-slate-700">Friend has not opted into section sharing.</p>
                      ) : friend.shared_sections.length === 0 ? (
                        <p className="text-sm text-slate-700">No planned sections found for {aiTargetTerm}.</p>
                      ) : (
                        <ul className="space-y-2">
                          {friend.shared_sections.map((section) => (
                            <li
                              key={`shared-${friend.user_id}-${section.section_id}`}
                              className="rounded-md border border-cyan-200 bg-white px-2 py-2 text-sm"
                            >
                              <p className="font-semibold text-slate-900">
                                {section.code}: {section.title}
                              </p>
                              <p className="text-slate-600">
                                {section.term} | SEC {section.sec ?? "--"} | Class #{section.class_number ?? "--"}
                              </p>
                              <p className="text-slate-600">
                                {section.days ?? "TBA"} {section.time_range ?? ""} | {section.location ?? "TBA"}
                              </p>
                              {section.is_same_section_as_me ? (
                                <p className="mt-1 inline-block rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                                  Same section as you
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-8">
              <h2 className="mb-4 text-2xl font-semibold">Saved Classes</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {savedCourses.map((course) => (
                  <article
                    key={course.id}
                    className="rounded-xl border border-cyan-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">{course.term}</p>
                        <h3 className="text-lg font-semibold">
                          {course.code}: {course.title}
                        </h3>
                      </div>
                      <span className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">
                        {course.status}
                      </span>
                    </div>
                    <div className="mb-3 text-sm text-slate-700">{course.units} units</div>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                      <select
                        value={selectedTermByCourse[course.id] ?? semesterTerms[0] ?? ""}
                        onChange={(event) => handleTermSelection(course.id, event.target.value)}
                        className="rounded-md border border-cyan-200 bg-white px-2 py-1 text-sm"
                      >
                        {semesterTerms.length === 0 ? (
                          <option value="">No semesters available</option>
                        ) : (
                          semesterTerms.map((term) => (
                            <option key={term} value={term}>
                              {term}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        onClick={() => assignSavedCourseToSemester(course)}
                        className="rounded-md border border-cyan-300 px-3 py-1 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
                      >
                        Add to Semester
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemoveSavedCourse(course.id)}
                      className="rounded-md border border-rose-300 px-2 py-1 text-sm text-rose-700 transition hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold">Add Classes</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {courseSuggestions.map((course) => (
                  <div key={course.id} className="rounded-xl border border-cyan-200 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">{course.term}</p>
                    <h3 className="mt-1 font-semibold">
                      {course.code}: {course.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-700">{course.units} units</p>
                    <button
                      onClick={() => handleAddSavedCourse(course)}
                      className="mt-3 w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-2 font-semibold text-white transition hover:from-cyan-500 hover:to-blue-700"
                    >
                      Save Class
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Semester History</h2>
              <button
                onClick={addSemester}
                className="rounded-lg border border-sky-300 bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-cyan-500 hover:to-blue-700"
              >
                Add Semester
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {semesters.map((semester) => (
                <article key={semester.id} className="rounded-xl border border-cyan-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      Term
                      <input
                        value={semester.term}
                        onChange={(event) => updateSemester(semester.id, { term: event.target.value })}
                        className="mt-1 w-full rounded-md border border-cyan-200 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      GPA
                      <input
                        value={semester.gpa}
                        onChange={(event) => updateSemester(semester.id, { gpa: event.target.value })}
                        className="mt-1 w-full rounded-md border border-cyan-200 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>

                  <label className="mb-3 block text-sm text-slate-600">
                    Notes
                    <textarea
                      value={semester.notes}
                      onChange={(event) => updateSemester(semester.id, { notes: event.target.value })}
                      className="mt-1 w-full rounded-md border border-cyan-200 px-2 py-1 text-sm"
                      rows={2}
                    />
                  </label>

                  <div className="mb-3">
                    <p className="mb-2 text-sm font-semibold text-slate-700">Courses</p>
                    <ul className="space-y-2 text-sm text-slate-700">
                      {semester.courses.map((course) => (
                        <li
                          key={`${semester.id}-${course}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-cyan-100 bg-cyan-50 px-2 py-1"
                        >
                          <span>{course}</span>
                          <button
                            onClick={() => removeCourseFromSemester(semester.id, course)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedSavedBySemester[semester.id] ?? ""}
                      onChange={(event) =>
                        setSelectedSavedBySemester((prev) => ({
                          ...prev,
                          [semester.id]: event.target.value,
                        }))
                      }
                      className="rounded-md border border-cyan-200 px-2 py-1 text-sm"
                    >
                      <option value="">Select a saved class</option>
                      {savedCourses.map((course) => (
                        <option key={`${semester.id}-${course.id}`} value={course.id}>
                          {toCourseLabel(course)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => addSavedCourseToSemesterByMenu(semester.id)}
                      className="rounded-md border border-cyan-300 px-3 py-1 text-sm font-semibold text-cyan-800 hover:bg-cyan-50"
                    >
                      Add Saved Class
                    </button>
                  </div>

                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={customCourseBySemester[semester.id] ?? ""}
                      onChange={(event) =>
                        setCustomCourseBySemester((prev) => ({
                          ...prev,
                          [semester.id]: event.target.value,
                        }))
                      }
                      placeholder="Add custom class entry"
                      className="rounded-md border border-cyan-200 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => addCustomCourseToSemester(semester.id)}
                      className="rounded-md border border-cyan-300 px-3 py-1 text-sm font-semibold text-cyan-800 hover:bg-cyan-50"
                    >
                      Add Custom Class
                    </button>
                  </div>

                  <button
                    onClick={() => removeSemester(semester.id)}
                    className="rounded-md border border-rose-300 px-2 py-1 text-sm text-rose-700 hover:bg-rose-50"
                  >
                    Remove Semester
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
