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
from typing import Union, List, Dict, Optional, Any

import cv2
import numpy as np

try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None

# ---------------------------------------------------------------------------
# PaddleOCR is expensive to construct (loads det/rec/cls model weights), so we
# build it once and reuse it across calls.
# ---------------------------------------------------------------------------
_ocr_engine: Optional[Any] = None


def _get_engine():
    global _ocr_engine
    if _ocr_engine is None:
        try:
            from paddleocr import PaddleOCR
            _ocr_engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        except Exception as e:
            print(f"[ocr_module] Note: PaddleOCR not available in this environment: {e}")
            _ocr_engine = False
    return _ocr_engine


def _polygon_to_xywh(polygon, scale_x: float = 1.0, scale_y: float = 1.0) -> List[int]:
    """Convert a 4-point polygon [[x1,y1],...,[x4,y4]] to axis-aligned [x, y, w, h] (plain ints) mapped back to original scale."""
    xs = [p[0] / scale_x for p in polygon]
    ys = [p[1] / scale_y for p in polygon]
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


def preprocess_image_for_ocr(img: np.ndarray):
    """
    Normalizes packaging image resolution and applies CLAHE contrast equalization
    to make 1mm-2mm small statutory fonts readable and eliminate wrapper glare.
    Returns: (processed_img, scale_x, scale_y)
    """
    h, w = img.shape[:2]
    scale = 1.0

    # 1. Optimal resolution scaling:
    # If image is small or low-res (e.g. mobile crop or webcam), upscale so small packaging text reaches >15px height.
    if min(h, w) < 720:
        scale = min(2.5, 800.0 / float(min(h, w)))
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        working_img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    # If image is massive (>1600px), downscale to avoid OOM on cloud container and optimize OCR speed
    elif max(h, w) > 1600:
        scale = 1400.0 / float(max(h, w))
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        working_img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        working_img = img.copy()

    # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization) on L channel
    # Normalizes packaging surface reflections, glare from plastic/foil, and enhances character edges
    try:
        lab = cv2.cvtColor(working_img, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_chan)
        enhanced_lab = cv2.merge((cl, a_chan, b_chan))
        enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    except Exception:
        enhanced_bgr = working_img

    scale_x = float(working_img.shape[1]) / float(w)
    scale_y = float(working_img.shape[0]) / float(h)
    return enhanced_bgr, scale_x, scale_y


def clean_ocr_text(text: str) -> str:
    """Corrects common OCR character confusions on packaging labels."""
    if not text:
        return ""
    cleaned = text.strip()
    # Normalize Indian Rupee symbol OCR variants (e.g. MRP ? 50 or MRP * 50 or MRP F 50)
    import re
    cleaned = re.sub(r'\bMRP\s*[:.-]?\s*[?*F₹]\s*', 'MRP ₹ ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bRs\.\s*[:.-]?\s*', 'Rs. ', cleaned, flags=re.IGNORECASE)
    # Normalize Net Weight / Net Qty spacing
    cleaned = re.sub(r'\bNet\s*Wt\s*[:.-]?\s*', 'Net Wt: ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bNet\s*Qty\s*[:.-]?\s*', 'Net Qty: ', cleaned, flags=re.IGNORECASE)
    return cleaned


def extract_text(image: Union[str, np.ndarray]) -> List[Dict]:
    """
    Run fine-tuned OCR on an image and return detected text regions.

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

    # 1. Preprocess image for maximum text detection accuracy
    proc_img, scale_x, scale_y = preprocess_image_for_ocr(img)

    results = []
    engine = _get_engine()

    # Strategy A: PaddleOCR (Production Render Container)
    if engine:
        try:
            raw_result = engine.ocr(proc_img, cls=True)
            lines = raw_result[0] if raw_result else None
            if lines:
                for polygon, (text, conf) in lines:
                    norm_text = clean_ocr_text(str(text))
                    if norm_text:
                        results.append({
                            "text": norm_text,
                            "box": _polygon_to_xywh(polygon, scale_x, scale_y),
                            "conf": float(conf),
                        })
        except Exception as e:
            print(f"[ocr_module] PaddleOCR execution failed - {e}")

    # Strategy B: Graceful PyTesseract fallback if PaddleOCR is not installed or returned 0 results
    if not results:
        try:
            import pytesseract
            data = pytesseract.image_to_data(proc_img, output_type=pytesseract.Output.DICT)
            n_boxes = len(data.get("text", []))
            for i in range(n_boxes):
                raw_t = data["text"][i].strip()
                if raw_t and int(data.get("conf", [0])[i]) > 25:
                    bx = int(round(data["left"][i] / scale_x))
                    by = int(round(data["top"][i] / scale_y))
                    bw = int(round(data["width"][i] / scale_x))
                    bh = int(round(data["height"][i] / scale_y))
                    conf = float(data["conf"][i]) / 100.0
                    results.append({
                        "text": clean_ocr_text(raw_t),
                        "box": [bx, by, bw, bh],
                        "conf": conf
                    })
        except Exception as e:
            print(f"[ocr_module] PyTesseract fallback notice: {e}")

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