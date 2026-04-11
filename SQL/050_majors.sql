-- =========================================================
-- 050_majors.sql
-- Canonical majors catalog for frontend profile selection
-- Execute after 045_completed_courses.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS majors (
  id BIGSERIAL PRIMARY KEY,
  college TEXT NOT NULL,
  major_name TEXT NOT NULL,
  college_sort_order INTEGER NOT NULL DEFAULT 0,
  major_sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_majors_college_major
ON majors (college, major_name);

CREATE INDEX IF NOT EXISTS idx_majors_active_order
ON majors (is_active, college_sort_order, major_sort_order);

INSERT INTO majors (college, major_name, college_sort_order, major_sort_order)
VALUES
  ('College of the Arts (COTA)', 'Art (BA) - Art Education', 1, 1),
  ('College of the Arts (COTA)', 'Art (BA) - Art History', 1, 2),
  ('College of the Arts (COTA)', 'Art (BA) - Studio Art', 1, 3),
  ('College of the Arts (COTA)', 'Art (BFA) - Ceramics', 1, 4),
  ('College of the Arts (COTA)', 'Art (BFA) - Drawing & Painting', 1, 5),
  ('College of the Arts (COTA)', 'Art (BFA) - Graphic Design', 1, 6),
  ('College of the Arts (COTA)', 'Art (BFA) - Illustration/Animation', 1, 7),
  ('College of the Arts (COTA)', 'Art (BFA) - Photography', 1, 8),
  ('College of the Arts (COTA)', 'Art (BFA) - Printmaking', 1, 9),
  ('College of the Arts (COTA)', 'Art (BFA) - 3-D Media', 1, 10),
  ('College of the Arts (COTA)', 'Dance (BA/BFA)', 1, 11),
  ('College of the Arts (COTA)', 'Dance Science (BS)', 1, 12),
  ('College of the Arts (COTA)', 'Industrial Design (BS)', 1, 13),
  ('College of the Arts (COTA)', 'Interior Design (BFA)', 1, 14),
  ('College of the Arts (COTA)', 'Cinematic Arts (BA)', 1, 15),
  ('College of the Arts (COTA)', 'Music (BM) - Composition', 1, 16),
  ('College of the Arts (COTA)', 'Music Education: Choral-Vocal (BM)', 1, 17),
  ('College of the Arts (COTA)', 'Music Education: Instrumental Music (BM)', 1, 18),
  ('College of the Arts (COTA)', 'Music Performance (BM)', 1, 19),
  ('College of the Arts (COTA)', 'Theatre Arts - Technical Theatre', 1, 20),

  ('College of Business (COB)', 'Business Administration (BS) - Accountancy', 2, 1),
  ('College of Business (COB)', 'Business Administration (BS) - Finance', 2, 2),
  ('College of Business (COB)', 'Business Administration (BS) - Information Systems', 2, 3),
  ('College of Business (COB)', 'Business Administration (BS) - International Business', 2, 4),
  ('College of Business (COB)', 'Business Administration (BS) - Management', 2, 5),
  ('College of Business (COB)', 'Business Administration (BS) - Marketing', 2, 6),
  ('College of Business (COB)', 'Business Administration (BS) - Operations and Supply Chain Management', 2, 7),

  ('College of Education (CED)', 'Liberal Studies (BA)', 3, 1),
  ('College of Education (CED)', 'Single Subject Teacher Credential Program', 3, 2),

  ('College of Engineering (COE)', 'Aerospace Engineering (BS)', 4, 1),
  ('College of Engineering (COE)', 'Biomedical Engineering (BS)', 4, 2),
  ('College of Engineering (COE)', 'Chemical Engineering (BS)', 4, 3),
  ('College of Engineering (COE)', 'Civil Engineering (BS)', 4, 4),
  ('College of Engineering (COE)', 'Computer Engineering (BS)', 4, 5),
  ('College of Engineering (COE)', 'Computer Engineering Technology', 4, 6),
  ('College of Engineering (COE)', 'Computer Science (BS)', 4, 7),
  ('College of Engineering (COE)', 'Construction Engineering Management (BS)', 4, 8),
  ('College of Engineering (COE)', 'Electrical Engineering (BS)', 4, 9),
  ('College of Engineering (COE)', 'Engineering Technology (BS)', 4, 10),
  ('College of Engineering (COE)', 'Mechanical Engineering (BS)', 4, 11),

  ('College of Health & Human Services (CHHS)', 'Criminology and Criminal Justice (BS)', 5, 1),
  ('College of Health & Human Services (CHHS)', 'Family and Consumer Sciences (BA) - Child Development and Family Studies', 5, 2),
  ('College of Health & Human Services (CHHS)', 'Family and Consumer Sciences (BA) - Consumer Affairs', 5, 3),
  ('College of Health & Human Services (CHHS)', 'Family and Consumer Sciences (BA) - Family Life Education', 5, 4),
  ('College of Health & Human Services (CHHS)', 'Fashion Design (BA)', 5, 5),
  ('College of Health & Human Services (CHHS)', 'Fashion Merchandising (BA)', 5, 6),
  ('College of Health & Human Services (CHHS)', 'Health Care Administration (BS) - Healthcare Data Analytics', 5, 7),
  ('College of Health & Human Services (CHHS)', 'Health Care Administration (BS) - Risk Management and Safety', 5, 8),
  ('College of Health & Human Services (CHHS)', 'Health Science (BS) - Community Health Education', 5, 9),
  ('College of Health & Human Services (CHHS)', 'Health Science (BS) - School Health Education', 5, 10),
  ('College of Health & Human Services (CHHS)', 'Hospitality Management (BS)', 5, 11),
  ('College of Health & Human Services (CHHS)', 'Kinesiology (BS) - Exercise Science', 5, 12),
  ('College of Health & Human Services (CHHS)', 'Kinesiology (BS) - Fitness', 5, 13),
  ('College of Health & Human Services (CHHS)', 'Kinesiology (BS) - Physical Education-Teacher Education', 5, 14),
  ('College of Health & Human Services (CHHS)', 'Kinesiology (BS) - Sport Psychology and Leadership', 5, 15),
  ('College of Health & Human Services (CHHS)', 'Nursing (BSN)', 5, 16),
  ('College of Health & Human Services (CHHS)', 'Nutrition and Dietetics (BS)', 5, 17),
  ('College of Health & Human Services (CHHS)', 'Recreation (BA)', 5, 18),
  ('College of Health & Human Services (CHHS)', 'Recreation Therapy (BS)', 5, 19),
  ('College of Health & Human Services (CHHS)', 'Social Work (BASW)', 5, 20),
  ('College of Health & Human Services (CHHS)', 'Speech-Language Pathology (BA)', 5, 21),

  ('College of Liberal Arts (CLA)', 'Africana Studies (BA)', 6, 1),
  ('College of Liberal Arts (CLA)', 'American Sign Language Linguistics & Deaf Culture (BA)', 6, 2),
  ('College of Liberal Arts (CLA)', 'American Studies (BA)', 6, 3),
  ('College of Liberal Arts (CLA)', 'Anthropology (BA)', 6, 4),
  ('College of Liberal Arts (CLA)', 'Asian and Asian American Studies (BA) - Asian Studies', 6, 5),
  ('College of Liberal Arts (CLA)', 'Asian and Asian American Studies (BA) - Asian American Studies', 6, 6),
  ('College of Liberal Arts (CLA)', 'Asian and Asian American Studies (BA) - Chinese Studies', 6, 7),
  ('College of Liberal Arts (CLA)', 'Asian and Asian American Studies (BA) - Japanese', 6, 8),
  ('College of Liberal Arts (CLA)', 'Chicano and Latino Studies (BA)', 6, 9),
  ('College of Liberal Arts (CLA)', 'Classics (BA) - Greek and Greek Civilization', 6, 10),
  ('College of Liberal Arts (CLA)', 'Communication Studies (BA) - Communication, Culture, and Public Affairs', 6, 11),
  ('College of Liberal Arts (CLA)', 'Communication Studies (BA) - Interpersonal and Organizational Communication', 6, 12),
  ('College of Liberal Arts (CLA)', 'Comparative World Literature (BA)', 6, 13),
  ('College of Liberal Arts (CLA)', 'Economics (BA) - Business Economics', 6, 14),
  ('College of Liberal Arts (CLA)', 'Economics (BA) - Mathematical Economics and Economic Theory', 6, 15),
  ('College of Liberal Arts (CLA)', 'English (BA) - Creative Writing', 6, 16),
  ('College of Liberal Arts (CLA)', 'English (BA) - English Education', 6, 17),
  ('College of Liberal Arts (CLA)', 'English (BA) - Literature', 6, 18),
  ('College of Liberal Arts (CLA)', 'English (BA) - Rhetoric and Composition', 6, 19),
  ('College of Liberal Arts (CLA)', 'English (BA) - Special Emphasis', 6, 20),
  ('College of Liberal Arts (CLA)', 'Environmental Science and Public Policy (BA/BS)', 6, 21),
  ('College of Liberal Arts (CLA)', 'French & Francophone Studies (BA)', 6, 22),
  ('College of Liberal Arts (CLA)', 'Geography (BA/BS)', 6, 23),
  ('College of Liberal Arts (CLA)', 'German (BA)', 6, 24),
  ('College of Liberal Arts (CLA)', 'Global Studies (BA)', 6, 25),
  ('College of Liberal Arts (CLA)', 'History (BA)', 6, 26),
  ('College of Liberal Arts (CLA)', 'Human Development (BA)', 6, 27),
  ('College of Liberal Arts (CLA)', 'Italian Studies (BA)', 6, 28),
  ('College of Liberal Arts (CLA)', 'Journalism (BA)', 6, 29),
  ('College of Liberal Arts (CLA)', 'Linguistics (BA) - Teaching English to Speakers of Other Languages (TESOL)', 6, 30),
  ('College of Liberal Arts (CLA)', 'Linguistics (BA) - Translation Studies', 6, 31),
  ('College of Liberal Arts (CLA)', 'Modern Jewish Studies (BA)', 6, 32),
  ('College of Liberal Arts (CLA)', 'Philosophy (BA)', 6, 33),
  ('College of Liberal Arts (CLA)', 'Political Science (BA)', 6, 34),
  ('College of Liberal Arts (CLA)', 'Psychology (BA)', 6, 35),
  ('College of Liberal Arts (CLA)', 'Public Relations (BA)', 6, 36),
  ('College of Liberal Arts (CLA)', 'Religious Studies (BA)', 6, 37),
  ('College of Liberal Arts (CLA)', 'Sociology (BA)', 6, 38),
  ('College of Liberal Arts (CLA)', 'Spanish (BA)', 6, 39),
  ('College of Liberal Arts (CLA)', 'Women''s, Gender, and Sexuality Studies (BA)', 6, 40),

  ('College of Natural Sciences & Mathematics (CNSM)', 'Biochemistry (BA/BS)', 7, 1),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Biology (BS) - Biology Education', 7, 2),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Biology (BS) - General Biology', 7, 3),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Biology (BS) - Marine Biology', 7, 4),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Biology (BS) - Microbiology', 7, 5),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Biology (BS) - Molecular Cell Biology and Physiology', 7, 6),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Biology (BS) - Zoology, Botany, and Ecology', 7, 7),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Chemistry (BA/BS)', 7, 8),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Earth Systems (BS)', 7, 9),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Geology (BS)', 7, 10),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Applied Data Science (BS)', 7, 11),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Materials Science (BS)', 7, 12),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Mathematics (BS) - Applied Mathematics', 7, 13),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Mathematics (BS) - Applied Statistics', 7, 14),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Mathematics (BS) - Mathematics Education', 7, 15),
  ('College of Natural Sciences & Mathematics (CNSM)', 'Physics (BS) - Materials Science', 7, 16)
ON CONFLICT (college, major_name) DO UPDATE
SET
  college_sort_order = EXCLUDED.college_sort_order,
  major_sort_order = EXCLUDED.major_sort_order,
  is_active = TRUE;

ALTER TABLE majors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS majors_select_all ON majors;
CREATE POLICY majors_select_all
ON majors
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);
