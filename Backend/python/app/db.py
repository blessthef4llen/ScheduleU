import os
from dotenv import load_dotenv
import psycopg
fromcontextlib import contextmanager

load_dotenv()

def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set. Copy .env.example to backend/python/.env and edit.")
    
    conn = psycopg.connect(url)

    try:
        yield conn
    finally:
        conn.close
 

