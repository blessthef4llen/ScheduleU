from __future__ import annotations

import os
from supabase import create_client, Client


# Lazily initialized shared Supabase client.
_client: Client | None = None


def get_supabase() -> Client:
    """
    Singleton Supabase client.
    Requires env:
      SUPABASE_URL
      SUPABASE_SERVICE_ROLE_KEY  (server-only)
    """
    global _client
    if _client is not None:
        return _client

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not url or not key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")

    _client = create_client(url, key)
    return _client
