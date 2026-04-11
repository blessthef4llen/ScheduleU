-- =========================================================
-- 055_profiles_grad_term.sql
-- Store graduation term text separately from numeric graduation year
-- =========================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS grad_term TEXT;
