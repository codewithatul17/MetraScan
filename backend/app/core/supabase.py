"""
Supabase client factory and connectivity helpers.
Provides both admin client (service role) and anonymous client.
"""

import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_ANON_KEY

logger = logging.getLogger("metra.supabase")

supabase_admin: Optional[Client] = None
supabase_anon: Optional[Client] = None

if SUPABASE_URL and SUPABASE_SECRET_KEY:
    try:
        supabase_admin = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
        logger.info("Supabase admin client initialized successfully.")
    except Exception as e:
        logger.warning("Failed to initialize Supabase admin client: %s", e)

if SUPABASE_URL and SUPABASE_ANON_KEY:
    try:
        supabase_anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        logger.info("Supabase anon client initialized successfully.")
    except Exception as e:
        logger.warning("Failed to initialize Supabase anon client: %s", e)


def get_supabase_admin() -> Optional[Client]:
    """Returns the privileged admin client using SUPABASE_SECRET_KEY."""
    return supabase_admin


def get_supabase_anon() -> Optional[Client]:
    """Returns public client using SUPABASE_ANON_KEY."""
    return supabase_anon or supabase_admin
