-- =========================================================
-- 045_completed_courses.sql
-- User-scoped completed courses imported from transcript parsing
-- Execute after 040_realtime_watchlist_notifications.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS completed_courses (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL DEFAULT auth.uid(),
  course_code TEXT NOT NULL,
  subject TEXT NOT NULL,
  course_number TEXT NOT NULL,
  title TEXT,
  term TEXT NOT NULL DEFAULT '',
  grade TEXT,
  units NUMERIC(5,2),
  raw_line TEXT,
  matched_catalog BOOLEAN NOT NULL DEFAULT FALSE,
  confidence NUMERIC(4,3),
  source TEXT NOT NULL DEFAULT 'transcript_import',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_completed_courses_user_course_term
ON completed_courses (auth_user_id, course_code, term);

CREATE INDEX IF NOT EXISTS idx_completed_courses_user
ON completed_courses (auth_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_completed_courses_code
ON completed_courses (course_code);

CREATE OR REPLACE FUNCTION set_completed_courses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_completed_courses_updated_at ON completed_courses;
CREATE TRIGGER trg_completed_courses_updated_at
BEFORE UPDATE ON completed_courses
FOR EACH ROW
EXECUTE FUNCTION set_completed_courses_updated_at();

ALTER TABLE completed_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS completed_courses_select_own ON completed_courses;
CREATE POLICY completed_courses_select_own
ON completed_courses
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS completed_courses_insert_own ON completed_courses;
CREATE POLICY completed_courses_insert_own
ON completed_courses
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS completed_courses_update_own ON completed_courses;
CREATE POLICY completed_courses_update_own
ON completed_courses
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS completed_courses_delete_own ON completed_courses;
CREATE POLICY completed_courses_delete_own
ON completed_courses
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth_user_id = auth.uid());
