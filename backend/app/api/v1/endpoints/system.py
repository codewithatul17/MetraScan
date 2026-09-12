"""
System health, status, and dynamic public configuration endpoints.
"""

from fastapi import APIRouter
from app.core.config import PROJECT_NAME, VERSION, SUPABASE_URL, SUPABASE_ANON_KEY
from app.core.supabase import get_supabase_admin

router = APIRouter()


@router.get("/")
@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": PROJECT_NAME,
        "version": VERSION,
        "endpoints": ["/scan", "/scans", "/health", "/supabase/status", "/config"]
    }


@router.get("/supabase/status")
def supabase_status():
    supabase = get_supabase_admin()
    if not supabase:
        return {
            "configured": False,
            "error": "SUPABASE_URL and SUPABASE_SECRET_KEY not set or invalid in .env"
        }
    try:
        supabase.table("product_scans").select("id").limit(1).execute()
        return {
            "configured": True,
            "connected": True,
            "endpoint": SUPABASE_URL,
            "table": "product_scans"
        }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "endpoint": SUPABASE_URL,
            "error": str(e),
            "hint": "Check project URL hostname and ensure service_role JWT key is used"
        }


@router.get("/config")
def get_public_config():
    """Provides public client credentials (URL & Anon Key) dynamically so frontend never hardcodes secrets."""
    return {
        "supabase_url": SUPABASE_URL,
        "supabase_anon_key": SUPABASE_ANON_KEY
    }
