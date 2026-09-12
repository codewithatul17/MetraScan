/**
 * MetraScan - Core Application Engine & Mock Data Store
 * Government-grade Product Verification Platform
 */

(function(window) {
  'use strict';

  // Application namespace
  window.MetraScan = window.MetraScan || {};

  // Mock Products Database with Full Legal Metrology Declarations
  const DEFAULT_PRODUCTS = [
    {
      id: 'prod-001',
      barcode: '8901234567890',
      qrId: 'QR-IN-2026-9812',
      name: 'NatureFresh Cold Pressed Groundnut Oil',
      brand: 'NatureFresh Pure',
      category: 'Edible Oils & Fats',
      image: 'assets/images/product-oil.svg',
      manufacturer: 'PureFoods Agro Industries Ltd.',
      mfgAddress: 'Survey No. 42/B, Industrial Area, Phase-II, Gandhinagar, Gujarat - 382010',
      consumerCare: 'support@purefoodsagro.in | 1800-209-4455',
      mrp: '₹245.00 (Incl. of all taxes)',
      mrpValue: 245,
      netQuantity: '1 Litre (910 g)',
      unitSalePrice: '₹24.50 per 100 ml',
      batchNo: 'NF-GO-2026-0819',
      mfgDate: '15 Jan 2026',
      expDate: '14 Jan 2027',
      bestBefore: '12 Months from Manufacturing',
      status: 'verified', // verified, review, violation
      statusLabel: 'VERIFIED COMPLIANT',
      score: 98,
      verifiedDate: '4 Sep 2026, 09:15 AM',
      licenceNo: 'FSSAI Lic. 10019021004123 | LMD Reg: GJ/LMD/2024/7718',
      declarations: {
        productName: { status: 'pass', label: 'Common / Generic Name', value: 'Cold Pressed Groundnut Oil' },
        fssaiLicence: { status: 'pass', label: 'FSSAI Logo & Licence Number', value: 'FSSAI Lic. 10019021004123 (Verified Active)' },
        batchAndMfg: { status: 'pass', label: 'Batch/Lot No. & Mfg Date', value: 'Batch: NF-GO-2026-0819 · Mfg: 15 Jan 2026' },
        bestBefore: { status: 'pass', label: 'Best Before / Expiry Date', value: 'Best Before 12 Months (Exp: 14 Jan 2027)' },
        mfgDetails: { status: 'pass', label: 'Manufacturer & Packer Address', value: 'Complete & Verified' },
        netQuantity: { status: 'pass', label: 'Net Quantity in Standard Units', value: '1 Litre (Compliant with Rule 12)' },
        mrpDeclaration: { status: 'pass', label: 'MRP & Unit Sale Price', value: '₹245.00 & ₹24.50/100ml' },
        dateDeclaration: { status: 'pass', label: 'Month & Year of Mfg/Pack', value: '01/2026 (Clearly visible)' },
        consumerCare: { status: 'pass', label: 'Consumer Helpline Details', value: 'Toll-free & Valid Email Provided' }
      },
      registryStatus: {
        legalMetrology: 'Active & Approved (Dept of Consumer Affairs)',
        nationalRegistry: 'Matches Central Packaged Commodity Database',
        qrIntegrity: 'Cryptographically Verified Official MetraSeal'
      }
    },
    {
      id: 'prod-002',
      barcode: '8907654321098',
      qrId: 'QR-IN-2026-7734',
      name: 'Organic Whole Wheat Sharbati Atta',
      brand: 'Kisan Organics',
      category: 'Food Grains & Flours',
      image: 'assets/images/product-flour.svg',
      manufacturer: 'Kisan Agro Foods Producer Co. Ltd.',
      mfgAddress: 'Village Mandi, Dist. Sehore, Madhya Pradesh - 466001',
      consumerCare: 'care@kisanorganics.org | 1800-180-2211',
      mrp: '₹380.00 (Incl. of all taxes)',
      mrpValue: 380,
      netQuantity: '5 kg Net Weight',
      unitSalePrice: '₹76.00 per kg',
      batchNo: 'KA-ATT-2026-041',
      mfgDate: '10 Feb 2026',
      expDate: '09 Aug 2026',
      bestBefore: '6 Months from Packaging',
      status: 'verified',
      statusLabel: 'VERIFIED COMPLIANT',
      score: 96,
      verifiedDate: '3 Sep 2026, 04:30 PM',
      licenceNo: 'FSSAI Lic. 10018026001190 | LMD Reg: MP/LMD/2025/1102',
      declarations: {
        productName: { status: 'pass', label: 'Common / Generic Name', value: 'Sharbati Whole Wheat Flour' },
        fssaiLicence: { status: 'pass', label: 'FSSAI Logo & Licence Number', value: 'FSSAI Lic. 10018026001190 (Verified Active)' },
        batchAndMfg: { status: 'pass', label: 'Batch/Lot No. & Mfg Date', value: 'Batch: KA-ATT-2026-041 · Mfg: 10 Feb 2026' },
        bestBefore: { status: 'pass', label: 'Best Before / Expiry Date', value: 'Best Before 6 Months (Exp: 09 Aug 2026)' },
        mfgDetails: { status: 'pass', label: 'Manufacturer & Packer Address', value: 'Complete Farm & Mill Address' },
        netQuantity: { status: 'pass', label: 'Net Quantity in Standard Units', value: '5 kg (Rule 5 standard packaging)' },
        mrpDeclaration: { status: 'pass', label: 'MRP & Unit Sale Price', value: '₹380.00 & ₹76.00/kg' },
        dateDeclaration: { status: 'pass', label: 'Month & Year of Mfg/Pack', value: '02/2026' },
        consumerCare: { status: 'pass', label: 'Consumer Helpline Details', value: 'Active Helpline & Email' }
      },
      registryStatus: {
        legalMetrology: 'Active & Verified',
        nationalRegistry: 'Matches Central Packaged Commodity Database',
        qrIntegrity: 'Verified MetraSeal'
      }
    },
    {
      id: 'prod-003',
      barcode: '8905551234567',
      qrId: 'QR-IN-2026-3391',
      name: 'VitalBoost Taurine & Caffeine Energy Drink',
      brand: 'VitalBoost Beverages',
      category: 'Caffeinated Beverages',
      image: 'assets/images/product-drink.svg',
      manufacturer: 'Apex Bottling & Beverage Corp',
      mfgAddress: 'Plot 108, Special Economic Zone, Sriperumbudur, Tamil Nadu - 602105',
      consumerCare: 'help@vitalboost.in (Phone line busy)',
      mrp: '₹120.00 (Incl. of all taxes)',
      mrpValue: 120,
      netQuantity: '250 ml',
      unitSalePrice: '₹48.00 per 100 ml (Font size below standard)',
      batchNo: 'VB-CAN-2026-90',
      mfgDate: '20 Dec 2025',
      expDate: '19 Dec 2026',
      bestBefore: '12 Months',
      status: 'review',
      statusLabel: 'NEEDS REVIEW / ADVISORY',
      score: 72,
      verifiedDate: '2 Sep 2026, 11:20 AM',
      licenceNo: 'FSSAI Lic. 10020042008899 | LMD Reg: TN/LMD/2023/5501',
      declarations: {
        productName: { status: 'pass', label: 'Common / Generic Name', value: 'Caffeinated Beverage' },
        fssaiLicence: { status: 'pass', label: 'FSSAI Logo & Licence Number', value: 'FSSAI Lic. 10020042008899' },
        batchAndMfg: { status: 'pass', label: 'Batch/Lot No. & Mfg Date', value: 'Batch: VB-CAN-2026-90 · Mfg: 20 Dec 2025' },
        bestBefore: { status: 'pass', label: 'Best Before / Expiry Date', value: 'Best Before 12 Months (Exp: 19 Dec 2026)' },
        mfgDetails: { status: 'pass', label: 'Manufacturer & Packer Address', value: 'Present' },
        netQuantity: { status: 'pass', label: 'Net Quantity', value: '250 ml' },
        mrpDeclaration: { status: 'review', label: 'Unit Sale Price Typography', value: 'Font size below 1mm minimum height' },
        dateDeclaration: { status: 'pass', label: 'Date of Manufacture', value: '12/2025' },
        consumerCare: { status: 'review', label: 'Consumer Care Verification', value: 'Toll-free number intermittent' }
      },
      registryStatus: {
        legalMetrology: 'Under Periodic Review',
        nationalRegistry: 'Advisory notice issued for typography compliance',
        qrIntegrity: 'Valid QR structure'
      }
    },
    {
      id: 'prod-004',
      barcode: '8909998887776',
      qrId: 'QR-IN-2026-0042',
      name: 'CrunchyBite Choco Cream Cookies',
      brand: 'Delight Snacks Co.',
      category: 'Bakery & Confectionery',
      image: 'assets/images/product-biscuit.svg',
      manufacturer: 'Delight Confectioneries Unregistered Unit',
      mfgAddress: 'Gala 4, Unnamed Industrial Estate, Bhiwandi, Maharashtra',
      consumerCare: 'Not Provided / Missing on Pack',
      mrp: 'Over-stickered: ₹60.00 (Original ₹40 scratched)',
      mrpValue: 60,
      netQuantity: '75 g (Declared 100 g - Deficit)',
      unitSalePrice: 'Missing',
      batchNo: 'CB-X2026-??',
      mfgDate: 'Smudged / Not Legible',
      expDate: 'Expired July 2026',
      bestBefore: 'Unreadable',
      status: 'violation',
      statusLabel: 'CRITICAL VIOLATION FOUND',
      score: 34,
      verifiedDate: '1 Sep 2026, 02:45 PM',
      licenceNo: 'Invalid / Unverified Metrology Registration',
      declarations: {
        productName: { status: 'pass', label: 'Product Name', value: 'Choco Cream Cookies' },
        fssaiLicence: { status: 'violation', label: 'FSSAI Logo & Licence Number', value: 'Invalid / Missing FSSAI Logo' },
        batchAndMfg: { status: 'violation', label: 'Batch/Lot No. & Mfg Date', value: 'Smudged & unreadable batch mark' },
        bestBefore: { status: 'violation', label: 'Best Before / Expiry Date', value: 'Past expiration date (Expired July 2026)' },
        mfgDetails: { status: 'violation', label: 'Manufacturer Address', value: 'Incomplete / No PIN code' },
        netQuantity: { status: 'violation', label: 'Net Weight Accuracy', value: 'Weight deficit exceeds Maximum Permissible Error (MPE)' },
        mrpDeclaration: { status: 'violation', label: 'MRP Overcharging / Smudging', value: 'Illegal sticker pasted over original price' },
        dateDeclaration: { status: 'violation', label: 'Date of Packing / Expiry', value: 'Smudged & past expiration date' },
        consumerCare: { status: 'violation', label: 'Consumer Redressal Info', value: 'Completely missing (Violation of Rule 6(1)(n))' }
      },
      registryStatus: {
        legalMetrology: 'Violation Notice Issued (Sec 36 LM Act)',
        nationalRegistry: 'Batch flagged for immediate market seizure',
        qrIntegrity: 'Counterfeit / Non-registered QR code'
      }
    }
  ];

  // Default Ministry Inspections
  const DEFAULT_INSPECTIONS = [
    {
      id: 'INS-2026-1048',
      reportId: 'RPT-LM-2026-1048',
      productId: 'prod-004',
      productName: 'CrunchyBite Choco Cream Cookies',
      retailer: 'Shree Ganesh Supermarket, Sector 22, Rohini, New Delhi',
      officer: 'Insp. Rajesh Verma (ID: GOV-LM-2026-4481)',
      department: 'Legal Metrology Department, Govt of NCT Delhi',
      date: '03 Sep 2026, 11:30 AM',
      status: 'violation',
      statusLabel: 'Violation Recorded',
      score: 34,
      severity: 'High',
      checklist: {
        labeling: 'violation',
        declarations: 'violation',
        manufacturer: 'violation',
        qrRegistration: 'violation',
        packaging: 'violation',
        measurement: 'violation'
      },
      violationType: 'Dual MRP Stamping & Weight Deficit',
      ruleCitation: 'Legal Metrology Act, 2009 Sec 36(1) & PCR Rule 6 & 18',
      evidenceCount: 3,
      notes: 'Retailer found selling with ₹60 sticker pasted over ₹40 printed MRP. Weight on calibrated digital scale was 74.2g against declared 100g. Seizure memo issued.'
    },
    {
      id: 'INS-2026-1047',
      reportId: 'RPT-LM-2026-1047',
      productId: 'prod-003',
      productName: 'VitalBoost Taurine & Caffeine Energy Drink',
      retailer: 'QuickBite Convenience Store, MG Road, Bengaluru',
      officer: 'Insp. Priya Nair (ID: GOV-LM-2026-8820)',
      department: 'Legal Metrology Department, Karnataka',
      date: '02 Sep 2026, 03:15 PM',
      status: 'review',
      statusLabel: 'Needs Review',
      score: 72,
      severity: 'Medium',
      checklist: {
        labeling: 'pass',
        declarations: 'review',
        manufacturer: 'pass',
        qrRegistration: 'pass',
        packaging: 'pass',
        measurement: 'pass'
      },
      violationType: 'Font Size & Unit Sale Price Readability',
      ruleCitation: 'Legal Metrology (Packaged Commodities) Amendment Rules, Rule 9',
      evidenceCount: 2,
      notes: 'Unit sale price printed in font height of 0.8mm which is below the mandatory 1.0mm minimum. Advisory notice served to manufacturer with 15 days compliance window.'
    },
    {
      id: 'INS-2026-1046',
      reportId: 'RPT-LM-2026-1046',
      productId: 'prod-001',
      productName: 'NatureFresh Cold Pressed Groundnut Oil',
      retailer: 'HyperMart Central, SG Highway, Ahmedabad',
      officer: 'Insp. Rajesh Verma (ID: GOV-LM-2026-4481)',
      department: 'Legal Metrology Department, Gujarat',
      date: '01 Sep 2026, 10:00 AM',
      status: 'verified',
      statusLabel: 'Fully Compliant',
      score: 98,
      severity: 'None',
      checklist: {
        labeling: 'pass',
        declarations: 'pass',
        manufacturer: 'pass',
        qrRegistration: 'pass',
        packaging: 'pass',
        measurement: 'pass'
      },
      violationType: 'None',
      ruleCitation: 'N/A - Fully Compliant',
      evidenceCount: 1,
      notes: 'All 6 mandatory declarations clearly legible. Calibrated volume testing confirmed 1000ml ± 0.5ml. Batch compliant.'
    },
    {
      id: 'INS-2026-1045',
      reportId: 'RPT-LM-2026-1045',
      productId: 'prod-002',
      productName: 'Organic Whole Wheat Sharbati Atta',
      retailer: 'Reliance Smart Point, Malviya Nagar, Jaipur',
      officer: 'Insp. Sunil Chouhan (ID: GOV-LM-2026-3319)',
      department: 'Legal Metrology Department, Rajasthan',
      date: '31 Aug 2026, 02:40 PM',
      status: 'verified',
      statusLabel: 'Fully Compliant',
      score: 96,
      severity: 'None',
      checklist: {
        labeling: 'pass',
        declarations: 'pass',
        manufacturer: 'pass',
        qrRegistration: 'pass',
        packaging: 'pass',
        measurement: 'pass'
      },
      violationType: 'None',
      ruleCitation: 'N/A - Fully Compliant',
      evidenceCount: 1,
      notes: 'Net weight check of 5 sample bags averaged 5020g. Packaging intact and valid FSSAI & LMD registration.'
    }
  ];

  // Default Violations
  const DEFAULT_VIOLATIONS = [
    {
      id: 'VIO-2026-088',
      inspectionId: 'INS-2026-1048',
      productName: 'CrunchyBite Choco Cream Cookies',
      retailer: 'Shree Ganesh Supermarket, Rohini, Delhi',
      violation: 'Dual MRP Stamping & Deficit Net Quantity',
      severity: 'High',
      clause: 'Rule 18(2) & Rule 24 of Legal Metrology (PC) Rules, 2011',
      status: 'Open Case',
      penalty: 'Compounding Notice Issued (₹25,000)',
      date: '03 Sep 2026'
    },
    {
      id: 'VIO-2026-087',
      inspectionId: 'INS-2026-1047',
      productName: 'VitalBoost Taurine & Caffeine Energy Drink',
      retailer: 'QuickBite Convenience Store, Bengaluru',
      violation: 'Illegible Unit Sale Price (Sub-standard Font Size)',
      severity: 'Medium',
      clause: 'Rule 9(3) of Legal Metrology (PC) Rules, 2011',
      status: 'Under Review',
      penalty: 'Notice for Rectification within 15 Days',
      date: '02 Sep 2026'
    },
    {
      id: 'VIO-2026-086',
      inspectionId: 'INS-2026-1039',
      productName: 'Classic Dairy Paneer Fresh',
      retailer: 'Apna Bazar, Bandra West, Mumbai',
      violation: 'Absence of Manufacturing Date & Consumer Helpline',
      severity: 'Critical',
      clause: 'Sec 36(1) Legal Metrology Act, 2009',
      status: 'Open Case',
      penalty: 'Product Seizure Memo #SZR-8890 Executed',
      date: '30 Aug 2026'
    },
    {
      id: 'VIO-2026-085',
      inspectionId: 'INS-2026-1033',
      productName: 'EverClean Detergent Powder 1kg',
      retailer: 'SuperMart, Salt Lake, Kolkata',
      violation: 'Packaging Violation - Non-standard Pack Size',
      severity: 'Low',
      clause: 'Second Schedule, PCR 2011',
      status: 'Resolved',
      penalty: 'Compounded on payment of ₹10,000',
      date: '27 Aug 2026'
    }
  ];

  // Default Open Cases
  const DEFAULT_OPEN_CASES = [
    {
      caseId: 'CASE-DL-2026-402',
      title: 'Overcharging & Weight Deficit at Rohini Supermarket',
      product: 'CrunchyBite Cookies',
      officer: 'Insp. Rajesh Verma',
      stage: 'Show Cause Issued',
      dueDate: '10 Sep 2026',
      priority: 'High'
    },
    {
      caseId: 'CASE-MH-2026-391',
      title: 'Perishable Dairy Products Without Expiry Dates',
      product: 'Classic Dairy Paneer',
      officer: 'Insp. Amit Kulkarni',
      stage: 'Court Filing Pending',
      dueDate: '08 Sep 2026',
      priority: 'Critical'
    },
    {
      caseId: 'CASE-KA-2026-388',
      title: 'Beverage Unit Price Typography Compliance',
      product: 'VitalBoost Beverage',
      officer: 'Insp. Priya Nair',
      stage: 'Awaiting Mfr Explanation',
      dueDate: '17 Sep 2026',
      priority: 'Medium'
    },
    {
      caseId: 'CASE-GJ-2026-370',
      title: 'Edible Oil Refill Verification Drive',
      product: 'Market Survey Phase 3',
      officer: 'Insp. Rajesh Verma',
      stage: 'Evidence Review',
      dueDate: '12 Sep 2026',
      priority: 'Medium'
    },
    {
      caseId: 'CASE-TN-2026-364',
      title: 'Imported Confectionery Label Over-stickering',
      product: 'EuroChoc Imported',
      officer: 'Insp. K. Raman',
      stage: 'Notice Served to Importer',
      dueDate: '15 Sep 2026',
      priority: 'High'
    },
    {
      caseId: 'CASE-UP-2026-352',
      title: 'Uncalibrated Electronic Weighing Scale Usage',
      product: 'Wholesale Mandi Retailers',
      officer: 'Insp. Sanjay Gupta',
      stage: 'Seizure Report Prepared',
      dueDate: '09 Sep 2026',
      priority: 'Critical'
    }
  ];

  // User Data Defaults for Demo profiles
  const DEFAULT_SCAN_HISTORY = [
    { id: 'sc-001', productId: 'prod-001', timestamp: 'Today, 10:14 AM', dateObj: new Date().toISOString(), status: 'verified' },
    { id: 'sc-002', productId: 'prod-002', timestamp: 'Yesterday, 04:30 PM', dateObj: new Date(Date.now() - 86400000).toISOString(), status: 'verified' },
    { id: 'sc-003', productId: 'prod-003', timestamp: '2 days ago, 11:20 AM', dateObj: new Date(Date.now() - 172800000).toISOString(), status: 'review' },
    { id: 'sc-004', productId: 'prod-004', timestamp: '3 days ago, 02:45 PM', dateObj: new Date(Date.now() - 259200000).toISOString(), status: 'violation' }
  ];
  const DEFAULT_SAVED_PRODUCTS = ['prod-001', 'prod-002'];

  function getCurrentUserScope() {
    try {
      const u = window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? window.MetraScan.Auth.getCurrentUser() : null;
      if (u) {
        const uid = u.id || u.supabaseId || u.email;
        if (uid) {
          return 'u_' + String(uid).replace(/[^a-zA-Z0-9_-]/g, '_');
        }
      }
    } catch (e) {}
    return 'guest';
  }

  function isDemoOrGuestUser() {
    try {
      const u = window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? window.MetraScan.Auth.getCurrentUser() : null;
      if (!u) return true; // guest
      if (u.id === 'user-demo-44' || (u.email && u.email.includes('@metrascan.demo'))) {
        return true; // demo profile
      }
      return false; // real citizen or official
    } catch (e) {
      return true;
    }
  }

  // Load user-scoped data
  function loadUserData(key, fallback) {
    const scope = getCurrentUserScope();
    try {
      const stored = localStorage.getItem('metrascan_' + scope + '_' + key);
      if (stored !== null) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading scoped localStorage for ' + key, e);
    }
    // For real registered users (not demo and not guest), start with a clean empty list
    if (!isDemoOrGuestUser()) {
      return Array.isArray(fallback) ? [] : fallback;
    }
    return fallback;
  }

  function saveUserData(key, data) {
    const scope = getCurrentUserScope();
    try {
      localStorage.setItem('metrascan_' + scope + '_' + key, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving scoped localStorage for ' + key, e);
    }
  }

  // Global load/save for shared system data
  function loadData(key, fallback) {
    try {
      const stored = localStorage.getItem('metrascan_' + key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (e) {
      console.warn('Error reading localStorage for key ' + key, e);
      return fallback;
    }
  }

  function saveData(key, data) {
    try {
      localStorage.setItem('metrascan_' + key, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving to localStorage for key ' + key, e);
    }
  }

  let userScannedProducts = loadUserData('user_products', []);

  // State
  const state = {
    userProducts: userScannedProducts,
    products: [...userScannedProducts, ...DEFAULT_PRODUCTS],
    inspections: loadData('inspections', DEFAULT_INSPECTIONS),
    violations: loadData('violations', DEFAULT_VIOLATIONS),
    openCases: loadData('openCases', DEFAULT_OPEN_CASES),
    scanHistory: loadUserData('scanHistory', DEFAULT_SCAN_HISTORY),
    savedProductIds: loadUserData('savedProducts', DEFAULT_SAVED_PRODUCTS),
    currentInspectionDraft: null,
    currentEvidence: []
  };

  // Data helpers
  function getProductById(id) {
    return state.products.find(p => p.id === id) || null;
  }

  function getProductByBarcode(code) {
    if (!code) return null;
    const cleanCode = code.toString().trim();
    return state.products.find(p => p.barcode === cleanCode || p.qrId.toLowerCase() === cleanCode.toLowerCase() || p.id === cleanCode) || null;
  }

  function addProduct(product) {
    if (!product || !product.id) return;
    const u = window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? window.MetraScan.Auth.getCurrentUser() : null;
    if (u) {
      product.userId = u.id || u.supabaseId;
      product.userEmail = u.email;
    }

    const existingIndex = state.userProducts.findIndex(p => p.id === product.id);
    if (existingIndex > -1) {
      state.userProducts[existingIndex] = product;
    } else {
      state.userProducts.unshift(product);
    }
    saveUserData('user_products', state.userProducts);
    state.products = [...state.userProducts, ...DEFAULT_PRODUCTS];
    return product;
  }

  function addScanToHistory(productId) {
    const prod = getProductById(productId);
    if (!prod) return;
    const item = {
      id: 'sc-' + Date.now(),
      productId: prod.id,
      timestamp: 'Just now',
      dateObj: new Date().toISOString(),
      status: prod.status
    };
    state.scanHistory.unshift(item);
    // Keep max 50 items
    if (state.scanHistory.length > 50) state.scanHistory.pop();
    saveUserData('scanHistory', state.scanHistory);
  }

  function toggleSaveProduct(productId) {
    const idx = state.savedProductIds.indexOf(productId);
    let isSaved = false;
    if (idx > -1) {
      state.savedProductIds.splice(idx, 1);
      isSaved = false;
    } else {
      state.savedProductIds.push(productId);
      isSaved = true;
    }
    saveUserData('savedProducts', state.savedProductIds);
    return isSaved;
  }

  function isProductSaved(productId) {
    return state.savedProductIds.indexOf(productId) > -1;
  }

  function refreshUserScope() {
    state.userProducts = loadUserData('user_products', []);
    state.products = [...state.userProducts, ...DEFAULT_PRODUCTS];
    state.scanHistory = loadUserData('scanHistory', DEFAULT_SCAN_HISTORY);
    state.savedProductIds = loadUserData('savedProducts', DEFAULT_SAVED_PRODUCTS);

    // Sync cloud scans if registered user is logged in
    const u = window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? window.MetraScan.Auth.getCurrentUser() : null;
    if (u && !isDemoOrGuestUser()) {
      syncUserScansFromSupabase();
    }
  }

  async function syncUserScansFromSupabase() {
    const u = window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? window.MetraScan.Auth.getCurrentUser() : null;
    if (!u || isDemoOrGuestUser() || !window.MetraScan.API || !window.MetraScan.API.fetchUserScans) return;

    try {
      const res = await MetraScan.API.fetchUserScans(u.id || u.supabaseId, u.email);
      if (res && res.ok && Array.isArray(res.scans)) {
        let updated = false;
        res.scans.forEach(function(sc) {
          const v = sc.verdict || {};
          const firstFilename = (sc.filenames && sc.filenames[0]) || 'Packaged Commodity';
          const scanProdId = 'supa-' + sc.id;

          // Check if already in user products
          if (!state.userProducts.some(p => p.id === scanProdId || (p.supabaseId && p.supabaseId === sc.id))) {
            const mapped = MetraScan.API.mapVerdictToProduct({ verdict: v, images: [] }, firstFilename, u);
            mapped.id = scanProdId;
            mapped.supabaseId = sc.id;
            state.userProducts.unshift(mapped);
            updated = true;
          }

          // Check if in scan history
          if (!state.scanHistory.some(h => h.productId === scanProdId || (h.id && h.id === 'sc-' + sc.id))) {
            const d = sc.created_at ? new Date(sc.created_at) : new Date();
            state.scanHistory.unshift({
              id: 'sc-' + sc.id,
              productId: scanProdId,
              timestamp: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              dateObj: d.toISOString(),
              status: sc.is_compliant ? 'verified' : (v.status || 'review')
            });
            updated = true;
          }
        });

        if (updated) {
          saveUserData('user_products', state.userProducts);
          saveUserData('scanHistory', state.scanHistory);
          state.products = [...state.userProducts, ...DEFAULT_PRODUCTS];

          // Refresh active UI if currently on consumer home or history
          const activeScreen = document.querySelector('.app-screen.active');
          if (activeScreen && activeScreen.id === 'screen-consumer-home' && window.MetraScan.Consumer) {
            window.MetraScan.Consumer.renderHome();
          } else if (activeScreen && activeScreen.id === 'screen-consumer-history' && window.MetraScan.Consumer) {
            window.MetraScan.Consumer.renderHistory();
          }
        }
      }
    } catch (e) {
      console.warn('Sync scans from Supabase notice:', e);
    }
  }

  // Audio Synthesizer for realistic scan sound
  function playScanBeep(success) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (success !== false) {
        // High double-beep for verification success
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.08);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760, now + 0.1); // A6
        gain2.gain.setValueAtTime(0.2, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.22);
      } else {
        // Warning low tone
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      // Audio not permitted or failed, fail silently
    }
  }

  // Toast System
  function showToast(message, type, duration) {
    type = type || 'info'; // info, success, warning, error
    duration = duration || 3200;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    let iconHtml = '';
    if (type === 'success') {
      iconHtml = '<span class="toast-icon">✓</span>';
    } else if (type === 'warning') {
      iconHtml = '<span class="toast-icon">⚠</span>';
    } else if (type === 'error') {
      iconHtml = '<span class="toast-icon">✕</span>';
    } else {
      iconHtml = '<span class="toast-icon">ℹ</span>';
    }

    toast.innerHTML = iconHtml + '<div class="toast-message">' + message + '</div>';
    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(function() {
      toast.classList.add('toast-show');
    });

    setTimeout(function() {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  // Modal helper
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('modal-active');
    document.body.classList.add('modal-open');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('modal-active');
    document.body.classList.remove('modal-open');
  }

  // Close modals when clicking backdrop or close button
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close-btn')) {
      const modal = e.target.closest('.modal-container');
      if (modal) {
        modal.classList.remove('modal-active');
        document.body.classList.remove('modal-open');
      }
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-container.modal-active');
      if (openModal) {
        openModal.classList.remove('modal-active');
        document.body.classList.remove('modal-open');
      }
    }
  });

  // =========================================================================
  // THEME ENGINE (Dark / Light Mode Toggle)
  // =========================================================================
  const STORAGE_KEY_THEME = 'metrascan_theme';

  function getTheme() {
    return 'light';
  }

  function applyTheme(theme, notify) {
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
    try {
      localStorage.removeItem(STORAGE_KEY_THEME);
    } catch (e) {}
  }

  function toggleTheme() {
    applyTheme('light', false);
  }

  // Force light theme immediately on script load
  try {
    applyTheme('light', false);
  } catch (e) {}

  /**
   * Helper to capture photo from video element or fallback
   */
  function capturePhotoFromVideo(videoEl, flashElId, fallbackImg) {
    // Play shutter sound feedback
    playScanBeep(true);

    // Trigger visual flash overlay animation if present
    if (flashElId) {
      const flashEl = document.getElementById(flashElId);
      if (flashEl) {
        flashEl.classList.remove('shutter-flash-active');
        void flashEl.offsetWidth; // trigger reflow
        flashEl.classList.add('shutter-flash-active');
      }
    }

    let photoDataUrl = null;

    if (videoEl && videoEl.videoWidth && videoEl.videoHeight && videoEl.readyState >= 2) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      } catch (err) {
        console.warn('Canvas video capture error:', err);
      }
    }

    if (!photoDataUrl && fallbackImg) {
      photoDataUrl = fallbackImg;
    }

    state.lastCapturedPhoto = photoDataUrl;
    return photoDataUrl;
  }

  // Export Core API
  window.MetraScan.App = {
    state: state,
    getProductById: getProductById,
    getProductByBarcode: getProductByBarcode,
    addProduct: addProduct,
    addScanToHistory: addScanToHistory,
    toggleSaveProduct: toggleSaveProduct,
    isProductSaved: isProductSaved,
    playScanBeep: playScanBeep,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    capturePhotoFromVideo: capturePhotoFromVideo,
    saveData: saveData,
    refreshUserScope: refreshUserScope,
    syncUserScansFromSupabase: syncUserScansFromSupabase,
    getTheme: getTheme,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme
  };

})(window);
