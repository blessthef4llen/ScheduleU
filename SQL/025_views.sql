-- =========================================================
-- 025_views.sql
-- Views used by the API / frontend
-- Execute after 010_schema_core.sql + 020_constraints.sql
-- =========================================================

CREATE OR REPLACE VIEW v_course_listings AS
SELECT
  c.id AS course_id,
  c.subject,
  c.number,
  c.title,
  c.units,
  s.id AS section_id,
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
  s.notes
FROM sections s
JOIN courses c ON c.id = s.course_id;

CREATE OR REPLACE VIEW v_course_ratings AS
SELECT
  c.id AS course_id,
  c.subject,
  c.number,
  c.title,
  COUNT(r.id) AS review_count,
  ROUND(AVG(r.rating)::numeric, 2) AS avg_rating
FROM courses c
LEFT JOIN reviews r ON r.course_id = c.id
GROUP BY c.id, c.subject, c.number, c.title;

CREATE OR REPLACE VIEW v_schedule_details AS
SELECT
  sch.id AS schedule_id,
  sch.user_id,
  sch.term,
  si.id AS schedule_item_id,
  c.id AS course_id,
  c.subject,
  c.number,
  c.title,
  c.units,
  sec.id AS section_id,
  sec.sec,
  sec.class_number,
  sec.component_type,
  sec.days,
  sec.time_range,
  sec.location,
  sec.instructor,
  sec.status
FROM schedules sch
JOIN schedule_items si ON si.schedule_id = sch.id
JOIN sections sec ON sec.id = si.section_id
JOIN courses c ON c.id = sec.course_id;
