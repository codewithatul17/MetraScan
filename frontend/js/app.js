/**
 * MetraScan - Core Application Engine & Mock Data Store
 * Government-grade Product Verification Platform
 */

(function(window) {
  'use strict';

  // Application namespace
  window.MetraScan = window.MetraScan || {};

  // Fully Law-Verified Packaged Commodity (Compliant with Legal Metrology Act 2009, Packaged Commodities Rules 2011 & FSSAI)
  const VERIFIED_LEGAL_PRODUCT = {
    id: 'prod-legal-verified-8901030',
    barcode: '8901030825412',
    qrId: 'MS-IND-2026-994821',
    name: 'PureHarvest 100% Pure Cold-Pressed Mustard Oil (Kachi Ghani)',
    brand: 'PureHarvest Organics',
    category: 'Packaged Edible Oil (Legal Metrology Audited)',
    image: 'assets/images/product-oil.svg',
    manufacturer: 'PureHarvest Organics India Pvt. Ltd.',
    mfgAddress: 'Plot 42-A, Ecotech Food Park, Phase 1, Greater Noida, Gautam Buddha Nagar, Uttar Pradesh 201306, India',
    consumerCare: 'Toll Free: 1800-120-4545 · Email: care@pureharvestorganics.in · Address: Executive, Consumer Care Cell, Plot 42-A, Ecotech Food Park, Greater Noida 201306',
    mrp: '₹245.00 (Incl. of all taxes)',
    mrpValue: 245.0,
    netQuantity: '1 L (SI Unit Valid)',
    unitSalePrice: '₹245.00 / L',
    batchNo: 'LOT-2026-FSSAI-08',
    mfgDate: '08/2026',
    expDate: '05/2027',
    bestBefore: 'Best before 9 months from packaging (May 2027)',
    status: 'verified',
    statusLabel: 'VERIFIED COMPLIANT',
    score: 100,
    calibrated: true,
    verifiedDate: '13 Sep 2026, 11:30 AM',
    licenceNo: 'FSSAI Lic. No. 10014011000213',
    countryOfOrigin: 'India',
    scanMode: 'standard',
    declarations: {
      productName: {
        status: 'pass',
        label: 'Common / Generic Commodity Name (Rule 6(1)(b))',
        value: 'PureHarvest 100% Pure Cold-Pressed Mustard Oil (Kachi Ghani)'
      },
      fssaiLicence: {
        status: 'pass',
        label: 'FSSAI Statutory Registration',
        value: 'FSSAI Lic. No. 10014011000213'
      },
      batchAndMfg: {
        status: 'pass',
        label: 'Batch/Lot No. & Mfg Date (Rule 6(1)(d))',
        value: 'Batch: LOT-2026-FSSAI-08 · Mfg: 08/2026'
      },
      bestBefore: {
        status: 'pass',
        label: 'Best Before / Expiry Indication',
        value: 'Best before 9 months from packaging (May 2027)'
      },
      mfgDetails: {
        status: 'pass',
        label: 'Manufacturer & Packer Address (Rule 6(1)(a))',
        value: 'PureHarvest Organics India Pvt. Ltd., Plot 42-A, Ecotech Food Park, Phase 1, Greater Noida, Gautam Buddha Nagar, Uttar Pradesh 201306, India'
      },
      netQuantity: {
        status: 'pass',
        label: 'Net Quantity in Standard Units (Rule 6(1)(c) & Rule 12)',
        value: '1 L (SI Unit Valid)'
      },
      mrpDeclaration: {
        status: 'pass',
        label: 'MRP & Unit Sale Price (Rule 6(1)(e))',
        value: '₹245.00 (Incl. of all taxes) · USP: ₹245.00 / L'
      },
      consumerCare: {
        status: 'pass',
        label: 'Consumer Care Helpline (Rule 6(2))',
        value: 'Toll Free: 1800-120-4545 · Email: care@pureharvestorganics.in · Executive, Consumer Care Cell, Greater Noida 201306'
      },
      countryOfOrigin: {
        status: 'pass',
        label: 'Country of Origin (Rule 6(1)(n))',
        value: 'India'
      }
    },
    rawBackendVerdict: {
      status: 'verified',
      is_compliant: true,
      score: 100,
      compliance_rate: 1.0,
      verified_rule: 'Legal Metrology (Packaged Commodities) Rules, 2011 & FSSAI Standards'
    },
    registryStatus: {
      legalMetrology: 'Compliant & Registered (Rule 6(1))',
      nationalRegistry: 'National Legal Metrology Portal (Verified Active)',
      qrIntegrity: 'Cryptographically Verified (MetraSeal Trust Engine)'
    },
    ingredientAnalysis: {
      found: true,
      score: 100,
      grade: 'A',
      rating_title: '100% Clean Organic Formulation',
      rating_summary: 'Zero synthetic preservatives, zero high-concern additives, zero UPF markers, and verified free from common food allergens.',
      raw_text: 'Ingredients: 100% Pure Cold-Pressed Virgin Mustard Oil (Kachi Ghani), Natural Plant Tocopherols / Vitamin E (INS 307b). Free from trans fats, argemone oil, chemical solvent extracts, artificial coloring, or synthetic preservatives.',
      additives: [
        { code: 'INS 307b', name: 'Tocopherol Concentrate (Natural Vitamin E)', category: 'Natural Antioxidant', risk: 'clean', concern: 'Safe natural plant-derived antioxidant' }
      ],
      allergens: [],
      upf_markers: [],
      clean_ingredients: ['100% Cold-Pressed Mustard Oil', 'Natural Vitamin E (Tocopherol)'],
      summary_counts: {
        high_concern: 0,
        moderate_concern: 0,
        clean: 2,
        allergens: 0,
        upf_count: 0,
        total_ingredients: 2
      }
    }
  };

  const VERIFIED_SCAN_HISTORY_ITEM = {
    id: 'sc-legal-verified-8901030',
    productId: 'prod-legal-verified-8901030',
    timestamp: 'Today, 11:30 AM',
    dateObj: '2026-09-13T11:30:00.000Z',
    status: 'verified'
  };

  // Default Store Collections (includes fully verified statutory legal product)
  const DEFAULT_PRODUCTS = [VERIFIED_LEGAL_PRODUCT];
  const DEFAULT_INSPECTIONS = [];
  const DEFAULT_VIOLATIONS = [];
  const DEFAULT_OPEN_CASES = [];
  const DEFAULT_SCAN_HISTORY = [VERIFIED_SCAN_HISTORY_ITEM];
  const DEFAULT_SAVED_PRODUCTS = [];

  // Purge any legacy dummy records from localStorage to ensure clean state
  (function purgeLegacyDummyData() {
    try {
      const keysToPurge = ['inspections', 'violations', 'openCases'];
      keysToPurge.forEach(function(k) {
        const item = localStorage.getItem('metrascan_' + k);
        if (item && (item.includes('INS-2026-') || item.includes('VIO-2026-') || item.includes('CASE-DL-') || item.includes('prod-00'))) {
          localStorage.removeItem('metrascan_' + k);
        }
      });
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('metrascan_')) {
          const val = localStorage.getItem(k);
          if (val && (val.includes('prod-001') || val.includes('prod-002') || val.includes('prod-003') || val.includes('prod-004') || val.includes('sc-001'))) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch (e) {
      // Storage unavailable or restricted
    }
  })();

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
    return false;
  }

  // Load user-scoped data
  function loadUserData(key, fallback) {
    const scope = getCurrentUserScope();
    try {
      const stored = localStorage.getItem('metrascan_' + scope + '_' + key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
          return [...fallback];
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading scoped localStorage for ' + key, e);
    }
    return Array.isArray(fallback) ? [...fallback] : fallback;
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

  let userScannedProducts = loadUserData('user_products', [VERIFIED_LEGAL_PRODUCT]);

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

  // Ensure fully verified statutory legal commodity is always present in state and scan history
  function ensureVerifiedLegalRecord() {
    if (!state.products.some(p => p.id === VERIFIED_LEGAL_PRODUCT.id)) {
      state.products.unshift(VERIFIED_LEGAL_PRODUCT);
    }
    if (!state.userProducts.some(p => p.id === VERIFIED_LEGAL_PRODUCT.id)) {
      state.userProducts.unshift(VERIFIED_LEGAL_PRODUCT);
      saveUserData('user_products', state.userProducts);
    }
    if (!state.scanHistory.some(h => h.productId === VERIFIED_LEGAL_PRODUCT.id || h.id === VERIFIED_SCAN_HISTORY_ITEM.id)) {
      state.scanHistory.unshift(VERIFIED_SCAN_HISTORY_ITEM);
      saveUserData('scanHistory', state.scanHistory);
    }
  }
  ensureVerifiedLegalRecord();

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
    state.userProducts = loadUserData('user_products', [VERIFIED_LEGAL_PRODUCT]);
    state.products = [...state.userProducts, ...DEFAULT_PRODUCTS];
    state.scanHistory = loadUserData('scanHistory', DEFAULT_SCAN_HISTORY);
    state.savedProductIds = loadUserData('savedProducts', DEFAULT_SAVED_PRODUCTS);
    ensureVerifiedLegalRecord();

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

    if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Display Detailed Non-Compliance / Invalid Packaging Diagnostic Modal
   * Explains exactly WHY a commodity failed statutory verification
   */
  function showInvalidScanModal(scanData, sourceName, photoUrl, isInspector) {
    const modal = document.getElementById('modal-scan-invalid');
    if (!modal) return;

    scanData = scanData || {};
    const verdict = scanData.verdict || {};
    const totalBoxes = scanData.total_ocr_boxes || 0;
    const images = scanData.images || [];
    const firstImg = images[0] || {};
    const rawTextList = firstImg.raw_text || [];

    // 1. Primary Diagnostic Reason
    const reasonEl = document.getElementById('invalid-scan-primary-reason');
    if (reasonEl) {
      if (totalBoxes === 0) {
        reasonEl.innerHTML = `<strong>Zero readable packaging text detected.</strong><br><span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">The package was either too far away, out of focus, or the camera was pointed at an unprinted surface.</span>`;
      } else if (totalBoxes < 4) {
        const previewTxt = rawTextList.slice(0, 3).join(' ') || '';
        reasonEl.innerHTML = `<strong>Minimal text detected (${totalBoxes} fragments: <em>"${escapeHtml(previewTxt)}"</em>).</strong><br><span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">Mandatory declarations are missing or illegible due to motion blur, glare, or severe smudging.</span>`;
      } else {
        reasonEl.innerHTML = `<strong>Decorative packaging detected, but NO statutory declarations found.</strong><br><span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">The AI OCR engine read ${totalBoxes} lines of text, but none matched mandatory Rule 6(1) declarations (MRP, Net Quantity, Mfg Date). Ensure you are scanning the <strong>Back-of-Pack (BOP)</strong> specification panel.</span>`;
      }
    }

    // 2. Scanned Image Thumbnail Preview
    const previewWrapper = document.getElementById('invalid-scan-preview-wrapper');
    const previewImg = document.getElementById('invalid-scan-image-preview');
    const displayImg = photoUrl || (firstImg.image_base64 ? 'data:image/jpeg;base64,' + firstImg.image_base64 : null);
    if (previewWrapper && previewImg) {
      if (displayImg) {
        previewImg.src = displayImg;
        previewWrapper.style.display = 'block';
      } else {
        previewWrapper.style.display = 'none';
      }
    }

    // 3. Mandatory Statutory Declarations Checklist
    const declList = document.getElementById('invalid-scan-declarations-list');
    if (declList) {
      const items = [
        {
          key: 'mrp',
          name: 'MRP (Maximum Retail Price)',
          rule: 'Rule 6(1)(e) — Inclusive of all taxes & Unit Sale Price',
          obj: verdict.mrp
        },
        {
          key: 'net_quantity',
          name: 'Net Quantity & Standard Unit',
          rule: 'Rule 6(1)(c) — Standard metric unit (g, kg, ml, l, count)',
          obj: verdict.net_quantity
        },
        {
          key: 'mfg_date',
          name: 'Date of Manufacture / Packing',
          rule: 'Rule 6(1)(d) — Month & Year of packing/import',
          obj: verdict.mfg_date
        },
        {
          key: 'manufacturer',
          name: 'Manufacturer / Packer Details',
          rule: 'Rule 6(1)(a) — Name and full complete address',
          obj: verdict.manufacturer
        },
        {
          key: 'consumer_care',
          name: 'Consumer Care Contact',
          rule: 'Rule 6(1)(g) — Toll-free phone, email or postal address',
          obj: verdict.consumer_care
        },
        {
          key: 'country_of_origin',
          name: 'Country of Origin',
          rule: 'Rule 6(10) — Mandatory declaration of manufacturing nation',
          obj: verdict.country_of_origin
        }
      ];

      let listHtml = '';
      items.forEach(function(item) {
        const isFound = item.obj && item.obj.found;
        const textVal = isFound ? (item.obj.text || item.obj.value || 'Detected') : 'Missing / Illegible';
        const statusBadge = isFound
          ? `<span style="background: rgba(34, 197, 94, 0.15); color: #16a34a; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(34, 197, 94, 0.3);">✓ FOUND</span>`
          : `<span style="background: rgba(239, 68, 68, 0.12); color: #ef4444; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">❌ MISSING</span>`;
        
        listHtml += `
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; background: var(--bg-card); border: 1px solid ${isFound ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.25)'}; border-left: 3.5px solid ${isFound ? '#22c55e' : '#ef4444'}; border-radius: 8px; padding: 8px 12px;">
            <div style="flex: 1;">
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">${item.name}</div>
              <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 1px;">${item.rule}</div>
              ${isFound ? `<div style="font-size: 0.75rem; color: #16a34a; font-weight: 600; margin-top: 3px;">Value: "${escapeHtml(String(textVal))}"</div>` : ''}
            </div>
            ${statusBadge}
          </div>
        `;
      });
      declList.innerHTML = listHtml;
    }

    // 4. Raw OCR Text Readout
    const ocrCountEl = document.getElementById('invalid-scan-ocr-count');
    const rawTextEl = document.getElementById('invalid-scan-raw-text');
    if (ocrCountEl) ocrCountEl.textContent = totalBoxes + (totalBoxes === 1 ? ' line' : ' lines');
    if (rawTextEl) {
      if (rawTextList && rawTextList.length > 0) {
        rawTextEl.textContent = rawTextList.join('\n');
      } else {
        rawTextEl.textContent = 'No text tokens recognized by OCR engine.';
      }
    }

    // 5. Button Bindings
    const retryBtn = document.getElementById('btn-invalid-scan-retry');
    if (retryBtn) {
      retryBtn.onclick = function() {
        closeModal('modal-scan-invalid');
        if (isInspector) {
          MetraScan.Nav.navigateTo('ministry-scan');
        } else {
          MetraScan.Nav.navigateTo('consumer-scan');
        }
      };
    }

    const manualBtn = document.getElementById('btn-invalid-scan-manual');
    if (manualBtn) {
      manualBtn.onclick = function() {
        closeModal('modal-scan-invalid');
        if (isInspector) {
          openModal('modal-inspector-manual');
        } else {
          openModal('modal-manual-code');
        }
      };
    }

    const proceedCaseBtn = document.getElementById('btn-invalid-scan-proceed-case');
    if (proceedCaseBtn) {
      if (isInspector) {
        proceedCaseBtn.style.display = 'block';
        proceedCaseBtn.onclick = function() {
          closeModal('modal-scan-invalid');
          const currentUser = MetraScan.Auth.getCurrentUser();
          const product = MetraScan.API.mapVerdictToProduct(scanData, sourceName || 'Seized Packaging Sample', currentUser, photoUrl);
          product.status = 'violation';
          if (scanData && scanData.supabase_id) {
            product.supabaseId = scanData.supabase_id;
          }
          MetraScan.App.addProduct(product);
          MetraScan.App.addScanToHistory(product.id);
          if (photoUrl && MetraScan.Ministry && MetraScan.Ministry.addEvidenceItem) {
            MetraScan.Ministry.addEvidenceItem({
              id: 'ev-' + Date.now(),
              type: 'Field Seizure Photo',
              name: 'Seized Packaging (' + (sourceName || 'Inspection Scan') + ')',
              url: photoUrl,
              time: 'Just now'
            });
          }
          MetraScan.Nav.navigateTo('ministry-inspection', {
            productId: product.id,
            location: 'Retail Inspection Point'
          });
        };
      } else {
        proceedCaseBtn.style.display = 'none';
      }
    }

    // Sound & open modal
    playScanBeep(false);
    openModal('modal-scan-invalid');
  }

  // Export Core API
  window.MetraScan.App = {
    state: state,
    getProductById: getProductById,
    getProductByBarcode: getProductByBarcode,
    addProduct: addProduct,
    addScanToHistory: addScanToHistory,
    ensureVerifiedLegalRecord: ensureVerifiedLegalRecord,
    VERIFIED_LEGAL_PRODUCT: VERIFIED_LEGAL_PRODUCT,
    toggleSaveProduct: toggleSaveProduct,
    isProductSaved: isProductSaved,
    playScanBeep: playScanBeep,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    showInvalidScanModal: showInvalidScanModal,
    capturePhotoFromVideo: capturePhotoFromVideo,
    saveData: saveData,
    refreshUserScope: refreshUserScope,
    syncUserScansFromSupabase: syncUserScansFromSupabase,
    getTheme: getTheme,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme
  };

})(window);
