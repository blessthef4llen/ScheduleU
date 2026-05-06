-- =========================================================
-- 060_seed_notification_center_demo.sql
-- Demo/test notifications for Notification Center
--
-- Replace TEST_USER_ID with a real auth user UUID.
-- Example:
--   11111111-1111-1111-1111-111111111111
-- =========================================================

-- Optional cleanup of previous demo rows for this user.
DELETE FROM notification_center
WHERE user_id = 'TEST_USER_ID'
  AND messages ILIKE '%[demo-seed]%';

-- Insert realistic demo notifications (newest first by created_at).
INSERT INTO notification_center (user_id, messages, type, is_read, created_at)
VALUES
  ('TEST_USER_ID', '[demo-seed] Registration Reminder: Your registration opens in 24 hours.', 'registration_reminder', false, NOW() - INTERVAL '10 minutes'),
  ('TEST_USER_ID', '[demo-seed] Seat Available: CECS 328 section 01 has an open seat.', 'seat_alert', false, NOW() - INTERVAL '25 minutes'),
  ('TEST_USER_ID', '[demo-seed] Waitlist Update: You moved from position 5 to position 2 in MATH 224.', 'waitlist_update', false, NOW() - INTERVAL '40 minutes'),
  ('TEST_USER_ID', '[demo-seed] Schedule Conflict Warning: CECS 343 and CECS 447 overlap on Tuesday at 11:00 AM.', 'schedule_conflict_warning', false, NOW() - INTERVAL '55 minutes'),
  ('TEST_USER_ID', '[demo-seed] Travel Alert: Beachside Shuttle delayed by 4 minutes.', 'travel_alert', true, NOW() - INTERVAL '75 minutes'),
  ('TEST_USER_ID', '[demo-seed] System Update: New ScheduleU planning insights are now available in your dashboard.', 'system_notification', true, NOW() - INTERVAL '120 minutes'),
  ('TEST_USER_ID', '[demo-seed] Registration Checklist: Verify holds and backup sections before your window opens.', 'registration_checklist', false, NOW() - INTERVAL '180 minutes'),
  ('TEST_USER_ID', '[demo-seed] Workload Advisory: Your planned term intensity is trending high. Consider balancing labs and writing-heavy courses.', 'workload_advisory', true, NOW() - INTERVAL '260 minutes');
