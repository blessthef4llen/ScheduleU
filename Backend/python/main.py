from pathlib import Path
import sys

# Ensure repo root is importable when running from Backend/python.
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Re-export the canonical FastAPI app from app/main.py.
from app.main import app
