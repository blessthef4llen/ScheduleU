from app.db import get_connection
import os


def main():
    with get_connection() as conn:
        with conn.cursor() as cur:
            # Insert (idempotent if unique(email) exists)
            cur.execute(
                """
                INSERT INTO users (email, name)
                VALUES (%s, %s)
                ON CONFLICT (email) DO NOTHING;
                """,
                ("TestUser@student.csulb.edu", "Test User")
            )
            # Read a few rows
            cur.execute(
                """
                SELECT id, email, name, role, created_at, updated_at
                FROM users
                ORDER BY id DESC
                LIMIT 5;
                """
            )
            rows = cur.fetchall():
            
            for row in rows:
                print(row)

if __name__ == "__main__":
    main()
