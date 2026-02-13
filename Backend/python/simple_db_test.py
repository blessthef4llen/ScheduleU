import os
from dotenv import load_dotenv
import psycopg

def main():
    # Force-load .env from this exact folder
    load_dotenv(dotenv_path=".env")

    # Debug prints to diagnose the problem
    print("DEBUG: Current working directory:", os.getcwd())

    db_url = os.getenv("DATABASE_URL")
    print("DEBUG: Loaded DATABASE_URL:", db_url)

    if not db_url:
        print("ERROR: DATABASE_URL is not set. Check if .env is in backend/python and encoded correctly.")
        return

    print("DATABASE_URL loaded successfully!")

    # Try connecting to the database
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT NOW();")
                now = cur.fetchone()
                print("Connected successfully! Current DB time:", now[0])
    except Exception as e:
        print("ERROR connecting to the database:")
        print(e)


if __name__ == "__main__":
    main()
