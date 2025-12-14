import os
from dotenv import load_dotenv
import psycopg

load_dotenv()

# Function to establish database connection
def get_connection():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set. Copy .env.example to backend/python/.env and edit.")
    return psycopg.connect(url)

# Function to fetch course listings
def fetch_courses():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM v_course_listings;")
            return cur.fetchall()

# Function to fetch schedule details
def fetch_schedule_details(user_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM v_schedule_details WHERE user_id = %s;", (user_id,))
            return cur.fetchall()

# Function to fetch course reviews
def fetch_reviews(course_id=None):
    with get_connection() as conn:
        with conn.cursor() as cur:
            if course_id:
                cur.execute("SELECT * FROM v_course_ratings WHERE course_id = %s;", (course_id,))
            else:
                cur.execute("SELECT * FROM v_course_ratings;")
            return cur.fetchall()

# Function to insert a new review
def insert_review(user_id, course_id, rating, comment):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reviews (user_id, course_id, rating, comment)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, course_id, rating, comment)
            )
            conn.commit()
