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


def _clean_field_value(field: str, text: str, pattern: str) -> Optional[str]:
    """Extracts the precise semantic value for a declaration from OCR text."""
    if not text:
        return None
    t = text.strip()
    if field == "mrp":
        # Extract pure numeric price avoiding trailing batch numbers or phone numbers
        m = re.search(r'(?:(?:rs\.?|₹|inr)\s*)?([0-9]+(?:\.[0-9]{1,2})?)', t, re.IGNORECASE)
        if m:
            return m.group(1)
    elif field == "net_quantity":
        m = re.search(r'(\d+(?:\.\d+)?\s*(?:kg|kgs|kilogram|g|gm|gms|gram|l|ltr|liter|litre|ml|mls|n|u|units?|pcs?|pieces?|tablets?|capsules?))\b', t, re.IGNORECASE)
        if m:
            return m.group(1)
    elif field == "mfg_date":
        m = re.search(r'\b(?:\d{1,2}[/.-])?\d{1,2}[/.-]\d{2,4}\b|\b(?:\d{1,2}[\s/-])?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s/-]+(?:20)?\d{2}\b', t, re.IGNORECASE)
        if m:
            return m.group(0)
    elif field == "country_of_origin":
        m = re.search(r'(?:country\s+of\s+origin|made\s+in|product\s+of|origin)[\s.:]+([A-Za-z\s]+)', t, re.IGNORECASE)
        if m:
            return m.group(1).strip()
        if re.search(r'\bindia\b|\bbharat\b', t, re.IGNORECASE):
            return "India"
    return t


def _find_matching_box(ocr_boxes, keywords, pattern, field="", allow_pattern_only_fallback=True):
    """
    Returns (box, format_valid, clean_value) for the best match of this declaration in ocr_boxes,
    or (None, False, None) if nothing matched.

    Strategy (multi-candidate, spatial layout aware):
      1. Single box contains BOTH a keyword and a value matching pattern.
      2. Keyword in box A, value in adjacent same-row or stacked (directly below) box B.
         For manufacturer, concatenates multi-line address rows below the label.
      3. Pattern-only fallback for unambiguous patterns (mrp, net_quantity, mfg_date).
    """
    keywords_lower = [k.lower() for k in keywords]

    # Pass 1: single box has both keyword and valid value
    for box in ocr_boxes:
        text_lower = box.get("text", "").lower()
        if any(kw in text_lower for kw in keywords_lower) and re.search(pattern, box.get("text", ""), re.IGNORECASE):
            clean_val = _clean_field_value(field, box.get("text", ""), pattern)
            return box, True, clean_val

    # Pass 2: Search ALL candidate keyword boxes and evaluate nearby value candidates
    # Supports both side-by-side (same row) AND stacked (value directly underneath label)
    candidate_keyword_boxes = []
    for box in ocr_boxes:
        text_lower = box.get("text", "").lower()
        if any(kw in text_lower for kw in keywords_lower):
            candidate_keyword_boxes.append(box)

    best_match = None
    best_dist = float("inf")

    for k_box in candidate_keyword_boxes:
        kx, ky, kw_, kh = k_box.get("box", [0, 0, 0, 0])
        k_center_y = ky + kh / 2.0
        k_center_x = kx + kw_ / 2.0

        # Special handling for manufacturer multi-line address:
        if field == "manufacturer":
            # Collect lines directly below the keyword within 3.5 line heights
            addr_lines = [k_box.get("text", "")]
            for other in ocr_boxes:
                if other is k_box:
                    continue
                bx, by, bw, bh = other.get("box", [0, 0, 0, 0])
                b_center_y = by + bh / 2.0
                if 0 < (b_center_y - k_center_y) < (kh * 3.5) and abs(bx - kx) < (kw_ * 1.5):
                    ot = other.get("text", "").strip()
                    if ot and not re.search(r'\b(?:mrp|net\s*wt|batch|exp)\b', ot, re.IGNORECASE):
                        addr_lines.append(ot)
            if len(addr_lines) > 1:
                combined_addr = " ".join(addr_lines)
                synthetic_box = {
                    "text": combined_addr,
                    "box": k_box.get("box"),
                    "conf": k_box.get("conf", 0.9)
                }
                return synthetic_box, True, combined_addr

        for other in ocr_boxes:
            if other is k_box:
                continue
            bx, by, bw, bh = other.get("box", [0, 0, 0, 0])
            b_center_y = by + bh / 2.0
            b_center_x = bx + bw / 2.0
            avg_h = (kh + bh) / 2.0 or 1.0

            # Proximity Case A: Same horizontal row (within 0.8 line height)
            same_row = abs(b_center_y - k_center_y) < (avg_h * 0.8)
            # Proximity Case B: Stacked layout (value directly beneath label within 2.8 line heights)
            stacked = (0 < (b_center_y - k_center_y) < (avg_h * 2.8)) and (abs(b_center_x - k_center_x) < max(kw_, bw) * 1.5)

            if (same_row or stacked) and re.search(pattern, other.get("text", ""), re.IGNORECASE):
                v_dist = abs(b_center_y - k_center_y)
                h_dist = abs(bx - (kx + kw_)) if same_row else abs(b_center_x - k_center_x)
                dist = (v_dist * 2.0 + h_dist) if same_row else (v_dist + h_dist * 0.5)

                if dist < best_dist:
                    best_dist = dist
                    best_match = other

    if best_match:
        clean_val = _clean_field_value(field, best_match.get("text", ""), pattern)
        return best_match, True, clean_val

    # If keyword box exists but no valid value was found nearby
    if candidate_keyword_boxes:
        fallback_kbox = candidate_keyword_boxes[0]
        return fallback_kbox, False, fallback_kbox.get("text")

    # Pass 3: Pattern-only fallback for unambiguous declarations
    if allow_pattern_only_fallback:
        for box in ocr_boxes:
            t = box.get("text", "")
            if re.search(pattern, t, re.IGNORECASE):
                clean_val = _clean_field_value(field, t, pattern)
                return box, True, clean_val

    return None, False, None


# Fields whose regex pattern is loose/free-text and must NOT be matched without
# their keyword also being present (otherwise any unrelated text "matches").
STRICT_KEYWORD_REQUIRED = {"manufacturer", "consumer_care"}


def extract_package_details(ocr_boxes: list) -> dict:
    """
    Extracts additional packaged commodity fields directly from OCR text:
    - batch_no: Real batch / lot number if printed on label
    - expiry_date: Best before / Expiry date if declared
    - unit_sale_price: Unit sale price (Rule 6(1)(e)) e.g. Rs.1.00/g
    - fssai_licence: 14-digit statutory FSSAI licence number
    - barcode: Numeric barcode / EAN-13 string detected in OCR
    - country_of_origin: Country of origin (Rule 6(1)(n))
    """
    batch_no = None
    expiry_date = None
    unit_sale_price = None
    fssai_licence = None
    barcode = None
    country_of_origin = None

    sorted_boxes = sorted(ocr_boxes, key=lambda b: (b.get("box", [0, 0, 0, 0])[1], b.get("box", [0, 0, 0, 0])[0]))

    for b in sorted_boxes:
        t = b.get("text", "").strip()
        if not t:
            continue
        t_lower = t.lower()

        # 1. Statutory FSSAI License Number (14 digits)
        if not fssai_licence:
            m_fssai = re.search(r'(?:fssai|lic(?:\.|ense)?\s*(?:no\.?)?)[\s.:]*([0-9\s-]{14,20})', t, re.IGNORECASE)
            if m_fssai:
                cleaned_fssai = re.sub(r'\D', '', m_fssai.group(1))
                if len(cleaned_fssai) == 14:
                    fssai_licence = cleaned_fssai
            elif re.search(r'\b(1\d{13})\b', t):
                m_direct = re.search(r'\b(1\d{13})\b', t)
                if m_direct:
                    fssai_licence = m_direct.group(1)

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
                b_y = b.get("box", [0, 0, 0, 0])[1] + b.get("box", [0, 0, 0, 0])[3] / 2
                for other in sorted_boxes:
                    if other is b:
                        continue
                    o_y = other.get("box", [0, 0, 0, 0])[1] + other.get("box", [0, 0, 0, 0])[3] / 2
                    if abs(o_y - b_y) < 45:
                        m_other = re.search(r'(?:rs\.?|inr|₹)?\s*([0-9.]+\s*(?:\/|\s*per\s*)(?:g|gm|kg|ml|l|unit|pc|piece|n|u))\b', other.get("text", ""), re.IGNORECASE)
                        if m_other:
                            unit_sale_price = m_other.group(0).strip()
                            break
            else:
                m_bare_usp = re.search(r'(?:rs\.?|inr|₹)\s*([0-9.]+\s*(?:\/|\s*per\s*)(?:g|gm|kg|ml|l|unit|pc|piece|n|u))\b', t, re.IGNORECASE)
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
                        m_date = re.search(r'\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|\b\d{1,2}\s+(?:months?|days?|years?)\b|\b\d{1,2}[/.-]\d{2,4}\b', other.get("text", ""), re.IGNORECASE)
                        if m_date:
                            expiry_date = m_date.group(0).strip()
                            break

        # 6. Country of Origin (Rule 6(1)(n))
        if not country_of_origin:
            m_orig = re.search(r'(?:country\s+of\s+origin|made\s+in|product\s+of)[\s.:]+([A-Za-z\s]+)', t, re.IGNORECASE)
            if m_orig:
                country_of_origin = m_orig.group(1).strip()
            elif re.search(r'\b(?:made\s+in\s+india|product\s+of\s+india)\b', t, re.IGNORECASE):
                country_of_origin = "India"

    # Avoid barcode colliding with FSSAI
    if barcode and fssai_licence and barcode == fssai_licence:
        barcode = None

    return {
        "batch_no": {"found": batch_no is not None, "format_valid": batch_no is not None, "text": batch_no, "box": None},
        "expiry_date": {"found": expiry_date is not None, "format_valid": expiry_date is not None, "text": expiry_date, "box": None},
        "unit_sale_price": {"found": unit_sale_price is not None, "format_valid": unit_sale_price is not None, "text": unit_sale_price, "box": None},
        "fssai_licence": {"found": fssai_licence is not None, "format_valid": fssai_licence is not None, "text": fssai_licence, "box": None},
        "barcode": {"found": barcode is not None, "format_valid": barcode is not None, "text": barcode, "box": None},
        "country_of_origin": {"found": country_of_origin is not None, "format_valid": country_of_origin is not None, "text": country_of_origin, "box": None}
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
                "clean_value": None,
                "note": rule.get("note", "not auto-checkable"),
            }
            continue
        allow_fallback = field not in STRICT_KEYWORD_REQUIRED
        box, format_valid, clean_val = _find_matching_box(
            ocr_boxes, rule["keywords"], rule["pattern"], field=field, allow_pattern_only_fallback=allow_fallback
        )
        result[field] = {
            "found": box is not None,
            "format_valid": format_valid,
            "box": box["box"] if box else None,
            "text": box["text"] if box else None,
            "clean_value": clean_val
        }

    # Extract additional packaging details (batch, expiry, USP, FSSAI, barcode, origin)
    extra_details = extract_package_details(ocr_boxes)
    for k, v in extra_details.items():
        # Keep extra detail if not already found with format_valid
        if k not in result or not result[k].get("found"):
            result[k] = v

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