# ScheduleU

ScheduleU is a scheduling platform for CSULB students. It combines a polished dashboard UI with real-time notifications and travel alerts so students can stay on top of schedule changes and campus commute updates.

## What it does

- Build and monitor your academic schedule in one place.
- Receive real-time updates in a Notification Center (seat openings, registration reminders, planning alerts).
- Monitor Travel Alerts for shuttle routes, delays, and campus transit advisories.

## Key features

- **Notification Center**: per-user notifications with live updates (Supabase Realtime).
- **Travel Alerts**: shuttle status + commute advisories with filters, featured alert, and demo fallback data.
- **Shuttle tracking/status**: on-time vs delayed indicators in the Travel Alerts UI.

## Tech stack

- **Next.js (App Router)** for the frontend UI
- **Supabase** for auth, database, and realtime updates

## Getting started (local dev)

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with your Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Run the dev server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Notes

- The Notification Center UI loads notifications for the currently signed-in Supabase Auth user (matching `notification_center.user_id` to the signed-in user id).
- Travel Alerts fetches from `/api/travel-alerts` and may show demo alerts if the API returns empty data.
