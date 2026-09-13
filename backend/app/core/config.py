"""
Core configuration module for Legal Metrology Scanner backend.
Loads environment variables from .env or environment with safe fallbacks.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current backend dir or parent project root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
PARENT_ENV = BASE_DIR.parent / ".env"

if ENV_PATH.is_file():
    load_dotenv(ENV_PATH)
elif PARENT_ENV.is_file():
    load_dotenv(PARENT_ENV)
else:
    load_dotenv()

# Service Configuration
PROJECT_NAME = "METRA SCAN — Legal Metrology Compliance API"
VERSION = "1.0.0"
API_V1_PREFIX = "/api/v1"

# Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# Server Settings
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
