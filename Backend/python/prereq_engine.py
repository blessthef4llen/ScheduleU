from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SERVICE_KEY")

supabase = create_client(url, key)


@dataclass
class ReqBundle:
    prereq: Set[str]
    coreq: Set[str]
    