# app/main.py
from dotenv import load_dotenv

# Load .env from the project root (works when you run uvicorn from Scheduler_backend/)
load_dotenv()

from fastapi import FastAPI
from app.api.routes import router as api_router

app = FastAPI(title="Scheduler Backend")

app.include_router(api_router)

@app.get("/")
def root():
    return {"ok": True, "message": "Scheduler backend running. See /health and /docs"}

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origin=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credential=True,
    allow_methods=["*"],
    allow_headers=["*"],
)