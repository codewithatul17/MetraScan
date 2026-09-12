"""
annotate.py

Draws the final pass/fail annotated result image for the Legal Metrology checker,
based on the rules module's verdict dict and the calibration module's mm-per-pixel scale.

Public interface (locked):
    annotate(image, verdict: dict, mm_per_px: float) -> image

Expected verdict shape (from teammate's rules module):
    {
        "mrp": {"found": bool, "format_valid": bool, "box": [x,y,w,h] | None, "text": str | None},
        "net_quantity": {...},
        ...
    }
"""

import sys
from typing import Dict, Optional

import cv2
import numpy as np

from rules_utils import get_min_height_mm

COLOR_PASS = (0, 200, 0)   # green, BGR
COLOR_FAIL = (0, 0, 220)   # red, BGR
FONT = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE = 0.6
FONT_THICKNESS = 2
BOX_THICKNESS = 2


def annotate(image: np.ndarray, verdict: Dict, mm_per_px: Optional[float]) -> np.ndarray:
    """
    Draw pass/fail boxes and labels for each field in the verdict dict.

    Args:
        image: original BGR image.
        verdict: {field_name: {"found": bool, "format_valid": bool,
                                "box": [x,y,w,h] | None, "text": str | None}, ...}
        mm_per_px: millimetres represented by one pixel (from calibration.get_mm_per_px),
            or None if no reference coin was detected - in that case height/mm checks
            are skipped entirely and pass/fail is based only on found + format_valid.

    Returns:
        A new annotated BGR image (input image is not mutated).
    """
    output = image.copy()

    # mrp and net_quantity's minimum numeral height both depend on the DECLARED
    # net quantity value (Rule 7(2) Table-I), not on the field being measured -
    # so pull it once up front and hand it to every lookup that needs it.
    net_quantity_text = verdict.get("net_quantity", {}).get("text")

    for field, data in verdict.items():
        box = data.get("box")
        if box is None:
            # Nothing detected for this field - nothing to draw. (Rules module
            # / downstream summary is responsible for flagging "not found" fields.)
            continue

        x, y, w, h = box
        found = bool(data.get("found"))
        format_valid = bool(data.get("format_valid"))

        if mm_per_px is not None:
            height_mm = h * mm_per_px
            min_height_mm = get_min_height_mm(field, net_quantity_text=net_quantity_text)
            passed = found and format_valid and (height_mm >= min_height_mm)
            label = f"{field}: {height_mm:.1f}mm"
        else:
            # No reference coin detected - can't measure real-world height, so
            # judge pass/fail on presence + format only and label without a
            # (meaningless, uncalibrated) mm figure.
            passed = found and format_valid
            label = f"{field}"

        color = COLOR_PASS if passed else COLOR_FAIL

        cv2.rectangle(output, (x, y), (x + w, y + h), color, BOX_THICKNESS)

        label_y = y - 10 if y - 10 > 10 else y + h + 20
        cv2.putText(output, label, (x, label_y), FONT, FONT_SCALE, color, FONT_THICKNESS, cv2.LINE_AA)

    return output


if __name__ == "__main__":
    # Quick standalone sanity check using a mock verdict, no teammates' modules required.
    # Usage: python annotate.py path/to/test_image.jpg
    test_path = sys.argv[1] if len(sys.argv) > 1 else "test3.jpeg"
    img = cv2.imread(test_path)
    if img is None:
        print(f"Could not read image: {test_path}")
        sys.exit(1)

    # Fabricated mm_per_px, e.g. as if a reference card gave us this scale.
    mock_mm_per_px = 0.15

    mock_verdict = {
        "mrp": {"found": True, "format_valid": True, "box": [108, 442, 582, 61], "text": "MRP Rs 80.00"},
        "net_quantity": {"found": True, "format_valid": True, "box": [103, 347, 647, 66], "text": "Net Wt 100g"},
        "consumer_care": {"found": False, "format_valid": False, "box": None, "text": None},
    }

    result = annotate(img, mock_verdict, mock_mm_per_px)
    out_path = "annotated_output.jpg"
    cv2.imwrite(out_path, result)
    print(f"Wrote annotated image to: {out_path}")
    print("(opencv-python-headless has no GUI window - open the file to inspect it)")