/**
 * MetraScan - Navigation & View Routing Engine
 * Responsive SPA Router with History Stack, Bottom Nav Controller & Screen Transitions
 */

(function(window) {
  'use strict';

  window.MetraScan = window.MetraScan || {};

  let currentView = 'role-selection';
  let navHistory = [];
  let currentParams = {};

  const CONSUMER_NAV_VIEWS = ['consumer-home', 'consumer-verification', 'consumer-history', 'consumer-saved', 'consumer-profile'];

  /**
   * Navigate to a screen
   * @param {string} viewId - ID of view without 'screen-' prefix
   * @param {object} params - Optional parameters (e.g. productId, reportId)
   * @param {boolean} isBack - Whether this is a back navigation
   */
  function navigateTo(viewId, params, isBack) {
    if (!isBack && currentView !== viewId) {
      navHistory.push({ view: currentView, params: currentParams });
    }

    // Stop camera if navigating away from scan
    if (currentView === 'consumer-scan' && viewId !== 'consumer-scan') {
      if (window.MetraScan.Consumer && window.MetraScan.Consumer.stopCamera) {
        window.MetraScan.Consumer.stopCamera();
      }
    }
    if (currentView === 'ministry-scan' && viewId !== 'ministry-scan') {
      if (window.MetraScan.Ministry && window.MetraScan.Ministry.stopInspectorCamera) {
        window.MetraScan.Ministry.stopInspectorCamera();
      }
    }

    currentView = viewId;
    currentParams = params || {};

    // Hide all view screens
    const allScreens = document.querySelectorAll('.app-screen');
    allScreens.forEach(function(el) {
      el.classList.remove('active');
    });

    // Show target view screen
    const targetScreen = document.getElementById('screen-' + viewId);
    if (targetScreen) {
      targetScreen.classList.add('active');
      window.scrollTo(0, 0);
    } else {
      console.warn('Target screen not found:', 'screen-' + viewId);
    }

    // Reset splash landing when returning to role-selection
    if (viewId === 'role-selection') {
      const splash    = document.getElementById('ms-splash');
      const rolesView = document.getElementById('ms-roles-view');
      if (splash)    splash.classList.remove('ms-hidden');
      if (rolesView) rolesView.classList.remove('ms-visible');
    }

    // Toggle zero padding on app-main for full-viewport screens (splash, auth, scanners)
    const NO_PADDING_VIEWS = ['role-selection', 'consumer-login', 'consumer-signup', 'ministry-login', 'ministry-signup', 'consumer-scan', 'ministry-scan'];
    const appMain = document.getElementById('app-main');
    if (appMain) {
      if (NO_PADDING_VIEWS.indexOf(viewId) > -1) {
        appMain.classList.add('app-main-no-padding');
      } else {
        appMain.classList.remove('app-main-no-padding');
      }
    }

    // Manage bottom navigation visibility
    const bottomNav = document.getElementById('consumer-bottom-nav');
    if (bottomNav) {
      if (CONSUMER_NAV_VIEWS.indexOf(viewId) > -1) {
        bottomNav.style.display = 'flex';
        updateBottomNavActiveState(viewId);
      } else {
        bottomNav.style.display = 'none';
      }
    }

    // Trigger Screen-specific Lifecycle Callbacks
    triggerScreenLifecycle(viewId, currentParams);
  }

  /**
   * Back button navigation
   */
  function goBack() {
    if (navHistory.length > 0) {
      const prev = navHistory.pop();
      navigateTo(prev.view, prev.params, true);
    } else {
      // Fallback default routing
      const user = MetraScan.Auth.getCurrentUser();
      const role = MetraScan.Auth.getUserRole();
      if (role === 'ministry') {
        navigateTo('ministry-dashboard', {}, true);
      } else if (role === 'consumer') {
        navigateTo('consumer-home', {}, true);
      } else {
        navigateTo('role-selection', {}, true);
      }
    }
  }

  /**
   * Update bottom navigation active tab
   */
  function updateBottomNavActiveState(viewId) {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach(function(item) {
      item.classList.remove('active');
      const target = item.getAttribute('data-nav-target');
      if (target === viewId) {
        item.classList.add('active');
      }
    });
  }

  /**
   * Lifecycle trigger for specific screens
   */
  function triggerScreenLifecycle(viewId, params) {
    switch (viewId) {
      case 'consumer-login':
        if (MetraScan.Auth && MetraScan.Auth.initGoogleAuth) {
          MetraScan.Auth.initGoogleAuth();
        }
        break;

      case 'consumer-home':
        if (MetraScan.Consumer && MetraScan.Consumer.renderHome) {
          MetraScan.Consumer.renderHome();
        }
        break;

      case 'consumer-scan':
        if (MetraScan.Consumer && MetraScan.Consumer.initScanner) {
          MetraScan.Consumer.initScanner();
        }
        break;

      case 'consumer-verification':
        if (MetraScan.Consumer && MetraScan.Consumer.renderVerification) {
          MetraScan.Consumer.renderVerification(params.productId || 'prod-001');
        }
        break;

      case 'consumer-history':
        if (MetraScan.Consumer && MetraScan.Consumer.renderHistory) {
          MetraScan.Consumer.renderHistory();
        }
        break;

      case 'consumer-saved':
        if (MetraScan.Consumer && MetraScan.Consumer.renderSaved) {
          MetraScan.Consumer.renderSaved();
        }
        break;

      case 'consumer-profile':
        if (MetraScan.Consumer && MetraScan.Consumer.renderProfile) {
          MetraScan.Consumer.renderProfile();
        }
        break;

      case 'consumer-report-view':
        if (MetraScan.Consumer && MetraScan.Consumer.renderConsumerReport) {
          MetraScan.Consumer.renderConsumerReport(params.productId || 'prod-001', params.location);
        }
        break;

      case 'ministry-dashboard':
        if (MetraScan.Ministry && MetraScan.Ministry.renderDashboard) {
          MetraScan.Ministry.renderDashboard();
        }
        break;

      case 'ministry-scan':
        if (MetraScan.Ministry && MetraScan.Ministry.initInspectorScanner) {
          MetraScan.Ministry.initInspectorScanner();
        }
        break;

      case 'ministry-profile':
        if (MetraScan.Ministry && MetraScan.Ministry.renderInspectorProfile) {
          MetraScan.Ministry.renderInspectorProfile();
        }
        break;

      case 'ministry-inspection':
        if (MetraScan.Ministry && MetraScan.Ministry.initInspectionWizard) {
          MetraScan.Ministry.initInspectionWizard(params.productId, params.location);
        }
        break;

      case 'ministry-report-confirm':
        if (MetraScan.Ministry && MetraScan.Ministry.renderReportConfirm) {
          MetraScan.Ministry.renderReportConfirm(params.reportId);
        }
        break;

      case 'ministry-report-view':
        if (MetraScan.Ministry && MetraScan.Ministry.renderOfficialReport) {
          MetraScan.Ministry.renderOfficialReport(params.reportId);
        }
        break;

      case 'ministry-history':
        if (MetraScan.Ministry && MetraScan.Ministry.renderHistory) {
          MetraScan.Ministry.renderHistory();
        }
        break;
    }
  }

  /**
   * Set up global navigation listeners on elements with data-navigate
   */
  function initNavigationEvents() {
    document.addEventListener('click', function(e) {
      // Find closest element with data-navigate or data-back
      const navBtn = e.target.closest('[data-navigate]');
      if (navBtn) {
        e.preventDefault();
        const targetView = navBtn.getAttribute('data-navigate');
        const paramStr = navBtn.getAttribute('data-params');
        let params = {};
        if (paramStr) {
          try {
            params = JSON.parse(paramStr);
          } catch (err) {
            params = { id: paramStr };
          }
        }
        navigateTo(targetView, params);
        return;
      }

      const backBtn = e.target.closest('[data-back]');
      if (backBtn) {
        e.preventDefault();
        goBack();
        return;
      }
    });

    // Bottom Navigation Clicks
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(function(item) {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const target = this.getAttribute('data-nav-target');
        if (target) {
          navigateTo(target);
        }
      });
    });
  }

  // Export Navigation API
  window.MetraScan.Nav = {
    navigateTo: navigateTo,
    goBack: goBack,
    getCurrentView: function() { return currentView; },
    getParams: function() { return currentParams; },
    initNavigationEvents: initNavigationEvents
  };

})(window);
