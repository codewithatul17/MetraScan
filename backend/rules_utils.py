"""
rules_utils.py

Shared helper for looking up minimum letter/numeral heights from rules.json,
per Legal Metrology (Packaged Commodities) Rules, 2011, Rule 7.

Two height regimes, per rules.json's height_type per field:
  - "letter"        -> flat letter_min_height_mm (Rule 7(3)) - same for every package size.
  - "numeral_table"  -> numeral_height_table_mm (Rule 7(2), Table-I) - depends on the
                         DECLARED NET QUANTITY VALUE, not the field being measured.
                         Both "mrp" and "net_quantity" use this table (the rule applies
                         to "any numeral in the declaration", keyed off the pack size).

KNOWN LIMITATION (flagged deliberately, not hidden): this pipeline has no way to visually
detect whether packaging is molded/blown/embossed/perforated glass or plastic vs. a normal
printed label. We default to "normal" packaging for every check. A molded-container product
would legally require a taller minimum (e.g. 2mm instead of 1mm for letters), so a result
here that says "PASS" on a molded container could be legally insufficient. State this
assumption explicitly in the demo rather than pretending it doesn't matter.
"""

import json
import re
from pathlib import Path
from typing import Optional

RULES_PATH = Path(__file__).parent / "rules.json"
with open(RULES_PATH, "r") as f:
    _RULES_FILE = json.load(f)

DECLARATIONS = _RULES_FILE["declarations"]
LETTER_MIN_HEIGHT_MM = _RULES_FILE["letter_min_height_mm"]
NUMERAL_HEIGHT_TABLE_MM = _RULES_FILE["numeral_height_table_mm"]

# Default packaging assumption - see KNOWN LIMITATION above.
DEFAULT_PACKAGING = "normal"

# Fallback used only when a numeral-table field's bracket can't be determined
# (net_quantity text missing/unparseable). Deliberately conservative (the
# largest table bracket) so we don't under-require height when we're unsure -
# but this WILL cause false "too small" failures for genuinely small packages
# if net_quantity OCR failed, so a printed warning always accompanies it.
_FALLBACK_NUMERAL_HEIGHT_MM = NUMERAL_HEIGHT_TABLE_MM[0]

_QUANTITY_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s?(kg|kgs|g|gm|gms|l|ltr|ml)\b", re.IGNORECASE
)

_UNIT_TO_GRAMS_OR_ML = {
    "g": 1, "gm": 1, "gms": 1,
    "kg": 1000, "kgs": 1000,
    "ml": 1,
    "l": 1000, "ltr": 1000,
}


def extract_quantity_value_g_or_ml(net_quantity_text: Optional[str]) -> Optional[float]:
    """Parse a net-quantity OCR string (e.g. 'Net Wt 100g') into a normalized
    grams-or-ml numeric value for table lookup. Returns None if unparseable."""
    if net_quantity_text is None:
        return None
    if isinstance(net_quantity_text, (int, float)):
        return float(net_quantity_text)
    if not isinstance(net_quantity_text, str):
        net_quantity_text = str(net_quantity_text)
    match = _QUANTITY_PATTERN.search(net_quantity_text)
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2).lower()
    multiplier = _UNIT_TO_GRAMS_OR_ML.get(unit)
    if multiplier is None:
        return None
    return value * multiplier


def _numeral_bracket_for(qty_g_or_ml: float) -> dict:
    for bracket in NUMERAL_HEIGHT_TABLE_MM:
        max_qty = bracket["max_qty_g_or_ml"]
        if max_qty is None or qty_g_or_ml <= max_qty:
            return bracket
    return NUMERAL_HEIGHT_TABLE_MM[-1]  # shouldn't happen given a None-terminated table


def get_min_height_mm(field: str, net_quantity_text: Optional[str] = None,
                       packaging: str = DEFAULT_PACKAGING, molded: bool = False) -> float:
    if molded:
        packaging = "molded"
    """
    Returns the minimum required letter/numeral height in mm for a field.

    Args:
        field: declaration field name (e.g. "mrp", "manufacturer").
        net_quantity_text: the OCR'd net_quantity text (needed only for fields
            with height_type == "numeral_table" - both mrp and net_quantity
            itself need this, since Rule 7(2)'s table is keyed by pack size).
        packaging: "normal" or the molded/blown/embossed/perforated variant.
            Defaults to "normal" - see KNOWN LIMITATION above.
    """
    rule = DECLARATIONS.get(field)
    height_type = rule.get("height_type", "letter") if rule else "letter"

    if height_type == "letter":
        return LETTER_MIN_HEIGHT_MM.get(packaging, LETTER_MIN_HEIGHT_MM["normal"])

    if height_type == "numeral_table":
        qty = extract_quantity_value_g_or_ml(net_quantity_text)
        if qty is None:
            print(f"[rules_utils] WARNING: could not determine declared net quantity for "
                  f"'{field}' height check - falling back to the largest table bracket "
                  f"({_FALLBACK_NUMERAL_HEIGHT_MM['normal']}mm normal). This may incorrectly "
                  f"fail a genuinely small/valid package.")
            bracket = _FALLBACK_NUMERAL_HEIGHT_MM
        else:
            bracket = _numeral_bracket_for(qty)
        # Numeral table uses the shorter key "molded", not the letter table's
        # "molded_blown_embossed_perforated" - map it here so callers only ever
        # pass one consistent packaging string.
        numeral_key = "molded" if packaging != "normal" else "normal"
        return bracket.get(numeral_key, bracket["normal"])

    # Unknown height_type - fall back to the plain letter minimum rather than guessing.
    return LETTER_MIN_HEIGHT_MM["normal"]