"""
calibration.py

Pixel-to-millimetre calibration using a coin (23mm diameter, e.g. Indian Rs 5 coin)
placed next to the product in the photo as a size reference.

Public interface:
    detect_reference_coin(image) -> tuple | None   # (x, y, w, h) bounding box in pixels
    get_mm_per_px(reference_box) -> float

Note: kept the (x, y, w, h) bounding-box return shape (rather than returning a
circle center+radius) so annotate.py and anything else downstream that expects
a box doesn't need to change.
"""

import sys
from typing import List, Optional, Tuple

import cv2
import numpy as np

# Reference coin diameter (mm). Indian Rs 5 coin is ~23mm - change this constant
# if you swap coins.
REFERENCE_DIAMETER_MM = 23.0

# Hough circle detection tuning.
HOUGH_DP = 1.0            # inverse accumulator resolution (1 = same res as image)
HOUGH_PARAM1 = 100        # upper Canny threshold used internally by HoughCircles
HOUGH_PARAM2 = 35         # accumulator threshold - lower = more (and more false-positive) circles
MIN_RADIUS_FRACTION = 0.01   # relative to image's shorter side
MAX_RADIUS_FRACTION = 0.25   # a coin shouldn't dominate the whole frame
MIN_DIST_FRACTION = 0.1      # min distance between detected circle centers

# --- Verification thresholds (these are what actually reject false positives) ---
# Fraction of the circle's perimeter that must fall on a real edge pixel to be
# accepted as a genuine coin outline rather than Hough scraping noise/gradients.
EDGE_COVERAGE_THRESHOLD = 0.55
EDGE_SAMPLE_POINTS = 72          # points sampled around the perimeter
EDGE_BAND_PX = 3                 # tolerance band (pixels) around the ideal perimeter


def _preprocess(image: np.ndarray) -> np.ndarray:
    """Grayscale + blur, tuned for round metallic coin edges rather than card edges."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # CLAHE evens out local contrast - useful since coins are reflective and
    # often have glare/highlight patches under uneven lighting.
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    blurred = cv2.medianBlur(gray, 5)
    return blurred


def _edge_map(image: np.ndarray) -> np.ndarray:
    """Independent Canny edge map used to verify a Hough circle is a real outline,
    not just an accumulator artifact."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    median = float(np.median(blurred))
    lower = int(max(0, 0.66 * median))
    upper = int(min(255, 1.33 * median))
    edges = cv2.Canny(blurred, lower, upper)
    # Dilate slightly so the tolerance band is forgiving of a 1-2px misalignment
    # between the Hough circle and the true edge.
    return cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)


def _edge_coverage(edge_map: np.ndarray, cx: int, cy: int, r: int) -> float:
    """Fraction of sampled perimeter points that land on (or near) a real edge pixel."""
    h, w = edge_map.shape[:2]
    hits = 0
    checked = 0
    for i in range(EDGE_SAMPLE_POINTS):
        theta = 2 * np.pi * i / EDGE_SAMPLE_POINTS
        px = int(round(cx + r * np.cos(theta)))
        py = int(round(cy + r * np.sin(theta)))
        if px < 0 or py < 0 or px >= w or py >= h:
            continue  # perimeter point falls outside the image - can't check it
        checked += 1
        y0, y1 = max(0, py - EDGE_BAND_PX), min(h, py + EDGE_BAND_PX + 1)
        x0, x1 = max(0, px - EDGE_BAND_PX), min(w, px + EDGE_BAND_PX + 1)
        if np.any(edge_map[y0:y1, x0:x1]):
            hits += 1
    if checked == 0:
        return 0.0
    return hits / checked


def _fully_in_frame(cx: int, cy: int, r: int, img_w: int, img_h: int) -> bool:
    """A physically placed reference coin should be entirely visible, not clipped
    by the frame edge - a circle poking off-screen is a strong false-positive signal."""
    return (cx - r) >= 0 and (cy - r) >= 0 and (cx + r) <= img_w and (cy + r) <= img_h


# A coin is normally a LONE round object. Perforated straps, buttons, rivets,
# bottle caps in a multipack etc. show up as several similarly-sized circles
# clustered together - that repeating pattern is a strong "not a coin" signal
# that edge-coverage alone can't catch (those circles have perfectly real edges).
REPEAT_RADIUS_RATIO_TOLERANCE = 0.3   # how close in size two circles must be to count as "siblings"
REPEAT_PROXIMITY_MULTIPLIER = 5.0     # search radius for siblings, in multiples of r
REPEAT_MAX_SIBLINGS_ALLOWED = 0       # >0 other similar circles nearby => reject as a pattern


def _is_part_of_repeating_pattern(cx: int, cy: int, r: int, all_circles: np.ndarray) -> bool:
    siblings = 0
    for ocx, ocy, orad in all_circles:
        if ocx == cx and ocy == cy and orad == r:
            continue  # skip itself
        radius_ratio = orad / r if r > 0 else 0
        similar_size = abs(radius_ratio - 1.0) <= REPEAT_RADIUS_RATIO_TOLERANCE
        dist = np.hypot(ocx - cx, ocy - cy)
        nearby = dist <= REPEAT_PROXIMITY_MULTIPLIER * r
        if similar_size and nearby:
            siblings += 1
    return siblings > REPEAT_MAX_SIBLINGS_ALLOWED


def detect_reference_coin(image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """
    Locate a circular coin in the image using Hough circle detection, verified
    against an independent edge map so a lack of any real coin returns None
    instead of a confident-looking false positive.

    Args:
        image: BGR numpy image (e.g. from cv2.imread).

    Returns:
        (x, y, w, h) bounding box of the best-matching coin, or None if nothing
        verified as a genuine coin outline was found.
    """
    if image is None or image.size == 0:
        return None

    h_img, w_img = image.shape[:2]
    short_side = min(h_img, w_img)

    processed = _preprocess(image)
    circles = cv2.HoughCircles(
        processed,
        cv2.HOUGH_GRADIENT,
        dp=HOUGH_DP,
        minDist=int(short_side * MIN_DIST_FRACTION),
        param1=HOUGH_PARAM1,
        param2=HOUGH_PARAM2,
        minRadius=int(short_side * MIN_RADIUS_FRACTION),
        maxRadius=int(short_side * MAX_RADIUS_FRACTION),
    )

    if circles is None:
        return None

    circles = np.round(circles[0, :]).astype(int)  # [[cx, cy, r], ...]
    edges = _edge_map(image)

    # A coin has multiple genuine circular features (outer rim, inner emblem
    # disc, etc.) that can ALL pass edge-coverage verification. The true coin
    # boundary is, by definition, the OUTERMOST one - so among verified
    # candidates we take the largest radius, not the highest coverage score.
    # (Picking by coverage alone previously grabbed an inner engraved circle
    # instead of the actual coin edge, inflating mm_per_px.)
    verified = []
    for cx, cy, r in circles:
        if not _fully_in_frame(cx, cy, r, w_img, h_img):
            continue  # reject anything clipped by the frame edge

        if _is_part_of_repeating_pattern(cx, cy, r, circles):
            continue  # a row of similar-sized circles => strap holes/buttons/rivets, not a coin

        coverage = _edge_coverage(edges, cx, cy, r)
        if coverage < EDGE_COVERAGE_THRESHOLD:
            continue  # doesn't actually sit on a real outline - likely noise

        verified.append((r, coverage, (cx, cy, r)))

    if not verified:
        return None

    verified.sort(key=lambda t: t[0], reverse=True)  # largest radius first
    _, _, (cx, cy, r) = verified[0]
    x = int(cx - r)
    y = int(cy - r)
    diameter = int(2 * r)
    return (x, y, diameter, diameter)


def get_mm_per_px(reference_box: Tuple[int, int, int, int]) -> float:
    """
    Convert a detected reference coin's pixel width (== diameter) into a mm-per-pixel scale.

    Args:
        reference_box: (x, y, w, h) as returned by detect_reference_coin.

    Returns:
        Millimetres represented by one pixel, based on the coin's known real-world diameter.
    """
    _, _, w, _ = reference_box
    if w <= 0:
        raise ValueError(f"Invalid reference box width: {w}")
    return REFERENCE_DIAMETER_MM / w


if __name__ == "__main__":
    # Quick standalone sanity check.
    # Usage: python calibration.py path/to/test_image.jpg
    test_path = sys.argv[1] if len(sys.argv) > 1 else "test_image.jpg"
    img = cv2.imread(test_path)
    if img is None:
        print(f"Could not read image: {test_path}")
        sys.exit(1)

    box = detect_reference_coin(img)
    print(f"Detected coin box (x, y, w, h): {box}")

    if box is not None:
        scale = get_mm_per_px(box)
        print(f"mm per pixel: {scale:.5f}")
        print(f"(sanity check) coin diameter in mm: {box[2] * scale:.2f}mm "
              f"(should be near {REFERENCE_DIAMETER_MM}mm)")
    else:
        print("No verified coin found. If you know a coin IS in this photo, try "
              "lowering EDGE_COVERAGE_THRESHOLD (e.g. to 0.4) or HOUGH_PARAM2 - "
              "in that order.")