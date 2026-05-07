# Scheduler Backend

FastAPI backend for ScheduleU features that are not served directly by the Next.js frontend.

## Local run

```bash
cd Backend/python/Scheduler_backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

Useful endpoints:

- `/`
- `/health`
- `/docs`

## Production deploy

Deploy this folder as a separate Python web service.

Recommended start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional but likely needed for feature completeness:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `CORS_ALLOW_ORIGINS`
- `CORS_ALLOW_ORIGIN_REGEX`

The frontend should point at this service using `NEXT_PUBLIC_SCHEDULER_API_URL`.

## Docker

Build the image:

```bash
cd Backend/python/Scheduler_backend
docker build -t scheduleu-backend .
```

Run it locally:

```bash
docker run --rm -p 8000:8000 --env-file .env scheduleu-backend
```

The container starts with:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

If you deploy this container to a host like Render, Railway, or Fly.io, set the same environment variables there instead of relying on a local `.env` file.
