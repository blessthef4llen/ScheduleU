import os
from contextlib import contextmanager
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Load env from repo root and legacy backend location for team compatibility.
load_dotenv()
load_dotenv(Path(__file__).resolve().parents[1] / "Backend" / "python" / ".env")


@contextmanager
def get_connection():
    # Shared DB connection context for all repository modules.
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Create a .env file (repo root or Backend/python) with DATABASE_URL."
        )

    conn = psycopg.connect(url)
    try:
        yield conn
    finally:
        conn.close()


def fetch_courses():
    # Legacy helper kept for course listing experiments.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM v_course_listings;")
            return cur.fetchall()


def fetch_schedule_details(user_id):
    # Legacy helper kept for schedule detail reads.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM v_schedule_details WHERE user_id = %s;", (user_id,))
            return cur.fetchall()


def fetch_reviews(course_id=None):
    # Legacy helper for reading aggregated ratings view.
    with get_connection() as conn:
        with conn.cursor() as cur:
            if course_id:
                cur.execute("SELECT * FROM v_course_ratings WHERE course_id = %s;", (course_id,))
            else:
                cur.execute("SELECT * FROM v_course_ratings;")
            return cur.fetchall()


def insert_review(user_id, course_id, rating, comment):
    # Legacy helper for creating review rows.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reviews (user_id, course_id, rating, comment)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, course_id, rating, comment),
            )
            conn.commit()
