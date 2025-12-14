-- ==========================================
-- 030_seed.sql  (realistic mock data)
-- ==========================================

-- ---------- USERS ----------
INSERT INTO users (email, name)
SELECT 'demo@csulb.edu', 'Demo User'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='demo@csulb.edu');

INSERT INTO users (email, name)
SELECT 'wesley@csulb.edu', 'Wesley Chen'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='wesley@csulb.edu');


-- ---------- COURSES ----------
-- NOTE: your current courses table includes instructor/status/meeting_time.
-- We keep those as NULL or simple defaults because details live in sections now.

INSERT INTO courses (subject, number, title, instructor, units, status, meeting_time)
SELECT 'CECS','361','Digital Design Tech Verification', NULL, 3, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM courses
  WHERE subject='CECS' AND number='361' AND title='Digital Design Tech Verification'
);

INSERT INTO courses (subject, number, title, instructor, units, status, meeting_time)
SELECT 'CECS','378','Intro to Computer Security', NULL, 3, NULL, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM courses
  WHERE subject='CECS' AND number='378' AND title='Intro to Computer Security'
);

INSERT INTO courses (subject, number, title, instructor, units, status, meeting_time)
SELECT 'CECS','491A','Senior Project A', 'Hoffman', 3, 'Open', 'MWF 10:00-10:50'
WHERE NOT EXISTS (
  SELECT 1 FROM courses
  WHERE subject='CECS' AND number='491A' AND title='Senior Project A'
);


-- ---------- SECTIONS (REALISTIC LISTING STYLE) ----------
-- Term: use a realistic label that matches your schedules.term
-- Example: "Spring 2026"
-- We will insert multiple sections per course like your screenshot (SEM + LAB, multiple rows).

-- Helper: CECS 361 course_id
WITH c AS (
  SELECT id AS course_id
  FROM courses
  WHERE subject='CECS' AND number='361' AND title='Digital Design Tech Verification'
  LIMIT 1
)
INSERT INTO sections (
  course_id, term, sec, class_number, component_type,
  days, time_range, location, instructor,
  open_seats, capacity, status, meeting_time, notes
)
SELECT
  c.course_id, 'Spring 2026', '01', 9432, 'SEM',
  'MW', '5:30-6:20PM', 'ECS-412', 'Ghaforyfard P',
  5, 35, 'open', 'MW 5:30-6:20PM', 'Class instruction is: F'
FROM c
WHERE NOT EXISTS (
  SELECT 1 FROM sections s
  WHERE s.course_id=c.course_id AND s.term='Spring 2026' AND s.class_number=9432
);

WITH c AS (
  SELECT id AS course_id
  FROM courses
  WHERE subject='CECS' AND number='361' AND title='Digital Design Tech Verification'
  LIMIT 1
)
INSERT INTO sections (
  course_id, term, sec, class_number, component_type,
  days, time_range, location, instructor,
  open_seats, capacity, status, meeting_time, notes
)
SELECT
  c.course_id, 'Spring 2026', '02', 9433, 'LAB',
  'MW', '6:30-7:45PM', 'ECS-412', 'Ghaforyfard P',
  0, 24, 'closed', 'MW 6:30-7:45PM', 'Lab section. Class instruction is: F'
FROM c
WHERE NOT EXISTS (
  SELECT 1 FROM sections s
  WHERE s.course_id=c.course_id AND s.term='Spring 2026' AND s.class_number=9433
);


-- CECS 378 sections (multiple SEM rows like screenshot)
WITH c AS (
  SELECT id AS course_id
  FROM courses
  WHERE subject='CECS' AND number='378' AND title='Intro to Computer Security'
  LIMIT 1
)
INSERT INTO sections (
  course_id, term, sec, class_number, component_type,
  days, time_range, location, instructor,
  open_seats, capacity, status, meeting_time, notes
)
SELECT
  c.course_id, 'Spring 2026', '01', 4624, 'SEM',
  'TuTh', '11:00-12:15PM', 'ECS-403', 'Giacalone A',
  2, 45, 'open', 'TuTh 11:00-12:15PM', 'Class instruction is: F'
FROM c
WHERE NOT EXISTS (
  SELECT 1 FROM sections s
  WHERE s.course_id=c.course_id AND s.term='Spring 2026' AND s.class_number=4624
);

WITH c AS (
  SELECT id AS course_id
  FROM courses
  WHERE subject='CECS' AND number='378' AND title='Intro to Computer Security'
  LIMIT 1
)
INSERT INTO sections (
  course_id, term, sec, class_number, component_type,
  days, time_range, location, instructor,
  open_seats, capacity, status, meeting_time, notes
)
SELECT
  c.course_id, 'Spring 2026', '02', 4812, 'SEM',
  'MW', '5:00-6:15PM', 'ECS-404', 'Uuh L',
  0, 45, 'waitlist', 'MW 5:00-6:15PM', 'Popular section. Expect waitlist.'
FROM c
WHERE NOT EXISTS (
  SELECT 1 FROM sections s
  WHERE s.course_id=c.course_id AND s.term='Spring 2026' AND s.class_number=4812
);

WITH c AS (
  SELECT id AS course_id
  FROM courses
  WHERE subject='CECS' AND number='378' AND title='Intro to Computer Security'
  LIMIT 1
)
INSERT INTO sections (
  course_id, term, sec, class_number, component_type,
  days, time_range, location, instructor,
  open_seats, capacity, status, meeting_time, notes
)
SELECT
  c.course_id, 'Spring 2026', '03', 6539, 'SEM',
  'MW', '6:30-7:45PM', 'VEC-518', 'Uuh L',
  12, 45, 'open', 'MW 6:30-7:45PM', 'Evening section.'
FROM c
WHERE NOT EXISTS (
  SELECT 1 FROM sections s
  WHERE s.course_id=c.course_id AND s.term='Spring 2026' AND s.class_number=6539
);

WITH c AS (
  SELECT id AS course_id
  FROM courses
  WHERE subject='CECS' AND number='378' AND title='Intro to Computer Security'
  LIMIT 1
)
INSERT INTO sections (
  course_id, term, sec, class_number, component_type,
  days, time_range, location, instructor,
  open_seats, capacity, status, meeting_time, notes
)
SELECT
  c.course_id, 'Spring 2026', '04', 9510, 'SEM',
  'F', '9:00-11:45AM', 'HSCI-105', 'Addington S',
  1, 40, 'open', 'F 9:00-11:45AM', 'Friday long meeting.'
FROM c
WHERE NOT EXISTS (
  SELECT 1 FROM sections s
  WHERE s.course_id=c.course_id AND s.term='Spring 2026' AND s.class_number=9510
);


-- ---------- SCHEDULES ----------
-- Make 1 schedule for Demo User for Spring 2026
INSERT INTO schedules (user_id, term)
SELECT u.id, 'Spring 2026'
FROM users u
WHERE u.email='demo@csulb.edu'
  AND NOT EXISTS (
    SELECT 1 FROM schedules s
    WHERE s.user_id=u.id AND s.term='Spring 2026'
  );


-- ---------- SCHEDULE ITEMS ----------
-- Add two sections into Demo User's schedule (one CECS 361 SEM, one CECS 378 TuTh)
WITH demo_user AS (
  SELECT id AS user_id FROM users WHERE email='demo@csulb.edu' LIMIT 1
),
demo_schedule AS (
  SELECT s.id AS schedule_id
  FROM schedules s JOIN demo_user u ON s.user_id=u.user_id
  WHERE s.term='Spring 2026'
  LIMIT 1
),
sec1 AS (
  SELECT s.id AS section_id
  FROM sections s
  JOIN courses c ON c.id=s.course_id
  WHERE c.subject='CECS' AND c.number='361' AND s.term='Spring 2026' AND s.class_number=9432
  LIMIT 1
),
sec2 AS (
  SELECT s.id AS section_id
  FROM sections s
  JOIN courses c ON c.id=s.course_id
  WHERE c.subject='CECS' AND c.number='378' AND s.term='Spring 2026' AND s.class_number=4624
  LIMIT 1
)
INSERT INTO schedule_items (schedule_id, section_id)
SELECT ds.schedule_id, sec1.section_id
FROM demo_schedule ds, sec1
WHERE NOT EXISTS (
  SELECT 1 FROM schedule_items si
  WHERE si.schedule_id=ds.schedule_id AND si.section_id=sec1.section_id
);

WITH demo_user AS (
  SELECT id AS user_id FROM users WHERE email='demo@csulb.edu' LIMIT 1
),
demo_schedule AS (
  SELECT s.id AS schedule_id
  FROM schedules s JOIN demo_user u ON s.user_id=u.user_id
  WHERE s.term='Spring 2026'
  LIMIT 1
),
sec2 AS (
  SELECT s.id AS section_id
  FROM sections s
  JOIN courses c ON c.id=s.course_id
  WHERE c.subject='CECS' AND c.number='378' AND s.term='Spring 2026' AND s.class_number=4624
  LIMIT 1
)
INSERT INTO schedule_items (schedule_id, section_id)
SELECT ds.schedule_id, sec2.section_id
FROM demo_schedule ds, sec2
WHERE NOT EXISTS (
  SELECT 1 FROM schedule_items si
  WHERE si.schedule_id=ds.schedule_id AND si.section_id=sec2.section_id
);


-- ---------- REVIEWS ----------
-- Demo user reviews CECS 378
INSERT INTO reviews (user_id, course_id, rating, comment)
SELECT u.id, c.id, 5, 'Great intro course. Workload is fair, lectures are clear.'
FROM users u, courses c
WHERE u.email='demo@csulb.edu'
  AND c.subject='CECS' AND c.number='378'
  AND NOT EXISTS (
    SELECT 1 FROM reviews r
    WHERE r.user_id=u.id AND r.course_id=c.id
  );
