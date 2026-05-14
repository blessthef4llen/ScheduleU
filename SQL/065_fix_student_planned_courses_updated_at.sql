-- =========================================================
-- 065_fix_student_planned_courses_updated_at.sql
-- Fix AI workload planner sync when student_planned_courses has an
-- updated_at trigger but no updated_at column.
-- Execute after the AI Workload Scorer tables have been created.
-- =========================================================

CREATE TABLE IF NOT EXISTS student_planned_courses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  term TEXT NOT NULL,
  course_code TEXT NOT NULL,
  section_code TEXT,
  meeting_days TEXT,
  start_time TEXT,
  end_time TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE student_planned_courses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_student_planned_courses_user_active
ON student_planned_courses (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_student_planned_courses_user_term
ON student_planned_courses (user_id, term);

CREATE OR REPLACE FUNCTION set_student_planned_courses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_planned_courses_updated_at ON student_planned_courses;
CREATE TRIGGER trg_student_planned_courses_updated_at
BEFORE UPDATE ON student_planned_courses
FOR EACH ROW
EXECUTE FUNCTION set_student_planned_courses_updated_at();

ALTER TABLE student_planned_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_planned_courses_select_own ON student_planned_courses;
CREATE POLICY student_planned_courses_select_own
ON student_planned_courses
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS student_planned_courses_insert_own ON student_planned_courses;
CREATE POLICY student_planned_courses_insert_own
ON student_planned_courses
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS student_planned_courses_update_own ON student_planned_courses;
CREATE POLICY student_planned_courses_update_own
ON student_planned_courses
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (user_id::text = auth.uid()::text)
WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS student_planned_courses_delete_own ON student_planned_courses;
CREATE POLICY student_planned_courses_delete_own
ON student_planned_courses
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (user_id::text = auth.uid()::text);
