// Shared Workloadscorer helpers for ScheduleU.
export type Intensity = "low" | "medium" | "high" | string | null | undefined;

export type CourseDifficultyProfile = {
  course_code: string;
  course_title?: string | null;
  department?: string | null;
  course_level?: number | string | null;
  units?: number | string | null;
  has_lab?: boolean | null;
  meeting_frequency?: number | string | null;
  base_difficulty?: number | string | null;
  project_intensity?: Intensity;
  exam_intensity?: Intensity;
  reading_intensity?: Intensity;
  assignment_intensity?: Intensity;
  notes?: string | null;
};

export type StudentPlannedCourse = {
  user_id: string;
  term: string;
  course_code: string;
  section_code?: string | null;
  meeting_days?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_active?: boolean | null;
};

export type AnalyzedCourse = {
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  meetingDays: string;
  startTime: string;
  endTime: string;
  score: number;
  reasons: string[];
  hasLab: boolean;
  earlyClass: boolean;
  isHeavy: boolean;
};

export type WorkloadLabel = "Light" | "Moderate" | "Heavy" | "Very Heavy";

export type WorkloadResult = {
  overallScore: number;
  label: WorkloadLabel;
  explanation: string;
  reasonTags: string[];
  recommendations: string[];
  analyzedCourses: AnalyzedCourse[];
  stats: {
    activeCourses: number;
    heavyCourses: number;
    earlyClasses: number;
    labCourses: number;
  };
};

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function normalizeIntensity(v: Intensity): "low" | "medium" | "high" {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("high")) return "high";
  if (s.includes("medium") || s.includes("med")) return "medium";
  return "low";
}

function isEarly(startTime?: string | null): boolean {
  if (!startTime) return false;
  const hh = Number((startTime.split(":")[0] ?? "").trim());
  return Number.isFinite(hh) && hh < 9;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function mapLabel(score: number): WorkloadLabel {
  if (score <= 3.9) return "Light";
  if (score <= 6.4) return "Moderate";
  if (score <= 8.4) return "Heavy";
  return "Very Heavy";
}

function scoreCourse(planned: StudentPlannedCourse, profile?: CourseDifficultyProfile): AnalyzedCourse {
  const units = toNumber(profile?.units, 0);
  const courseLevel = toNumber(profile?.course_level, 0);
  const meetingFreq = toNumber(profile?.meeting_frequency, 0);
  const baseDifficulty = toNumber(profile?.base_difficulty, 4);
  const hasLab = Boolean(profile?.has_lab);
  const early = isEarly(planned.start_time);

  let score = baseDifficulty;
  const reasons: string[] = [];

  if (units >= 4) {
    score += 0.5;
    reasons.push("High Unit Load");
  }
  if (hasLab) {
    score += 1.0;
    reasons.push("Lab Component");
  }
  if (courseLevel >= 300) {
    score += 0.5;
    reasons.push("Upper-Division");
  }
  if (meetingFreq >= 3) {
    score += 0.5;
    reasons.push("Frequent Meetings");
  }
  if (early) {
    score += 0.5;
    reasons.push("Early Start");
  }

  if (normalizeIntensity(profile?.project_intensity) === "high") {
    score += 1.0;
    reasons.push("Heavy Project Load");
  }
  if (normalizeIntensity(profile?.exam_intensity) === "high") {
    score += 1.0;
    reasons.push("Exam Intensive");
  }
  if (normalizeIntensity(profile?.reading_intensity) === "high") {
    score += 0.5;
    reasons.push("Reading Intensive");
  }
  if (normalizeIntensity(profile?.assignment_intensity) === "high") {
    score += 0.5;
    reasons.push("Assignment Heavy");
  }

  score = clamp(score, 0, 10);
  const isHeavy = score >= 7.2;

  return {
    courseCode: planned.course_code,
    courseTitle: profile?.course_title?.trim() || "Course",
    sectionCode: planned.section_code ?? "N/A",
    meetingDays: planned.meeting_days ?? "TBA",
    startTime: planned.start_time ?? "TBA",
    endTime: planned.end_time ?? "TBA",
    score: Number(score.toFixed(1)),
    reasons: reasons.slice(0, 4),
    hasLab,
    earlyClass: early,
    isHeavy,
  };
}

function dayDensityBump(plannedCourses: StudentPlannedCourse[]): { bump: number; tag?: string } {
  const dayCount: Record<string, number> = {};
  for (const c of plannedCourses) {
    const days = (c.meeting_days ?? "").toUpperCase();
    for (const token of ["M", "T", "W", "R", "F"]) {
      if (days.includes(token)) dayCount[token] = (dayCount[token] ?? 0) + 1;
    }
  }
  const maxCount = Math.max(0, ...Object.values(dayCount));
  if (maxCount >= 4) return { bump: 0.6, tag: "Dense Weekly Schedule" };
  if (maxCount >= 3) return { bump: 0.3, tag: "Clustered Class Days" };
  return { bump: 0 };
}

function buildExplanation(label: WorkloadLabel, tags: string[]): string {
  if (label === "Very Heavy") {
    return `This semester looks very demanding due to ${tags.slice(0, 3).join(", ").toLowerCase()}. Plan study blocks early and keep buffer time each week.`;
  }
  if (label === "Heavy") {
    return `This semester appears heavy because of ${tags.slice(0, 3).join(", ").toLowerCase()}. You can manage it well with consistent weekly pacing.`;
  }
  if (label === "Moderate") {
    return `Your semester appears moderately balanced, with manageable pressure from ${tags.slice(0, 2).join(", ").toLowerCase()}.`;
  }
  return "This schedule looks light and manageable overall, with room for flexibility during busier weeks.";
}

function buildRecommendations(label: WorkloadLabel, tags: string[]): string[] {
  const recs: string[] = [];
  if (label === "Very Heavy" || label === "Heavy") {
    recs.push("Consider balancing this term with one lighter elective if possible.");
    recs.push("Block recurring study sessions early in the week to avoid deadline clustering.");
  } else {
    recs.push("Your schedule looks manageable; maintain a consistent weekly review routine.");
  }
  if (tags.includes("Early Morning Schedule")) {
    recs.push("You have multiple early classes. Protect sleep and prepare materials the night before.");
  }
  if (tags.includes("Dense Weekly Schedule") || tags.includes("Clustered Class Days")) {
    recs.push("Your schedule is day-dense. Leave extra time for assignments and commuting.");
  }
  if (tags.includes("Lab-Heavy Week")) {
    recs.push("Plan additional prep/review blocks for lab reports and practical work.");
  }
  recs.push("Watch Notification Center for reminders around registration and high-pressure weeks.");
  return recs.slice(0, 4);
}

export function analyzeWorkload(
  plannedCourses: StudentPlannedCourse[],
  profilesByCode: Record<string, CourseDifficultyProfile | undefined>
): WorkloadResult {
  const analyzedCourses = plannedCourses.map((course) => scoreCourse(course, profilesByCode[course.course_code]));

  const baseAverage =
    analyzedCourses.length > 0
      ? analyzedCourses.reduce((sum, c) => sum + c.score, 0) / analyzedCourses.length
      : 0;

  const heavyCourses = analyzedCourses.filter((c) => c.isHeavy).length;
  const earlyClasses = analyzedCourses.filter((c) => c.earlyClass).length;
  const labCourses = analyzedCourses.filter((c) => c.hasLab).length;

  let bump = 0;
  const tags = new Set<string>();

  if (heavyCourses >= 2) {
    bump += 0.5;
    tags.add("Upper-Division Focus");
  }
  const density = dayDensityBump(plannedCourses);
  bump += density.bump;
  if (density.tag) tags.add(density.tag);

  if (earlyClasses >= 2) {
    bump += earlyClasses >= 3 ? 0.6 : 0.3;
    tags.add("Early Morning Schedule");
  }
  if (labCourses >= 2) tags.add("Lab-Heavy Week");

  const hasHeavyAndLight =
    analyzedCourses.some((c) => c.score >= 7.2) && analyzedCourses.some((c) => c.score <= 5.2);
  if (hasHeavyAndLight) {
    bump -= 0.3;
    tags.add("Balanced Mix");
  }

  const overallScore = Number(clamp(baseAverage + bump, 0, 10).toFixed(1));
  const label = mapLabel(overallScore);

  if (analyzedCourses.some((c) => c.reasons.includes("Heavy Project Load"))) tags.add("Heavy Project Load");
  if (analyzedCourses.some((c) => c.reasons.includes("Exam Intensive"))) tags.add("Exam Intensive");
  if (analyzedCourses.some((c) => c.reasons.includes("Assignment Heavy"))) tags.add("Assignment Intensive");

  const reasonTags = Array.from(tags);
  const explanation = buildExplanation(label, reasonTags.length ? reasonTags : ["course intensity"]);
  const recommendations = buildRecommendations(label, reasonTags);

  return {
    overallScore,
    label,
    explanation,
    reasonTags,
    recommendations,
    analyzedCourses,
    stats: {
      activeCourses: analyzedCourses.length,
      heavyCourses,
      earlyClasses,
      labCourses,
    },
  };
}

