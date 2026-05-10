// Shared Types helpers for ScheduleU.
export type MeetingBlock = {
  day: number;
  startMin: number;
  endMin: number;
  label?: string;
};

export type AppUserRow = {
  id: number;
  auth_uid?: string | null;
  email?: string | null;
  name?: string | null;
};

export type SectionLite = {
  id: number;
  source?: "semester_table" | "sections";
  section_uid?: string | null;
  term_table?: string | null;
  term?: string | null;
  subject?: string | null;
  course_number?: string | number | null;
  course_code_full: string | null;
  course_title?: string | null;
  units?: number | null;
  section?: string | null;
  component_type?: string | null;
  class_number?: string | number | null;
  instructor: string | null;
  days: string | null;
  time_range: string | null;
  location: string | null;
  status?: string | null;
  open_seats?: number | null;
  open_seats_label?: string | null;
  capacity?: number | null;
};

export type ScheduleRow = {
  id: number;
  user_id: string;
  term: string;
  created_at?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start?: string;
  end?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  extendedProps?: {
    section_id: number;
    raw?: SectionLite;
  };
};

export type AddResult =
  | { ok: true; msg: string }
  | { ok: false; msg: string };
