"use client";

import { useEffect, useMemo, useState } from "react";

// Frontend shape used by both local state and backend demo-store responses.
type SavedCourse = {
  id: string;
  code: string;
  title: string;
  units: number;
  term: string;
  status: "Planned" | "In Progress" | "Completed";
};

const storageKey = "scheduleu-uc4-saved-courses";
// Backend defaults to local FastAPI instance; override with NEXT_PUBLIC_BACKEND_URL.
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
const demoUserId = 1;

// Starter data shown when there is no local or backend data yet.
const starterSavedCourses: SavedCourse[] = [
  {
    id: "1",
    code: "CECS 328",
    title: "Data Structures & Algorithms",
    units: 3,
    term: "Spring 2026",
    status: "In Progress",
  },
  {
    id: "2",
    code: "MATH 247",
    title: "Calculus III",
    units: 4,
    term: "Spring 2026",
    status: "Planned",
  },
  {
    id: "3",
    code: "CECS 343",
    title: "Intro to Software Engineering",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
];

const semesterHistory = [
  {
    term: "Fall 2025",
    gpa: "3.72",
    courses: ["CECS 174 - Intro Programming", "MATH 122 - Calculus I", "ENGL 100"],
  },
  {
    term: "Winter 2026",
    gpa: "3.80",
    courses: ["COMM 110 - Oral Communication"],
  },
  {
    term: "Spring 2026",
    gpa: "In Progress",
    courses: ["CECS 225 - Digital Logic", "MATH 123 - Calculus II", "PHYS 151"],
  },
];

// Simulated "save from builder" buttons for demo flow.
const quickAddCourses: SavedCourse[] = [
  {
    id: "4",
    code: "CECS 277",
    title: "Object-Oriented App Development",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
  {
    id: "5",
    code: "CECS 282",
    title: "C++ for Java Programmers",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
  {
    id: "6",
    code: "STAT 381",
    title: "Probability and Statistics",
    units: 3,
    term: "Fall 2026",
    status: "Planned",
  },
];

export default function Home() {
  // Initialize from browser storage for fast render and offline resilience.
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>(() => {
    if (typeof window === "undefined") return starterSavedCourses;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return starterSavedCourses;

    try {
      const parsed = JSON.parse(stored) as SavedCourse[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : starterSavedCourses;
    } catch {
      return starterSavedCourses;
    }
  });

  const [statusMessage, setStatusMessage] = useState(() => {
    if (typeof window === "undefined") return "Demo data loaded.";
    return localStorage.getItem(storageKey)
      ? "Loaded saved classes from browser storage."
      : "Demo data loaded.";
  });
  // Shows current backend connectivity state for demo transparency.
  const [backendStatus, setBackendStatus] = useState("Checking backend...");

  useEffect(() => {
    let cancelled = false;

    // On first load, prefer backend demo-store data if service is up.
    async function syncFromBackendOnLoad() {
      try {
        const healthResponse = await fetch(`${backendBaseUrl}/health`);
        if (!healthResponse.ok) throw new Error("backend health check failed");

        const classesResponse = await fetch(
          `${backendBaseUrl}/uc4/demo/saved-classes?user_id=${demoUserId}`,
        );
        if (!classesResponse.ok) throw new Error("backend classes fetch failed");

        const data = (await classesResponse.json()) as { courses?: SavedCourse[] };
        if (cancelled) return;

        setBackendStatus("Connected (demo store)");
        if (Array.isArray(data.courses) && data.courses.length > 0) {
          setSavedCourses(data.courses);
          setStatusMessage("Loaded saved classes from backend demo store.");
        } else {
          setStatusMessage("Backend connected. Using local/demo data.");
        }
      } catch {
        if (cancelled) return;
        // Keep working entirely client-side when API is down.
        setBackendStatus("Offline (local storage fallback)");
      }
    }

    void syncFromBackendOnLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Local persistence keeps demo state stable across page refreshes.
    localStorage.setItem(storageKey, JSON.stringify(savedCourses));
  }, [savedCourses]);

  // Lightweight summary metric shown in header cards.
  const totalUnits = useMemo(
    () => savedCourses.reduce((sum, course) => sum + course.units, 0),
    [savedCourses],
  );

  async function pushCourseToBackend(course: SavedCourse) {
    try {
      const response = await fetch(`${backendBaseUrl}/uc4/demo/saved-classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: demoUserId, course }),
      });
      if (!response.ok) throw new Error("failed to push course");
      setBackendStatus("Connected (demo store)");
    } catch {
      setBackendStatus("Offline (local storage fallback)");
    }
  }

  async function removeCourseFromBackend(courseId: string) {
    try {
      const response = await fetch(
        `${backendBaseUrl}/uc4/demo/saved-classes/${encodeURIComponent(courseId)}?user_id=${demoUserId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("failed to remove course");
      setBackendStatus("Connected (demo store)");
    } catch {
      setBackendStatus("Offline (local storage fallback)");
    }
  }

  async function resetBackendDemoStore() {
    try {
      const response = await fetch(
        `${backendBaseUrl}/uc4/demo/saved-classes/reset?user_id=${demoUserId}`,
        {
          method: "POST",
        },
      );
      if (!response.ok) throw new Error("failed to reset backend demo");
      setBackendStatus("Connected (demo store)");
    } catch {
      setBackendStatus("Offline (local storage fallback)");
    }
  }

  function handleQuickSave(course: SavedCourse) {
    if (savedCourses.some((saved) => saved.code === course.code)) {
      setStatusMessage(`${course.code} is already saved.`);
      return;
    }

    setSavedCourses((prev) => [...prev, course]);
    setStatusMessage(`${course.code} saved to your class plan.`);
    void pushCourseToBackend(course);
  }

  function handleRemoveCourse(id: string) {
    setSavedCourses((prev) => prev.filter((course) => course.id !== id));
    setStatusMessage("Course removed from saved classes.");
    void removeCourseFromBackend(id);
  }

  function handleResetDemo() {
    localStorage.removeItem(storageKey);
    setSavedCourses(starterSavedCourses);
    setStatusMessage("Demo reset to starter saved classes.");
    void resetBackendDemoStore();
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            Use Case 4 Demo
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Saved Classes + Semester History</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            This screen demonstrates saving course data without a visible course-builder flow by
            simulating quick-save actions and persisting results in browser storage + backend demo
            store.
          </p>
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
              onClick={handleResetDemo}
              className="rounded-lg border border-sky-300 bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-2 font-semibold text-white transition hover:from-cyan-500 hover:to-blue-700"
            >
              Reset demo data
            </button>
          </div>
          <p className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
            {statusMessage}
          </p>
        </header>

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
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>{course.units} units</span>
                  <button
                    onClick={() => handleRemoveCourse(course.id)}
                    className="rounded-md border border-rose-300 px-2 py-1 text-rose-700 transition hover:bg-rose-50"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Simulated Quick Save</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {quickAddCourses.map((course) => (
              <div key={course.id} className="rounded-xl border border-cyan-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">{course.term}</p>
                <h3 className="mt-1 font-semibold">
                  {course.code}: {course.title}
                </h3>
                <p className="mt-1 text-sm text-slate-700">{course.units} units</p>
                <button
                  onClick={() => handleQuickSave(course)}
                  className="mt-3 w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-600 px-3 py-2 font-semibold text-white transition hover:from-cyan-500 hover:to-blue-700"
                >
                  Save Course
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Dummy Semester History</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {semesterHistory.map((semester) => (
              <article key={semester.term} className="rounded-xl border border-cyan-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{semester.term}</h3>
                  <span className="text-sm text-slate-700">GPA: {semester.gpa}</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {semester.courses.map((course) => (
                    <li key={course} className="rounded-md border border-cyan-100 bg-cyan-50 px-2 py-1">
                      {course}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
