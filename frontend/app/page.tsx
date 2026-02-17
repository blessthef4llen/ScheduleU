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

const savedCoursesKey = "scheduleu-uc4-saved-courses";
const semesterHistoryKey = "scheduleu-semester-history";
const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
const apiUserId = 1;

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

const starterSemesters: SemesterRecord[] = [
  {
    id: "sem-1",
    term: "Fall 2025",
    gpa: "3.72",
    notes: "Strong first term with solid CS/math base.",
    courses: ["CECS 174 - Intro Programming", "MATH 122 - Calculus I", "ENGL 100"],
  },
  {
    id: "sem-2",
    term: "Winter 2026",
    gpa: "3.80",
    notes: "Focused short-term session.",
    courses: ["COMM 110 - Oral Communication"],
  },
  {
    id: "sem-3",
    term: "Spring 2026",
    gpa: "In Progress",
    notes: "Continuing core major requirements.",
    courses: ["CECS 225 - Digital Logic", "MATH 123 - Calculus II", "PHYS 151"],
  },
];

const courseSuggestions: SavedCourse[] = [
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

type ActiveView = "planner" | "semesters";

function toCourseLabel(course: SavedCourse): string {
  return `${course.code}: ${course.title}`;
}

export default function Home() {
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>(() => {
    if (typeof window === "undefined") return starterSavedCourses;
    const stored = localStorage.getItem(savedCoursesKey);
    if (!stored) return starterSavedCourses;

    try {
      const parsed = JSON.parse(stored) as SavedCourse[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : starterSavedCourses;
    } catch {
      return starterSavedCourses;
    }
  });

  const [semesters, setSemesters] = useState<SemesterRecord[]>(() => {
    if (typeof window === "undefined") return starterSemesters;
    const stored = localStorage.getItem(semesterHistoryKey);
    if (!stored) return starterSemesters;

    try {
      const parsed = JSON.parse(stored) as SemesterRecord[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : starterSemesters;
    } catch {
      return starterSemesters;
    }
  });

  const [statusMessage, setStatusMessage] = useState(() => {
    if (typeof window === "undefined") return "Planner ready.";
    return localStorage.getItem(savedCoursesKey)
      ? "Loaded saved classes from local storage."
      : "Planner ready.";
  });
  const [backendStatus, setBackendStatus] = useState("Checking backend...");
  const [activeView, setActiveView] = useState<ActiveView>("planner");
  const [selectedTermByCourse, setSelectedTermByCourse] = useState<Record<string, string>>({});
  const [selectedSavedBySemester, setSelectedSavedBySemester] = useState<Record<string, string>>({});
  const [customCourseBySemester, setCustomCourseBySemester] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function syncSavedClassesFromServer() {
      try {
        const healthResponse = await fetch(`${backendBaseUrl}/health`);
        if (!healthResponse.ok) throw new Error("health check failed");

        const classesResponse = await fetch(
          `${backendBaseUrl}/uc4/demo/saved-classes?user_id=${apiUserId}`,
        );
        if (!classesResponse.ok) throw new Error("saved classes fetch failed");

        const data = (await classesResponse.json()) as { courses?: SavedCourse[] };
        if (cancelled) return;

        setBackendStatus("Connected");
        if (Array.isArray(data.courses) && data.courses.length > 0) {
          setSavedCourses(data.courses);
          setStatusMessage("Loaded saved classes from server.");
        } else {
          setStatusMessage("Connected to backend.");
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
  }, []);

  useEffect(() => {
    localStorage.setItem(savedCoursesKey, JSON.stringify(savedCourses));
  }, [savedCourses]);

  useEffect(() => {
    localStorage.setItem(semesterHistoryKey, JSON.stringify(semesters));
  }, [semesters]);

  const totalUnits = useMemo(
    () => savedCourses.reduce((sum, course) => sum + course.units, 0),
    [savedCourses],
  );

  const semesterTerms = useMemo(() => semesters.map((semester) => semester.term), [semesters]);

  async function pushCourseToBackend(course: SavedCourse) {
    try {
      const response = await fetch(`${backendBaseUrl}/uc4/demo/saved-classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: apiUserId, course }),
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
        `${backendBaseUrl}/uc4/demo/saved-classes/${encodeURIComponent(courseId)}?user_id=${apiUserId}`,
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
        `${backendBaseUrl}/uc4/demo/saved-classes/reset?user_id=${apiUserId}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("reset failed");
      setBackendStatus("Connected");
    } catch {
      setBackendStatus("Offline (local fallback)");
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
    localStorage.removeItem(savedCoursesKey);
    setSavedCourses(starterSavedCourses);
    setStatusMessage("Saved classes reset.");
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
