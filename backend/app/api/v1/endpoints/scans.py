"""
Product label scanning and compliance audit API endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, File, Form, UploadFile
from app.services.scan_service import process_multi_scan, fetch_user_scans

router = APIRouter(tags=["Scanner"])


@router.post("/scan")
async def handle_scan(
    images: List[UploadFile] = File(...),
    user_id: Optional[str] = Form(None),
    user_email: Optional[str] = Form(None)
):
    """
    Accepts one or more photos of a packaged commodity (e.g. front + back),
    runs OCR, Legal Metrology Rule 6 validation, coin-reference calibration,
    and returns annotated pass/fail overlays.
    """
    return await process_multi_scan(images, user_id, user_email)


@router.get("/scans")
def handle_get_scans(
    user_id: Optional[str] = None,
    user_email: Optional[str] = None
):
    """Retrieves compliance scans filtered strictly for the authenticated user."""
    return fetch_user_scans(user_id, user_email)
