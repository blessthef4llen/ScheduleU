// Shared Degreeauditdetails helpers for ScheduleU.
import { supabase } from "@/utils/supabase";

export type AuditCourseDetail = {
  group_id: number;
  group_name: string;
  course_code_full: string;
  title: string;
  units: number;
  term?: string | null;
  grade?: string | null;
};

type RequirementGroupRow = {
  id: number;
  group_name: string;
  program_id: number;
};

type ProgramRequirementRow = {
  group_id: number;
  course_code_full: string;
};

type CourseRow = {
  course_code_full: string;
  title: string;
  units: number;
};

type CompletedRow = {
  course_code_full: string;
  term: string | null;
  grade: string | null;
};

type EnrichedRequirementRow = {
  group_id: number;
  group_name: string;
  course_code_full: string;
  title: string;
  units: number;
};

async function getRequirementGroups(programId: number): Promise<RequirementGroupRow[]> {
  const { data, error } = await supabase
    .from("requirement_groups")
    .select("id, group_name, program_id")
    .eq("program_id", programId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Requirement groups error:", error);
    return [];
  }

  return (data as RequirementGroupRow[]) ?? [];
}

async function getProgramRequirementsByGroups(
  groupIds: number[]
): Promise<ProgramRequirementRow[]> {
  if (groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from("program_requirements")
    .select("group_id, course_code_full")
    .in("group_id", groupIds);

  if (error) {
    console.error("Program requirements error:", error);
    return [];
  }

  return (data as ProgramRequirementRow[]) ?? [];
}

async function getCoursesByCodes(courseCodes: string[]): Promise<CourseRow[]> {
  if (courseCodes.length === 0) return [];

  const { data, error } = await supabase
    .from("courses")
    .select("course_code_full, title, units")
    .in("course_code_full", courseCodes);

  if (error) {
    console.error("Courses lookup error:", error);
    return [];
  }

  return (data as CourseRow[]) ?? [];
}

async function getUserCompletedRows(userId: string): Promise<CompletedRow[]> {
  const { data, error } = await supabase
    .from("user_completed_courses")
    .select("course_code_full, term, grade")
    .eq("user_id", userId);

  if (error) {
    console.error("User completed rows error:", error);
    return [];
  }

  return (data as CompletedRow[]) ?? [];
}

async function getProgramRequirementDetails(
  programId: number
): Promise<EnrichedRequirementRow[]> {
  const groups = await getRequirementGroups(programId);
  const groupIds = groups.map((group) => group.id);

  const requirements = await getProgramRequirementsByGroups(groupIds);
  const courseCodes = [...new Set(requirements.map((req) => req.course_code_full))];
  const courses = await getCoursesByCodes(courseCodes);

  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const courseMap = new Map(courses.map((course) => [course.course_code_full, course]));

  return requirements
    .map((req) => {
      const group = groupMap.get(req.group_id);
      const course = courseMap.get(req.course_code_full);

      if (!group || !course) return null;

      return {
        group_id: req.group_id,
        group_name: group.group_name,
        course_code_full: req.course_code_full,
        title: course.title,
        units: Number(course.units),
      };
    })
    .filter((item): item is EnrichedRequirementRow => item !== null);
}

export async function getCompletedCourseDetails(
  userId: string,
  programId: number
): Promise<AuditCourseDetail[]> {
  const [requirements, completedCourses] = await Promise.all([
    getProgramRequirementDetails(programId),
    getUserCompletedRows(userId),
  ]);

  const completedMap = new Map(
    completedCourses.map((course) => [course.course_code_full, course])
  );

  return requirements
    .filter((req) => completedMap.has(req.course_code_full))
    .map((req) => {
      const completed = completedMap.get(req.course_code_full);

      return {
        group_id: req.group_id,
        group_name: req.group_name,
        course_code_full: req.course_code_full,
        title: req.title,
        units: req.units,
        term: completed?.term ?? null,
        grade: completed?.grade ?? null,
      };
    });
}

export async function getRemainingCourseDetails(
  userId: string,
  programId: number
): Promise<AuditCourseDetail[]> {
  const [requirements, completedCourses] = await Promise.all([
    getProgramRequirementDetails(programId),
    getUserCompletedRows(userId),
  ]);

  const completedSet = new Set(
    completedCourses.map((course) => course.course_code_full)
  );

  return requirements.filter((req) => !completedSet.has(req.course_code_full));
}