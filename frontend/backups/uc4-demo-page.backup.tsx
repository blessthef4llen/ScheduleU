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

const storageKey = "scheduleu-uc4-saved-courses";

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

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(savedCourses));
  }, [savedCourses]);

  const totalUnits = useMemo(
    () => savedCourses.reduce((sum, course) => sum + course.units, 0),
    [savedCourses],
  );

  function handleQuickSave(course: SavedCourse) {
    if (savedCourses.some((saved) => saved.code === course.code)) {
      setStatusMessage(`${course.code} is already saved.`);
      return;
    }

    setSavedCourses((prev) => [...prev, course]);
    setStatusMessage(`${course.code} saved to your class plan.`);
  }

  function handleRemoveCourse(id: string) {
    setSavedCourses((prev) => prev.filter((course) => course.id !== id));
    setStatusMessage("Course removed from saved classes.");
  }

  function handleResetDemo() {
    localStorage.removeItem(storageKey);
    setSavedCourses(starterSavedCourses);
    setStatusMessage("Demo reset to starter saved classes.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Use Case 4 Demo
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Saved Classes + Semester History</h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            This screen demonstrates saving course data without a visible course-builder flow by
            simulating quick-save actions and persisting results in browser storage.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <div className="rounded-lg bg-slate-800 px-3 py-2">
              <span className="text-slate-400">Saved classes:</span> {savedCourses.length}
            </div>
            <div className="rounded-lg bg-slate-800 px-3 py-2">
              <span className="text-slate-400">Planned units:</span> {totalUnits}
            </div>
            <button
              onClick={handleResetDemo}
              className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Reset demo data
            </button>
          </div>
          <p className="mt-4 rounded-lg bg-slate-800/80 px-3 py-2 text-sm text-emerald-300">
            {statusMessage}
          </p>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Saved Classes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {savedCourses.map((course) => (
              <article
                key={course.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-950/50"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">{course.term}</p>
                    <h3 className="text-lg font-semibold">
                      {course.code}: {course.title}
                    </h3>
                  </div>
                  <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                    {course.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{course.units} units</span>
                  <button
                    onClick={() => handleRemoveCourse(course.id)}
                    className="rounded-md border border-rose-500/30 px-2 py-1 text-rose-300 transition hover:bg-rose-500/10"
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
              <div key={course.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">{course.term}</p>
                <h3 className="mt-1 font-semibold">
                  {course.code}: {course.title}
                </h3>
                <p className="mt-1 text-sm text-slate-300">{course.units} units</p>
                <button
                  onClick={() => handleQuickSave(course)}
                  className="mt-3 w-full rounded-lg bg-emerald-500 px-3 py-2 font-semibold text-slate-900 transition hover:bg-emerald-400"
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
              <article key={semester.term} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{semester.term}</h3>
                  <span className="text-sm text-slate-300">GPA: {semester.gpa}</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {semester.courses.map((course) => (
                    <li key={course} className="rounded-md bg-slate-800 px-2 py-1">
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
