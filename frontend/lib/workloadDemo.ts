// Shared Workloaddemo helpers for ScheduleU.
import { analyzeWorkload, type CourseDifficultyProfile, type StudentPlannedCourse, type WorkloadResult } from "./workloadScorer";

const DEMO_USER = "demo-scheduleu";

function plan(
  course_code: string,
  section: string,
  meeting_days: string,
  start_time: string,
  end_time: string
): StudentPlannedCourse {
  return {
    user_id: DEMO_USER,
    term: "Spring 2026",
    course_code,
    section_code: section,
    meeting_days,
    start_time,
    end_time,
    is_active: true,
  };
}

/**
 * Realistic CSULB-style demo load: networks + math + composition + mechanics/lab.
 * Tuned so analyzeWorkload yields Heavy (or upper band) with strong reason tags for demos.
 */
export function getDemoPlannedCourses(): StudentPlannedCourse[] {
  return [
    plan("MATH 370A", "03", "MWF", "08:00", "08:50"),
    plan("ENGL 100", "12", "TR", "08:00", "09:15"),
    plan("CECS 328", "04", "TR", "09:30", "10:45"),
    plan("PHYS 151", "06", "MW", "11:00", "12:15"),
  ];
}

export function getDemoProfilesByCode(): Record<string, CourseDifficultyProfile> {
  return {
    "MATH 370A": {
      course_code: "MATH 370A",
      course_title: "Mathematical Structures I",
      base_difficulty: 6.3,
      units: 3,
      course_level: 300,
      meeting_frequency: 3,
      exam_intensity: "high",
      assignment_intensity: "high",
    },
    "ENGL 100": {
      course_code: "ENGL 100",
      course_title: "Composition",
      base_difficulty: 4.2,
      units: 3,
      course_level: 100,
      meeting_frequency: 2,
      reading_intensity: "medium",
      assignment_intensity: "medium",
    },
    "CECS 328": {
      course_code: "CECS 328",
      course_title: "Introduction to Computer Networks and Distributed Computing",
      base_difficulty: 6.4,
      units: 3,
      course_level: 300,
      meeting_frequency: 2,
      project_intensity: "high",
      exam_intensity: "high",
      assignment_intensity: "medium",
    },
    "PHYS 151": {
      course_code: "PHYS 151",
      course_title: "Mechanics and Heat",
      base_difficulty: 5.9,
      units: 3,
      course_level: 200,
      has_lab: true,
      meeting_frequency: 3,
      exam_intensity: "high",
      assignment_intensity: "high",
    },
  };
}

export function getDemoWorkloadResult(): WorkloadResult {
  return analyzeWorkload(getDemoPlannedCourses(), getDemoProfilesByCode());
}
