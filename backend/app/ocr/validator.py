"""
Rules/logic module for SIH26034.

Input contract (locked with OCR/CV lead):
    ocr_boxes = [{"text": str, "box": [x, y, w, h], "conf": float}, ...]

Output contract (locked with Calibration lead):
    {
        "mrp": {"found": bool, "format_valid": bool, "box": [x,y,w,h] | None, "text": str | None},
        "net_quantity": {...},
        ...
    }
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / "rules.json"
with open(RULES_PATH, "r") as f:
    _RULES_FILE = json.load(f)
RULES = _RULES_FILE["declarations"]


def _find_matching_box(ocr_boxes, keywords, pattern, allow_pattern_only_fallback=True):
    """
    Returns (box, format_valid) for the best match of this declaration in ocr_boxes,
    or (None, False) if nothing matched.

    Strategy (cheapest -> most forgiving, in order):
      1. A single box contains BOTH a keyword and a value matching the pattern
         (e.g. "MRP ₹45.00" in one OCR line) — most common case on real labels.
      2. A box contains just the keyword (the label), and another box roughly on the
         same row matches the pattern (label and value got OCR'd as separate lines) —
         handles split label/value layouts.
      3. No keyword found at all, but SOME box matches the pattern outright — last
         resort, catches cases where OCR garbled the label text. SKIPPED for fields
         with loose/free-text patterns (manufacturer, consumer_care) since it causes
         false positives — any text 3+ chars long "matches" an unrelated field.
    """
    keywords_lower = [k.lower() for k in keywords]

    # Pass 1: same box has both keyword and valid value
    for box in ocr_boxes:
        text_lower = box["text"].lower()
        if any(kw in text_lower for kw in keywords_lower) and re.search(pattern, box["text"], re.IGNORECASE):
            return box, True

    # Pass 2: keyword found in one box, look for a value in a nearby box (same row).
    # Collect ALL same-row candidates and pick the closest one — picking the first
    # match in ocr_boxes list order (as before) meant an unrelated line above/below
    # the keyword (e.g. a batch-number line sitting just as "same row") could win
    # over the actual value line purely by being earlier in OCR output order.
    keyword_box = None
    for box in ocr_boxes:
        text_lower = box["text"].lower()
        if any(kw in text_lower for kw in keywords_lower):
            keyword_box = box
            break

    if keyword_box:
        kx, ky, kw_, kh = keyword_box["box"]
        candidates = []
        for box in ocr_boxes:
            if box is keyword_box:
                continue
            bx, by, bw, bh = box["box"]
            # Tighter same-row check: vertical centers must be within half the
            # (average) line height of each other, not a whole line height —
            # the old `max(kh, bh)` threshold was loose enough to also match
            # the line directly above or below on tightly-packed labels.
            avg_h = (kh + bh) / 2
            k_center_y = ky + kh / 2
            b_center_y = by + bh / 2
            same_row = abs(b_center_y - k_center_y) < (avg_h * 0.6)
            if same_row and re.search(pattern, box["text"], re.IGNORECASE):
                v_dist = abs(b_center_y - k_center_y)
                h_dist = abs(bx - (kx + kw_))  # distance from end of keyword box
                candidates.append((v_dist, h_dist, box))

        if candidates:
            # Best candidate: closest vertically first, then closest horizontally
            # (a value box usually sits right after or just below its label).
            candidates.sort(key=lambda c: (c[0], c[1]))
            return candidates[0][2], True

        # keyword exists but no valid value found nearby -> found, but not format_valid
        return keyword_box, False

    # Pass 3: no keyword anywhere, try pattern-only as a last resort
    if allow_pattern_only_fallback:
        for box in ocr_boxes:
            if re.search(pattern, box["text"], re.IGNORECASE):
                return box, True

    return None, False


# Fields whose regex pattern is loose/free-text and must NOT be matched without
# their keyword also being present (otherwise any unrelated text "matches").
STRICT_KEYWORD_REQUIRED = {"manufacturer", "consumer_care", "mrp"}


def match_declarations(ocr_boxes: list) -> dict:
    result = {}
    for field, rule in RULES.items():
        if not rule.get("auto_checkable", True):
            # e.g. generic_name -- no reliable keyword to match against, don't fake a check
            result[field] = {
                "found": None,
                "format_valid": None,
                "box": None,
                "text": None,
                "note": rule.get("note", "not auto-checkable"),
            }
            continue
        allow_fallback = field not in STRICT_KEYWORD_REQUIRED
        box, format_valid = _find_matching_box(
            ocr_boxes, rule["keywords"], rule["pattern"], allow_pattern_only_fallback=allow_fallback
        )
        result[field] = {
            "found": box is not None,
            "format_valid": format_valid,
            "box": box["box"] if box else None,
            "text": box["text"] if box else None,
        }
    return result


def merge_verdicts(verdicts: list) -> dict:
    """
    Merge per-image verdicts into one combined verdict, for the case where a
    single product's declarations are scattered across multiple photos (e.g.
    MRP/net qty on the front, manufacturer/consumer-care on the back).

    For each field, prefer (in order): a found+format_valid match, then any
    found match, then a not-auto-checkable placeholder, then "not found".
    """
    if not verdicts:
        return {}

    fields = verdicts[0].keys()
    merged = {}
    for field in fields:
        best = None
        for v in verdicts:
            entry = v.get(field)
            if entry is None:
                continue
            if entry.get("found") is None:
                # not auto-checkable (e.g. generic_name) — keep as a placeholder
                # unless we already have a real match from another image.
                if best is None:
                    best = entry
                continue
            if entry.get("found") and entry.get("format_valid"):
                # Best possible outcome for this field — take it and stop looking.
                best = entry
                break
            if entry.get("found") and not (best and best.get("found")):
                best = entry
            elif best is None:
                best = entry
        merged[field] = best if best is not None else {
            "found": False, "format_valid": False, "box": None, "text": None
        }
    return merged


if __name__ == "__main__":
    # Mock OCR output — stand-in until the OCR/CV lead's PaddleOCR module is ready.
    # Mirrors the exact shape their module will hand off.
    mock_ocr_boxes = [
        {"text": "MRP Rs 45.00", "box": [50, 100, 120, 20], "conf": 0.95},
        {"text": "Net Wt 100g", "box": [50, 130, 100, 18], "conf": 0.92},
        {"text": "MFG: 03/2026", "box": [50, 155, 95, 16], "conf": 0.88},
        {"text": "Manufactured by ABC Foods Pvt Ltd, Kochi", "box": [50, 180, 260, 18], "conf": 0.9},
        # deliberately missing a consumer_care line, and mfg_date has no valid pattern below
        {"text": "Toll Free 1800-123-456", "box": [50, 205, 180, 16], "conf": 0.87},
    ]

    verdict = match_declarations(mock_ocr_boxes)
    print(json.dumps(verdict, indent=2))

    # Quick pass/fail summary
    print("\n--- Summary ---")
    for field, res in verdict.items():
        status = "OK" if res["found"] and res["format_valid"] else ("MISSING" if not res["found"] else "MALFORMED")
        print(f"{field:15s} {status:10s} text={res['text']}")