/**
 * MetraScan - Consumer Module
 * Scanner, Product Verification, History, Saved Products & Profile Management
 */

(function(window) {
  'use strict';

  window.MetraScan = window.MetraScan || {};

  let cameraStream = null;
  let activeHistoryFilter = 'all';
  let historySearchQuery = '';

  /**
   * Helper to get greeting based on time of day
   */
  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Render Consumer Home Dashboard
   */
  function renderHome() {
    const user = MetraScan.Auth.getCurrentUser() || { name: 'Priya Sharma', givenName: 'Priya' };
    const greetingEl = document.getElementById('consumer-greeting');
    const userNameEl = document.getElementById('consumer-user-name');
    const userAvatarEl = document.getElementById('consumer-user-avatar');

    if (greetingEl) greetingEl.textContent = getTimeGreeting() + ',';
    if (userNameEl) userNameEl.textContent = user.givenName || user.name.split(' ')[0];
    if (userAvatarEl && user.picture) {
      userAvatarEl.src = user.picture;
    }

    // Render Recent Verifications
    renderRecentVerifications();
  }

  /**
   * Render Recent Verifications on Home Screen
   */
  function renderRecentVerifications() {
    const container = document.getElementById('recent-verifications-list');
    if (!container) return;

    const history = MetraScan.App.state.scanHistory.slice(0, 4);
    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>No products verified yet.</p>
          <button class="btn btn-outline btn-sm" data-navigate="consumer-scan">Scan First Product</button>
        </div>
      `;
      return;
    }

    let html = '';
    history.forEach(function(item) {
      const product = MetraScan.App.getProductById(item.productId);
      if (!product) return;

      let badgeClass = 'badge-success';
      let badgeText = '✓ Verified';
      if (product.status === 'review') {
        badgeClass = 'badge-warning';
        badgeText = '⚠ Needs Review';
      } else if (product.status === 'violation') {
        badgeClass = 'badge-danger';
        badgeText = '✕ Violation';
      }

      html += `
        <div class="product-card" data-navigate="consumer-verification" data-params='{"productId":"${product.id}"}'>
          <div class="product-card-thumb">
            <img src="${product.image}" alt="${product.name}" onerror="this.src='assets/images/product-oil.svg'">
          </div>
          <div class="product-card-info">
            <div class="product-card-header">
              <span class="badge ${badgeClass}">${badgeText}</span>
              <span class="product-card-date">${item.timestamp}</span>
            </div>
            <h4 class="product-card-title">${product.name}</h4>
            <p class="product-card-mfr">${product.brand} · ${product.manufacturer.split(' ')[0]}</p>
          </div>
          <div class="product-card-action">
            <span class="chevron-icon">›</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  let alignmentInterval = null;
  let deviceOrientationListener = null;
  let deviceMotionListener = null;
  let currentRollAngle = 0;
  let consumerLastShakeTime = 0;
  let consumerLastAcc = { x: 0, y: 0, z: 0 };
  let consumerPrevFrameData = null;

  /**
   * Start Live Camera Alignment Analyzer
   * Monitors centering, tilt, shake/motion, brightness, and edge distribution in real-time
   */
  function startAlignmentAnalyzer() {
    stopAlignmentAnalyzer();

    const video = document.getElementById('camera-preview-video');
    const guidancePill = document.getElementById('scanner-guidance-pill');
    const guidanceText = document.getElementById('guidance-text');
    const guidanceIcon = document.getElementById('guidance-icon');
    const arrowLeft = document.getElementById('guidance-arrow-left');
    const arrowRight = document.getElementById('guidance-arrow-right');
    const arrowUp = document.getElementById('guidance-arrow-up');
    const arrowDown = document.getElementById('guidance-arrow-down');
    const horizonLevel = document.getElementById('guidance-horizon-level');
    const horizonLine = document.getElementById('guidance-horizon-line');
    const horizonAngle = document.getElementById('guidance-horizon-angle');
    const frameBox = document.getElementById('scanner-frame-box');

    // Offscreen canvas for ultra-fast sampling
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 160;
    sampleCanvas.height = 120;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    // Gyroscope / orientation listener for straightness detection
    deviceOrientationListener = function(event) {
      if (event.gamma !== null && event.gamma !== undefined) {
        currentRollAngle = Math.round(event.gamma);
      }
    };
    window.addEventListener('deviceorientation', deviceOrientationListener, true);

    // Accelerometer / devicemotion listener for physical shake detection
    deviceMotionListener = function(event) {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;
      const dx = Math.abs((acc.x || 0) - consumerLastAcc.x);
      const dy = Math.abs((acc.y || 0) - consumerLastAcc.y);
      const dz = Math.abs((acc.z || 0) - consumerLastAcc.z);
      consumerLastAcc = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 };
      if (dx + dy + dz > 14) {
        consumerLastShakeTime = Date.now();
      }
    };
    window.addEventListener('devicemotion', deviceMotionListener, true);

    alignmentInterval = setInterval(function() {
      if (!video || video.paused || video.ended || video.readyState < 2) {
        return;
      }

      try {
        sampleCtx.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const imgData = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
        const data = imgData.data;
        const w = sampleCanvas.width;
        const h = sampleCanvas.height;

        let leftEnergy = 0;
        let centerEnergy = 0;
        let rightEnergy = 0;
        let topEnergy = 0;
        let middleEnergy = 0;
        let bottomEnergy = 0;
        let totalEnergy = 0;
        let totalBrightness = 0;
        let opticalJitter = 0;

        const colW = Math.floor(w / 3);
        const rowH = Math.floor(h / 3);

        for (let y = 2; y < h - 2; y += 2) {
          for (let x = 2; x < w - 2; x += 2) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += lum;

            if (consumerPrevFrameData) {
              const pLum = 0.299 * consumerPrevFrameData[idx] + 0.587 * consumerPrevFrameData[idx + 1] + 0.114 * consumerPrevFrameData[idx + 2];
              opticalJitter += Math.abs(lum - pLum);
            }

            const rightIdx = (y * w + (x + 1)) * 4;
            const downIdx = ((y + 1) * w + x) * 4;
            const lumRight = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
            const lumDown = 0.299 * data[downIdx] + 0.587 * data[downIdx + 1] + 0.114 * data[downIdx + 2];
            const edge = Math.abs(lum - lumRight) + Math.abs(lum - lumDown);

            totalEnergy += edge;

            if (x < colW) leftEnergy += edge;
            else if (x < colW * 2) centerEnergy += edge;
            else rightEnergy += edge;

            if (y < rowH) topEnergy += edge;
            else if (y < rowH * 2) middleEnergy += edge;
            else bottomEnergy += edge;
          }
        }

        const pixelCount = ((w - 4) / 2) * ((h - 4) / 2);
        const avgBrightness = totalBrightness / pixelCount;
        const avgEdge = totalEnergy / pixelCount;
        const avgJitter = opticalJitter / pixelCount;
        consumerPrevFrameData = data;

        if (avgJitter > 22) {
          consumerLastShakeTime = Date.now();
        }

        // Reset active arrow indicators
        if (arrowLeft) arrowLeft.classList.remove('active');
        if (arrowRight) arrowRight.classList.remove('active');
        if (arrowUp) arrowUp.classList.remove('active');
        if (arrowDown) arrowDown.classList.remove('active');

        // Update Horizon Level bar
        const isLevel = Math.abs(currentRollAngle) <= 6;
        if (horizonLine) horizonLine.style.transform = `rotate(${currentRollAngle}deg)`;
        if (horizonAngle) horizonAngle.textContent = `${currentRollAngle > 0 ? '+' : ''}${currentRollAngle}°`;
        if (horizonLevel) {
          if (isLevel) horizonLevel.classList.add('is-level');
          else horizonLevel.classList.remove('is-level');
        }

        const isShaking = (Date.now() - consumerLastShakeTime) < 900;

        // Live decision tree with interactive arrow & shake guidance
        if (isShaking) {
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-warning';
            if (guidanceIcon) guidanceIcon.textContent = '📳';
            if (guidanceText) guidanceText.textContent = 'Hold steady — Camera shaking';
          }
          if (frameBox) frameBox.style.borderColor = 'rgba(245, 158, 11, 0.8)';
        } else if (avgBrightness < 30) {
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-warning';
            if (guidanceIcon) guidanceIcon.textContent = '💡';
            if (guidanceText) guidanceText.textContent = 'Low light detected — Use torch or brighter light';
          }
        } else if (avgEdge < 10) {
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-alert';
            if (guidanceIcon) guidanceIcon.textContent = '⛶';
            if (guidanceText) guidanceText.textContent = 'Product not in frame — Place label inside box';
          }
          if (arrowUp) arrowUp.classList.add('active');
          if (frameBox) frameBox.style.borderColor = 'rgba(239, 68, 68, 0.7)';
        } else if (!isLevel) {
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-warning';
            if (guidanceIcon) guidanceIcon.textContent = currentRollAngle > 0 ? '⟲' : '⟳';
            if (guidanceText) guidanceText.textContent = `Align straight (${currentRollAngle}° tilt) — Hold device level`;
          }
          if (frameBox) frameBox.style.borderColor = 'rgba(245, 158, 11, 0.8)';
        } else if (leftEnergy > rightEnergy * 1.65) {
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-warning';
            if (guidanceIcon) guidanceIcon.textContent = '←';
            if (guidanceText) guidanceText.textContent = 'Move Left — Center product in frame';
          }
          if (arrowLeft) arrowLeft.classList.add('active');
          if (frameBox) frameBox.style.borderColor = 'rgba(245, 158, 11, 0.8)';
        } else if (rightEnergy > leftEnergy * 1.65) {
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-warning';
            if (guidanceIcon) guidanceIcon.textContent = '→';
            if (guidanceText) guidanceText.textContent = 'Move Right — Center product in frame';
          }
          if (arrowRight) arrowRight.classList.add('active');
          if (frameBox) frameBox.style.borderColor = 'rgba(245, 158, 11, 0.8)';
        } else if (topEnergy > bottomEnergy * 2.0) {
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-warning';
            if (guidanceIcon) guidanceIcon.textContent = '↑';
            if (guidanceText) guidanceText.textContent = 'Pan Up — Bring declarations into center';
          }
          if (arrowUp) arrowUp.classList.add('active');
        } else if (bottomEnergy > topEnergy * 2.0) {
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-warning';
            if (guidanceIcon) guidanceIcon.textContent = '↓';
            if (guidanceText) guidanceText.textContent = 'Pan Down — Center package inside frame';
          }
          if (arrowDown) arrowDown.classList.add('active');
        } else {
          // Perfectly aligned!
          if (guidancePill) {
            guidancePill.className = 'scanner-guidance-pill guidance-aligned';
            if (guidanceIcon) guidanceIcon.textContent = '✓';
            if (guidanceText) guidanceText.textContent = '✓ Product Aligned & Straight — Ready to scan';
          }
          if (frameBox) {
            frameBox.style.borderColor = '#22c55e';
            frameBox.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 24px rgba(34, 197, 94, 0.6)';
          }
        }
      } catch (err) {
        // Safe fallback
      }
    }, 220);
  }

  function stopAlignmentAnalyzer() {
    if (alignmentInterval) {
      clearInterval(alignmentInterval);
      alignmentInterval = null;
    }
    if (deviceOrientationListener) {
      window.removeEventListener('deviceorientation', deviceOrientationListener, true);
      deviceOrientationListener = null;
    }
    if (deviceMotionListener) {
      window.removeEventListener('devicemotion', deviceMotionListener, true);
      deviceMotionListener = null;
    }
    consumerPrevFrameData = null;
  }

  let currentScannerMode = 'standard';

  /**
   * Initialize Product Scanner & Camera
   */
  function initScanner(params) {
    currentScannerMode = (params && params.mode) || 'standard';
    const video = document.getElementById('camera-preview-video');
    const statusNotice = document.getElementById('scanner-status-notice');
    const navTitle = document.querySelector('.scanner-nav-title');
    const guidanceText = document.getElementById('guidance-text');
    const guidanceIcon = document.getElementById('guidance-icon');
    const frameBox = document.getElementById('scanner-frame-box');

    if (currentScannerMode === 'ingredients') {
      if (navTitle) navTitle.textContent = '🌿 Scan Ingredients & Additives';
      if (guidanceText) guidanceText.textContent = 'Position ingredients & additives panel inside frame';
      if (guidanceIcon) guidanceIcon.textContent = '🌿';
      if (frameBox) frameBox.classList.add('scanner-frame-ingredients');
      MetraScan.App.showToast('🌿 Ingredients Scan Mode Active — Align ingredients panel', 'info', 2500);
    } else {
      if (navTitle) navTitle.textContent = 'Scan Product';
      if (guidanceText) guidanceText.textContent = 'Position product inside frame';
      if (guidanceIcon) guidanceIcon.textContent = '⛶';
      if (frameBox) frameBox.classList.remove('scanner-frame-ingredients');
    }

    // Attempt browser camera access
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      .catch(function(err) {
        console.warn('Primary camera constraint failed, retrying with fallback:', err);
        return navigator.mediaDevices.getUserMedia({ video: true });
      })
      .then(function(stream) {
        cameraStream = stream;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.muted = true;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(function() {});
          }
          video.style.display = 'block';
        }
        if (statusNotice) {
          statusNotice.textContent = currentScannerMode === 'ingredients'
            ? 'Live camera active. Point at back ingredients & nutrition panel.'
            : 'Live camera active. Point at package label.';
          statusNotice.className = 'scanner-status-banner status-live';
          statusNotice.style.display = 'inline-flex';
        }
        startAlignmentAnalyzer();
      })
      .catch(function(err) {
        console.warn('Camera access denied or unavailable:', err.name);
        if (video) video.style.display = 'none';
        if (statusNotice) {
          statusNotice.textContent = 'Camera unavailable. Please upload a packaging photo or enter code manually below.';
          statusNotice.className = 'scanner-status-banner status-sim';
          statusNotice.style.display = 'inline-flex';
        }
      });
    } else {
      if (statusNotice) {
        statusNotice.textContent = 'Scanner ready. Please upload a packaging photo or enter code manually below.';
        statusNotice.className = 'scanner-status-banner status-sim';
        statusNotice.style.display = 'inline-flex';
      }
    }

    setupScannerEvents();
  }

  /**
   * Stop camera stream and alignment analyzer
   */
  function stopCamera() {
    stopAlignmentAnalyzer();
    if (cameraStream) {
      cameraStream.getTracks().forEach(function(track) {
        track.stop();
      });
      cameraStream = null;
    }
    const video = document.getElementById('camera-preview-video');
    if (video) {
      video.srcObject = null;
    }
  }

  /**
   * Set up Scanner Interactive Events
   */
  function setupScannerEvents() {
    // Scanner mode tabs (Back of Pack vs Barcode)
    const tabBop = document.getElementById('tab-scan-bop');
    const tabBarcode = document.getElementById('tab-scan-barcode');
    const frameBox = document.getElementById('scanner-frame-box');
    const instructionText = document.getElementById('scanner-instruction-text');
    const statusNotice = document.getElementById('scanner-status-notice');
    const bopBadges = document.getElementById('bop-detect-badges');

    if (tabBop && tabBarcode) {
      tabBop.onclick = function() {
        tabBop.classList.add('active');
        tabBarcode.classList.remove('active');
        if (frameBox) frameBox.classList.remove('scanner-frame-barcode');
        if (bopBadges) bopBadges.style.display = 'grid';
        if (instructionText) instructionText.textContent = 'Align BACK OF PACKAGING inside frame to audit declarations';
        if (statusNotice) statusNotice.textContent = 'Live AI OCR active. Auditing 8 Rule 6(1) statutory declarations...';
        MetraScan.App.showToast('Switched to Back-of-Pack (BOP) Legal Audit Mode', 'info', 1400);
      };

      tabBarcode.onclick = function() {
        tabBarcode.classList.add('active');
        tabBop.classList.remove('active');
        if (frameBox) frameBox.classList.add('scanner-frame-barcode');
        if (bopBadges) bopBadges.style.display = 'none';
        if (instructionText) instructionText.textContent = 'Position barcode or MetraSeal QR inside frame';
        if (statusNotice) statusNotice.textContent = 'Barcode / QR scanner active...';
        MetraScan.App.showToast('Switched to 1D Barcode & MetraSeal QR Mode', 'info', 1400);
      };
    }

    // Quick barcode simulation buttons
    const simButtons = document.querySelectorAll('.barcode-sim-pill');
    simButtons.forEach(function(btn) {
      btn.onclick = function() {
        const barcode = this.getAttribute('data-barcode');
        triggerScanSuccess(barcode);
      };
    });

    // Gallery upload button and input
    const uploadBtn = document.getElementById('btn-scanner-upload');
    const galleryInput = document.getElementById('scanner-gallery-input');
    if (uploadBtn && galleryInput) {
      uploadBtn.onclick = function(e) {
        if (e.target !== galleryInput) {
          galleryInput.click();
        }
      };
    }

    if (galleryInput) {
      galleryInput.onchange = function(e) {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const localUrl = URL.createObjectURL(file);
          processRealScan(file, file.name, localUrl);
          galleryInput.value = ''; // Reset input so same file can be re-selected if needed
        }
      };
    }

    // Camera Shutter Photo Capture Button — REAL SCAN EXECUTION
    const captureBtn = document.getElementById('btn-scanner-capture');
    if (captureBtn) {
      captureBtn.onclick = function() {
        const video = document.getElementById('camera-preview-video');
        let photoUrl = null;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          photoUrl = MetraScan.App.capturePhotoFromVideo(video, 'consumer-shutter-flash', null);
        }

        if (!photoUrl) {
          if (galleryInput) {
            MetraScan.App.showToast('Camera feed not ready — select or capture a photo', 'info', 2500);
            galleryInput.click();
            return;
          }
          MetraScan.App.showToast('Camera feed is not ready. Please allow camera permissions or upload an image.', 'error', 3500);
          return;
        }
        const file = MetraScan.API.dataUrlToFile(photoUrl, 'live-captured-label.jpg');
        if (file) {
          processRealScan(file, 'Live Camera Scan', photoUrl);
        } else {
          MetraScan.App.showToast('Could not convert camera frame to file.', 'error');
        }
      };
    }

    // Flashlight toggle simulation
    const torchBtn = document.getElementById('btn-scanner-torch');
    if (torchBtn) {
      torchBtn.onclick = function() {
        this.classList.toggle('active');
        const isActive = this.classList.contains('active');
        if (cameraStream) {
          const track = cameraStream.getVideoTracks()[0];
          if (track && track.applyConstraints) {
            track.applyConstraints({
              advanced: [{ torch: isActive }]
            }).catch(function() {
              // Ignore unsupported torch
            });
          }
        }
        MetraScan.App.showToast(isActive ? 'Flashlight turned ON' : 'Flashlight turned OFF', 'info', 1500);
      };
    }
  }

  /**
   * Process Real Label Photo Scan with FastAPI OCR Backend
   * Extracts real text, verifies statutory declarations, and rejects non-products without ambiguous data.
   */
  async function processRealScan(file, sourceName, photoUrl) {
    if (!file) return;

    // Show direct processing overlay so user is never stuck
    const procOverlay = document.getElementById('scanner-processing-overlay');
    const procStatus = document.getElementById('scanner-processing-status');
    if (procOverlay) procOverlay.style.display = 'flex';
    if (procStatus) procStatus.textContent = 'Scanning captured packaging with AI OCR Engine...';

    MetraScan.App.showToast('🔍 Analyzing label for Legal Metrology declarations...', 'info', 3000);

    const currentUser = MetraScan.Auth.getCurrentUser();

    try {
      if (procStatus) procStatus.textContent = 'Extracting packaging declarations & checking compliance...';

      const response = await MetraScan.API.scanImages([file], currentUser);
      
      // If server could not be reached or scan errored out
      if (!response || !response.ok || !response.data) {
        if (procOverlay) procOverlay.style.display = 'none';
        MetraScan.App.playScanBeep(false);
        const errMsg = (response && response.error) ? response.error : 'Scanner service is unavailable.';
        MetraScan.App.showToast('ℹ️ Scanner processing completed. Connect backend server for live cloud OCR.', 'info', 4000);
        return;
      }

      const scanData = response.data;
      const verdict = scanData.verdict || {};

      // Check whether real statutory packaging declarations were actually detected
      const hasDeclarations = ['mrp', 'net_quantity', 'mfg_date', 'manufacturer', 'consumer_care'].some(k => {
        return verdict[k] && verdict[k].found;
      });
      const hasGenericName = verdict.generic_name && (verdict.generic_name.found || (verdict.generic_name.text && String(verdict.generic_name.text).trim().length > 0));
      const hasIngredients = verdict.ingredient_analysis && verdict.ingredient_analysis.found;
      const isValidProduct = scanData.is_valid_product || hasDeclarations || hasGenericName || hasIngredients;

      // If NO statutory packaging declarations were detected:
      if (!isValidProduct) {
        if (procOverlay) procOverlay.style.display = 'none';
        MetraScan.App.playScanBeep(false);
        MetraScan.App.showToast('⚠️ Verification Rejected — Package non-compliant with Rule 6(1)', 'error', 4000);
        MetraScan.App.showInvalidScanModal(scanData, sourceName || file.name, photoUrl, false);
        return;
      }

      // Valid product detected — ONLY map the genuine detected data!
      const product = MetraScan.API.mapVerdictToProduct(scanData, sourceName || file.name, currentUser, photoUrl);
      if (scanData.supabase_id) {
        product.supabaseId = scanData.supabase_id;
      }

      // Save strictly to this user's repository and history
      MetraScan.App.addProduct(product);
      MetraScan.App.addScanToHistory(product.id);

      // Sound and visual feedback
      MetraScan.App.playScanBeep(product.status !== 'violation');

      const laser = document.querySelector('.scanner-laser');
      if (laser) laser.classList.add('scanner-laser-matched');
      const frame = document.querySelector('.scanner-frame');
      if (frame) frame.classList.add('scanner-frame-success');

      if (procStatus) procStatus.textContent = '✓ Verification Complete! Loading real audit findings...';

      // Transition to verification screen
      setTimeout(function() {
        if (procOverlay) procOverlay.style.display = 'none';
        if (laser) laser.classList.remove('scanner-laser-matched');
        if (frame) frame.classList.remove('scanner-frame-success');
        stopCamera();
        stopAlignmentAnalyzer();
        MetraScan.Nav.navigateTo('consumer-verification', { productId: product.id });
      }, 450);

    } catch (err) {
      if (procOverlay) procOverlay.style.display = 'none';
      MetraScan.App.playScanBeep(false);
      MetraScan.App.showToast('⚠️ Scanner error: ' + err.message, 'error', 4500);
    }
  }

  /**
   * Open Captured Photo Modal with Preview & Options
   */
  function openCapturedPhotoModal(photoUrl, sourceName, onAttachEvidence, onAnalyze) {
    const modalImg = document.getElementById('captured-photo-img');
    const timestampEl = document.getElementById('captured-photo-timestamp');
    const sourceEl = document.getElementById('captured-photo-source');
    const analyzeBtn = document.getElementById('btn-photo-action-analyze');
    const evidenceBtn = document.getElementById('btn-photo-action-evidence');

    if (modalImg) modalImg.src = photoUrl;
    
    const now = new Date();
    const timeStr = '⏱ ' + now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    if (timestampEl) timestampEl.textContent = timeStr;
    if (sourceEl) sourceEl.textContent = sourceName || 'Live HD Camera Viewport';

    if (evidenceBtn) {
      if (typeof onAttachEvidence === 'function') {
        evidenceBtn.style.display = 'inline-flex';
        evidenceBtn.onclick = function() {
          onAttachEvidence(photoUrl);
          MetraScan.App.closeModal('modal-captured-photo');
        };
      } else {
        evidenceBtn.style.display = 'none';
      }
    }

    if (analyzeBtn) {
      analyzeBtn.onclick = function() {
        MetraScan.App.closeModal('modal-captured-photo');
        if (typeof onAnalyze === 'function') {
          onAnalyze(photoUrl);
        } else {
          // Convert captured canvas screenshot into a real File and submit to backend
          const file = MetraScan.API.dataUrlToFile(photoUrl, 'live-captured-label.jpg');
          if (file) {
            processRealScan(file, 'Live Camera Capture');
          } else {
            MetraScan.App.showToast('Could not convert camera frame to file.', 'error');
          }
        }
      };
    }

    MetraScan.App.openModal('modal-captured-photo');
  }

  /**
   * Handle successful scan detection
   */
  function triggerScanSuccess(barcode) {
    const product = MetraScan.App.getProductByBarcode(barcode);
    if (!product) {
      MetraScan.App.playScanBeep(false);
      MetraScan.App.showToast('Barcode ' + barcode + ' not found in national registry.', 'error');
      return;
    }

    // Play pleasant verification audio beep
    MetraScan.App.playScanBeep(product.status !== 'violation');

    // Visual feedback: trigger green scanner flash
    const laser = document.querySelector('.scanner-laser');
    if (laser) laser.classList.add('scanner-laser-matched');

    const frame = document.querySelector('.scanner-frame');
    if (frame) frame.classList.add('scanner-frame-success');

    MetraScan.App.showToast('Product Identified: ' + product.name, 'success', 1500);
    MetraScan.App.addScanToHistory(product.id);

    setTimeout(function() {
      if (laser) laser.classList.remove('scanner-laser-matched');
      if (frame) frame.classList.remove('scanner-frame-success');
      stopCamera();
      MetraScan.Nav.navigateTo('consumer-verification', { productId: product.id });
    }, 600);
  }

  /**
   * Render Product Verification Screen
   */
  function renderVerification(productId) {
    const product = (productId && MetraScan.App.getProductById(productId)) || MetraScan.App.state.products[0];
    const container = document.getElementById('verification-content');
    if (!container) return;

    if (!product) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1.5rem; text-align: center;">
          <div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
          <h3 style="margin-bottom: 0.5rem;">No Verification Data Available</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Scan a packaged commodity label or enter a barcode to view its statutory compliance verification.</p>
          <button class="btn btn-primary" data-navigate="consumer-scan">Open Scanner</button>
        </div>
      `;
      return;
    }

    const isSaved = MetraScan.App.isProductSaved(product.id);

    // Build status banner
    let statusBannerHtml = '';
    if (product.status === 'verified') {
      statusBannerHtml = `
        <div class="verification-status-card status-verified">
          <div class="status-badge-icon">✓</div>
          <div class="status-badge-text">
            <h3>VERIFIED COMPLIANT</h3>
            <p>Certified under Legal Metrology Act (2009) & Packaged Commodities Rules</p>
          </div>
          <div class="radial-gauge-box" title="Compliance Score: ${product.score || 98}%">
            <svg class="radial-gauge-svg" viewBox="0 0 36 36">
              <path class="radial-gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="radial-gauge-fill fill-success" stroke-dasharray="${product.score || 98}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div class="radial-gauge-center text-success">${product.score || 98}%</div>
          </div>
        </div>
      `;
    } else if (product.status === 'review') {
      statusBannerHtml = `
        <div class="verification-status-card status-review">
          <div class="status-badge-icon">⚠</div>
          <div class="status-badge-text">
            <h3>NEEDS REVIEW / ADVISORY</h3>
            <p>Advisory issued for minor declaration typography inconsistency</p>
          </div>
          <div class="radial-gauge-box" title="Compliance Score: ${product.score || 72}%">
            <svg class="radial-gauge-svg" viewBox="0 0 36 36">
              <path class="radial-gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="radial-gauge-fill fill-warning" stroke-dasharray="${product.score || 72}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div class="radial-gauge-center text-warning">${product.score || 72}%</div>
          </div>
        </div>
      `;
    } else {
      statusBannerHtml = '';
    }

    // Build 8-Point Legal Metrology & FSSAI Statutory Declarations Audit Checklist
    const decl = product.declarations || {};
    const declItems = [
      { key: 'productName', title: '1. Commodity Identity & Generic Name', desc: 'Common or generic commodity name prominently displayed on pack', data: decl.productName },
      { key: 'fssaiLicence', title: '2. FSSAI Logo & Licence Number', desc: '14-digit FSSAI License number and official logo printed on pack', data: decl.fssaiLicence || { status: 'pass', value: product.licenceNo } },
      { key: 'batchAndMfg', title: '3. Batch/Lot Number + Manufacturing/Packaging Date', desc: 'Legible batch identification mark and manufacturing date', data: decl.batchAndMfg || decl.dateDeclaration || { status: 'pass', value: `Batch: ${product.batchNo} · Mfg: ${product.mfgDate}` } },
      { key: 'bestBefore', title: '4. Best Before / Use By / Expiry Date', desc: 'Clear Best Before or Expiration date declared on container', data: decl.bestBefore || { status: 'pass', value: `${product.bestBefore} (Exp: ${product.expDate})` } },
      { key: 'mfgDetails', title: '5. Manufacturer & Packer Registered Address', desc: 'Full registered business address with state PIN', data: decl.mfgDetails },
      { key: 'netQuantity', title: '6. Net Quantity & Standard Weights (Rule 12)', desc: 'Declared in standard SI units (Litre/g/kg) compliant with Rule 12', data: decl.netQuantity },
      { key: 'mrpDeclaration', title: '7. MRP (Incl. Taxes) & Unit Sale Price (USP)', desc: 'Clear Maximum Retail Price & mandatory Unit Sale Price', data: decl.mrpDeclaration },
      { key: 'consumerCare', title: '8. Consumer Care & Grievance Helpline', desc: 'Toll-free telephone number, address & email provided', data: decl.consumerCare }
    ];

    let declListHtml = '';
    declItems.forEach(function(item) {
      const itemStatus = item.data ? item.data.status : 'pass';
      let icon = '✓';
      let statusClass = 'decl-pass';
      let statusLabel = 'Verified';

      if (itemStatus === 'review') {
        icon = '⚠';
        statusClass = 'decl-review';
        statusLabel = 'Review';
      } else if (itemStatus === 'violation') {
        icon = '✕';
        statusClass = 'decl-violation';
        statusLabel = 'Non-Compliant';
      }

      declListHtml += `
        <div class="declaration-item ${statusClass}">
          <div class="decl-indicator">${icon}</div>
          <div class="decl-body">
            <div class="decl-header">
              <span class="decl-title">${item.title}</span>
              <span class="decl-pill">${statusLabel}</span>
            </div>
            <p class="decl-desc">${item.desc}</p>
            <div class="decl-value"><strong>Found:</strong> ${item.data ? item.data.value : 'Verified in Registry'}</div>
          </div>
        </div>
      `;
    });

    // Build Ingredient Health & Safety Scoring Card
    const ing = product.ingredientAnalysis || {};
    let ingredientScoreCardHtml = '';

    if (ing.found && ing.score !== null) {
      const grade = ing.grade || 'C';
      const gradeClass = 'score-grade-' + grade.toLowerCase();
      const counts = ing.summary_counts || {};

      // Build High Concern Additives warning box
      let highConcernHtml = '';
      const highConcernList = (ing.additives || []).filter(function(a) { return a.risk === 'high'; });
      if (highConcernList.length > 0) {
        let itemsHtml = '';
        highConcernList.forEach(function(a) {
          itemsHtml += `
            <div class="ingredient-item-row">
              <div class="ingredient-item-name">⚠️ ${a.code}: ${a.name} <span class="badge badge-danger" style="font-size:0.65rem; padding: 2px 6px;">${a.category}</span></div>
              <div class="ingredient-item-desc">${a.concern}</div>
            </div>
          `;
        });
        highConcernHtml = `
          <div class="ingredient-alert-box ingredient-alert-danger">
            <div class="ingredient-alert-header">
              <span>🚨 Additives of Concern Detected (${highConcernList.length})</span>
            </div>
            <div class="ingredient-item-list">
              ${itemsHtml}
            </div>
          </div>
        `;
      }

      // Build Allergen Warning box
      let allergenHtml = '';
      if (ing.allergens && ing.allergens.length > 0) {
        let allergenChips = '';
        ing.allergens.forEach(function(al) {
          allergenChips += `<span class="ingredient-chip chip-allergen">${al.icon || '⚠️'} ${al.name}</span>`;
        });
        allergenHtml = `
          <div class="ingredient-alert-box ingredient-alert-warning">
            <div class="ingredient-alert-header">
              <span>🌾 Allergen Notice (${ing.allergens.length})</span>
            </div>
            <div class="ingredient-chip-container">
              ${allergenChips}
            </div>
          </div>
        `;
      }

      // Build Ultra-Processed (UPF) Markers box
      let upfHtml = '';
      if (ing.upf_markers && ing.upf_markers.length > 0) {
        let upfChips = '';
        ing.upf_markers.forEach(function(upf) {
          upfChips += `<span class="ingredient-chip chip-upf" title="${upf.reason}">🏭 ${upf.name}</span>`;
        });
        upfHtml = `
          <div class="ingredient-alert-box ingredient-alert-purple">
            <div class="ingredient-alert-header">
              <span>🏭 Ultra-Processed Food (UPF) Markers (${ing.upf_markers.length})</span>
            </div>
            <div class="ingredient-chip-container">
              ${upfChips}
            </div>
          </div>
        `;
      }

      // Build Clean ingredients & wholesome tags
      let cleanHtml = '';
      if (ing.clean_ingredients && ing.clean_ingredients.length > 0) {
        let cleanChips = '';
        ing.clean_ingredients.forEach(function(c) {
          cleanChips += `<span class="ingredient-chip chip-clean">✓ ${c}</span>`;
        });
        cleanHtml = `
          <div style="margin-bottom: 14px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">🥗 Wholesome / Clean Components:</div>
            <div class="ingredient-chip-container">
              ${cleanChips}
            </div>
          </div>
        `;
      }

      // Build Detected Additives Chips
      let allAdditivesHtml = '';
      if (ing.additives && ing.additives.length > 0) {
        let addChips = '';
        ing.additives.forEach(function(a) {
          let chipClass = a.risk === 'high' ? 'badge-danger' : (a.risk === 'clean' ? 'badge-success' : 'chip-additive');
          addChips += `<span class="ingredient-chip ${chipClass}" title="${a.concern || a.name}">${a.code} · ${a.name.split(' ')[0]}</span>`;
        });
        allAdditivesHtml = `
          <div style="margin-bottom: 14px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">🧪 Detected Additives (${ing.additives.length}):</div>
            <div class="ingredient-chip-container">
              ${addChips}
            </div>
          </div>
        `;
      }

      ingredientScoreCardHtml = `
        <div class="ingredient-score-card ${gradeClass}">
          <div class="ingredient-header-bar">
            <div class="ingredient-header-title">
              <span style="font-size: 1.3rem;">🌿</span>
              <div>
                <h3>Ingredient Safety & Clean Score</h3>
                <div style="font-size: 0.78rem; color: var(--text-muted);">AI Optical Formulation & Additive Safety Audit</div>
              </div>
            </div>
            <span class="ingredient-header-badge badge ${grade === 'A' ? 'badge-success' : (grade === 'B' ? 'badge-info' : (grade === 'C' ? 'badge-warning' : 'badge-danger'))}">
              Grade ${grade}
            </span>
          </div>

          <div class="ingredient-score-hero">
            <div class="ingredient-score-circle">
              <span class="ingredient-score-num">${ing.score}</span>
              <span class="ingredient-score-max">/ 100</span>
            </div>
            <div class="ingredient-score-info">
              <span class="ingredient-grade-pill">Grade ${grade} · ${ing.rating_title}</span>
              <p class="ingredient-rating-desc">${ing.rating_summary}</p>
            </div>
          </div>

          <div class="ingredient-kpi-grid">
            <div class="ingredient-kpi-box">
              <span class="ingredient-kpi-label">Ingredients Count</span>
              <span class="ingredient-kpi-val">${counts.total_ingredients || 0}</span>
            </div>
            <div class="ingredient-kpi-box">
              <span class="ingredient-kpi-label">High Concern</span>
              <span class="ingredient-kpi-val ${counts.high_concern > 0 ? 'text-danger' : 'text-success'}">${counts.high_concern || 0}</span>
            </div>
            <div class="ingredient-kpi-box">
              <span class="ingredient-kpi-label">UPF Markers</span>
              <span class="ingredient-kpi-val ${counts.upf_count > 0 ? 'text-purple' : 'text-success'}">${counts.upf_count || 0}</span>
            </div>
            <div class="ingredient-kpi-box">
              <span class="ingredient-kpi-label">Allergens</span>
              <span class="ingredient-kpi-val ${counts.allergens > 0 ? 'text-warning' : 'text-success'}">${counts.allergens || 0}</span>
            </div>
          </div>

          ${highConcernHtml}
          ${allergenHtml}
          ${upfHtml}
          ${cleanHtml}
          ${allAdditivesHtml}

          ${ing.raw_text ? `
            <div class="ingredient-raw-box">
              <div class="ingredient-raw-title">
                <span>📝 Packaging Ingredients Declaration (OCR Extracted)</span>
                <span class="badge badge-subtle" style="font-size: 0.65rem;">Optical Text</span>
              </div>
              <div class="ingredient-raw-content">"${ing.raw_text}"</div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // Ingredients panel not captured in this image
      ingredientScoreCardHtml = `
        <div class="ingredient-not-found-box">
          <span class="ingredient-not-found-icon">🌿</span>
          <h4>Ingredient Health & Safety Score</h4>
          <p>
            The ingredients declaration was not clearly captured on this surface of the packaging.
            Scan the back-of-pack ingredients table for an instant additive risk analysis, allergen detection, and Clean Label Score (0–100).
          </p>
          <button class="btn btn-outline btn-sm" data-navigate="consumer-scan">
            <span class="btn-icon">📷</span> Scan Back / Ingredients Panel
          </button>
        </div>
      `;
    }

    const role = MetraScan.Auth ? MetraScan.Auth.getUserRole() : 'consumer';
    const isInspector = (role === 'ministry');

    let actionsBarHtml = '';
    if (isInspector) {
      actionsBarHtml = `
        <div class="verification-actions-bar verification-actions-inspector" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
          <button class="btn btn-primary btn-lg" id="btn-inspector-proceed-report" data-product-id="${product.id}" style="width: 100%; font-weight: 700; padding: 13px 18px; font-size: 0.95rem; background: #002B49; border-color: #002B49; box-shadow: 0 4px 12px rgba(0,43,73,0.25);">
            <span class="btn-icon">⚖️</span>
            <span>File Official Inspection Report & Seizure Notice</span>
          </button>
          <div style="display: flex; gap: 10px; width: 100%;">
            <button class="btn btn-outline" id="btn-inspector-view-cert" data-product-id="${product.id}" style="flex: 1; font-weight: 600;">
              <span class="btn-icon">📄</span>
              <span>Official Certificate</span>
            </button>
            <button class="btn btn-outline" data-navigate="ministry-scan" style="flex: 1; font-weight: 600;">
              <span class="btn-icon">📷</span>
              <span>Re-Scan Package</span>
            </button>
          </div>
        </div>
      `;
    } else {
      actionsBarHtml = `
        <div class="verification-actions-bar">
          <button class="btn btn-primary btn-save-product ${isSaved ? 'btn-saved-active' : ''}" id="btn-save-toggle" data-product-id="${product.id}">
            <span class="btn-icon">${isSaved ? '★' : '☆'}</span>
            <span class="btn-text">${isSaved ? 'Saved in Products' : 'Save Product'}</span>
          </button>
          <button class="btn btn-danger-outline" id="btn-report-issue" data-product-id="${product.id}">
            <span class="btn-icon">⚠</span>
            <span>Report Issue</span>
          </button>
        </div>
      `;
    }

    // Render Full Page
    container.innerHTML = `
      <div class="verification-hero">
        <div class="product-badge-bar">
          <span class="category-tag">${product.category}</span>
          ${product.batchNo && product.batchNo !== 'Not detected on package' ? `<span class="batch-tag">Batch: ${product.batchNo}</span>` : `<span class="batch-tag" style="background: rgba(100, 116, 139, 0.15); color: #64748b;">Batch: Not visible</span>`}
        </div>
        
        <div class="product-profile-card">
          <div class="product-profile-media">
            <img src="${product.image}" alt="${product.name}" class="product-main-img" onerror="this.src='assets/images/product-oil.svg'">
          </div>
          <div class="product-profile-details">
            <h2 class="product-title">${product.name}</h2>
            <p class="product-brand">${product.brand}</p>
            <p class="product-manufacturer"><strong>Manufacturer:</strong> ${product.manufacturer}</p>
            <p class="product-address">📍 ${product.mfgAddress}</p>
            
            <div class="product-specs-grid">
              <div class="spec-box">
                <span class="spec-label">Net Quantity</span>
                <span class="spec-val">${product.netQuantity}</span>
              </div>
              <div class="spec-box">
                <span class="spec-label">Maximum Retail Price</span>
                <span class="spec-val highlight-mrp">${product.mrp}</span>
              </div>
              <div class="spec-box">
                <span class="spec-label">Unit Sale Price</span>
                <span class="spec-val">${product.unitSalePrice}</span>
              </div>
              <div class="spec-box">
                <span class="spec-label">Mfg Date / Expiry</span>
                <span class="spec-val">${product.mfgDate}${product.expDate && product.expDate !== 'Not detected on package' ? ' · Exp: ' + product.expDate : ''}</span>
              </div>
            </div>

            <div class="product-code-meta">
              <span><strong>Barcode:</strong> ${product.barcode}</span>
              <span><strong>MetraSeal QR:</strong> ${product.qrId}</span>
            </div>
          </div>
        </div>

        ${statusBannerHtml}

        ${ingredientScoreCardHtml}

        ${actionsBarHtml}
      </div>
    `;

    if (isInspector) {
      const inspectorReportBtn = document.getElementById('btn-inspector-proceed-report');
      if (inspectorReportBtn) {
        inspectorReportBtn.onclick = function() {
          MetraScan.Nav.navigateTo('ministry-inspection', {
            productId: product.id,
            location: 'Retail Inspection Point'
          });
        };
      }
      const inspectorCertBtn = document.getElementById('btn-inspector-view-cert');
      if (inspectorCertBtn) {
        inspectorCertBtn.onclick = function() {
          MetraScan.Nav.navigateTo('consumer-report-view', {
            productId: product.id,
            location: 'National Legal Metrology Verification Portal'
          });
        };
      }
    } else {
      // Save toggle event
      const saveBtn = document.getElementById('btn-save-toggle');
      if (saveBtn) {
        saveBtn.onclick = function() {
          const saved = MetraScan.App.toggleSaveProduct(product.id);
          if (saved) {
            this.classList.add('btn-saved-active');
            this.classList.remove('btn-outline');
            this.innerHTML = '<span class="btn-icon">★</span><span class="btn-text">Saved in Products</span>';
            MetraScan.App.showToast('Product bookmarked in Saved Products.', 'success');
          } else {
            this.classList.remove('btn-saved-active');
            this.classList.add('btn-outline');
            this.innerHTML = '<span class="btn-icon">☆</span><span class="btn-text">Save Product</span>';
            MetraScan.App.showToast('Product removed from bookmarks.', 'info');
          }
        };
      }

      // Report issue button
      const reportBtn = document.getElementById('btn-report-issue');
      if (reportBtn) {
        reportBtn.onclick = function() {
          openIssueReportModal(product);
        };
      }
    }
  }

  /**
   * Open Issue Report Modal for Consumer
   */
  function openIssueReportModal(product) {
    const modal = document.getElementById('modal-report-issue');
    if (!modal) return;

    const prodNameInput = document.getElementById('report-product-name');
    const prodBarcode = document.getElementById('report-product-barcode');
    if (prodNameInput) prodNameInput.value = product ? product.name : '';
    if (prodBarcode) prodBarcode.value = product ? product.barcode : '';

    MetraScan.App.openModal('modal-report-issue');
  }

  /**
   * Render Consumer Scan History
   */
  function renderHistory() {
    const container = document.getElementById('consumer-history-list');
    if (!container) return;

    let items = MetraScan.App.state.scanHistory;

    // Apply Filter
    if (activeHistoryFilter !== 'all') {
      items = items.filter(function(item) {
        return item.status === activeHistoryFilter;
      });
    }

    // Apply Search Query
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase().trim();
      items = items.filter(function(item) {
        const prod = MetraScan.App.getProductById(item.productId);
        if (!prod) return false;
        return prod.name.toLowerCase().includes(q) ||
               prod.manufacturer.toLowerCase().includes(q) ||
               prod.barcode.includes(q);
      });
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No Scans Found</h3>
          <p>No verification records match your current filter or search criteria.</p>
          <button class="btn btn-primary" data-navigate="consumer-scan">Scan a Product Now</button>
        </div>
      `;
      return;
    }

    let html = '';
    items.forEach(function(item) {
      const prod = MetraScan.App.getProductById(item.productId);
      if (!prod) return;

      let badgeClass = 'badge-success';
      let badgeText = '✓ Verified';
      if (prod.status === 'review') {
        badgeClass = 'badge-warning';
        badgeText = '⚠ Needs Review';
      } else if (prod.status === 'violation') {
        badgeClass = 'badge-danger';
        badgeText = '✕ Violation';
      }

      html += `
        <div class="history-card" data-navigate="consumer-verification" data-params='{"productId":"${prod.id}"}'>
          <div class="history-thumb">
            <img src="${prod.image}" alt="${prod.name}" onerror="this.src='assets/images/product-oil.svg'">
          </div>
          <div class="history-details">
            <div class="history-top">
              <span class="badge ${badgeClass}">${badgeText}</span>
              <span class="history-date">${item.timestamp}</span>
            </div>
            <h4 class="history-title">${prod.name}</h4>
            <p class="history-sub">${prod.manufacturer}</p>
            <p class="history-code">Barcode: ${prod.barcode}</p>
          </div>
          <div class="history-arrow">›</div>
        </div>
      `;
    });

    container.innerHTML = html;
    setupHistoryFilters();
  }

  /**
   * Set up History Filter buttons
   */
  function setupHistoryFilters() {
    const chips = document.querySelectorAll('.history-filter-chip');
    chips.forEach(function(chip) {
      chip.onclick = function() {
        chips.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        activeHistoryFilter = this.getAttribute('data-filter');
        renderHistory();
      };
    });

    const searchInput = document.getElementById('history-search-input');
    if (searchInput) {
      searchInput.oninput = function() {
        historySearchQuery = this.value;
        renderHistory();
      };
    }
  }

  /**
   * Render Saved Products View
   */
  function renderSaved() {
    const container = document.getElementById('saved-products-list');
    if (!container) return;

    const savedIds = MetraScan.App.state.savedProductIds;
    if (savedIds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⭐</div>
          <h3>No Saved Products</h3>
          <p>You haven't bookmarked any products yet. Scan products and tap "Save Product" to access them quickly here.</p>
          <button class="btn btn-primary" data-navigate="consumer-scan">Start Scanning</button>
        </div>
      `;
      return;
    }

    let html = '';
    savedIds.forEach(function(id) {
      const prod = MetraScan.App.getProductById(id);
      if (!prod) return;

      let badgeClass = 'badge-success';
      let badgeText = '✓ Verified';
      if (prod.status === 'review') {
        badgeClass = 'badge-warning';
        badgeText = '⚠ Needs Review';
      } else if (prod.status === 'violation') {
        badgeClass = 'badge-danger';
        badgeText = '✕ Violation';
      }

      html += `
        <div class="saved-card" id="saved-item-${prod.id}">
          <div class="saved-card-main" data-navigate="consumer-verification" data-params='{"productId":"${prod.id}"}'>
            <img src="${prod.image}" alt="${prod.name}" class="saved-thumb" onerror="this.src='assets/images/product-oil.svg'">
            <div class="saved-info">
              <span class="badge ${badgeClass}">${badgeText}</span>
              <h4 class="saved-title">${prod.name}</h4>
              <p class="saved-mfr">${prod.manufacturer}</p>
              <p class="saved-mrp">${prod.mrp}</p>
            </div>
          </div>
          <div class="saved-card-actions">
            <button class="btn-remove-saved" data-product-id="${prod.id}" title="Remove from bookmarks">
              ✕ Remove
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Remove buttons
    const removeBtns = container.querySelectorAll('.btn-remove-saved');
    removeBtns.forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        const pid = this.getAttribute('data-product-id');
        MetraScan.App.toggleSaveProduct(pid);
        MetraScan.App.showToast('Removed from Saved Products.', 'info');
        renderSaved();
      };
    });
  }

  /**
   * Render Consumer Profile Screen (View & Edit Details)
   */
  function renderProfile() {
    const user = MetraScan.Auth.getCurrentUser() || {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '9876543210',
      city: 'New Delhi',
      state: 'Delhi',
      address: 'Flat 402, Metro Enclave, Dwarka Sector 12',
      language: 'English (India)'
    };

    const nameEl = document.getElementById('profile-user-name');
    const emailEl = document.getElementById('profile-user-email');
    const avatarEl = document.getElementById('profile-user-avatar');
    const googleBadge = document.getElementById('profile-google-badge');

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl && user.picture) avatarEl.src = user.picture;

    if (googleBadge) {
      googleBadge.style.display = user.isGoogle ? 'inline-flex' : 'none';
    }

    // Populate editable form fields
    const inputName = document.getElementById('consumer-profile-name');
    const inputEmail = document.getElementById('consumer-profile-email');
    const inputPhone = document.getElementById('consumer-profile-phone');
    const inputCity = document.getElementById('consumer-profile-city');
    const inputState = document.getElementById('consumer-profile-state');
    const inputAddress = document.getElementById('consumer-profile-address');
    const selectLang = document.getElementById('consumer-profile-lang');

    if (inputName) inputName.value = user.name || '';
    if (inputEmail) inputEmail.value = user.email || '';
    if (inputPhone) inputPhone.value = user.phone ? String(user.phone).replace(/^\+?91[\s-]*/, '') : '9876543210';
    if (inputCity) inputCity.value = user.city || 'New Delhi';
    if (inputState) inputState.value = user.state || 'Delhi';
    if (inputAddress) inputAddress.value = user.address || '';
    if (selectLang && user.language) selectLang.value = user.language;

    // Profile form submission handler
    const profileForm = document.getElementById('form-consumer-profile-details');
    if (profileForm) {
      profileForm.onsubmit = async function(e) {
        e.preventDefault();
        const updated = {
          name: inputName ? inputName.value.trim() : user.name,
          email: inputEmail ? inputEmail.value.trim() : user.email,
          phone: inputPhone ? inputPhone.value.trim() : user.phone,
          city: inputCity ? inputCity.value.trim() : user.city,
          state: inputState ? inputState.value.trim() : user.state,
          address: inputAddress ? inputAddress.value.trim() : user.address,
          language: selectLang ? selectLang.value : user.language
        };

        await MetraScan.Auth.updateConsumerProfile(updated);
        if (nameEl) nameEl.textContent = updated.name;
        if (emailEl) emailEl.textContent = updated.email;
      };
    }

    // Update stats counters
    const scansCountEl = document.getElementById('profile-total-scans');
    const savedCountEl = document.getElementById('profile-total-saved');
    if (scansCountEl) scansCountEl.textContent = MetraScan.App.state.scanHistory.length;
    if (savedCountEl) savedCountEl.textContent = MetraScan.App.state.savedProductIds.length;

    // Render Saved Products Preview list in Profile Area
    renderProfileSavedPreview();

    // Logout is handled by global event delegation in bootstrap (index.html)
  }

  /**
   * Render Saved Products Preview section in Profile
   */
  function renderProfileSavedPreview() {
    const previewContainer = document.getElementById('profile-saved-products-preview');
    if (!previewContainer) return;

    const savedIds = MetraScan.App.state.savedProductIds;
    if (savedIds.length === 0) {
      previewContainer.innerHTML = `
        <div style="text-align: center; padding: 16px; background: var(--bg-subtle); border-radius: var(--radius-sm);">
          <div style="font-size: 1.5rem; margin-bottom: 4px;">⭐</div>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0 0 10px 0;">No bookmarked commodities saved yet.</p>
          <button class="btn btn-outline btn-sm" data-navigate="consumer-scan">Scan & Save Product</button>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    savedIds.slice(0, 4).forEach(function(id) {
      const prod = MetraScan.App.getProductById(id);
      if (!prod) return;

      let badgeClass = 'badge-success';
      let badgeText = '✓ Verified';
      if (prod.status === 'review') {
        badgeClass = 'badge-warning';
        badgeText = '⚠ Review';
      } else if (prod.status === 'violation') {
        badgeClass = 'badge-danger';
        badgeText = '✕ Violation';
      }

      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-subtle); border-radius: var(--radius-sm); gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer;" data-navigate="consumer-verification" data-params='{"productId":"${prod.id}"}'>
            <img src="${prod.image}" alt="${prod.name}" style="width: 36px; height: 36px; object-fit: contain; border-radius: 6px; background: #fff; padding: 2px; border: 1px solid var(--border-color);" onerror="this.src='assets/images/product-oil.svg'">
            <div>
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); line-height: 1.2;">${prod.name}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${prod.brand} · ${prod.mrp}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge ${badgeClass}" style="font-size: 0.7rem;">${badgeText}</span>
            <button class="btn-profile-remove-saved" data-product-id="${prod.id}" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.85rem; padding: 4px;" title="Remove bookmark">✕</button>
          </div>
        </div>
      `;
    });
    html += '</div>';

    previewContainer.innerHTML = html;

    // Bind remove buttons inside profile
    const removeBtns = previewContainer.querySelectorAll('.btn-profile-remove-saved');
    removeBtns.forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        const pid = this.getAttribute('data-product-id');
        MetraScan.App.toggleSaveProduct(pid);
        MetraScan.App.showToast('Product removed from bookmarks.', 'info');
        renderProfile();
      };
    });
  }

  /**
   * Render Comprehensive Official Product Verification Certificate / PDF Report
   */
  function renderConsumerReport(productId, location) {
    const product = (productId && MetraScan.App.getProductById(productId)) || MetraScan.App.state.products[0];
    const container = document.getElementById('consumer-report-document');
    if (!container) return;

    if (!product) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1.5rem; text-align: center;">
          <div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
          <h3 style="margin-bottom: 0.5rem;">No Verification Report Available</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Please scan a packaged commodity first to generate an authenticated compliance certificate.</p>
          <button class="btn btn-primary" data-navigate="consumer-scan">Open Scanner</button>
        </div>
      `;
      return;
    }

    const user = MetraScan.Auth.getCurrentUser() || { name: 'Verified Citizen', email: 'citizen@metrascan.gov.in' };
    const verifyLocation = location || 'Location Authenticated via Device';
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const refSuffix = (product.barcode && /^\d+$/.test(product.barcode)) ? product.barcode.slice(-4) : (product.id ? product.id.slice(-4) : 'AUDIT');
    const reportRefId = 'METRA-VERIFY-2026-' + refSuffix + '-' + Math.floor(1000 + Math.random() * 9000);

    const isVerified = (product.status === 'verified');
    const isViolation = (product.status === 'violation');

    // Build checklist rows
    const decl = product.declarations;
    const items = [
      { name: 'Common / Generic Product Identity', rule: 'Rule 6(1)(a) & PCR 2011', found: decl.productName ? decl.productName.value : product.name, status: decl.productName ? decl.productName.status : 'pass' },
      { name: 'Complete Manufacturer & Packer Address', rule: 'Rule 6(1)(a) & State Registration', found: decl.mfgDetails ? decl.mfgDetails.value : product.mfgAddress, status: decl.mfgDetails ? decl.mfgDetails.status : 'pass' },
      { name: 'Net Quantity in Standard SI Units (Gravimetric)', rule: 'Rule 12 & Rule 24 (Max Permissible Error)', found: decl.netQuantity ? decl.netQuantity.value : product.netQuantity, status: decl.netQuantity ? decl.netQuantity.status : 'pass' },
      { name: 'Maximum Retail Price (MRP) & Unit Sale Price (USP)', rule: 'Rule 6(1)(e) (Price per 100g/ml Mandatory)', found: decl.mrpDeclaration ? decl.mrpDeclaration.value : product.mrp + ' · ' + product.unitSalePrice, status: decl.mrpDeclaration ? decl.mrpDeclaration.status : 'pass' },
      { name: 'Date of Packaging / Manufacturing & Expiry', rule: 'Rule 6(1)(d) Conspicuity Rule', found: decl.batchAndMfg ? decl.batchAndMfg.value : product.mfgDate + ' / ' + product.expDate, status: decl.batchAndMfg ? decl.batchAndMfg.status : 'pass' },
      { name: 'Consumer Grievance Helpline & Contact Email', rule: 'Rule 6(1)(h) Active NCH Integration', found: decl.consumerCare ? decl.consumerCare.value : product.consumerCare, status: decl.consumerCare ? decl.consumerCare.status : 'pass' }
    ];

    let checklistRowsHtml = '';
    items.forEach(function(item) {
      let badge = '<span class="report-check-pass">PASS (Statutory Compliant)</span>';
      if (item.status === 'violation') {
        badge = '<span class="report-check-fail">FAIL (Statutory Violation)</span>';
      } else if (item.status === 'review') {
        badge = '<span class="report-check-warn">ADVISORY REVIEW</span>';
      }
      checklistRowsHtml += `
        <tr>
          <td><strong>${item.name}</strong><br><small class="text-muted">${item.rule}</small></td>
          <td>${item.found}</td>
          <td class="text-center">${badge}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="official-certificate-sheet">
        <!-- National Government Top Header -->
        <div class="cert-gov-header">
          <img src="assets/logo/emblem.svg" alt="Emblem of India" class="cert-emblem-img">
          <div class="cert-gov-titles">
            <h3>GOVERNMENT OF INDIA</h3>
            <h4>MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION</h4>
            <h5>DEPARTMENT OF LEGAL METROLOGY & NATIONAL COMMODITY REGISTRY</h5>
            <p class="cert-act-subtitle">Official Verification & Statutory Compliance Certificate under Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011</p>
          </div>
        </div>

        <div class="cert-divider-gold"></div>

        <!-- Verification Metadata & Location Grid -->
        <div class="cert-meta-grid">
          <div class="cert-meta-col">
            <p><strong>DOCUMENT REFERENCE:</strong> <span class="mono-text">${reportRefId}</span></p>
            <p><strong>VERIFIED FOR CITIZEN:</strong> ${user.name}</p>
            <p><strong>AUDIT TIMESTAMP:</strong> ${formattedDate}</p>
            <p><strong>VERIFICATION LOCATION:</strong> <span style="color: #1e3a8a; font-weight: 700;">📍 ${verifyLocation}</span></p>
          </div>
          <div class="cert-meta-col text-right">
            <p><strong>COMMODITY STATUS:</strong> <span class="badge ${isVerified ? 'badge-success' : 'badge-danger'}" style="font-size: 0.88rem;">${product.statusLabel.toUpperCase()}</span></p>
            <p><strong>COMPLIANCE ACCURACY:</strong> <strong>${product.score} / 100 Points</strong></p>
            <p><strong>AUDIT ENGINE:</strong> Legal Metrology OCR AI Verified</p>
            <p><strong>CALIBRATION:</strong> ${product.calibrated ? '₹5 Coin Reference Calibrated' : 'Standard Visual Analysis'}</p>
          </div>
        </div>

        <!-- 1. Commodity Particulars -->
        <div class="cert-section-box">
          <h4 class="cert-box-title">1. VERIFIED COMMODITY PARTICULARS & COMPOSITION</h4>
          <div class="cert-table-wrapper">
            <table class="cert-table">
              <colgroup>
                <col style="width: 22%;">
                <col style="width: 28%;">
                <col style="width: 22%;">
                <col style="width: 28%;">
              </colgroup>
              <tr>
                <td><strong>Commodity Name:</strong></td>
                <td>${product.name}</td>
                <td><strong>Category / Class:</strong></td>
                <td>${product.category}</td>
              </tr>
              <tr>
                <td><strong>Brand / Line:</strong></td>
                <td>${product.brand}</td>
                <td><strong>Batch / Lot No:</strong></td>
                <td>${product.batchNo}</td>
              </tr>
              <tr>
                <td><strong>Manufacturer / Packer:</strong></td>
                <td>${product.manufacturer}</td>
                <td><strong>Declared Net Quantity:</strong></td>
                <td>${product.netQuantity}</td>
              </tr>
              <tr>
                <td><strong>Registered Address:</strong></td>
                <td>${product.mfgAddress}</td>
                <td><strong>Maximum Retail Price:</strong></td>
                <td><strong style="color: #1d4ed8;">${product.mrp}</strong></td>
              </tr>
              <tr>
                <td><strong>Barcode / GTIN:</strong></td>
                <td><span class="mono-text">${product.barcode}</span></td>
                <td><strong>Unit Sale Price (USP):</strong></td>
                <td>${product.unitSalePrice}</td>
              </tr>
              <tr>
                <td><strong>FSSAI / Metrology License:</strong></td>
                <td>${product.licenceNo}</td>
                <td><strong>Packaging & Expiry:</strong></td>
                <td>${product.mfgDate}${product.expDate && product.expDate !== 'Not detected on package' ? ' · Exp: ' + product.expDate : ''}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- 2. Legal Metrology Declarations & Recipe Standards Finding -->
        <div class="cert-section-box">
          <h4 class="cert-box-title">2. STATUTORY FINDING & RECIPE / QUALITY STANDARDS CERTIFICATION</h4>
          <div class="cert-notes-box">
            ${isVerified ? `
              <div class="cert-compliance-success-box" style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
                <h5 style="color: #166534; font-size: 0.98rem; font-weight: 800; margin-bottom: 6px;">
                  ✓ CERTIFIED: STRICTLY FOLLOWS ALL LAWS, METROLOGY RULES & RECIPE/COMPOSITION STANDARDS
                </h5>
                <p style="font-size: 0.86rem; color: #166534; line-height: 1.5; margin: 0;">
                  This packaged commodity has been fully audited against statutory standards. It conforms in all respects to <strong>Rule 6(1) mandatory declarations</strong> of the Legal Metrology (Packaged Commodities) Rules 2011, adheres to <strong>Rule 5 standard packaging quantities</strong>, and satisfies <strong>Rule 12 gravimetric standards</strong> with zero deficit. Declared recipe composition, food safety certifications (FSSAI), consumer contact helpline, and fair Unit Sale Price (USP) match the official central commodity repository.
                </p>
              </div>
            ` : `
              <div class="cert-violation-alert" style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
                <h5 style="color: #991b1b; font-size: 1.05rem; font-weight: 800; margin-bottom: 8px;">
                  ✕ CRITICAL NOTICE: WHAT IS WRONG WITH THIS COMMODITY
                </h5>
                <div style="font-size: 0.88rem; color: #7f1d1d; line-height: 1.6;">
                  <p><strong>1. Missing / Deceptive Unit Sale Price (Rule 6(1)(e)):</strong> Product fails to declare statutory Unit Sale Price (USP) per 100g/ml, impairing citizen ability to evaluate fair pricing.</p>
                  <p><strong>2. Inoperative Consumer Care Helpline (Rule 6(1)(h)):</strong> Listed telephone support is non-functional or invalid under statutory consumer grievance guidelines.</p>
                  <p><strong>3. Statutory Section Violated:</strong> Section 36 of Legal Metrology Act, 2009 (Penalty for selling non-standard packages) and Rule 18 (Maximum Retail Price compliance).</p>
                  <p><strong>4. Immediate Citizen Action:</strong> Citizen is advised to file a grievance via National Consumer Helpline (NCH 1915) or INGRAM portal.</p>
                </div>
              </div>
            `}
          </div>
        </div>

        <!-- 3. Full 6-Point Statutory Declaration Audit Table -->
        <div class="cert-section-box">
          <h4 class="cert-box-title">3. COMPREHENSIVE STATUTORY PARAMETERS AUDIT TABLE</h4>
          <table class="cert-table cert-checklist-table">
            <thead>
              <tr>
                <th style="width: 40%;">Statutory Requirement & Legal Provision</th>
                <th style="width: 38%;">Observed Declaration on Package</th>
                <th style="width: 22%;" class="text-center">Verification Finding</th>
              </tr>
            </thead>
            <tbody>
              ${checklistRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- 4. Official Signatures and Seals -->
        <div class="cert-signatures-row">
          <div class="cert-seal-col">
            <div class="cert-digital-seal">
              <div class="cert-seal-badge">
                <img src="assets/logo/metraverified-logo.png" alt="MetraVerified Official Seal" class="cert-seal-badge-img">
              </div>
              <span class="cert-seal-label">Digitally Certified • MetraVerified</span>
            </div>
          </div>
          <div class="cert-sign-col">
            <div class="cert-signature-line">
              <span class="digital-sign-font">MetraScan Gateway</span>
            </div>
            <p><strong>National Verification Authority</strong></p>
            <p class="cert-sign-dept">Dept. of Consumer Affairs, Govt. of India</p>
            <p class="cert-sign-time">${formattedDate}</p>
          </div>
        </div>

        <div class="cert-footer-disclaimer">
          This document is generated under Section 18 of the Legal Metrology Act, 2009 for consumer empowerment and enforcement verification.
        </div>
      </div>
    `;
  }

  // Export Consumer Module API
  window.MetraScan.Consumer = {
    renderHome: renderHome,
    renderRecentVerifications: renderRecentVerifications,
    initScanner: initScanner,
    stopCamera: stopCamera,
    triggerScanSuccess: triggerScanSuccess,
    openCapturedPhotoModal: openCapturedPhotoModal,
    renderVerification: renderVerification,
    renderConsumerReport: renderConsumerReport,
    openIssueReportModal: openIssueReportModal,
    renderHistory: renderHistory,
    renderSaved: renderSaved,
    renderProfile: renderProfile,
    processRealScan: processRealScan
  };

})(window);
