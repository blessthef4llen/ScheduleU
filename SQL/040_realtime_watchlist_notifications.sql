--Backend only; awaiting a true front end hookup
-- =========================================================
-- 040_realtime_watchlist_notifications.sql
-- Watchlist + Notifications + section freshness
-- Execute after 010_schema_core.sql + 020_constraints.sql + 025_views.sql
-- =========================================================

-- 1) Track freshness for real-time section status
ALTER TABLE sections
ADD COLUMN IF NOT EXISTS last_status_at TIMESTAMPTZ;

-- 2) Watchlist table (UC4: "Watch this class" + rules)
CREATE TABLE IF NOT EXISTS watchlists (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id BIGINT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,

  -- Rule: alert when open seats >= min_open_seats (default 1)
  min_open_seats INTEGER NOT NULL DEFAULT 1,

  -- Optional quiet hours / channel prefs (keep flexible)
  quiet_hours JSONB,
  channels JSONB,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_notified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicates: same user watches same section once
CREATE UNIQUE INDEX IF NOT EXISTS ux_watchlists_user_section
ON watchlists (user_id, section_id);

CREATE INDEX IF NOT EXISTS idx_watchlists_section_active
ON watchlists (section_id, is_active);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_watchlists_updated_at ON watchlists;
CREATE TRIGGER trg_watchlists_updated_at
BEFORE UPDATE ON watchlists
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- 3) Notifications table (UC4: “Alert delivery” + Notification Center later)
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- e.g. 'seat_open', 'status_change'
  type TEXT NOT NULL,

  -- flexible payload: course/section, old/new status, deep link, etc.
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications (user_id, created_at DESC);


-- 4) Views for easy consumption (optional but matches your pattern)
CREATE OR REPLACE VIEW v_watchlist_details AS
SELECT
  w.id AS watch_id,
  w.user_id,
  w.section_id,
  w.min_open_seats,
  w.is_active,
  w.last_notified_at,
  w.created_at,
  w.updated_at,

  c.id AS course_id,
  c.subject,
  c.number,
  c.title,
  s.term,
  s.sec,
  s.class_number,
  s.component_type,
  s.days,
  s.time_range,
  s.location,
  s.instructor,
  s.open_seats,
  s.capacity,
  s.status,
  s.last_status_at
FROM watchlists w
JOIN sections s ON s.id = w.section_id
JOIN courses c ON c.id = s.course_id;

CREATE OR REPLACE VIEW v_notifications AS
SELECT
  n.id,
  n.user_id,
  n.type,
  n.payload,
  n.is_read,
  n.created_at
FROM notifications n;


-- 5) RLS policies (align with your 020_constraints.sql approach)
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- watchlists: only owner can read/write
DROP POLICY IF EXISTS watchlists_select_own ON watchlists;
CREATE POLICY watchlists_select_own
ON watchlists
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = watchlists.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS watchlists_insert_own ON watchlists;
CREATE POLICY watchlists_insert_own
ON watchlists
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = watchlists.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS watchlists_update_own ON watchlists;
CREATE POLICY watchlists_update_own
ON watchlists
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = watchlists.user_id
      AND u.auth_uid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = watchlists.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS watchlists_delete_own ON watchlists;
CREATE POLICY watchlists_delete_own
ON watchlists
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = watchlists.user_id
      AND u.auth_uid = auth.uid()
  )
);

-- notifications: only owner can read/update, insert via backend/service role or owner
DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own
ON notifications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = notifications.user_id
      AND u.auth_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own
ON notifications
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = notifications.user_id
      AND u.auth_uid = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = notifications.user_id
      AND u.auth_uid = auth.uid()
  )
);

-- NOTE: For inserts, you can either:
--  A) allow authenticated users to insert for themselves, OR
--  B) insert from backend with service role (recommended).
DROP POLICY IF EXISTS notifications_insert_own ON notifications;
CREATE POLICY notifications_insert_own
ON notifications
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = notifications.user_id
      AND u.auth_uid = auth.uid()
  )
);
