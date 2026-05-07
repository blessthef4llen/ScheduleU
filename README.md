# ScheduleU

`frontend/` is now the canonical Next.js app for this repo.

The older root-level Next app and duplicate files were moved into `archive/` so the active project structure is no longer split across two parallel app trees.

## Active app

- App root: `frontend/`
- Deploy target: Vercel with root directory set to `frontend`
- Main services: Next.js, Supabase, Postgres

## Local development

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` from `frontend/.env.example` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SCHEDULER_API_URL`
- `NEXT_PUBLIC_ENCRYPTION_KEY`

## Deployment

Deploy `frontend/` to Vercel.

Recommended setup:

1. Import the GitHub repo into Vercel.
2. Set the project root directory to `frontend`.
3. Add the environment variables from `frontend/.env.example`.
4. Run a production check locally with `cd frontend && npm run build`.

## Repo notes

- `archive/root-next-app/` contains the archived duplicate root Next.js app.
- `archive/duplicate-files/` contains obviously redundant duplicate files such as `page 2.tsx` and `theme-toggle 2.tsx`.
- `Backend/python/` is still separate from the Vercel frontend deployment. Any feature using `NEXT_PUBLIC_SCHEDULER_API_URL` still expects that backend to exist somewhere.
