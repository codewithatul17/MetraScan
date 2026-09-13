"""
METRA SCAN — Ingredient Health & Safety Scoring Engine
Analyzes ingredient declarations from OCR text, identifies INS/E-number additives,
detects ultra-processed food (UPF) markers, allergens, and calculates an evidence-based
clean label safety score (0–100) with graded health insights.
"""

import re
from typing import List, Dict, Any, Optional

# ---------------------------------------------------------------------------
# Knowledge Base of Food Additives (INS / E Numbers)
# ---------------------------------------------------------------------------
ADDITIVE_DATABASE: Dict[str, Dict[str, str]] = {
    # High Concern / Hazardous / Potentially Harmful Additives
    "102": {
        "name": "Tartrazine (Yellow 5)",
        "category": "Synthetic Azo Dye / Colour",
        "risk": "high",
        "concern": "Synthetic coal-tar dye linked to hyperactivity in children and asthma/urticaria flare-ups."
    },
    "110": {
        "name": "Sunset Yellow FCF (Yellow 6)",
        "category": "Synthetic Azo Dye / Colour",
        "risk": "high",
        "concern": "Synthetic dye linked to allergic reactions, hyperactivity, and banned in parts of the EU."
    },
    "122": {
        "name": "Azorubine (Carmoisine)",
        "category": "Synthetic Red Azo Dye",
        "risk": "high",
        "concern": "Synthetic dye associated with intolerances, hyperactivity, and restricted in several jurisdictions."
    },
    "124": {
        "name": "Ponceau 4R (Cochineal Red A)",
        "category": "Synthetic Azo Dye / Colour",
        "risk": "high",
        "concern": "Synthetic red colorant linked to histamine release and hyperactivity."
    },
    "129": {
        "name": "Allura Red AC (Red 40)",
        "category": "Synthetic Azo Dye / Colour",
        "risk": "high",
        "concern": "Azo dye linked to neurobehavioral concerns in children and gut barrier disruption."
    },
    "133": {
        "name": "Brilliant Blue FCF (Blue 1)",
        "category": "Synthetic Triarylmethane Dye",
        "risk": "high",
        "concern": "Synthetic petrochemical dye with hypersensitivity alerts."
    },
    "150d": {
        "name": "Caramel IV (Sulphite Ammonia Caramel)",
        "category": "Caramel Colouring",
        "risk": "high",
        "concern": "Manufactured using ammonia; can contain 4-MEI (4-methylimidazole), an IARC Group 2B possible carcinogen."
    },
    "211": {
        "name": "Sodium Benzoate",
        "category": "Chemical Preservative",
        "risk": "high",
        "concern": "Forms carcinogenic Benzene when combined with Vitamin C (Ascorbic Acid) or citric acid in beverages."
    },
    "220": {
        "name": "Sulphur Dioxide",
        "category": "Chemical Preservative / Bleach",
        "risk": "high",
        "concern": "Potent respiratory allergen; can induce severe bronchospasms in asthmatics."
    },
    "223": {
        "name": "Sodium Metabisulphite",
        "category": "Preservative / Dough Conditioner",
        "risk": "high",
        "concern": "Destroys Vitamin B1 (Thiamine); triggers allergic and asthmatic attacks."
    },
    "224": {
        "name": "Potassium Metabisulphite",
        "category": "Chemical Preservative",
        "risk": "high",
        "concern": "Severe allergen for sensitive individuals and destroys thiamine."
    },
    "249": {
        "name": "Potassium Nitrite",
        "category": "Curing Agent / Preservative",
        "risk": "high",
        "concern": "Reacts with dietary amines in stomach to form carcinogenic nitrosamines."
    },
    "250": {
        "name": "Sodium Nitrite",
        "category": "Curing Agent / Preservative",
        "risk": "high",
        "concern": "Processed meat preservative strongly linked to elevated colorectal cancer risks."
    },
    "320": {
        "name": "BHA (Butylated Hydroxyanisole)",
        "category": "Synthetic Antioxidant",
        "risk": "high",
        "concern": "Anticipated human carcinogen (NTP) and endocrine disruptor."
    },
    "321": {
        "name": "BHT (Butylated Hydroxytoluene)",
        "category": "Synthetic Antioxidant",
        "risk": "high",
        "concern": "Synthetic preservative linked to organ toxicity and thyroid enlargement in animal studies."
    },
    "621": {
        "name": "Monosodium Glutamate (MSG)",
        "category": "Flavor Enhancer",
        "risk": "high",
        "concern": "Excitotoxic flavor booster that triggers flushing, headaches, and numbness in sensitive consumers."
    },
    "627": {
        "name": "Disodium Guanylate",
        "category": "Flavor Enhancer",
        "risk": "high",
        "concern": "Purine additive metabolized into uric acid; caution advised for gout sufferers."
    },
    "631": {
        "name": "Disodium Inosinate",
        "category": "Flavor Enhancer",
        "risk": "high",
        "concern": "Synergistic purine flavor enhancer; must be avoided by people with hyperuricemia."
    },
    "950": {
        "name": "Acesulfame Potassium (Ace-K)",
        "category": "Artificial Sweetener",
        "risk": "high",
        "concern": "Synthetic intense sweetener containing methylene chloride; disrupts gut microbiome."
    },
    "951": {
        "name": "Aspartame",
        "category": "Artificial Sweetener",
        "risk": "high",
        "concern": "Classified as possibly carcinogenic to humans (IARC Group 2B); contains phenylalanine."
    },
    "955": {
        "name": "Sucralose",
        "category": "Artificial Sweetener",
        "risk": "high",
        "concern": "Chlorinated sucrose derivative that alters gut microbiota and produces chloropropanols when baked."
    },

    # Moderate Concern / Additives to Consume in Moderation
    "150a": {
        "name": "Caramel I (Plain Caramel)",
        "category": "Colouring Agent",
        "risk": "moderate",
        "concern": "Heated sugar coloring; safe in moderation but marks ultra-processed formulation."
    },
    "150c": {
        "name": "Caramel III (Ammonia Caramel)",
        "category": "Colouring Agent",
        "risk": "moderate",
        "concern": "Processed with ammonium compounds; contains trace imidazoles."
    },
    "200": {
        "name": "Sorbic Acid",
        "category": "Preservative",
        "risk": "moderate",
        "concern": "Antifungal preservative; safe for most but can cause contact dermatitis."
    },
    "202": {
        "name": "Potassium Sorbate",
        "category": "Preservative",
        "risk": "moderate",
        "concern": "Widely used antifungal preservative; generally tolerated, potential mild skin/mucous irritation."
    },
    "282": {
        "name": "Calcium Propionate",
        "category": "Antimicrobial / Mold Inhibitor",
        "risk": "moderate",
        "concern": "Bakery preservative linked to irritability and sleep disturbances in sensitive children."
    },
    "296": {
        "name": "Malic Acid",
        "category": "Acidity Regulator",
        "risk": "moderate",
        "concern": "Synthetic or natural souring agent; high concentrations can irritate dental enamel."
    },
    "339": {
        "name": "Sodium Phosphates",
        "category": "Emulsifier / Stabilizer",
        "risk": "moderate",
        "concern": "Inorganic phosphate additive; excessive dietary phosphates accelerate arterial calcification."
    },
    "407": {
        "name": "Carrageenan",
        "category": "Gelling Agent / Thickener",
        "risk": "moderate",
        "concern": "Seaweed extract linked to gut inflammation, irritable bowel flare-ups, and mucosal erosion."
    },
    "412": {
        "name": "Guar Gum",
        "category": "Stabilizer / Thickener",
        "risk": "moderate",
        "concern": "Vegetable gum; safe in standard amounts, excessive intake causes gastrointestinal gas."
    },
    "415": {
        "name": "Xanthan Gum",
        "category": "Stabilizer / Thickener",
        "risk": "moderate",
        "concern": "Bacterial fermentation gum; acceptable in low doses, can act as a laxative in high amounts."
    },
    "450": {
        "name": "Diphosphates / Pyrophosphates",
        "category": "Emulsifier / Leavening Agent",
        "risk": "moderate",
        "concern": "High bioavailable inorganic phosphorus; may strain kidney filtration over time."
    },
    "451": {
        "name": "Triphosphates",
        "category": "Mineral Salt / Stabilizer",
        "risk": "moderate",
        "concern": "Inorganic phosphate additive; high intake linked to cardiovascular risk."
    },
    "452": {
        "name": "Polyphosphates",
        "category": "Stabilizer / Water Retainer",
        "risk": "moderate",
        "concern": "Synthetic phosphate stabilizer; excessive intake impacts calcium balance."
    },
    "471": {
        "name": "Mono- and Diglycerides of Fatty Acids",
        "category": "Emulsifier",
        "risk": "moderate",
        "concern": "Industrial emulsifier; may carry small amounts of trans fatty acids and alter gut barrier."
    },
    "472e": {
        "name": "DATEM (Diacetyl Tartaric Acid Esters of Mono- and Diglycerides)",
        "category": "Emulsifier / Dough Improver",
        "risk": "moderate",
        "concern": "Industrial emulsifier used to increase loaf volume in commercial baking."
    },
    "476": {
        "name": "Polyglycerol Polyricinoleate (PGPR)",
        "category": "Emulsifier / Viscosity Reducer",
        "risk": "moderate",
        "concern": "Synthetic emulsifier used as a cheap substitute for natural cocoa butter in chocolates."
    },
    "481": {
        "name": "Sodium Stearoyl Lactylate",
        "category": "Emulsifier / Dough Conditioner",
        "risk": "moderate",
        "concern": "Synthetic chemical emulsifier; generally recognized as safe but marks ultra-processing."
    },
    "500": {
        "name": "Sodium Carbonates (Baking Soda)",
        "category": "Acidity Regulator / Raising Agent",
        "risk": "low_caution",
        "concern": "Standard mineral raising agent (INS 500(ii) Sodium Bicarbonate); elevates sodium content."
    },
    "503": {
        "name": "Ammonium Carbonates (Baker's Ammonia)",
        "category": "Raising Agent",
        "risk": "low_caution",
        "concern": "Mineral leavening agent for crisp cookies (INS 503(ii)); releases ammonia gas during baking."
    },

    # Clean / Safe / Beneficial Additives
    "100": {
        "name": "Curcumin (Turmeric Extract)",
        "category": "Natural Botanical Colour",
        "risk": "clean",
        "concern": "Natural plant-derived polyphenol with well-documented antioxidant properties."
    },
    "160a": {
        "name": "Beta-Carotene",
        "category": "Natural Colour / Provitamin A",
        "risk": "clean",
        "concern": "Natural plant carotenoid converted by the body into essential Vitamin A."
    },
    "162": {
        "name": "Beetroot Red (Betanin)",
        "category": "Natural Plant Colour",
        "risk": "clean",
        "concern": "Completely natural pigment extracted from fresh beetroot."
    },
    "300": {
        "name": "Ascorbic Acid (Vitamin C)",
        "category": "Natural Antioxidant / Vitamin",
        "risk": "clean",
        "concern": "Essential nutrient and wholesome antioxidant protecting food freshness."
    },
    "306": {
        "name": "Tocopherols (Natural Vitamin E)",
        "category": "Natural Antioxidant",
        "risk": "clean",
        "concern": "Essential lipid-soluble antioxidant nutrient extracted from plant oils."
    },
    "322": {
        "name": "Lecithin (Soy / Sunflower)",
        "category": "Natural Emulsifier",
        "risk": "clean",
        "concern": "Naturally occurring plant phospholipid vital for cell membrane health."
    },
    "330": {
        "name": "Citric Acid",
        "category": "Natural Acidity Regulator",
        "risk": "clean",
        "concern": "Natural fruit acid found in lemons/oranges; safe and organic metabolic intermediate."
    },
    "440": {
        "name": "Pectin",
        "category": "Natural Gelling Agent",
        "risk": "clean",
        "concern": "Soluble dietary fiber naturally found in apple and citrus peel."
    }
}

# ---------------------------------------------------------------------------
# Ultra-Processed Food (UPF) Markers & Keywords
# ---------------------------------------------------------------------------
UPF_MARKERS = [
    {
        "pattern": r"\b(?:refined\s+)?palm\s+(?:oil|olein|stearin|fat)\b",
        "name": "Refined Palm Oil / Olein",
        "reason": "Highly saturated processed oil associated with elevated LDL cholesterol and cardiovascular risk."
    },
    {
        "pattern": r"\b(?:hydrogenated|partially\s+hydrogenated)\s+(?:vegetable\s+)?(?:oil|fat|vanaspati)\b",
        "name": "Hydrogenated Vegetable Fat (Trans Fats)",
        "reason": "Major source of artificial trans-fatty acids; severely elevates coronary heart disease risk."
    },
    {
        "pattern": r"\binvert\s+(?:sugar\s+)?syrup\b",
        "name": "Invert Sugar Syrup",
        "reason": "Ultra-processed hydrolyzed sugar providing rapid glycemic spikes without micronutrients."
    },
    {
        "pattern": r"\b(?:high\s+fructose\s+corn\s+syrup|hfcs|liquid\s+glucose|corn\s+syrup)\b",
        "name": "Liquid Glucose / HFCS",
        "reason": "Industrial high-glycemic sweetener heavily linked to fatty liver and insulin resistance."
    },
    {
        "pattern": r"\bmaltodextrin\b",
        "name": "Maltodextrin",
        "reason": "Hyper-processed starch with glycemic index higher than table sugar (GI 110–135)."
    },
    {
        "pattern": r"\bartificial\s+flavour(?:ing)?\s*(?:substances?)?\b",
        "name": "Artificial Flavouring Substances",
        "reason": "Synthetic aroma chemicals engineered to create hyper-palatability."
    },
    {
        "pattern": r"\bnature\s+identical\s+flavour(?:ing)?\s*(?:substances?)?\b",
        "name": "Nature Identical Flavouring",
        "reason": "Chemically synthesized flavor molecules that simulate real food flavors."
    },
    {
        "pattern": r"\bpolydextrose\b",
        "name": "Polydextrose / Synthetic Bulking Agent",
        "reason": "Synthetic low-calorie polymer used as an industrial texture substitute."
    }
]

# ---------------------------------------------------------------------------
# Common Food Allergens Knowledge Base
# ---------------------------------------------------------------------------
ALLERGEN_PATTERNS = [
    {
        "pattern": r"\b(?:wheat|maida|atta|gluten|semolina|suji|barley|rye|spelt)\b",
        "fuzzy_keywords": ["wheat", "maida", "atta", "gluten", "semolina", "suji", "barley", "spelt"],
        "name": "Gluten (Wheat)",
        "icon": "🌾"
    },
    {
        "pattern": r"\b(?:milk|dairy|milk\s+solids?|whey|casein|caseinate|lactose|butter|ghee|cheese|cream|curd|paneer)\b",
        "fuzzy_keywords": ["milk", "dairy", "whey", "casein", "caseinate", "lactose", "butter", "cheese", "cream", "paneer"],
        "name": "Milk / Dairy Solids",
        "icon": "🥛"
    },
    {
        "pattern": r"\b(?:soy|soya|soybean|soy\s+lecithin)\b",
        "fuzzy_keywords": ["soya", "soybean", "lecithin", "soylecithin"],
        "name": "Soy / Soybean",
        "icon": "🌱"
    },
    {
        "pattern": r"\b(?:peanut|peanuts|groundnut|groundnuts)\b",
        "fuzzy_keywords": ["peanut", "peanuts", "groundnut", "groundnuts"],
        "name": "Peanuts / Groundnuts",
        "icon": "🥜"
    },
    {
        "pattern": r"\b(?:almond|cashew|walnut|pistachio|hazelnut|tree\s+nuts?|badam|kaju)\b",
        "fuzzy_keywords": ["almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "pistachio", "hazelnut", "badam", "kaju"],
        "name": "Tree Nuts",
        "icon": "🌰"
    },
    {
        "pattern": r"\b(?:egg|eggs|albumin|egg\s+white|egg\s+yolk)\b",
        "fuzzy_keywords": ["albumin", "albumen", "eggwhite", "eggyolk"],
        "name": "Egg / Albumen",
        "icon": "🥚"
    },
    {
        "pattern": r"\b(?:fish|crustacean|prawn|shrimp|crab|shellfish)\b",
        "fuzzy_keywords": ["crustacean", "shellfish", "prawn", "shrimp"],
        "name": "Fish / Shellfish",
        "icon": "🐟"
    },
    {
        "pattern": r"\b(?:sulphite|sulfite|sulphur\s+dioxide|metabisulphite)\b",
        "fuzzy_keywords": ["sulphite", "sulfite", "metabisulphite"],
        "name": "Sulphites (>10ppm)",
        "icon": "⚠️"
    },
    {
        "pattern": r"\b(?:sesame|til)\b",
        "fuzzy_keywords": ["sesame"],
        "name": "Sesame Seeds",
        "icon": "✨"
    },
    {
        "pattern": r"\b(?:mustard|sarson)\b",
        "fuzzy_keywords": ["mustard", "sarson"],
        "name": "Mustard",
        "icon": "🌿"
    }
]

# ---------------------------------------------------------------------------
# Clean Whole Ingredients (Bonus Points)
# ---------------------------------------------------------------------------
CLEAN_PATTERNS = [
    r"\bwhole\s+(?:wheat|grain|oats)\b",
    r"\boats?\b",
    r"\bragi|millet|jowar|bajra\b",
    r"\breal\s+fruit|fruit\s+(?:pulp|puree|juice)\b",
    r"\bcocoa\s+(?:mass|solids|butter)\b",
    r"\bhoney\b",
    r"\bspices?|herbs?|cinnamon|cardamom|ginger\b",
    r"\bjaggery|gur\b",
    r"\biodised\s+salt|rock\s+salt\b"
]


def extract_ingredients_text(ocr_boxes: List[Dict[str, Any]]) -> Optional[str]:
    """
    Locates the ingredients section across OCR lines and extracts the full text block.
    Handles labels spanning across multiple boxes.
    """
    if not ocr_boxes:
        return None

    # Sort boxes spatially in natural top-to-bottom reading order with row grouping
    sorted_boxes = sorted(
        ocr_boxes,
        key=lambda b: (
            round((b.get("box", [0, 0, 0, 0])[1]) / 25.0) * 25.0,
            b.get("box", [0, 0, 0, 0])[0]
        )
    )

    # Step 1: Find lines with ingredients trigger keywords
    ingredient_header_pattern = re.compile(
        r"\b(?:ingredients?|key\s+ingredients?|active\s+ingredients?|contains|सामग्री|घटक)\b",
        re.IGNORECASE
    )

    stop_header_pattern = re.compile(
        r"\b(?:nutritional\s+(?:information|info|values?)|nutrition\s+(?:facts?|information|info)|"
        r"mfg\s+by|mfd\s+by|manufactured\s+by|packed\s+by|batch\s+no|b\.?\s*no|mrp\b|best\s+before|use\s+by|"
        r"consumer\s+care|customer\s+care|toll\s+free|fssai\b|storage\s+instructions?|marketed\s+by|"
        r"regd\s+office|feedback)\b",
        re.IGNORECASE
    )

    start_idx = -1
    for idx, box in enumerate(sorted_boxes):
        text = box.get("text", "").strip()
        if ingredient_header_pattern.search(text):
            start_idx = idx
            break

    # If no explicit header found, look for lines containing explicit additive / INS codes
    if start_idx == -1:
        for idx, box in enumerate(sorted_boxes):
            text = box.get("text", "")
            if re.search(r"\bINS\s*\d{3,4}\b|\bE\s*\d{3,4}\b|Leavening\s+Agent|Emulsifier\b|Acidity\s+Regulator", text, re.IGNORECASE):
                start_idx = idx
                break

    if start_idx == -1:
        return None

    # Step 2: Accumulate text from start_idx forward until stop keyword or max 10 lines
    collected_lines = []
    max_lines = 10

    for i in range(start_idx, min(len(sorted_boxes), start_idx + max_lines)):
        line_text = sorted_boxes[i].get("text", "").strip()
        if not line_text:
            continue

        # Check if a non-ingredient block starts after the first line
        if i > start_idx and stop_header_pattern.search(line_text):
            if re.search(r"\ballergen\b", line_text, re.IGNORECASE):
                collected_lines.append(line_text)
            break

        collected_lines.append(line_text)

    if not collected_lines:
        return None

    full_text = " ".join(collected_lines)

    # Clean up prefix like "INGREDIENTS:" or "Ingredients :"
    full_text_cleaned = re.sub(
        r"^(?:ingredients?|key\s+ingredients?|active\s+ingredients?|सामग्री|घटक)\s*[:\-]?\s*",
        "",
        full_text,
        flags=re.IGNORECASE
    ).strip()

    return full_text_cleaned if full_text_cleaned else full_text


def _levenshtein(s1: str, s2: str) -> int:
    """Computes minimum single-character edit distance (insertions, deletions, substitutions)."""
    try:
        from rapidfuzz.distance import Levenshtein as _rf_lev
        return int(_rf_lev.distance(s1, s2))
    except Exception:
        pass

    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row
    return prev_row[-1]


def is_fuzzy_match(word: str, target: str, min_ratio: float = 0.80) -> bool:
    """
    Fuzzy Levenshtein matching for OCR character glitches on foil/curved packaging
    (e.g., 'whcat' -> 'wheat', 'soya lccithin' -> 'soya lecithin', 'pcanuts' -> 'peanuts').
    """
    w, t = word.lower(), target.lower()
    if w == t:
        return True
    len_diff = abs(len(w) - len(t))
    if len_diff > 2:
        return False
    max_len = max(len(w), len(t))
    if max_len < 4:
        return False
    dist = _levenshtein(w, t)
    sim = 1.0 - (float(dist) / float(max_len))
    # For short words (4-5 chars, e.g. wheat), allow max 1 edit
    if max_len <= 5:
        return dist <= 1 and sim >= min_ratio
    # For words 6+ chars (e.g. peanuts, lecithin, cashew), allow max 2 edits
    return dist <= 2 and sim >= min_ratio


def parse_and_score_ingredients(ingredients_text: Optional[str]) -> Dict[str, Any]:
    """
    Analyzes raw ingredients text, extracts additives, detects allergens and UPF markers,
    and computes the Clean Label Health & Safety Score (0-100).
    """
    if not ingredients_text or len(ingredients_text.strip()) < 4:
        return {
            "found": False,
            "raw_text": None,
            "score": None,
            "grade": None,
            "rating_title": "Ingredients Panel Not Detected",
            "rating_summary": "Ingredients declaration was not clearly identified in this photo. Scan the back-of-pack ingredients table for an instant health & safety audit.",
            "additives": [],
            "allergens": [],
            "upf_markers": [],
            "clean_ingredients": [],
            "summary_counts": {
                "high_concern": 0,
                "moderate_concern": 0,
                "clean": 0,
                "allergens": 0,
                "upf_count": 0,
                "total_ingredients": 0
            }
        }

    text_to_analyze = ingredients_text

    # 1. Detect INS / E Numbers
    detected_additives = []
    seen_additive_codes = set()

    # Pattern A: Explicit INS / E prefixes
    ins_matches = re.finditer(r"\b(?:INS|E)\s*[-:]?\s*(\d{3,4}(?:\([a-z0-9]+\)|[a-z])?)", text_to_analyze, re.IGNORECASE)
    for m in ins_matches:
        full_code = m.group(1).lower()
        base_code_match = re.match(r"^\d{3,4}", full_code)
        base_code = base_code_match.group(0) if base_code_match else full_code

        matched_info = ADDITIVE_DATABASE.get(full_code) or ADDITIVE_DATABASE.get(base_code)
        canonical_code = f"INS {full_code.upper()}"

        if canonical_code not in seen_additive_codes:
            seen_additive_codes.add(canonical_code)
            if matched_info:
                detected_additives.append({
                    "code": canonical_code,
                    "name": matched_info["name"],
                    "category": matched_info["category"],
                    "risk": matched_info["risk"],
                    "concern": matched_info["concern"]
                })
            else:
                detected_additives.append({
                    "code": canonical_code,
                    "name": f"Food Additive {canonical_code}",
                    "category": "Technological Additive",
                    "risk": "moderate",
                    "concern": "Statutory food additive declared on package."
                })

    # Pattern B: Bare numbers inside typical brackets
    bracket_matches = re.findall(r"(?:raising\s+agents?|leavening\s+agents?|emulsifiers?|acidity\s+regulators?|preservatives?|colours?|antioxidants?)\s*[\[\(]([^\)\]]+)[\]\)]", text_to_analyze, re.IGNORECASE)
    for group in bracket_matches:
        sub_codes = re.findall(r"\b(\d{3,4}(?:\([a-z0-9]+\)|[a-z])?)\b", group)
        for sc in sub_codes:
            full_code = sc.lower()
            base_code_match = re.match(r"^\d{3,4}", full_code)
            base_code = base_code_match.group(0) if base_code_match else full_code
            canonical_code = f"INS {full_code.upper()}"
            if canonical_code not in seen_additive_codes:
                seen_additive_codes.add(canonical_code)
                matched_info = ADDITIVE_DATABASE.get(full_code) or ADDITIVE_DATABASE.get(base_code)
                if matched_info:
                    detected_additives.append({
                        "code": canonical_code,
                        "name": matched_info["name"],
                        "category": matched_info["category"],
                        "risk": matched_info["risk"],
                        "concern": matched_info["concern"]
                    })
                else:
                    detected_additives.append({
                        "code": canonical_code,
                        "name": f"Food Additive {canonical_code}",
                        "category": "Technological Additive",
                        "risk": "moderate",
                        "concern": "Statutory food additive declared on package."
                    })

    # 2. Detect Ultra-Processed Food (UPF) Markers
    detected_upf = []
    seen_upf_names = set()
    for item in UPF_MARKERS:
        if re.search(item["pattern"], text_to_analyze, re.IGNORECASE):
            if item["name"] not in seen_upf_names:
                seen_upf_names.add(item["name"])
                detected_upf.append({
                    "name": item["name"],
                    "reason": item["reason"]
                })

    # 3. Detect Allergens (Exact Regex + Fuzzy OCR Glitch Tolerance)
    detected_allergens = []
    seen_allergens = set()

    # Extract word tokens from ingredient text for fuzzy matching
    clean_tokens = [w.lower() for w in re.findall(r"\b[A-Za-z0-9]{4,}\b", text_to_analyze)]

    for item in ALLERGEN_PATTERNS:
        matched = False
        matched_term = None

        # Pass 1: Direct fast regex match
        m_exact = re.search(item["pattern"], text_to_analyze, re.IGNORECASE)
        if m_exact:
            matched = True
            matched_term = m_exact.group(0)

        # Pass 2: Fuzzy Levenshtein match for wrinkled/curved foil packaging OCR glitches
        if not matched:
            fuzzy_kws = item.get("fuzzy_keywords", [])
            for token in clean_tokens:
                for target_kw in fuzzy_kws:
                    if is_fuzzy_match(token, target_kw, min_ratio=0.80):
                        matched = True
                        matched_term = f"{token} (~{target_kw})"
                        break
                if matched:
                    break

        if matched and item["name"] not in seen_allergens:
            seen_allergens.add(item["name"])
            entry = {
                "name": item["name"],
                "icon": item["icon"]
            }
            if matched_term:
                entry["detected_as"] = matched_term
            detected_allergens.append(entry)

    # 4. Detect Clean / Wholesome Ingredients
    detected_clean = []
    seen_clean = set()
    for pat in CLEAN_PATTERNS:
        match = re.search(pat, text_to_analyze, re.IGNORECASE)
        if match:
            clean_name = match.group(0).capitalize()
            if clean_name not in seen_clean:
                seen_clean.add(clean_name)
                detected_clean.append(clean_name)

    # 5. Rough total ingredients count (split by commas and semicolons)
    split_items = [i.strip() for i in re.split(r"[,;]+", text_to_analyze) if len(i.strip()) > 1]
    total_ingredients_count = max(len(split_items), 1)

    # 6. Calculate Clean Label Health & Safety Score (0–100)
    score = 100

    high_risk_count = sum(1 for a in detected_additives if a["risk"] == "high")
    moderate_risk_count = sum(1 for a in detected_additives if a["risk"] in ("moderate", "low_caution"))
    clean_additives_count = sum(1 for a in detected_additives if a["risk"] == "clean")
    upf_count = len(detected_upf)

    # Deductions
    score -= (high_risk_count * 18)
    score -= (moderate_risk_count * 5)
    score -= (upf_count * 8)

    # Excess additive load penalty
    if len(detected_additives) >= 4:
        score -= 6
    if upf_count >= 3:
        score -= 6

    # Bonuses for wholesome components
    bonus = (len(detected_clean) * 3) + (clean_additives_count * 2)
    score = min(100, score + bonus)

    # Clamp score to reasonable range 12 - 100
    score = max(12, min(100, score))

    # Grade and classification
    if score >= 85:
        grade = "A"
        rating_title = "Clean Label · Wholesome"
        rating_summary = "Excellent nutritional profile with natural ingredients and virtually no harmful chemical additives."
    elif score >= 70:
        grade = "B"
        rating_title = "Good · Minimally Processed"
        rating_summary = "Good formulation with standard safe ingredients and minimal technological additives."
    elif score >= 50:
        grade = "C"
        rating_title = "Moderate · Processed"
        rating_summary = "Contains standard industrial emulsifiers, leaveners, or sweeteners. Safe to consume in moderation."
    elif score >= 35:
        grade = "D"
        rating_title = "Ultra-Processed Food (UPF)"
        rating_summary = "High additive burden detected. Contains refined fats, artificial aromas, or synthetic chemical markers."
    else:
        grade = "E"
        rating_title = "High Concern · Chemical Additives"
        rating_summary = "Multiple high-concern additives, synthetic dyes, preservatives, or high-risk industrial markers found."

    return {
        "found": True,
        "raw_text": text_to_analyze,
        "score": score,
        "grade": grade,
        "rating_title": rating_title,
        "rating_summary": rating_summary,
        "additives": detected_additives,
        "allergens": detected_allergens,
        "upf_markers": detected_upf,
        "clean_ingredients": detected_clean,
        "summary_counts": {
            "high_concern": high_risk_count,
            "moderate_concern": moderate_risk_count,
            "clean": len(detected_clean) + clean_additives_count,
            "allergens": len(detected_allergens),
            "upf_count": upf_count,
            "total_ingredients": total_ingredients_count
        }
    }
