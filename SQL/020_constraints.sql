-- =========================================================
-- 020_constraints.sql
-- Constraints, indexes, checks, triggers, and RLS policies
-- Execute after 010_schema_core.sql
-- =========================================================

-- -------------------------
-- Indexes / Uniqueness
-- -------------------------

-- users
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email
ON users (email);

-- allow many NULL auth_uid, but enforce uniqueness when present
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_auth_uid
ON users (auth_uid)
WHERE (auth_uid IS NOT NULL);

-- reviews
CREATE UNIQUE INDEX IF NOT EXISTS ux_reviews_user_course
ON reviews (user_id, course_id);

-- sections
CREATE INDEX IF NOT EXISTS idx_sections_course_term
ON sections (course_id, term);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sections_course_term_classnum
ON sections (course_id, term, class_number);

-- schedule_items
CREATE INDEX IF NOT EXISTS idx_schedule_items_schedule
ON schedule_items (schedule_id);

CREATE INDEX IF NOT EXISTS idx_schedule_items_section
ON schedule_items (section_id);

-- prevent duplicates: same section added twice into same schedule
CREATE UNIQUE INDEX IF NOT EXISTS ux_schedule_items_schedule_section
ON schedule_items (schedule_id, section_id);


-- -------------------------
-- Foreign Keys
-- -------------------------

ALTER TABLE schedules
    DROP CONSTRAINT IF EXISTS schedules_user_id_fkey,
    ADD CONSTRAINT schedules_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE;

ALTER TABLE reviews
    DROP CONSTRAINT IF EXISTS reviews_user_id_fkey,
    ADD CONSTRAINT reviews_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE;

ALTER TABLE reviews
    DROP CONSTRAINT IF EXISTS reviews_course_id_fkey,
    ADD CONSTRAINT reviews_course_id_fkey
        FOREIGN KEY (course_id) REFERENCES courses(id)
        ON DELETE CASCADE;

ALTER TABLE sections
    DROP CONSTRAINT IF EXISTS sections_course_id_fkey,
    ADD CONSTRAINT sections_course_id_fkey
        FOREIGN KEY (course_id) REFERENCES courses(id)
        ON DELETE CASCADE;

ALTER TABLE schedule_items
    DROP CONSTRAINT IF EXISTS schedule_items_schedule_id_fkey,
    ADD CONSTRAINT schedule_items_schedule_id_fkey
        FOREIGN KEY (schedule_id) REFERENCES schedules(id)
        ON DELETE CASCADE;

ALTER TABLE schedule_items
    DROP CONSTRAINT IF EXISTS schedule_items_section_id_fkey,
    ADD CONSTRAINT schedule_items_section_id_fkey
        FOREIGN KEY (section_id) REFERENCES sections(id)
        ON DELETE CASCADE;


-- -------------------------
-- CHECK Constraints
-- -------------------------

-- reviews: rating must be 1..5 when provided
ALTER TABLE reviews
    DROP CONSTRAINT IF EXISTS reviews_rating_check,
    ADD CONSTRAINT reviews_rating_check
        CHECK ((rating IS NULL) OR (rating >= 1 AND rating <= 5));

-- sections: seats / capacity sanity
ALTER TABLE sections
    DROP CONSTRAINT IF EXISTS sections_seats_nonnegative,
    ADD CONSTRAINT sections_seats_nonnegative
        CHECK ((open_seats IS NULL) OR (open_seats >= 0));

ALTER TABLE sections
    DROP CONSTRAINT IF EXISTS sections_capacity_nonnegative,
    ADD CONSTRAINT sections_capacity_nonnegative
        CHECK ((capacity IS NULL) OR (capacity >= 0));

ALTER TABLE sections
    DROP CONSTRAINT IF EXISTS sections_open_le_capacity,
    ADD CONSTRAINT sections_open_le_capacity
        CHECK ((open_seats IS NULL) OR (capacity IS NULL) OR (open_seats <= capacity));


-- -------------------------
-- Trigger (auto-fill users.auth_uid)
-- -------------------------
-- NOTE: This assumes you are using Supabase Auth and want to map auth.uid() -> users.auth_uid.

CREATE OR REPLACE FUNCTION set_users_auth_uid()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.auth_uid IS NULL THEN
    NEW.auth_uid := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_users_auth_uid ON users;

CREATE TRIGGER trg_set_users_auth_uid
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_users_auth_uid();


-- -------------------------
-- RLS (Row Level Security) + Policies
-- -------------------------

-- Enable RLS on user-owned tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- users: only see/insert/update your own row (by auth_uid)
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own
ON users
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth_uid = auth.uid());

DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own
ON users
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth_uid = auth.uid());

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own
ON users
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth_uid = auth.uid())
WITH CHECK (auth_uid = auth.uid());

-- schedules: only owner can read/write
DROP POLICY IF EXISTS schedules_select_own ON schedules;
CREATE POLICY schedules_select_own
ON schedules
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = schedules.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS schedules_insert_own ON schedules;
CREATE POLICY schedules_insert_own
ON schedules
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = schedules.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS schedules_update_own ON schedules;
CREATE POLICY schedules_update_own
ON schedules
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = schedules.user_id
      AND u.auth_uid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = schedules.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS schedules_delete_own ON schedules;
CREATE POLICY schedules_delete_own
ON schedules
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = schedules.user_id
      AND u.auth_uid = auth.uid()
  )
);

-- schedule_items: only items inside schedules you own
DROP POLICY IF EXISTS schedule_items_select_own ON schedule_items;
CREATE POLICY schedule_items_select_own
ON schedule_items
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM schedules sch
    JOIN users u ON u.id = sch.user_id
    WHERE sch.id = schedule_items.schedule_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS schedule_items_insert_own ON schedule_items;
CREATE POLICY schedule_items_insert_own
ON schedule_items
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM schedules sch
    JOIN users u ON u.id = sch.user_id
    WHERE sch.id = schedule_items.schedule_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS schedule_items_delete_own ON schedule_items;
CREATE POLICY schedule_items_delete_own
ON schedule_items
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM schedules sch
    JOIN users u ON u.id = sch.user_id
    WHERE sch.id = schedule_items.schedule_id
      AND u.auth_uid = auth.uid()
  )
);

-- reviews: public read, only owner can write
DROP POLICY IF EXISTS reviews_read_all ON reviews;
CREATE POLICY reviews_read_all
ON reviews
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS reviews_insert_own ON reviews;
CREATE POLICY reviews_insert_own
ON reviews
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = reviews.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS reviews_update_own ON reviews;
CREATE POLICY reviews_update_own
ON reviews
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = reviews.user_id
      AND u.auth_uid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = reviews.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS reviews_delete_own ON reviews;
CREATE POLICY reviews_delete_own
ON reviews
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = reviews.user_id
      AND u.auth_uid = auth.uid()
  )
);
