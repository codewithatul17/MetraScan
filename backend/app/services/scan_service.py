"""
Scan service orchestrating OCR, Legal Metrology Rule 6 validation,
coin reference calibration, image annotation, and multi-user persistence.
"""

import base64
import logging
from typing import List, Optional, Dict, Any
import cv2
import numpy as np
from fastapi import HTTPException, UploadFile

from app.core.supabase import get_supabase_admin
from app.ocr.ocr_module import extract_text
from app.ocr.validator import match_declarations, merge_verdicts
from app.ocr.calibration import detect_reference_coin, get_mm_per_px
from app.ocr.annotate import annotate

logger = logging.getLogger("metra.scan_service")


def process_single_image(raw_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Runs the complete Legal Metrology scan pipeline on a single image's raw bytes."""
    if not raw_bytes:
        raise HTTPException(status_code=400, detail=f"Uploaded file ({filename}) is empty")

    try:
        np_buffer = np.frombuffer(raw_bytes, dtype=np.uint8)
        img = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image — unsupported or corrupt file")
    except Exception as exc:
        logger.warning("Bad image upload (%s): %s", filename, exc)
        raise HTTPException(status_code=400, detail=f"Invalid image upload ({filename}): {exc}")

    try:
        # 1. PaddleOCR Text Extraction
        ocr_boxes = extract_text(img)

        # 2. Rule Validation against Legal Metrology Declarations
        verdict = match_declarations(ocr_boxes)

        # 3. Size Calibration via Reference Coin
        reference_box = detect_reference_coin(img)
        calibrated = reference_box is not None
        mm_per_px = get_mm_per_px(reference_box) if calibrated else None

        if not calibrated:
            logger.info("No reference card detected in %s — skipping font-size/mm checks", filename)

        # 4. Annotate image with pass/fail bounding boxes
        annotated_img = annotate(img, verdict, mm_per_px)

    except Exception as exc:
        logger.exception("Pipeline failure during scan (%s)", filename)
        raise HTTPException(status_code=400, detail=f"Failed to process image ({filename}): {exc}")

    try:
        success, buffer = cv2.imencode(".jpg", annotated_img)
        if not success:
            raise ValueError("cv2.imencode failed to produce a JPEG")
        image_base64 = base64.b64encode(buffer.tobytes()).decode("utf-8")
    except Exception as exc:
        logger.exception("Failed to encode annotated image (%s)", filename)
        raise HTTPException(status_code=400, detail=f"Failed to encode result image ({filename}): {exc}")

    return {
        "filename": filename,
        "verdict": verdict,
        "image_base64": image_base64,
        "calibrated": calibrated,
        "ocr_boxes_count": len(ocr_boxes),
        "raw_text": [b.get("text", "") for b in ocr_boxes]
    }


async def process_multi_scan(images: List[UploadFile], user_id: Optional[str], user_email: Optional[str]) -> Dict[str, Any]:
    """Processes multiple angles of a packaged product and merges declarations into a final audit verdict."""
    if not images:
        raise HTTPException(status_code=400, detail="No images uploaded")

    per_image_results = []
    for image in images:
        raw_bytes = await image.read()
        per_image_results.append(process_single_image(raw_bytes, image.filename or "image"))

    merged_verdict = merge_verdicts([r["verdict"] for r in per_image_results])
    if user_id:
        merged_verdict["user_id"] = user_id
    if user_email:
        merged_verdict["user_email"] = user_email

    has_declarations = any(
        isinstance(v, dict) and v.get("found", False)
        for k, v in merged_verdict.items()
        if k not in ("user_id", "user_email")
    )
    total_ocr_boxes = sum(r.get("ocr_boxes_count", 0) for r in per_image_results)
    is_valid_product = has_declarations

    supabase = get_supabase_admin()
    scan_id = None
    supabase_state = "unconfigured" if not supabase else "pending"

    if supabase and is_valid_product:
        try:
            record = {
                "filenames": [r["filename"] for r in per_image_results],
                "verdict": merged_verdict,
                "is_compliant": all(
                    v.get("format_valid", False)
                    for k, v in merged_verdict.items()
                    if isinstance(v, dict) and k not in ("generic_name", "user_id", "user_email")
                ),
                "calibrated": any(r.get("calibrated", False) for r in per_image_results)
            }
            db_res = supabase.table("product_scans").insert(record).execute()
            if db_res and db_res.data and len(db_res.data) > 0:
                scan_id = db_res.data[0].get("id")
                supabase_state = "persisted"
                logger.info("Persisted scan to Supabase with ID: %s (user: %s, %s)", scan_id, user_id, user_email)
        except Exception as e:
            supabase_state = f"error: {str(e)}"
            logger.warning("Supabase save skipped/failed: %s", e)

    return {
        "verdict": merged_verdict,
        "images": per_image_results,
        "is_valid_product": is_valid_product,
        "has_declarations": has_declarations,
        "total_ocr_boxes": total_ocr_boxes,
        "supabase_id": scan_id,
        "supabase_status": supabase_state
    }


def fetch_user_scans(user_id: Optional[str] = None, user_email: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves saved product scans strictly partitioned by user_id / user_email."""
    supabase = get_supabase_admin()
    if not supabase:
        return {"ok": False, "scans": [], "error": "Supabase not configured"}

    if not user_id and not user_email:
        return {"ok": True, "scans": []}

    try:
        query = supabase.table("product_scans").select("*")
        if user_id and user_email:
            query = query.or_(f"verdict->>user_id.eq.{user_id},verdict->>user_email.eq.{user_email}")
        elif user_id:
            query = query.filter("verdict->>user_id", "eq", user_id)
        elif user_email:
            query = query.filter("verdict->>user_email", "eq", user_email)

        res = query.order("created_at", desc=True).limit(50).execute()
        return {"ok": True, "scans": res.data or []}
    except Exception as e:
        logger.warning("Error fetching user scans: %s", e)
        return {"ok": False, "scans": [], "error": str(e)}
