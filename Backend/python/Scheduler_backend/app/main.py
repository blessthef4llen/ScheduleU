import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router


def load_local_env() -> None:
    """Load local development env vars when a .env file exists."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)


def parse_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


load_local_env()

app = FastAPI(title="Scheduler Backend")

app.include_router(api_router)

@app.get("/")
def root():
    return {"ok": True, "message": "Scheduler backend running. See /health and /docs"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX", "").strip() or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
