from typing import Optional, Dict, Any
from app.db import get_connection
import bcrypt


# ---------------------------------------
# Password hashing & verification helpers
# ---------------------------------------

def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(
        plain_password.encode("utf-8"), 
        salt
    ).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Return True if password matches its stored hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        password_hash.encode("utf-8")
    )


# ---------------------------------------
# User CRUD + Authentication
# ---------------------------------------

def create_user(email: str, password: str, name: Optional[str] = None) -> Dict[str, Any]:
    """Create a new user with hashed password."""
    password_hash = hash_password(password)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, name, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id, email, name, role, created_at, updated_at;
                """,
                (email, name, password_hash)
            )
            row = cur.fetchone()
        conn.commit()

    return {
        "id": row[0],
        "email": row[1],
        "name": row[2],
        "role": row[3],
        "created_at": row[4],
        "updated_at": row[5],
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetch a user by email (used for registration + login)."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, name, password_hash, role, created_at, updated_at
                FROM users
                WHERE email = %s;
                """,
                (email,)
            )
            row = cur.fetchone()

    if not row:
        return None

    return {
        "id": row[0],
        "email": row[1],
        "name": row[2],
        "password_hash": row[3],
        "role": row[4],
        "created_at": row[5],
        "updated_at": row[6],
    }


def update_user_email(user_id: int, new_email: str) -> Dict[str, Any]:
    """Update a user's email."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET email = %s
                WHERE id = %s
                RETURNING id, email, name, role, created_at, updated_at;
                """,
                (new_email, user_id)
            )
            row = cur.fetchone()
        conn.commit()

    if not row:
        raise ValueError("User not found")

    return {
        "id": row[0],
        "email": row[1],
        "name": row[2],
        "role": row[3],
        "created_at": row[4],
        "updated_at": row[5],
    }


def delete_user(user_id: int) -> None:
    """Delete a user by ID."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s;", (user_id,))
        conn.commit()


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Validate email + password and return user if correct."""
    user = get_user_by_email(email)
    if not user:
        return None

    password_hash = user["password_hash"]
    if not password_hash:
        return None

    if not verify_password(password, password_hash):
        return None

    # Return user without exposing password_hash
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
    }