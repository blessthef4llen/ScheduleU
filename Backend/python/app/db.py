import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set. Copy .env.example to backend/python/.env and edit.")
    return psycopg.connect(url)
