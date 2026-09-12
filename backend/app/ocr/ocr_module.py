"""
ocr_module.py

OCR/text-extraction module for the Legal Metrology label-checking prototype.
Backend: PaddleOCR (CPU build - paddlepaddle + paddleocr, no GPU deps).

Public interface (locked contract with teammates):
    extract_text(image) -> List[Dict]
    Each dict: {"text": str, "box": [x, y, w, h], "conf": float}
    box = [top_left_x, top_left_y, width, height] in pixels, plain Python ints.
    conf is a plain Python float. Guaranteed JSON-serializable, no numpy types.

Accepts either:
    - a file path (str)
    - an in-memory numpy image (e.g. from cv2.imread or cv2.imdecode)
"""

import sys
from typing import Union, List, Dict, Optional

import cv2
import numpy as np
from paddleocr import PaddleOCR

# ---------------------------------------------------------------------------
# PaddleOCR is expensive to construct (loads det/rec/cls model weights), so we
# build it once and reuse it across calls.
# ---------------------------------------------------------------------------
_ocr_engine: Optional["PaddleOCR"] = None


def _get_engine() -> "PaddleOCR":
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = PaddleOCR(use_angle_cls=True, lang="en")
    return _ocr_engine


def _polygon_to_xywh(polygon) -> List[int]:
    """Convert a 4-point polygon [[x1,y1],...,[x4,y4]] to axis-aligned [x, y, w, h] (plain ints)."""
    xs = [p[0] for p in polygon]
    ys = [p[1] for p in polygon]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    return [int(round(x_min)), int(round(y_min)), int(round(x_max - x_min)), int(round(y_max - y_min))]


def _load_image(image: Union[str, np.ndarray]) -> np.ndarray:
    """Resolve input (path or numpy array) into a valid BGR numpy image, or raise ValueError."""
    if isinstance(image, str):
        img = cv2.imread(image)
        if img is None:
            raise ValueError(f"Could not read image from path: {image}")
        return img

    if isinstance(image, np.ndarray):
        if image.size == 0:
            raise ValueError("Received an empty numpy array as image input.")
        return image

    raise ValueError(f"Unsupported image input type: {type(image)}")


def extract_text(image: Union[str, np.ndarray]) -> List[Dict]:
    """
    Run OCR on an image and return detected text regions.

    Args:
        image: file path (str) OR decoded numpy image (BGR, as from cv2.imread/cv2.imdecode).

    Returns:
        List[{"text": str, "box": [x, y, w, h], "conf": float}]
        Always a list, never None - returns [] on a bad image or when no text is found,
        so the FastAPI layer can always safely iterate/json-serialize the result.
    """
    try:
        img = _load_image(image)
    except ValueError as e:
        print(f"[ocr_module] Skipping OCR - {e}")
        return []

    try:
        engine = _get_engine()
        raw_result = engine.ocr(img, cls=True)  # [[ [poly, (text, conf)], ... ]] per image
    except Exception as e:
        print(f"[ocr_module] OCR failed - {e}")
        return []

    # PaddleOCR wraps results per input image; we only ever pass one image at a time.
    # raw_result[0] can be None (some versions) or [] when nothing is detected.
    lines = raw_result[0] if raw_result else None
    if not lines:
        return []

    results = []
    for polygon, (text, conf) in lines:
        results.append({
            "text": str(text),
            "box": _polygon_to_xywh(polygon),
            "conf": float(conf),
        })
    return results


if __name__ == "__main__":
    # Quick standalone sanity check.
    # Usage: python ocr_module.py path/to/test3.jpeg
    test_path = sys.argv[1] if len(sys.argv) > 1 else "test3.jpeg"
    print(f"Running OCR on: {test_path}")
    output = extract_text(test_path)
    print(f"Found {len(output)} text region(s):\n")
    for item in output:
        print(item)