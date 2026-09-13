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


def extract_package_details(ocr_boxes: list) -> dict:
    """
    Extracts additional packaged commodity fields directly from OCR text:
    - batch_no: Real batch / lot number if printed on label
    - expiry_date: Best before / Expiry date if declared
    - unit_sale_price: Unit sale price (Rule 6(1)(e)) e.g. Rs.1.00/g
    - fssai_licence: 14-digit statutory FSSAI licence number
    - barcode: Numeric barcode / EAN-13 string detected in OCR
    """
    batch_no = None
    expiry_date = None
    unit_sale_price = None
    fssai_licence = None
    barcode = None

    sorted_boxes = sorted(ocr_boxes, key=lambda b: (b.get("box", [0, 0, 0, 0])[1], b.get("box", [0, 0, 0, 0])[0]))

    for b in sorted_boxes:
        t = b.get("text", "").strip()
        if not t:
            continue
        t_lower = t.lower()

        # 1. Statutory FSSAI License Number (14 digits)
        if not fssai_licence:
            m_fssai = re.search(r'(?:fssai|lic(?:\.|ense)?\s*(?:no\.?)?)[\s.:]*([0-9]{14})', t, re.IGNORECASE)
            if m_fssai:
                fssai_licence = m_fssai.group(1)

        # 2. Barcode / GTIN / EAN-13
        if not barcode:
            m_ean = re.search(r'\b(890\d{10})\b', t)
            if m_ean:
                barcode = m_ean.group(1)
            else:
                m_gtin = re.search(r'\b(\d{12,14})\b', t)
                if m_gtin and (not fssai_licence or m_gtin.group(1) != fssai_licence):
                    if not re.search(r'\+91|tel|phone|pincode|pin\b', t, re.IGNORECASE):
                        barcode = m_gtin.group(1)
                elif re.search(r'\b(?:barcode|bar\s*code|ean|gtin)[\s.:#-]*([0-9]{8,14})\b', t, re.IGNORECASE):
                    m_kw = re.search(r'\b(?:barcode|bar\s*code|ean|gtin)[\s.:#-]*([0-9]{8,14})\b', t, re.IGNORECASE)
                    if m_kw:
                        barcode = m_kw.group(1)

        # 3. Unit Sale Price (USP - Rule 6(1)(e))
        if not unit_sale_price:
            m_usp = re.search(
                r'(?:usp|unit\s*sale\s*price|unit\s*price)[\s.:]*(?:rs\.?|inr|₹)?\s*([0-9.]+\s*(?:\/|\s*per\s*)[A-Za-z0-9]+)',
                t, re.IGNORECASE
            )
            if m_usp:
                unit_sale_price = m_usp.group(1).strip()
            elif re.search(r'\bunit\s*sale\s*price\b', t_lower):
                # Look in same-row / adjacent boxes
                b_y = b.get("box", [0, 0, 0, 0])[1] + b.get("box", [0, 0, 0, 0])[3] / 2
                for other in sorted_boxes:
                    if other is b:
                        continue
                    o_y = other.get("box", [0, 0, 0, 0])[1] + other.get("box", [0, 0, 0, 0])[3] / 2
                    if abs(o_y - b_y) < 45:
                        m_other = re.search(r'(?:rs\.?|inr|₹)?\s*([0-9.]+\s*(?:\/|\s*per\s*)(?:g|gm|kg|ml|l|unit|pc|piece))\b', other.get("text", ""), re.IGNORECASE)
                        if m_other:
                            unit_sale_price = m_other.group(0).strip()
                            break
            else:
                m_bare_usp = re.search(r'(?:rs\.?|inr|₹)\s*([0-9.]+\s*(?:\/|\s*per\s*)(?:g|gm|kg|ml|l|unit|pc|piece))\b', t, re.IGNORECASE)
                if m_bare_usp and not re.search(r'\bmrp\b', t, re.IGNORECASE):
                    unit_sale_price = m_bare_usp.group(0).strip()

        # 4. Batch / Lot Number
        if not batch_no:
            m_batch = re.search(
                r'\b(?:batch(?:\s*(?:no|number|num)\.?)?|lot(?:\s*(?:no|number|num)\.?)?|b\.?\s*no\.?)[\s.:#-]+(?!(?:no|number)\b)([A-Za-z0-9\/-]{2,20})',
                t, re.IGNORECASE
            )
            if m_batch:
                batch_no = m_batch.group(1).strip()
            elif re.search(r'\b(?:batch(?:\s*no\.?)?|lot(?:\s*no\.?)?)\b', t_lower):
                # Search nearby box
                b_y = b.get("box", [0, 0, 0, 0])[1] + b.get("box", [0, 0, 0, 0])[3] / 2
                for other in sorted_boxes:
                    if other is b:
                        continue
                    o_y = other.get("box", [0, 0, 0, 0])[1] + other.get("box", [0, 0, 0, 0])[3] / 2
                    if abs(o_y - b_y) < 45:
                        cand = other.get("text", "").strip()
                        if re.match(r'^[A-Za-z0-9\/-]{3,18}$', cand) and not re.search(r'mrp|rs|date|use|net|pack|taxes', cand, re.IGNORECASE):
                            batch_no = cand
                            break

        # 5. Expiry Date / Best Before / Use By
        if not expiry_date:
            m_exp = re.search(
                r'(?:exp(?:iry)?(?:\s*date)?|use\s*by|best\s*before)[\s.:]+([A-Za-z0-9\/\s.-]{3,35})',
                t, re.IGNORECASE
            )
            if m_exp:
                expiry_date = m_exp.group(1).strip()
            elif re.search(r'\b(?:use\s*by|best\s*before|exp(?:iry)?)\b', t_lower):
                b_y = b.get("box", [0, 0, 0, 0])[1] + b.get("box", [0, 0, 0, 0])[3] / 2
                for other in sorted_boxes:
                    if other is b:
                        continue
                    o_y = other.get("box", [0, 0, 0, 0])[1] + other.get("box", [0, 0, 0, 0])[3] / 2
                    if abs(o_y - b_y) < 55:
                        m_date = re.search(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}\s+(?:months?|days?|years?)\b', other.get("text", ""), re.IGNORECASE)
                        if m_date:
                            expiry_date = m_date.group(0).strip()
                            break

    # Avoid barcode colliding with FSSAI
    if barcode and fssai_licence and barcode == fssai_licence:
        barcode = None

    return {
        "batch_no": {"found": batch_no is not None, "format_valid": batch_no is not None, "text": batch_no, "box": None},
        "expiry_date": {"found": expiry_date is not None, "format_valid": expiry_date is not None, "text": expiry_date, "box": None},
        "unit_sale_price": {"found": unit_sale_price is not None, "format_valid": unit_sale_price is not None, "text": unit_sale_price, "box": None},
        "fssai_licence": {"found": fssai_licence is not None, "format_valid": fssai_licence is not None, "text": fssai_licence, "box": None},
        "barcode": {"found": barcode is not None, "format_valid": barcode is not None, "text": barcode, "box": None},
    }


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

    # Extract additional packaging details (batch, expiry, USP, FSSAI, barcode)
    extra_details = extract_package_details(ocr_boxes)
    result.update(extra_details)

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

    fields = set()
    for v in verdicts:
        fields.update(v.keys())

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