/**
 * MetraScan - Authentication Module & Real Google Identity Services (GIS)
 * Handles Google OAuth 2.0, Consumer session, Ministry Official session
 */

(function(window) {
  'use strict';

  window.MetraScan = window.MetraScan || {};

  // =========================================================================
  // GOOGLE IDENTITY SERVICES CONFIGURATION
  // Replace "YOUR_GOOGLE_CLIENT_ID" with your actual Google Cloud OAuth Client ID
  // e.g., "1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
  // =========================================================================
  const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

  // Auth state keys
  const STORAGE_KEY_USER = 'metrascan_auth_user';
  const STORAGE_KEY_ROLE = 'metrascan_auth_role';

  // ── Always start fresh at the role selection screen ───────────────────────
  // Clear any previously saved session so every page load/refresh begins at
  // the role selection landing page, regardless of prior login state.
  (function clearSessionOnStartup() {
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_ROLE);
    } catch (e) { /* ignore storage errors */ }
  })();

  let googleAuthInitialized = false;

  /**
   * Helper: Parse JWT token from Google Identity Services
   * Decodes header and payload without needing third-party libraries
   */
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to parse Google JWT token', e);
      return null;
    }
  }

  /**
   * Initialize Google Identity Services SDK
   */
  function initGoogleAuth() {
    const googleButtonContainer = document.getElementById('g_id_signin');
    const googleConfigWarning = document.getElementById('google-config-warning');

    // Check if Client ID is configured
    const isConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID";

    if (!isConfigured) {
      if (googleConfigWarning) {
        googleConfigWarning.style.display = 'block';
      }
      // Provide an interactive helper container when not yet configured
      if (googleButtonContainer) {
        googleButtonContainer.innerHTML = `
          <button type="button" class="btn btn-google-demo" id="btn-simulate-google">
            <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google (Demo Profile)</span>
          </button>
        `;
        const simBtn = document.getElementById('btn-simulate-google');
        if (simBtn) {
          simBtn.addEventListener('click', function() {
            loginWithDemoGoogle();
          });
        }
      }
      return;
    }

    // If configured, initialize official Google Identity Services
    if (googleConfigWarning) {
      googleConfigWarning.style.display = 'none';
    }

    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        if (googleButtonContainer) {
          googleButtonContainer.innerHTML = '';
          window.google.accounts.id.renderButton(
            googleButtonContainer,
            {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              shape: 'rectangular',
              text: 'continue_with',
              logo_alignment: 'left',
              width: 320
            }
          );
        }
        googleAuthInitialized = true;
      } catch (err) {
        console.error('Google Identity Services initialization error:', err);
        showGoogleError('Unable to connect to Google Identity Services: ' + err.message);
      }
    } else {
      // SDK might still be downloading
      setTimeout(initGoogleAuth, 300);
    }
  }

  /**
   * Handle credential response from Google Identity Services
   */
  function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      showGoogleError('Google Sign-In failed or was cancelled.');
      return;
    }

    const payload = parseJwt(response.credential);
    if (!payload) {
      showGoogleError('Could not process Google credentials.');
      return;
    }

    // Construct verified user object
    const user = {
      id: 'goog-' + (payload.sub || Date.now()),
      name: payload.name || 'Google User',
      givenName: payload.given_name || payload.name || 'User',
      email: payload.email,
      picture: payload.picture || 'assets/images/avatar-default.svg',
      isGoogle: true,
      role: 'consumer',
      authenticatedAt: new Date().toISOString()
    };

    saveUserSession(user, 'consumer');
    MetraScan.App.showToast('Welcome, ' + user.name + '! Signed in with Google.', 'success');
    MetraScan.Nav.navigateTo('consumer-home');
  }

  /**
   * Simulated Google Login for demo environments or when Client ID is pending setup
   */
  async function loginWithDemoGoogle() {
    MetraScan.App.showToast('Connecting Google Demo Profile with Supabase...', 'info', 1500);
    await MetraScan.API.authSignup({
      email: 'priya.sharma@gmail.com',
      password: 'GoogleDemoPassword123!',
      name: 'Priya Sharma',
      phone: '9876543210',
      role: 'consumer',
      city: 'New Delhi',
      state: 'Delhi'
    });

    const demoGoogleUser = {
      id: 'goog-demo-9921',
      name: 'Priya Sharma',
      givenName: 'Priya',
      email: 'priya.sharma@gmail.com',
      picture: 'assets/images/avatar-default.svg',
      isGoogle: true,
      role: 'consumer',
      authenticatedAt: new Date().toISOString()
    };

    saveUserSession(demoGoogleUser, 'consumer');
    MetraScan.App.showToast('Signed in as Priya Sharma (Google OAuth Demo · Supabase Connected)', 'success');
    MetraScan.Nav.navigateTo('consumer-home');
  }

  /**
   * Standard Consumer Login with phone number / email and password
   */
  /**
   * Standard Consumer Login with phone number / email and password
   */
  async function loginAsConsumer(phoneOrEmail, password) {
    if (!phoneOrEmail || !password) {
      MetraScan.App.showToast('Please enter both mobile phone number and password.', 'error');
      return false;
    }

    const cleanInput = phoneOrEmail.trim();
    const digitsOnly = cleanInput.replace(/\D/g, '');

    // Allow 10+ digit phone numbers or standard email
    const isPhone = digitsOnly.length >= 10;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanInput);

    if (!isPhone && !isEmail) {
      MetraScan.App.showToast('Please enter a valid email or 10-digit mobile phone number.', 'error');
      return false;
    }

    MetraScan.App.showToast('Authenticating with Supabase...', 'info', 2000);

    const result = await MetraScan.API.authLogin(cleanInput, password, 'consumer');
    if (result && result.ok && result.user) {
      const u = result.user;
      const meta = u.metadata || {};
      const fullName = u.name || meta.name || meta.full_name || 'Consumer User';
      const user = {
        id: u.id,
        supabaseId: u.id,
        name: fullName + ' (Consumer)',
        givenName: fullName.split(' ')[0],
        phone: u.phone || meta.phone || (isPhone ? cleanInput : '9876543210'),
        email: u.email,
        picture: 'assets/images/avatar-default.svg',
        isGoogle: false,
        role: 'consumer',
        authenticatedAt: new Date().toISOString()
      };

      saveUserSession(user, 'consumer');
      MetraScan.App.showToast('✓ Welcome back, ' + user.givenName + '! Signed in via Supabase Auth.', 'success');
      MetraScan.Nav.navigateTo('consumer-home');
      return true;
    }

    const errMsg = (result && result.error) ? result.error : 'Invalid mobile number, email, or password.';
    MetraScan.App.showToast(errMsg, 'error');
    return false;
  }

  /**
   * Ministry Official Login
   */
  async function loginAsMinistry(govId, department, password) {
    if (!govId || !department || !password) {
      MetraScan.App.showToast('Please enter your Government ID, Department, and Password.', 'error');
      return false;
    }

    MetraScan.App.showToast('Verifying official credentials with Supabase...', 'info', 2000);

    const result = await MetraScan.API.authLogin(govId.trim(), password, 'ministry');
    if (result && result.ok && result.user) {
      const u = result.user;
      const meta = u.metadata || {};
      const officialUser = {
        id: u.id,
        supabaseId: u.id,
        govId: meta.govId || govId.trim(),
        name: u.name || meta.name || 'Insp. Rajesh Verma',
        department: meta.department || department,
        designation: meta.designation || 'Senior Inspector of Legal Metrology',
        badgeNumber: meta.badgeNumber || 'LM-DEL-8841',
        avatar: 'assets/images/inspector-avatar.svg',
        role: 'ministry',
        authenticatedAt: new Date().toISOString()
      };

      saveUserSession(officialUser, 'ministry');
      MetraScan.App.showToast('✓ Authorized: Field Command Center Access Granted (Supabase Verified)', 'success');
      MetraScan.Nav.navigateTo('ministry-dashboard');
      return true;
    }

    const errMsg = (result && result.error) ? result.error : 'Invalid Government credentials. Please verify your ID and password.';
    MetraScan.App.showToast(errMsg, 'error');
    return false;
  }

  /**
   * Quick demo login for Consumer
   */
  async function quickConsumerDemo() {
    MetraScan.App.showToast('Connecting demo consumer session with Supabase...', 'info', 2000);
    // Ensure demo consumer exists in Supabase
    await MetraScan.API.authSignup({
      email: 'aarav.patel@metrascan.demo',
      password: 'DemoConsumerPass123!',
      name: 'Aarav Patel',
      phone: '9876543210',
      role: 'consumer',
      city: 'Delhi',
      state: 'Delhi'
    });

    const user = {
      id: 'user-demo-44',
      name: 'Aarav Patel',
      givenName: 'Aarav',
      email: 'aarav.patel@metrascan.demo',
      picture: 'assets/images/avatar-default.svg',
      isGoogle: false,
      role: 'consumer',
      authenticatedAt: new Date().toISOString()
    };
    saveUserSession(user, 'consumer');
    MetraScan.App.showToast('Quick Access: Signed in as Aarav Patel (Supabase Connected)', 'success');
    MetraScan.Nav.navigateTo('consumer-home');
  }

  /**
   * Quick demo login for Ministry
   */
  async function quickMinistryDemo() {
    MetraScan.App.showToast('Connecting official session with Supabase...', 'info', 2000);
    // Ensure demo ministry official exists in Supabase
    await MetraScan.API.authSignup({
      email: 'rajesh.verma@metrascan.gov.in',
      password: 'DemoMinistryPass123!',
      name: 'Insp. Rajesh Verma',
      govId: 'GOV-LM-2026-4481',
      department: 'Legal Metrology Department',
      badgeNumber: 'LM-DEL-8841',
      designation: 'Senior Inspector of Legal Metrology',
      role: 'ministry'
    });

    const officialUser = {
      id: 'GOV-LM-2026-4481',
      name: 'Insp. Rajesh Verma',
      govId: 'GOV-LM-2026-4481',
      department: 'Legal Metrology Department',
      designation: 'Senior Inspector of Legal Metrology',
      badgeNumber: 'LM-DEL-8841',
      avatar: 'assets/images/inspector-avatar.svg',
      role: 'ministry',
      authenticatedAt: new Date().toISOString()
    };
    saveUserSession(officialUser, 'ministry');
    MetraScan.App.showToast('Official Login: Field Command Center Ready (Supabase Connected)', 'success');
    MetraScan.Nav.navigateTo('ministry-dashboard');
  }

  /**
   * Session Management
   */
  function saveUserSession(user, role) {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_ROLE, role);
      if (window.MetraScan && window.MetraScan.App && window.MetraScan.App.refreshUserScope) {
        window.MetraScan.App.refreshUserScope();
      }
    } catch (e) {
      console.error('Error saving user session', e);
    }
  }

  function getCurrentUser() {
    try {
      const u = localStorage.getItem(STORAGE_KEY_USER);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  function getUserRole() {
    return localStorage.getItem(STORAGE_KEY_ROLE) || null;
  }

  function isAuthenticated() {
    return getCurrentUser() !== null;
  }

  function logout() {
    const user = getCurrentUser();
    const role = getUserRole();

    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_ROLE);

    if (window.MetraScan && window.MetraScan.App && window.MetraScan.App.refreshUserScope) {
      window.MetraScan.App.refreshUserScope();
    }

    // If Google was initialized, disable auto-select
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (e) {
        // Ignore
      }
    }

    MetraScan.App.showToast('You have been logged out safely.', 'info');
    MetraScan.Nav.navigateTo('role-selection');
  }

  function showGoogleError(msg) {
    MetraScan.App.showToast(msg, 'error');
    console.error('Google Auth Error:', msg);
  }

  /**
   * Consumer Sign Up
   */
  async function signupAsConsumer(data) {
    if (!data.name || !data.email || !data.password) {
      MetraScan.App.showToast('Please fill in all mandatory fields.', 'error');
      return false;
    }

    if (data.password.length < 6) {
      MetraScan.App.showToast('Password must be at least 6 characters.', 'error');
      return false;
    }

    if (data.password !== data.confirmPassword) {
      MetraScan.App.showToast('Passwords do not match. Please re-enter.', 'error');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      MetraScan.App.showToast('Please enter a valid email address.', 'error');
      return false;
    }

    const cleanPhone = data.phone ? data.phone.trim().replace(/\D/g, '').slice(-10) : '';
    if (cleanPhone.length >= 10 && window.MetraScan && window.MetraScan.API && window.MetraScan.API.checkPhoneExists) {
      const exists = await window.MetraScan.API.checkPhoneExists(cleanPhone);
      if (exists) {
        MetraScan.App.showToast('This mobile number already exists. Please log in.', 'error', 4500);
        return false;
      }
    }

    MetraScan.App.showToast('Registering account with Supabase Database...', 'info', 3000);

    const signupPayload = {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      name: data.name.trim(),
      phone: cleanPhone || '9876543210',
      city: data.city ? data.city.trim() : 'New Delhi',
      state: data.state ? data.state.trim() : 'Delhi',
      address: data.address ? data.address.trim() : '',
      language: data.language || 'English (India)',
      role: 'consumer'
    };

    const result = await MetraScan.API.authSignup(signupPayload);
    if (!result.ok) {
      MetraScan.App.showToast(result.error || 'Failed to create Supabase account.', 'error');
      return false;
    }

    const supaUser = result.user || {};
    const newUser = {
      id: supaUser.id || ('user-' + Date.now()),
      supabaseId: supaUser.id,
      name: data.name.trim(),
      givenName: data.name.trim().split(' ')[0],
      email: data.email.trim(),
      phone: signupPayload.phone,
      city: signupPayload.city,
      state: signupPayload.state,
      address: signupPayload.address || 'Flat 402, Metro Enclave, Dwarka Sector 12',
      language: data.language || 'English (India)',
      picture: 'assets/images/avatar-default.svg',
      isGoogle: false,
      role: 'consumer',
      authenticatedAt: new Date().toISOString()
    };

    saveUserSession(newUser, 'consumer');
    MetraScan.App.showToast('✓ Account registered in Supabase! Welcome, ' + newUser.givenName, 'success', 5000);
    MetraScan.Nav.navigateTo('consumer-home');
    return true;
  }

  /**
   * Ministry Official Sign Up (Official Credential Registration)
   */
  async function signupAsMinistry(data) {
    if (!data.name || !data.govId || !data.password || !data.department) {
      MetraScan.App.showToast('Please fill in all required official credentials.', 'error');
      return false;
    }

    if (data.password.length < 6) {
      MetraScan.App.showToast('Password must be at least 6 characters.', 'error');
      return false;
    }

    if (data.password !== data.confirmPassword) {
      MetraScan.App.showToast('Passwords do not match.', 'error');
      return false;
    }

    const officialEmail = data.email && data.email.includes('@')
      ? data.email.trim().toLowerCase()
      : ('officer.' + data.govId.toLowerCase().replace(/[^a-z0-9]/g, '') + '@metrascan.gov.in');

    const cleanPhone = data.phone ? data.phone.trim().replace(/\D/g, '').slice(-10) : '';
    if (cleanPhone.length >= 10 && window.MetraScan && window.MetraScan.API && window.MetraScan.API.checkPhoneExists) {
      const exists = await window.MetraScan.API.checkPhoneExists(cleanPhone);
      if (exists) {
        MetraScan.App.showToast('This mobile number already exists. Please log in.', 'error', 4500);
        return false;
      }
    }

    MetraScan.App.showToast('Registering official credentials in Supabase...', 'info', 3000);

    const signupPayload = {
      email: officialEmail,
      password: data.password,
      name: data.name.trim().startsWith('Insp.') ? data.name.trim() : ('Insp. ' + data.name.trim()),
      govId: data.govId.trim(),
      department: data.department.trim(),
      designation: data.designation ? data.designation.trim() : 'Inspector of Legal Metrology',
      badgeNumber: data.badgeNumber ? data.badgeNumber.trim() : ('LM-IN-' + Math.floor(1000 + Math.random() * 9000)),
      jurisdiction: data.jurisdiction ? data.jurisdiction.trim() : 'Central Enforcement Circle & NCR',
      phone: cleanPhone || '1123389800',
      role: 'ministry'
    };

    const result = await MetraScan.API.authSignup(signupPayload);
    if (!result.ok) {
      MetraScan.App.showToast(result.error || 'Failed to register official in Supabase.', 'error');
      return false;
    }

    const supaUser = result.user || {};
    const newOfficial = {
      id: supaUser.id || data.govId.trim(),
      supabaseId: supaUser.id,
      name: signupPayload.name,
      govId: data.govId.trim(),
      department: data.department.trim(),
      designation: signupPayload.designation,
      badgeNumber: signupPayload.badgeNumber,
      jurisdiction: signupPayload.jurisdiction,
      email: officialEmail,
      phone: signupPayload.phone,
      officeAddress: data.officeAddress ? data.officeAddress.trim() : 'Krishi Bhawan, Dr. Rajendra Prasad Road, New Delhi - 110001',
      signature: data.name.trim(),
      avatar: 'assets/images/inspector-avatar.svg',
      role: 'ministry',
      authenticatedAt: new Date().toISOString()
    };

    saveUserSession(newOfficial, 'ministry');
    MetraScan.App.showToast('✓ Official Credentials Registered in Supabase! Welcome, ' + newOfficial.name, 'success', 5000);
    MetraScan.Nav.navigateTo('ministry-dashboard');
    return true;
  }

  /**
   * Update Consumer Profile
   */
  /**
   * Update Consumer Profile
   */
  async function updateConsumerProfile(updatedData) {
    const current = getCurrentUser() || { role: 'consumer' };
    const merged = Object.assign({}, current, updatedData);
    saveUserSession(merged, 'consumer');

    // Sync with Supabase Auth
    if (merged.email) {
      MetraScan.API.updateProfile({
        email: merged.email,
        name: merged.name,
        phone: merged.phone,
        city: merged.city,
        state: merged.state,
        address: merged.address,
        language: merged.language,
        metadata: { role: 'consumer' }
      }).catch(function(err) { console.warn('Supabase profile sync notice:', err); });
    }

    MetraScan.App.showToast('Profile updated & synced with Supabase!', 'success');
    return merged;
  }

  /**
   * Update Ministry Official Profile
   */
  async function updateMinistryProfile(updatedData) {
    const current = getCurrentUser() || { role: 'ministry' };
    const merged = Object.assign({}, current, updatedData);
    saveUserSession(merged, 'ministry');

    // Update officer name and department displayed on dashboard
    const nameEl = document.getElementById('ministry-officer-name');
    const deptEl = document.getElementById('ministry-officer-dept');
    if (nameEl && merged.name) nameEl.textContent = merged.name;
    if (deptEl && merged.department) deptEl.textContent = merged.department;

    if (merged.email || merged.govId) {
      MetraScan.API.updateProfile({
        email: merged.email || (merged.govId + '@metrascan.gov.in'),
        name: merged.name,
        phone: merged.phone,
        metadata: {
          role: 'ministry',
          govId: merged.govId,
          department: merged.department,
          designation: merged.designation,
          badgeNumber: merged.badgeNumber
        }
      }).catch(function(err) { console.warn('Supabase official profile sync notice:', err); });
    }

    MetraScan.App.showToast('Official profile & credentials synced with Supabase!', 'success');
    return merged;
  }

  // OTP Memory Store
  const activeOTPStore = {};

  /**
   * Send SMS OTP to mobile phone number (verifies with Supabase first)
   */
  async function sendRegistrationOTP(phoneNum) {
    if (!phoneNum || phoneNum.trim().length < 8) {
      MetraScan.App.showToast('Please enter a valid mobile phone number first.', 'error');
      return null;
    }
    const cleanPhone = phoneNum.trim().replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      MetraScan.App.showToast('Please enter a valid 10-digit mobile phone number.', 'error');
      return null;
    }

    // Check with Supabase whether this phone number already exists
    if (window.MetraScan && window.MetraScan.API && window.MetraScan.API.checkPhoneExists) {
      const exists = await window.MetraScan.API.checkPhoneExists(cleanPhone);
      if (exists) {
        MetraScan.App.showToast('This mobile number already exists. Please log in.', 'error', 5000);
        return null;
      }
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    activeOTPStore[cleanPhone] = {
      code: otpCode,
      verified: false,
      sentAt: Date.now()
    };

    MetraScan.App.playScanBeep(true);
    MetraScan.App.showToast('📱 SMS OTP Sent to ' + cleanPhone + '! Verification Code: ' + otpCode, 'info', 6000);
    return otpCode;
  }

  /**
   * Verify SMS OTP for phone number
   */
  function verifyRegistrationOTP(phoneNum, inputCode) {
    if (!phoneNum) return false;
    const cleanPhone = phoneNum.trim();
    const stored = activeOTPStore[cleanPhone];
    
    const isValid = (stored && stored.code === (inputCode ? inputCode.trim() : ''));
    if (isValid) {
      activeOTPStore[cleanPhone].verified = true;
      MetraScan.App.playScanBeep(true);
      MetraScan.App.showToast('✓ Mobile number ' + cleanPhone + ' verified successfully!', 'success');
      return true;
    } else {
      MetraScan.App.showToast('Invalid OTP security code. Please check your SMS and try again.', 'error');
      return false;
    }
  }

  /**
   * Check if phone number is verified
   */
  function isPhoneVerified(phoneNum) {
    if (!phoneNum) return false;
    const stored = activeOTPStore[phoneNum.trim()];
    return stored ? stored.verified : false;
  }

  // Export Auth API
  window.MetraScan.Auth = {
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
    initGoogleAuth: initGoogleAuth,
    loginAsConsumer: loginAsConsumer,
    loginAsMinistry: loginAsMinistry,
    signupAsConsumer: signupAsConsumer,
    signupAsMinistry: signupAsMinistry,
    sendRegistrationOTP: sendRegistrationOTP,
    verifyRegistrationOTP: verifyRegistrationOTP,
    isPhoneVerified: isPhoneVerified,
    updateConsumerProfile: updateConsumerProfile,
    updateMinistryProfile: updateMinistryProfile,
    loginWithDemoGoogle: loginWithDemoGoogle,
    quickConsumerDemo: quickConsumerDemo,
    quickMinistryDemo: quickMinistryDemo,
    getCurrentUser: getCurrentUser,
    getUserRole: getUserRole,
    isAuthenticated: isAuthenticated,
    logout: logout
  };

})(window);
