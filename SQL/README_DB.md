# ScheduleU Database Design & Setup

## 1. Database Design Rationale

The database for **ScheduleU** is designed to model a real-world university course scheduling system while remaining simple, extensible, and safe for a shared environment (Supabase).

The core design principles are:

- **Separation of concerns**
  - `courses` represents *course definitions* (subject, number, title, units)
  - `sections` represents *specific offerings* of a course in a given term (time, instructor, location, seat availability)
  - This mirrors how real university registration systems distinguish courses from sections.

- **Normalization with practical flexibility**
  - User-specific data (schedules, schedule items, reviews) is separated from public catalog data (courses, sections).
  - This reduces redundancy while keeping queries straightforward for frontend use.

- **User ownership and data safety**
  - User-owned tables (`users`, `schedules`, `schedule_items`, `reviews`) are protected using Row Level Security (RLS).
  - Public catalog data remains readable without authentication when needed.

- **Reproducibility and maintainability**
  - The database is built using ordered SQL scripts that can recreate the entire schema from scratch.
  - Constraints, indexes, and views are clearly separated from core table definitions.

---

## 2. Current Database Structure (Implemented)

### Core Tables

- **users**  
  Stores application users and maps them to Supabase Auth via `auth_uid`.

- **courses**  
  Defines courses (e.g., CECS 378, CECS 361).

- **sections**  
  Represents individual course offerings with realistic attributes such as:
  - section number
  - class number
  - meeting days and time
  - instructor
  - location
  - open seats and capacity

- **schedules**  
  Represents a user’s schedule for a given academic term.

- **schedule_items**  
  Join table connecting schedules to selected sections.

- **reviews**  
  Stores course reviews and ratings (one review per user per course).

---

### Constraints and Data Integrity

- Unique indexes enforce:
  - unique user emails
  - one review per user per course
  - unique sections per course / term / class number
- CHECK constraints enforce:
  - valid seat and capacity values
  - valid rating ranges
- Foreign keys ensure referential integrity with cascading deletes where appropriate.

---

### Views

- **v_course_listings**  
  Used for course browsing and search (similar to a real school listing page).

- **v_course_ratings**  
  Aggregates review counts and average ratings per course.

- **v_schedule_details**  
  Provides a complete view of a user’s schedule with course and section details.

These views are designed to be consumed directly by backend APIs or frontend components.

---

## 3. SQL Script Execution Order

All database objects can be recreated from scratch using the following scripts, executed **in order**:

1. **010_schema_core.sql**  
   Creates core tables only (no indexes, constraints, or policies).

2. **020_constraints.sql**  
   Adds:
   - indexes and unique constraints  
   - foreign keys  
   - CHECK constraints  
   - triggers  
   - Row Level Security (RLS) policies  

3. **025_views.sql**  
   Creates all application-facing database views.

4. **030_seed.sql**  
   Inserts mock data used for development and demonstration.

---

### Notes

- All scripts are designed to be **re-runnable**.
- Mock data is synthetic and modeled after real university course listings.
- No real student or institutional data is used.

---

## Summary

At this stage, the database is functionally complete and supports:

- realistic course browsing and filtering
- user-specific schedule building
- course reviews and ratings
- secure multi-user access in a shared Supabase environment

The database is ready to be integrated with backend APIs and frontend components.
