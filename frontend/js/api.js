/**
 * MetraScan - Backend API Integration Layer
 * Connects frontend with the Python/FastAPI Legal Metrology Scanner
 * Source of Truth: http://localhost:8000/scan
 */

(function(window) {
  'use strict';

  window.MetraScan = window.MetraScan || {};

  // Configurable API base URL (can be overridden via localStorage or config.js)
  const DEFAULT_API_BASE_URL = 'https://metrascan-1.onrender.com';
  let apiBaseUrl = (function() {
    try {
      const stored = localStorage.getItem('metrascan_api_url');
      const isRemoteHost = window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      // If client is accessed on a mobile phone or cloud host, discard stale localhost URLs
      if (stored && isRemoteHost && (stored.includes('localhost') || stored.includes('127.0.0.1'))) {
        try { localStorage.removeItem('metrascan_api_url'); } catch (e) {}
        return DEFAULT_API_BASE_URL;
      }
      return stored || window.METRASCAN_API_URL || DEFAULT_API_BASE_URL;
    } catch (e) {
      return DEFAULT_API_BASE_URL;
    }
  })();

  function getApiBaseUrl() {
    return apiBaseUrl;
  }

  function setApiBaseUrl(url) {
    apiBaseUrl = (url || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
    try {
      localStorage.setItem('metrascan_api_url', apiBaseUrl);
    } catch (e) {}
  }

  // Official Supabase Configuration
  const SUPABASE_URL = 'https://cdtwumtgqvmwzyhekevl.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdHd1bXRncXZtd3p5aGVrZXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDk4MjIsImV4cCI6MjEwNDc4NTgyMn0.UNAWsdlMq9G329h_2OAIMYR8oXYHKxQdl4KS9XdYH5E';

  let supabaseClient = null;
  function getSupabase() {
    if (!supabaseClient && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (e) {
        console.warn('Supabase initialization notice:', e);
      }
    }
    return supabaseClient;
  }

  /**
   * Health check to determine if real Python backend is running
   */
  async function checkHealth() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const resp = await fetch(`${apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        return { online: true, data: data };
      }
      return { online: false, status: resp.status, error: resp.statusText };
    } catch (err) {
      clearTimeout(timeoutId);
      return { online: false, error: err.name === 'AbortError' ? 'Connection timeout' : err.message };
    }
  }

  /**
   * Convert Data URL (from canvas / camera) into a real File object
   */
  function dataUrlToFile(dataUrl, filename) {
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename || ('capture-' + Date.now() + '.jpg'), { type: mime });
    } catch (e) {
      console.error('Error converting dataUrl to File:', e);
      return null;
    }
  }

  /**
   * Post one or more label images to the real backend /scan endpoint
   * @param {File[]|FileList} files
   * @param {object} [user] - Optional user context
   * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
   */
  async function scanImages(files, user) {
    if (!files || files.length === 0) {
      return { ok: false, error: 'No files provided for scan.' };
    }

    const currentUser = user || (window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? window.MetraScan.Auth.getCurrentUser() : null);

    const fileArray = Array.from(files);
    const formData = new FormData();

    // The backend endpoint accepts `images: List[UploadFile] = File(...)`
    fileArray.forEach((file) => {
      formData.append('images', file, file.name);
    });

    // Attach user ownership attribution
    if (currentUser) {
      if (currentUser.id || currentUser.supabaseId) {
        formData.append('user_id', currentUser.id || currentUser.supabaseId);
      }
      if (currentUser.email) {
        formData.append('user_email', currentUser.email);
      }
    }

    // Helper for fetch with timeout (allows 55s for Render free tier cold start)
    const doScanFetch = async (targetUrl) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      try {
        const resp = await fetch(`${targetUrl}/scan`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return resp;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      let resp;
      try {
        resp = await doScanFetch(apiBaseUrl);
      } catch (firstErr) {
        // If first attempt failed on localhost, automatically fallback to live Render backend
        if (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1')) {
          console.warn('Localhost scan failed, falling back to Render live backend...');
          setApiBaseUrl(DEFAULT_API_BASE_URL);
          resp = await doScanFetch(DEFAULT_API_BASE_URL);
        } else {
          throw firstErr;
        }
      }

      if (!resp.ok) {
        let errorDetail = `${resp.status} ${resp.statusText}`;
        try {
          const errJson = await resp.json();
          if (errJson && errJson.detail) {
            errorDetail = errJson.detail;
          }
        } catch (e) {}
        return { ok: false, error: `Scan failed: ${errorDetail}` };
      }

      const result = await resp.json();
      return { ok: true, data: result };
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout
        ? 'AI Cloud backend took too long to respond (server may be waking up from sleep). Please tap Scan again.'
        : `Unable to connect to AI backend at ${apiBaseUrl} (${err.message}).`;
      return {
        ok: false,
        error: msg
      };
    }
  }

  /**
   * Transforms the backend scan verdict & annotated image into a unique product record
   * Guarantees a UNIQUE product ID per upload to permanently prevent the wrong-product-details bug.
   *
   * @param {object} scanData - Output from /scan: { verdict: {...}, images: [...] }
   * @param {string} sourceName - Filename or description of the image source
   * @returns {object} MetraScan compliant product object
   */
  function mapVerdictToProduct(scanData, sourceName, user, customPhotoUrl, scanMode) {
    const currentUser = user || (window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? window.MetraScan.Auth.getCurrentUser() : null);
    const uniqueId = 'scan-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    const mode = scanMode || (scanData && scanData.scan_mode) || 'standard';
    const isIngredientsMode = (mode === 'ingredients');

    const verdict = scanData.verdict || {};
    const firstImg = (scanData.images && scanData.images[0]) ? scanData.images[0] : null;

    // Use the backend's real OpenCV-annotated image or the captured photo
    let displayImage = customPhotoUrl || '';
    if (firstImg && firstImg.image_base64) {
      displayImage = 'data:image/jpeg;base64,' + firstImg.image_base64;
    } else if (!displayImage) {
      displayImage = 'assets/images/product-oil.svg';
    }

    // Extract declarations from OCR verdict
    const mrpData = verdict.mrp || {};
    const netQtyData = verdict.net_quantity || {};
    const mfgDateData = verdict.mfg_date || {};
    const mfrData = verdict.manufacturer || {};
    const careData = verdict.consumer_care || {};
    const genericNameData = verdict.generic_name || {};

    // Genuine extracted packaging fields (zero hallucination)
    const barcodeData = verdict.barcode || {};
    const qrData = verdict.qr_code || {};
    const batchData = verdict.batch_no || {};
    const expData = verdict.expiry_date || {};
    const uspData = verdict.unit_sale_price || {};
    const fssaiData = verdict.fssai_licence || {};

    // Extract Ingredient Health & Safety Analysis
    const ingredientAnalysis = verdict.ingredient_analysis || (firstImg && firstImg.ingredient_analysis) || {
      found: false,
      raw_text: null,
      score: null,
      grade: null,
      rating_title: 'Ingredients Panel Not Detected',
      rating_summary: 'Ingredients declaration was not detected in this photo. Scan the back-of-pack ingredients table for an instant health & safety score.',
      additives: [],
      allergens: [],
      upf_markers: [],
      clean_ingredients: [],
      summary_counts: {
        high_concern: 0,
        moderate_concern: 0,
        clean: 0,
        allergens: 0,
        upf_count: 0,
        total_ingredients: 0
      }
    };

    // Determine honest values directly from OCR results
    let cleanMrpNum = mrpData.clean_value || null;
    if (!cleanMrpNum && mrpData.text) {
      const match = mrpData.text.match(/(?:(?:rs\.?|₹|inr)\s*)?([0-9]+(?:\.[0-9]{1,2})?)/i);
      cleanMrpNum = match ? match[1] : mrpData.text.replace(/[^0-9.]/g, '');
    }
    const mrpText = cleanMrpNum ? ('₹' + cleanMrpNum + ' (Incl. of all taxes)') : (mrpData.text || 'Not detected on label');
    const mrpValue = cleanMrpNum ? parseFloat(cleanMrpNum) || 0 : 0;
    const netQtyText = netQtyData.clean_value || netQtyData.text || 'Not detected on label';
    const mfgDateText = mfgDateData.clean_value || mfgDateData.text || 'Not detected on label';
    const mfrText = mfrData.clean_value || mfrData.text || 'Not detected on label';
    const careText = careData.clean_value || careData.text || 'Not detected on label';

    // Barcode: strictly genuine or Not detected
    const barcodeVal = (barcodeData.found && barcodeData.text) ? barcodeData.text : 'Not detected on scanned package';

    // QR Seal: strictly genuine or None detected
    const qrVal = (qrData.found && qrData.text) ? qrData.text : 'None detected';

    // Batch No: strictly genuine or Not detected
    const batchVal = (batchData.found && batchData.text) ? batchData.text : 'Not detected on package';

    // Unit Sale Price: strictly genuine OCR extraction or Not declared
    const uspVal = (uspData.found && uspData.text) ? uspData.text : 'Not declared on package';

    // Expiry / Best Before: strictly genuine or Not detected
    const expVal = (expData.found && expData.text) ? expData.text : 'Not detected on package';

    // FSSAI Statutory License: strictly genuine or Not detected
    const fssaiVal = (fssaiData.found && fssaiData.text) ? ('FSSAI Lic. No. ' + fssaiData.text) : 'FSSAI not detected on scanned surface';

    // Country of Origin (Rule 6(1)(n))
    const originData = verdict.country_of_origin || {};
    const originVal = (originData.found && (originData.clean_value || originData.text)) ? (originData.clean_value || originData.text) : 'India';

    // Clean Brand Name Extraction from manufacturer line
    let brandName = 'Brand not detected on label';
    if (mfrData.found && mfrText && mfrText !== 'Not detected on label') {
      let cleaned = mfrText.replace(/^(?:manufactured|marketed|mfg|mfd|packed|imported)\s*(?:by|at)?[\s.:]*/i, '').trim();
      const sepIdx = cleaned.search(/[,;\/\n]/);
      if (sepIdx > 0) {
        cleaned = cleaned.substring(0, sepIdx).trim();
      }
      if (cleaned.length >= 2) {
        brandName = cleaned;
      }
    }

    const productName = genericNameData.text || (sourceName ? sourceName.replace(/\.[^/.]+$/, '') : (isIngredientsMode ? 'Food Product Formulation' : 'Scanned Packaged Commodity'));

    // Rule 6(1) audit checks mapping
    const declarations = {
      productName: {
        status: genericNameData.found ? 'pass' : (genericNameData.note ? 'review' : 'pass'),
        label: 'Common / Generic Commodity Name',
        value: productName
      },
      fssaiLicence: {
        status: fssaiData.found ? 'pass' : 'review',
        label: 'FSSAI Statutory Registration',
        value: fssaiVal
      },
      batchAndMfg: {
        status: (mfgDateData.found && mfgDateData.format_valid) ? 'pass' : (mfgDateData.found ? 'review' : 'violation'),
        label: 'Batch/Lot No. & Mfg Date (Rule 6(1)(d))',
        value: (batchVal !== 'Not detected on package' ? (`Batch: ${batchVal} · `) : '') + (mfgDateData.found ? (mfgDateData.clean_value || mfgDateData.text) : 'Mfg date not detected on label')
      },
      bestBefore: {
        status: expData.found ? 'pass' : 'review',
        label: 'Best Before / Expiry Indication',
        value: expVal !== 'Not detected on package' ? expVal : 'Expiry / Best Before date not detected on scanned surface'
      },
      mfgDetails: {
        status: mfrData.found && mfrData.format_valid ? 'pass' : (mfrData.found ? 'review' : 'violation'),
        label: 'Manufacturer & Packer Address (Rule 6(1)(a))',
        value: mfrData.found ? mfrData.text : 'Complete address not detected'
      },
      netQuantity: {
        status: netQtyData.found && netQtyData.format_valid ? 'pass' : (netQtyData.found ? 'review' : 'violation'),
        label: 'Net Quantity in Standard Units (Rule 6(1)(c) & Rule 12)',
        value: netQtyData.found ? ((netQtyData.clean_value || netQtyData.text) + (netQtyData.format_valid ? ' (SI Unit Valid)' : ' (Invalid SI Unit)')) : 'Net quantity declaration missing'
      },
      mrpDeclaration: {
        status: mrpData.found && mrpData.format_valid ? 'pass' : (mrpData.found ? 'review' : 'violation'),
        label: 'MRP & Unit Sale Price (Rule 6(1)(e))',
        value: mrpData.found ? (mrpText + (uspVal !== 'Not declared on package' ? (` · USP: ${uspVal}`) : '')) : 'MRP declaration not detected'
      },
      consumerCare: {
        status: careData.found && careData.format_valid ? 'pass' : (careData.found ? 'review' : 'violation'),
        label: 'Consumer Care Helpline (Rule 6(2))',
        value: careData.found ? careData.text : 'Customer grievance redressal not detected'
      },
      countryOfOrigin: {
        status: originData.found ? 'pass' : 'review',
        label: 'Country of Origin (Rule 6(1)(n))',
        value: originData.found ? originVal : 'Country of origin not detected on scanned surface'
      }
    };

    // Calculate score and status based on real findings
    let overallStatus = 'verified';
    let statusLabel = 'VERIFIED COMPLIANT';
    let score = 95;

    if (isIngredientsMode) {
      // INGREDIENT & ALLERGEN AUDIT MODE:
      // Status is based on formulation safety & allergens, NOT Legal Metrology Rule 6(1)
      score = (ingredientAnalysis.score !== null && ingredientAnalysis.score !== undefined) ? ingredientAnalysis.score : 85;
      const counts = ingredientAnalysis.summary_counts || {};
      const hasHighConcern = counts.high_concern > 0;
      const hasAllergens = ingredientAnalysis.allergens && ingredientAnalysis.allergens.length > 0;

      if (hasHighConcern) {
        overallStatus = 'review';
        statusLabel = 'HIGH CONCERN ADDITIVES';
      } else if (hasAllergens) {
        overallStatus = 'review';
        statusLabel = 'ALLERGEN ALERT';
      } else if (ingredientAnalysis.grade === 'A' || ingredientAnalysis.grade === 'B') {
        overallStatus = 'verified';
        statusLabel = 'CLEAN FORMULATION';
      } else {
        overallStatus = 'review';
        statusLabel = 'PROCESSED FORMULATION';
      }
    } else {
      // STANDARD LEGAL METROLOGY MODE:
      const keysToCheck = ['netQuantity', 'mrpDeclaration', 'batchAndMfg', 'mfgDetails', 'consumerCare'];
      let reviewCount = 0;

      keysToCheck.forEach(k => {
        const st = declarations[k].status;
        if (st === 'review' || st === 'violation') reviewCount++;
      });

      if (reviewCount > 0 || (firstImg && firstImg.calibrated === false)) {
        overallStatus = 'review';
        statusLabel = 'NEEDS REVIEW / ADVISORY';
        score = Math.max(75, 95 - (reviewCount * 5));
      }
    }

    const now = new Date();
    const verifiedDateStr = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return {
      id: uniqueId,
      barcode: barcodeVal,
      qrId: qrVal,
      name: productName,
      brand: brandName,
      category: isIngredientsMode ? '🌿 Ingredient & Allergen Rating' : 'Packaged Commodity (OCR Audited)',
      image: displayImage,
      manufacturer: mfrText,
      mfgAddress: mfrText,
      consumerCare: careText,
      mrp: mrpText,
      mrpValue: mrpValue,
      netQuantity: netQtyText,
      unitSalePrice: uspVal,
      batchNo: batchVal,
      mfgDate: mfgDateText,
      expDate: expVal,
      bestBefore: expVal,
      status: overallStatus,
      statusLabel: statusLabel,
      score: score,
      verifiedDate: verifiedDateStr,
      licenceNo: fssaiVal,
      countryOfOrigin: originVal,
      declarations: declarations,
      rawBackendVerdict: verdict,
      calibrated: firstImg ? firstImg.calibrated : false,
      ingredientAnalysis: ingredientAnalysis,
      scanMode: mode,
      userId: (user && user.id) || (currentUser && currentUser.id) || (verdict && verdict.user_id) || null,
      userEmail: (user && user.email) || (currentUser && currentUser.email) || (verdict && verdict.user_email) || null
    };
  }

  /**
  /**
   * Checks if a mobile phone number is already registered in Supabase
   * @param {string} phone - Mobile number to verify
   * @returns {Promise<boolean>} True if number already exists
   */
  async function checkPhoneExists(phone) {
    if (!phone) return false;
    const clean = String(phone).replace(/\D/g, '').slice(-10);
    if (clean.length < 10) return false;

    try {
      const resp = await fetch(`${apiBaseUrl}/auth/check-phone?phone=${encodeURIComponent(clean)}`);
      if (resp.ok) {
        const data = await resp.json();
        return Boolean(data.exists);
      }
    } catch (err) {
      console.warn('Backend /auth/check-phone error:', err);
    }
    return false;
  }

  /**
   * Register a user with Supabase Auth (via backend admin create_user or direct client)
   */
  async function authSignup(userData) {
    try {
      const resp = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await resp.json();
      if (resp.ok) {
        return { ok: true, source: 'backend_supabase', user: data.user };
      }
      if (resp.status === 409) {
        const errMsg = (data && data.detail) ? data.detail : 'This mobile number or email already exists. Please log in.';
        return { ok: false, error: errMsg, code: 'ALREADY_EXISTS' };
      }
      if (data && data.detail) {
        return { ok: false, error: typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail) };
      }
    } catch (err) {
      console.warn('FastAPI backend /auth/signup unavailable, using direct Supabase client fallback:', err);
    }

    // Direct Supabase Client fallback
    const supa = getSupabase();
    if (supa && supa.auth) {
      try {
        const { data, error } = await supa.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              name: userData.name,
              full_name: userData.name,
              phone: userData.phone || '',
              role: userData.role || 'consumer',
              city: userData.city || '',
              state: userData.state || '',
              govId: userData.govId || '',
              department: userData.department || '',
              badgeNumber: userData.badgeNumber || '',
              designation: userData.designation || ''
            }
          }
        });
        if (error) {
          return { ok: false, error: error.message };
        }
        return {
          ok: true,
          source: 'direct_supabase',
          user: {
            id: data.user ? data.user.id : ('user-' + Date.now()),
            email: userData.email,
            role: userData.role || 'consumer',
            metadata: data.user ? data.user.user_metadata : userData
          }
        };
      } catch (sdkErr) {
        return { ok: false, error: sdkErr.message };
      }
    }

    return { ok: false, error: 'Authentication service unavailable.' };
  }

  /**
   * Log in a user via Supabase Auth (via backend or direct client)
   */
  async function authLogin(identifier, password, role) {
    try {
      const resp = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier, password: password, role: role })
      });
      const data = await resp.json();
      if (resp.ok) {
        return { ok: true, source: 'backend_supabase', session: data.session, user: data.user };
      }
      if (data && data.detail) {
        return { ok: false, error: typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail) };
      }
    } catch (err) {
      console.warn('FastAPI backend /auth/login unavailable, using direct Supabase client fallback:', err);
    }

    // Direct Supabase Client fallback
    const supa = getSupabase();
    if (supa && supa.auth) {
      let emailToTry = identifier ? identifier.trim() : '';
      if (!emailToTry.includes('@')) {
        const cleanDigits = emailToTry.replace(/\D/g, '');
        if (cleanDigits === '9876543210' || cleanDigits.endsWith('9876543210')) {
          emailToTry = 'aarav.patel@metrascan.demo';
        } else if (cleanDigits === '9045331361' || cleanDigits.endsWith('9045331361')) {
          emailToTry = 'aanya@gmail.com';
        } else if (cleanDigits === '9971135429' || cleanDigits.endsWith('9971135429')) {
          emailToTry = 'mangalam@gmail.com';
        } else if (emailToTry.toUpperCase().includes('GOV-LM') || emailToTry.toUpperCase().includes('4481')) {
          emailToTry = 'rajesh.verma@metrascan.gov.in';
        }
      }

      if (emailToTry && emailToTry.includes('@')) {
        const passwordsToTry = [password];

        for (const pwd of passwordsToTry) {
          try {
            const { data, error } = await supa.auth.signInWithPassword({
              email: emailToTry,
              password: pwd
            });
            if (!error && data && data.user) {
              const u = data.user;
              return {
                ok: true,
                source: 'direct_supabase',
                session: data.session,
                user: {
                  id: u.id,
                  email: u.email,
                  role: (u.user_metadata && u.user_metadata.role) || role || 'consumer',
                  name: (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || 'User',
                  phone: (u.user_metadata && u.user_metadata.phone) || '',
                  metadata: u.user_metadata || {}
                }
              };
            }
          } catch (sdkErr) {
            console.warn('Direct Supabase sign-in attempt error:', sdkErr);
          }
        }
      }
    }

    return { ok: false, error: 'Unable to authenticate. Please ensure the backend server is running (http://localhost:8000) and verify your credentials.' };
  }

  /**
   * Fetch list of all registered Supabase users
   */
  async function listAuthUsers() {
    try {
      const resp = await fetch(`${apiBaseUrl}/auth/users`);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Failed to fetch auth users list:', e);
    }
    return { configured: false, users: [] };
  }

  /**
   * Update profile details in Supabase Auth user metadata
   */
  async function updateProfile(profileData) {
    try {
      const resp = await fetch(`${apiBaseUrl}/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn('Backend update-profile unavailable:', e);
    }
    return { ok: false };
  }

  /**
   * Fetch user-scoped scan history from backend / Supabase
   */
  async function fetchUserScans(userId, userEmail) {
    const uid = userId || (window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? (window.MetraScan.Auth.getCurrentUser().id || window.MetraScan.Auth.getCurrentUser().supabaseId) : null);
    const uemail = userEmail || (window.MetraScan && window.MetraScan.Auth && window.MetraScan.Auth.getCurrentUser ? window.MetraScan.Auth.getCurrentUser().email : null);

    if (!uid && !uemail) {
      return { ok: true, scans: [] };
    }

    try {
      const params = new URLSearchParams();
      if (uid) params.append('user_id', uid);
      if (uemail) params.append('user_email', uemail);

      const resp = await fetch(`${apiBaseUrl}/scans?${params.toString()}`);
      if (resp.ok) {
        const data = await resp.json();
        return { ok: true, scans: data.scans || [] };
      }
    } catch (e) {
      console.warn('Unable to reach backend /scans, using local storage:', e);
    }
    return { ok: false, scans: [] };
  }

  // Export API
  window.MetraScan.API = {
    getApiBaseUrl: getApiBaseUrl,
    setApiBaseUrl: setApiBaseUrl,
    checkHealth: checkHealth,
    dataUrlToFile: dataUrlToFile,
    scanImages: scanImages,
    mapVerdictToProduct: mapVerdictToProduct,
    fetchUserScans: fetchUserScans,
    getSupabase: getSupabase,
    checkPhoneExists: checkPhoneExists,
    authSignup: authSignup,
    authLogin: authLogin,
    updateProfile: updateProfile,
    listAuthUsers: listAuthUsers
  };

})(window);

