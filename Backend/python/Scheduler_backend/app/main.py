# app/main.py
from dotenv import load_dotenv
from pathlib import Path

# Always load env from Backend/python/Scheduler_backend/.env
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

app = FastAPI(title="Scheduler Backend")

app.include_router(api_router)

@app.get("/")
def root():
    return {"ok": True, "message": "Scheduler backend running. See /health and /docs"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
