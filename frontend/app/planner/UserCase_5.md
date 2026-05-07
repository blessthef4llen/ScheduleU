# Feature 5: Interactive Schedule Builder (Drag & Drop + Conflict Detection)

## Overview
Feature 5 provides an interactive schedule planner that allows a logged-in user to build a weekly schedule by:
- Dragging a course section from a catalog list into the calendar (adds it to the schedule)
- Clicking an event in the calendar to remove it
- Automatically preventing time conflicts (overlapping meeting times on the same day)
- Preventing duplicates (cannot add the same section twice)

This feature uses Supabase Authentication + Postgres tables (`profiles`, `schedules`, `schedule_items`, `sections`) and enforces row-level security (RLS) so users can only access their own schedules.

---

## Data Model
- `profiles`  
  - `id` (uuid) = auth user id  
  - other profile fields (email, major, etc.)
- `schedules`
  - `id` (bigint)
  - `user_id` (uuid) -> references `profiles(id)`
  - `term` (text)
- `schedule_items`
  - `schedule_id` (bigint) -> references `schedules(id)`
  - `section_id` -> references `sections(id)`
  - UNIQUE(`schedule_id`, `section_id`) to prevent duplicates
- `sections`
  - contains the meeting info: `days`, `time_range`, etc.
  - used to render events in the calendar and to show the catalog list

---

## Database Setup (Migrations)
Run these SQL scripts in Supabase SQL Editor (in order):

1. `040_auth_trigger_profiles.sql`  
   Creates a trigger so when a new user signs up, a matching `profiles` row is created automatically.
2. `041_backfill_profiles.sql`  
   Backfills missing profiles for existing auth users (one-time).
3. `050_schedules.sql`  
   Creates the `schedules` table using uuid `user_id` linked to `profiles.id`.
4. `060_schedule_items_constraints.sql`  
   Ensures FK constraints and unique constraint on schedule items.
5. `070_rls_policies_feature5.sql`  
   Enables RLS + policies so users can only read/write their own schedules and schedule items.
6. (Optional) `071_sections_read_policy.sql`  
   Only needed if RLS is enabled on `sections`.

---

## Local Development
### Prerequisites
- Node.js + npm
- Supabase project created and configured
- Environment variables set in `.env.local`:

Example:
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

### Run
```bash
npm install
npm run dev
