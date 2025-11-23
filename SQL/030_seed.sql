-- Seed minimal demo rows (idempotent if unique(email) exists)
INSERT INTO users (email, name)
VALUES ('demo@csulb.edu','Demo User')
ON CONFLICT (email) DO NOTHING;

INSERT INTO courses (subject, number, title, instructor, units, status, meeting_time)
VALUES ('CECS','491A','Senior Project A','Hoffman',3,'Open','MWF 10:00-10:50')
ON CONFLICT DO NOTHING;
