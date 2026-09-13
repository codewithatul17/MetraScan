/**
 * MetraScan - Ministry Official Module
 * Field Command Center, Inspection Wizard, Evidence Management,
 * Violation Filing & Official Government Report Generation
 */

(function(window) {
  'use strict';

  window.MetraScan = window.MetraScan || {};

  // Current inspection in-progress state
  let currentWizardStep = 1;
  let activeMinistryTab = 'inspections';
  let activeEvidenceList = [];
  let inspectionChecklist = {
    labeling: 'pass',
    declarations: 'pass',
    manufacturer: 'pass',
    qrRegistration: 'pass',
    packaging: 'pass',
    measurement: 'pass'
  };

  /**
   * Render Ministry Dashboard
   */
  function renderDashboard() {
    const user = MetraScan.Auth.getCurrentUser() || {
      name: 'Insp. Rajesh Verma',
      govId: 'GOV-LM-2026-4481',
      department: 'Legal Metrology Department',
      designation: 'Senior Inspector'
    };

    const officerNameEl = document.getElementById('ministry-officer-name');
    const officerDeptEl = document.getElementById('ministry-officer-dept');
    const officerBadgeEl = document.getElementById('ministry-officer-id');

    if (officerNameEl) officerNameEl.textContent = user.name;
    if (officerDeptEl) officerDeptEl.textContent = user.department;
    if (officerBadgeEl) officerBadgeEl.textContent = user.govId || 'GOV-LM-2026-4481';

    // Render Stats
    renderStats();

    // Render Compliance Pulse Chart
    renderCompliancePulse();

    // Render Recent Inspections & Cases
    renderRecentDashboardItems();
  }

  /**
   * Render Stats counters
   */
  function renderStats() {
    const totalInspectionsEl = document.getElementById('stat-total-inspections');
    const complianceRateEl = document.getElementById('stat-compliance-rate');
    const violationsCountEl = document.getElementById('stat-total-violations');
    const openCasesCountEl = document.getElementById('stat-open-cases');

    const inspections = MetraScan.App.state.inspections || [];
    const violations = MetraScan.App.state.violations || [];
    const openCases = MetraScan.App.state.openCases || [];

    if (totalInspectionsEl) totalInspectionsEl.textContent = inspections.length.toString();
    if (violationsCountEl) violationsCountEl.textContent = violations.length.toString();
    if (openCasesCountEl) openCasesCountEl.textContent = openCases.length.toString();

    if (complianceRateEl) {
      if (inspections.length > 0) {
        const compliantCount = inspections.filter(i => i.status === 'verified').length;
        const rate = Math.round((compliantCount / inspections.length) * 100);
        complianceRateEl.textContent = rate + '%';
      } else {
        complianceRateEl.textContent = '100%';
      }
    }
  }

  /**
   * Render Compliance Pulse Chart (SVG Dynamic Donut Gauge)
   */
  function renderCompliancePulse() {
    const container = document.getElementById('compliance-pulse-container');
    if (!container) return;

    const inspections = MetraScan.App.state.inspections || [];
    const total = inspections.length;

    if (total === 0) {
      container.innerHTML = `
        <div style="padding: 2rem 1rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📊</div>
          <p style="margin-bottom: 0.3rem; font-weight: 600; color: var(--text-main); font-size: 0.95rem;">No statutory inspections filed yet</p>
          <p style="font-size: 0.82rem; margin: 0 auto; max-width: 320px;">Conduct field inspections to generate live statutory compliance and enforcement metrics.</p>
        </div>
      `;
      return;
    }

    const compliant = inspections.filter(i => i.status === 'verified').length;
    const violation = inspections.filter(i => i.status === 'violation').length;
    const review = inspections.filter(i => i.status === 'review').length;

    const compPct = Math.round((compliant / total) * 100);
    const vioPct = Math.round((violation / total) * 100);
    const revPct = 100 - compPct - vioPct;

    const circumference = 427.25;
    const compArc = (compPct / 100) * circumference;
    const vioArc = (vioPct / 100) * circumference;
    const revArc = (revPct / 100) * circumference;

    container.innerHTML = `
      <div class="pulse-gauge-wrapper">
        <div class="pulse-chart-circle">
          <svg viewBox="0 0 160 160" class="donut-chart-svg">
            <circle cx="80" cy="80" r="68" class="donut-bg" />
            <circle cx="80" cy="80" r="68" class="donut-segment donut-compliant" stroke-dasharray="${compArc} ${circumference}" stroke-dashoffset="0" />
            <circle cx="80" cy="80" r="68" class="donut-segment donut-violation" stroke-dasharray="${vioArc} ${circumference}" stroke-dashoffset="-${compArc}" />
            <circle cx="80" cy="80" r="68" class="donut-segment donut-review" stroke-dasharray="${revArc} ${circumference}" stroke-dashoffset="-${compArc + vioArc}" />
          </svg>
          <div class="pulse-center-stat">
            <span class="pulse-big-number">${compPct}%</span>
            <span class="pulse-stat-label">Statutory<br>Compliance</span>
          </div>
        </div>
        <div class="pulse-legend">
          <div class="pulse-legend-item">
            <span class="legend-dot dot-green"></span>
            <span class="legend-label">Compliant Packages</span>
            <span class="legend-pct">${compPct}% (${compliant})</span>
          </div>
          <div class="pulse-legend-item">
            <span class="legend-dot dot-red"></span>
            <span class="legend-label">Violations & Seizures</span>
            <span class="legend-pct">${vioPct}% (${violation})</span>
          </div>
          <div class="pulse-legend-item">
            <span class="legend-dot dot-amber"></span>
            <span class="legend-label">Under Review</span>
            <span class="legend-pct">${revPct}% (${review})</span>
          </div>
          <div class="pulse-stat-footnote">
            <span>Audit Standard: Legal Metrology Act (2009) & PCR (2011)</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Recent Dashboard Items (Inspections, Open Cases, Violations)
   */
  function renderRecentDashboardItems() {
    renderDashboardInspections();
    renderDashboardCases();
    renderDashboardViolations();
    setupDashboardTabs();
  }

  function renderDashboardInspections() {
    const list = document.getElementById('dashboard-inspections-list');
    if (!list) return;

    const items = MetraScan.App.state.inspections.slice(0, 4);
    if (items.length === 0) {
      list.innerHTML = `
        <div class="empty-state-small" style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
          <p style="margin-bottom: 0.75rem; font-weight: 600;">No field inspections recorded yet.</p>
          <button class="btn btn-primary btn-sm" data-navigate="ministry-scan">Start Inspection Scan</button>
        </div>
      `;
      return;
    }

    let html = '';
    items.forEach(function(item) {
      let badgeClass = 'badge-pulse-success';
      let badgeText = '✓ Compliant';
      if (item.status === 'review') {
        badgeClass = 'badge-pulse-warning';
        badgeText = '⚠️ Review';
      } else if (item.status === 'violation') {
        badgeClass = 'badge-pulse-danger';
        badgeText = '✕ Deficit';
      }

      html += `
        <div class="inspection-record-card" data-navigate="ministry-report-view" data-params='{"reportId":"${item.reportId}"}'>
          <div class="record-badge-col">
            <span class="badge ${badgeClass}">${badgeText}</span>
            <span class="record-score">${item.score}%</span>
          </div>
          <div class="record-main-col">
            <div class="record-header">
              <span class="record-id">${item.id}</span>
              <span class="record-date">${item.date}</span>
            </div>
            <h4 class="record-product">${item.productName}</h4>
            <p class="record-retailer">📍 ${item.retailer}</p>
            <p class="record-officer">👤 ${item.officer}</p>
          </div>
          <div class="record-action-col">
            <span class="btn-text-link">View Report ›</span>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  function renderDashboardCases() {
    const list = document.getElementById('dashboard-cases-list');
    if (!list) return;

    const cases = MetraScan.App.state.openCases.slice(0, 4);
    if (cases.length === 0) {
      list.innerHTML = `
        <div class="empty-state-small" style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
          <p style="margin: 0; font-weight: 500;">No open enforcement cases at this time.</p>
        </div>
      `;
      return;
    }

    let html = '';
    cases.forEach(function(c) {
      let prioClass = 'badge-danger';
      if (c.priority === 'Medium') prioClass = 'badge-warning';

      html += `
        <div class="case-card">
          <div class="case-header">
            <span class="case-id">${c.caseId}</span>
            <span class="badge ${prioClass}">${c.priority} Priority</span>
          </div>
          <h4 class="case-title">${c.title}</h4>
          <p class="case-product"><strong>Commodity:</strong> ${c.product}</p>
          <div class="case-footer">
            <span class="case-stage">📌 Stage: ${c.stage}</span>
            <span class="case-due">⏱ Due: ${c.dueDate}</span>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  function renderDashboardViolations() {
    const list = document.getElementById('dashboard-violations-list');
    if (!list) return;

    const vios = MetraScan.App.state.violations.slice(0, 4);
    if (vios.length === 0) {
      list.innerHTML = `
        <div class="empty-state-small" style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
          <p style="margin: 0; font-weight: 500;">No statutory violations registered.</p>
        </div>
      `;
      return;
    }

    let html = '';
    vios.forEach(function(v) {
      let sevClass = 'badge-danger';
      if (v.severity === 'Medium') sevClass = 'badge-warning';
      if (v.severity === 'Low') sevClass = 'badge-info';

      html += `
        <div class="violation-card">
          <div class="violation-top">
            <span class="violation-id">${v.id}</span>
            <span class="badge ${sevClass}">${v.severity} Severity</span>
          </div>
          <h4 class="violation-heading">${v.violation}</h4>
          <p class="violation-prod"><strong>Product:</strong> ${v.productName}</p>
          <p class="violation-clause"><strong>Legal Citation:</strong> ${v.clause}</p>
          <div class="violation-footer">
            <span class="violation-status">Status: ${v.status}</span>
            <span class="violation-penalty">${v.penalty}</span>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  function setupDashboardTabs() {
    const tabBtns = document.querySelectorAll('.dashboard-tab-btn');
    const sections = {
      'tab-inspections': document.getElementById('section-inspections'),
      'tab-cases': document.getElementById('section-cases'),
      'tab-violations': document.getElementById('section-violations')
    };

    tabBtns.forEach(function(btn) {
      btn.onclick = function() {
        tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const target = this.getAttribute('data-tab');

        Object.keys(sections).forEach(key => {
          if (sections[key]) {
            sections[key].style.display = (key === target) ? 'block' : 'none';
          }
        });
      };
    });
  }

  /**
   * Initialize Inspection Wizard
   */
  function initInspectionWizard(preselectProductId, preselectLocation) {
    currentWizardStep = 1;
    activeEvidenceList = [];

    // Reset Checklist
    inspectionChecklist = {
      labeling: 'pass',
      declarations: 'pass',
      manufacturer: 'pass',
      qrRegistration: 'pass',
      packaging: 'pass',
      measurement: 'pass'
    };

    // Pre-fill location if provided
    const retailerInput = document.getElementById('wizard-retailer-input');
    if (retailerInput && preselectLocation) {
      retailerInput.value = preselectLocation;
    }

    // Populate products dropdown in Step 1
    const productSelect = document.getElementById('wizard-product-select');
    if (productSelect) {
      const allProducts = MetraScan.App.state.products || [];
      let optionsHtml = '';
      if (allProducts.length === 0) {
        optionsHtml = '<option value="">-- No products in database (upload package photo below) --</option>';
      } else {
        allProducts.forEach(function(p, idx) {
          const isSel = (preselectProductId && p.id === preselectProductId) || (!preselectProductId && idx === 0);
          optionsHtml += `<option value="${p.id}" ${isSel ? 'selected' : ''}>${p.name} (Barcode: ${p.barcode})</option>`;
        });
      }
      productSelect.innerHTML = optionsHtml;

      productSelect.onchange = function() {
        if (this.value) {
          updateWizardProductPreview(this.value);
        }
      };
    }

    // Bind Quick Scan Button in Wizard
    const wizardScanBtn = document.getElementById('btn-wizard-scan-trigger');
    if (wizardScanBtn) {
      wizardScanBtn.onclick = function() {
        MetraScan.Nav.navigateTo('ministry-scan');
      };
    }

    // Custom uploaded package images map
    const customProductImages = {};

    // Bind Upload Image Button in Wizard
    const wizardUploadBtn = document.getElementById('btn-wizard-upload-trigger');
    const wizardUploadInput = document.getElementById('wizard-product-image-input');
    if (wizardUploadBtn && wizardUploadInput) {
      wizardUploadBtn.onclick = function() {
        wizardUploadInput.click();
      };

      wizardUploadInput.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        MetraScan.App.showToast('🔍 Analyzing package label with Legal Metrology AI...', 'info', 2500);

        const currentUser = MetraScan.Auth.getCurrentUser();
        const reader = new FileReader();
        reader.onload = async function(evt) {
          const imgUrl = evt.target.result;

          // Attempt real scan with backend
          try {
            const scanResponse = await MetraScan.API.scanImages([file], currentUser);
            let finalImage = imgUrl;

            if (scanResponse && scanResponse.ok && scanResponse.data) {
              const data = scanResponse.data;
              const verdict = data.verdict || {};
              const firstImg = data.images && data.images[0];

              if (firstImg && firstImg.image_base64) {
                finalImage = 'data:image/jpeg;base64,' + firstImg.image_base64;
              }

              // Create product record and add to state
              const product = MetraScan.API.mapVerdictToProduct(data, file.name, currentUser, finalImage);
              if (data.supabase_id) {
                product.supabaseId = data.supabase_id;
              }
              MetraScan.App.addProduct(product);

              // Update product select dropdown
              const pSelect = document.getElementById('wizard-product-select');
              if (pSelect) {
                const opt = document.createElement('option');
                opt.value = product.id;
                opt.textContent = `${product.name} (Uploaded Label)`;
                opt.selected = true;
                pSelect.insertBefore(opt, pSelect.firstChild);
              }

              // Update preview & pre-populate all form fields
              updateWizardProductPreview(product.id);
              renderWizardChecklistUI();
              checkViolationRecommendation();
              MetraScan.App.showToast('✓ AI OCR completed! Form auto-populated from uploaded label.', 'success', 3500);
            } else {
              MetraScan.App.showToast('Package image uploaded. (AI note: ' + ((scanResponse && scanResponse.error) || 'Processing completed') + ')', 'info', 4000);
            }

            // Automatically add as Evidence item
            activeEvidenceList.unshift({
              id: 'ev-' + Date.now(),
              type: 'Package Label Photo',
              name: file.name,
              url: finalImage,
              time: 'Just now'
            });
            renderEvidenceGrid();

          } catch (err) {
            console.error('Wizard scan error:', err);
            MetraScan.App.showToast('Error analyzing image: ' + err.message, 'error');
          }
        };
        reader.readAsDataURL(file);
      };
    }

    const firstId = preselectProductId || (MetraScan.App.state.products[0] ? MetraScan.App.state.products[0].id : null);
    updateWizardProductPreview(firstId);
    renderWizardChecklistUI();
    renderEvidenceGrid();
    goToWizardStep(1);
    setupWizardNavigation();
  }

  /**
   * Update Product Preview & Auto-Fill All Form Fields in Inspection Wizard
   */
  function updateWizardProductPreview(productId) {
    const prod = productId ? MetraScan.App.getProductById(productId) : null;
    const previewContainer = document.getElementById('wizard-product-preview');
    const declContainer = document.getElementById('wizard-declarations-info');

    if (!prod) {
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="empty-state-small" style="padding: 1.5rem; text-align: center; color: var(--text-muted); border: 2px dashed var(--border-color); border-radius: var(--radius-md);">
            <p style="margin: 0; font-weight: 500;">No product selected. Upload a label photo or scan packaging to begin inspection.</p>
          </div>
        `;
      }
      if (declContainer) {
        declContainer.innerHTML = `
          <p class="text-muted" style="text-align: center; padding: 1.5rem;">Declarations will appear once packaging is scanned or selected.</p>
        `;
      }
      return;
    }

    // Auto-fill form fields: Batch/Lot Number
    const batchInput = document.getElementById('wizard-batch-input');
    if (batchInput && prod.batchNo) {
      batchInput.value = prod.batchNo;
    }

    // Auto-fill Inspector Notes in Step 4 if unchanged
    const notesInput = document.getElementById('wizard-notes-input');
    if (notesInput) {
      if (prod.status === 'violation') {
        notesInput.value = `CRITICAL VIOLATION: Mandatory statutory declarations missing/smudged on packaging label. Package audited against Legal Metrology Rule 6(1) and Rule 12 gravimetric standards. Non-compliance report auto-generated.`;
      } else {
        notesInput.value = `Routine statutory packaging inspection conducted. Commodity audited against Legal Metrology (PC) Rules 2011 and FSSAI Regulations. Package declarations legible and verified.`;
      }
    }

    // Automatically evaluate & pre-select ALL Step 3 compliance checklist toggles
    const decl = prod.declarations || {};

    inspectionChecklist.fssaiLicence = decl.fssaiLicence ? decl.fssaiLicence.status : (prod.status === 'violation' ? 'violation' : 'pass');
    inspectionChecklist.batchAndMfg = decl.batchAndMfg ? decl.batchAndMfg.status : (decl.dateDeclaration ? decl.dateDeclaration.status : (prod.status === 'violation' ? 'violation' : 'pass'));
    inspectionChecklist.expiryDate = decl.bestBefore ? decl.bestBefore.status : (decl.dateDeclaration ? decl.dateDeclaration.status : (prod.status === 'violation' ? 'violation' : 'pass'));
    inspectionChecklist.labeling = decl.mrpDeclaration ? decl.mrpDeclaration.status : (prod.status === 'violation' ? 'violation' : 'pass');
    inspectionChecklist.manufacturer = decl.mfgDetails ? decl.mfgDetails.status : (prod.status === 'violation' ? 'violation' : 'pass');
    inspectionChecklist.measurement = decl.netQuantity ? decl.netQuantity.status : (prod.status === 'violation' ? 'violation' : 'pass');

    renderWizardChecklistUI();
    checkViolationRecommendation();

    // Auto-select Step 5 Violation Category dropdown
    const violationSelect = document.getElementById('wizard-violation-type');
    if (violationSelect) {
      if (prod.status === 'violation') {
        violationSelect.value = 'Missing Mandatory Declarations';
      } else {
        violationSelect.value = 'None / Fully Compliant';
      }
    }

    // Determine preview image (uploaded custom photo or default product SVG)
    const activeImage = customProductImages[prod.id] || prod.image;

    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="wizard-prod-summary" style="position: relative;">
          <div style="position: relative; display: inline-block;">
            <img src="${activeImage}" alt="${prod.name}" class="wizard-prod-thumb" onerror="this.src='assets/images/product-oil.svg'" style="cursor: pointer; object-fit: cover; border-radius: var(--radius-md); border: 2px solid var(--border-color);" title="Click to Upload / Change Image">
            <button type="button" class="btn btn-sm btn-secondary btn-upload-thumb-overlay" onclick="document.getElementById('wizard-product-image-input').click();" style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); font-size: 0.68rem; padding: 2px 6px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
              📷 Upload Image
            </button>
          </div>
          <div class="wizard-prod-meta" style="flex: 1; margin-left: 6px;">
            <h4 style="margin-bottom: 4px;">${prod.name}</h4>
            <p style="margin-bottom: 2px;"><strong>Brand / Category:</strong> ${prod.brand} · ${prod.category}</p>
            <p style="margin-bottom: 2px;"><strong>Manufacturer:</strong> ${prod.manufacturer}</p>
            <p style="margin-bottom: 2px;"><strong>Declared Net Qty:</strong> ${prod.netQuantity} | <strong>MRP:</strong> ${prod.mrp}</p>
            <p style="margin-bottom: 0;"><strong>Batch:</strong> ${prod.batchNo} | <strong>Mfg Date:</strong> ${prod.mfgDate}</p>
          </div>
        </div>
      `;
    }

    // Also populate Declaration Info tab (Step 2)
    if (declContainer) {
      declContainer.innerHTML = `
        <div class="declaration-review-table">
          <div class="decl-rev-row">
            <span class="decl-rev-label">1. Common / Generic Name</span>
            <span class="decl-rev-val">${prod.declarations && prod.declarations.productName ? prod.declarations.productName.value : prod.name}</span>
          </div>
          <div class="decl-rev-row">
            <span class="decl-rev-label">2. FSSAI Logo & Licence Number</span>
            <span class="decl-rev-val">${prod.declarations && prod.declarations.fssaiLicence ? prod.declarations.fssaiLicence.value : prod.licenceNo}</span>
          </div>
          <div class="decl-rev-row">
            <span class="decl-rev-label">3. Batch/Lot No. & Mfg Date</span>
            <span class="decl-rev-val">${prod.declarations && prod.declarations.batchAndMfg ? prod.declarations.batchAndMfg.value : `Batch: ${prod.batchNo} | Mfg: ${prod.mfgDate}`}</span>
          </div>
          <div class="decl-rev-row">
            <span class="decl-rev-label">4. Best Before / Expiry Date</span>
            <span class="decl-rev-val">${prod.declarations && prod.declarations.bestBefore ? prod.declarations.bestBefore.value : `${prod.bestBefore} (Exp: ${prod.expDate})`}</span>
          </div>
          <div class="decl-rev-row">
            <span class="decl-rev-label">5. Complete Address of Manufacturer</span>
            <span class="decl-rev-val">${prod.mfgAddress}</span>
          </div>
          <div class="decl-rev-row">
            <span class="decl-rev-label">6. Net Weight / Volume</span>
            <span class="decl-rev-val">${prod.netQuantity} (${prod.unitSalePrice})</span>
          </div>
          <div class="decl-rev-row">
            <span class="decl-rev-label">7. Maximum Retail Price (MRP)</span>
            <span class="decl-rev-val">${prod.mrp}</span>
          </div>
          <div class="decl-rev-row">
            <span class="decl-rev-label">8. Consumer Helpline Details</span>
            <span class="decl-rev-val">${prod.consumerCare}</span>
          </div>
        </div>
      `;
    }
  }

  /**
   * Render Checklist UI with Compliant / Review / Violation toggles
   */
  function renderWizardChecklistUI() {
    const container = document.getElementById('wizard-checklist-container');
    if (!container) return;

    const checklistItems = [
      { key: 'fssaiLicence', title: '1. FSSAI Logo & Licence Number', desc: '14-digit FSSAI License number and official FSSAI logo printed on pack.' },
      { key: 'batchAndMfg', title: '2. Batch/Lot No. & Mfg Date', desc: 'Legible batch/lot identification mark and month/year of packing.' },
      { key: 'expiryDate', title: '3. Best Before / Expiry Date', desc: 'Clear Best Before, Use By, or Expiration Date declared on container.' },
      { key: 'labeling', title: '4. Product Labeling & Conspicuity', desc: 'Legibility, prominent color contrast, height of letters compliant with Schedule-II.' },
      { key: 'manufacturer', title: '5. Manufacturer / Packer Information', desc: 'Complete name, premises address, city and postal PIN code included.' },
      { key: 'measurement', title: '6. Net Quantity & Scale Accuracy', desc: 'Actual weight within Maximum Permissible Error (MPE) limits of Rule 24.' }
    ];

    let html = '';
    checklistItems.forEach(function(item) {
      const currentVal = inspectionChecklist[item.key] || 'pass';

      html += `
        <div class="wizard-checklist-item" data-checklist-key="${item.key}">
          <div class="checklist-item-info">
            <h4 class="checklist-item-title">${item.title}</h4>
            <p class="checklist-item-desc">${item.desc}</p>
          </div>
          <div class="checklist-toggle-group">
            <button type="button" class="btn-check-toggle btn-toggle-pass ${currentVal === 'pass' ? 'active' : ''}" data-status="pass">
              ✓ Compliant
            </button>
            <button type="button" class="btn-check-toggle btn-toggle-review ${currentVal === 'review' ? 'active' : ''}" data-status="review">
              ⚠ Needs Review
            </button>
            <button type="button" class="btn-check-toggle btn-toggle-violation ${currentVal === 'violation' ? 'active' : ''}" data-status="violation">
              ✕ Violation
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Toggle button events
    const toggleBtns = container.querySelectorAll('.btn-check-toggle');
    toggleBtns.forEach(function(btn) {
      btn.onclick = function() {
        const parent = this.closest('.wizard-checklist-item');
        const key = parent.getAttribute('data-checklist-key');
        const status = this.getAttribute('data-status');

        parent.querySelectorAll('.btn-check-toggle').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        inspectionChecklist[key] = status;

        // Check if any item is violation or review to auto-suggest violation filing
        checkViolationRecommendation();
      };
    });
  }

  function checkViolationRecommendation() {
    const hasViolation = Object.values(inspectionChecklist).some(v => v === 'violation');
    const hasReview = Object.values(inspectionChecklist).some(v => v === 'review');

    const warningBanner = document.getElementById('checklist-violation-notice');
    if (warningBanner) {
      if (hasViolation) {
        warningBanner.style.display = 'block';
        warningBanner.className = 'notice-banner notice-danger';
        warningBanner.innerHTML = '<strong>Violation Detected:</strong> A formal violation report section will be included in this inspection filing.';
      } else if (hasReview) {
        warningBanner.style.display = 'block';
        warningBanner.className = 'notice-banner notice-warning';
        warningBanner.innerHTML = '<strong>Advisory Condition:</strong> Packaging will be flagged for follow-up review.';
      } else {
        warningBanner.style.display = 'none';
      }
    }
  }

  /**
   * Render Evidence Grid in Wizard
   */
  function renderEvidenceGrid() {
    const grid = document.getElementById('wizard-evidence-grid');
    if (!grid) return;

    if (activeEvidenceList.length === 0) {
      grid.innerHTML = '<p class="text-muted">No evidence attached yet. Capture or upload packaging photos below.</p>';
      return;
    }

    let html = '';
    activeEvidenceList.forEach(function(ev, index) {
      html += `
        <div class="evidence-thumb-card">
          <img src="${ev.url}" alt="${ev.name}" class="evidence-img" onerror="this.src='assets/images/product-oil.svg'">
          <div class="evidence-meta">
            <span class="evidence-tag">${ev.type}</span>
            <span class="evidence-name">${ev.name}</span>
          </div>
          <button type="button" class="btn-delete-evidence" data-evidence-index="${index}" title="Remove Evidence">✕</button>
        </div>
      `;
    });

    grid.innerHTML = html;

    // Delete evidence handlers
    const delBtns = grid.querySelectorAll('.btn-delete-evidence');
    delBtns.forEach(function(btn) {
      btn.onclick = function() {
        const idx = parseInt(this.getAttribute('data-evidence-index'), 10);
        activeEvidenceList.splice(idx, 1);
        renderEvidenceGrid();
        MetraScan.App.showToast('Evidence item removed.', 'info');
      };
    });
  }

  /**
   * Setup Wizard Navigation between Steps
   */
  function setupWizardNavigation() {
    // Evidence Upload Buttons
    const uploadInput = document.getElementById('evidence-file-input');
    const uploadBtn = document.getElementById('btn-upload-evidence');
    const captureBtn = document.getElementById('btn-capture-evidence');

    if (uploadBtn && uploadInput) {
      uploadBtn.onclick = function() {
        uploadInput.click();
      };
    }

    if (captureBtn) {
      captureBtn.onclick = function() {
        MetraScan.Nav.navigateTo('ministry-scan');
        MetraScan.App.showToast('Point scanner at commodity & tap shutter button to capture evidence photo.', 'info', 3000);
      };
    }

    if (uploadInput) {
      uploadInput.onchange = function(e) {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = function(evt) {
            const newEv = {
              id: 'ev-' + Date.now(),
              type: 'Field Photo',
              name: file.name,
              url: evt.target.result
            };
            activeEvidenceList.push(newEv);
            renderEvidenceGrid();
            MetraScan.App.showToast('Evidence attached: ' + file.name, 'success');
          };
          reader.readAsDataURL(file);
        }
      };
    }
  }

  // Global Capture-Phase Event Delegation for Wizard Navigation Buttons & Step Indicators
  document.addEventListener('click', function(e) {
    const nextBtn = e.target.closest('#wizard-btn-next');
    if (nextBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (validateWizardStep(currentWizardStep)) {
        goToWizardStep(currentWizardStep + 1);
      }
      return;
    }

    const prevBtn = e.target.closest('#wizard-btn-prev');
    if (prevBtn) {
      e.preventDefault();
      e.stopPropagation();
      goToWizardStep(currentWizardStep - 1);
      return;
    }

    const submitBtn = e.target.closest('#wizard-btn-submit');
    if (submitBtn) {
      e.preventDefault();
      e.stopPropagation();
      generateInspectionReport();
      return;
    }

    const stepIndicator = e.target.closest('.step-indicator');
    if (stepIndicator) {
      e.preventDefault();
      e.stopPropagation();
      const idStr = stepIndicator.id || '';
      const stepNum = parseInt(idStr.replace('step-indicator-', ''), 10);
      if (stepNum >= 1 && stepNum <= 5) {
        if (stepNum > currentWizardStep) {
          if (validateWizardStep(currentWizardStep)) {
            goToWizardStep(stepNum);
          }
        } else {
          goToWizardStep(stepNum);
        }
      }
      return;
    }
  }, true);

  /**
   * Validate step before moving forward
   */
  function validateWizardStep(step) {
    if (step === 1) {
      const retailerInput = document.getElementById('wizard-retailer-input');
      if (retailerInput && !retailerInput.value.trim()) {
        MetraScan.App.showToast('Please enter retailer or inspection market location.', 'error');
        retailerInput.focus();
        return false;
      }
    }
    return true;
  }

  /**
   * Navigate to wizard step
   */
  function goToWizardStep(step) {
    currentWizardStep = step;
    if (currentWizardStep < 1) currentWizardStep = 1;
    if (currentWizardStep > 5) currentWizardStep = 5;

    // Update Step Indicators
    for (let i = 1; i <= 5; i++) {
      const stepEl = document.getElementById('wizard-step-pane-' + i);
      const indicatorEl = document.getElementById('step-indicator-' + i);
      if (stepEl) {
        stepEl.style.display = (i === currentWizardStep) ? 'block' : 'none';
      }
      if (indicatorEl) {
        if (i < currentWizardStep) {
          indicatorEl.className = 'step-indicator completed';
        } else if (i === currentWizardStep) {
          indicatorEl.className = 'step-indicator active';
          if (indicatorEl.scrollIntoView) {
            indicatorEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        } else {
          indicatorEl.className = 'step-indicator pending';
        }
      }
    }

    // Update buttons
    const prevBtn = document.getElementById('wizard-btn-prev');
    const nextBtn = document.getElementById('wizard-btn-next');
    const submitBtn = document.getElementById('wizard-btn-submit');

    if (prevBtn) prevBtn.style.display = (currentWizardStep === 1) ? 'none' : 'inline-flex';
    if (nextBtn) nextBtn.style.display = (currentWizardStep === 5) ? 'none' : 'inline-flex';
    if (submitBtn) submitBtn.style.display = (currentWizardStep === 5) ? 'inline-flex' : 'none';

    window.scrollTo(0, 100);
  }

  /**
   * Generate Inspection Report and save into registry
   */
  function generateInspectionReport() {
    const productSelect = document.getElementById('wizard-product-select');
    const productId = productSelect ? productSelect.value : null;
    const product = (productId && MetraScan.App.getProductById(productId)) || MetraScan.App.state.products[0] || {
      id: 'prod-' + Date.now(),
      name: 'Inspected Commodity Sample',
      barcode: 'FIELD-' + Date.now()
    };

    const retailerInput = document.getElementById('wizard-retailer-input');
    const retailer = retailerInput && retailerInput.value.trim() ? retailerInput.value.trim() : 'Retail Market Point';

    const notesInput = document.getElementById('wizard-notes-input');
    const notes = notesInput ? notesInput.value.trim() : 'Routine market surveillance inspection conducted.';

    const user = MetraScan.Auth.getCurrentUser() || {
      name: 'Insp. Rajesh Verma',
      govId: 'GOV-LM-2026-4481',
      department: 'Legal Metrology Department'
    };

    // Calculate score and status
    const values = Object.values(inspectionChecklist);
    const violationsCount = values.filter(v => v === 'violation').length;
    const reviewCount = values.filter(v => v === 'review').length;

    let status = 'verified';
    let statusLabel = 'Fully Compliant';
    let score = 98;

    if (violationsCount > 0) {
      status = 'violation';
      statusLabel = 'Violation Recorded';
      score = Math.max(30, 98 - (violationsCount * 25));
    } else if (reviewCount > 0) {
      status = 'review';
      statusLabel = 'Needs Review';
      score = Math.max(70, 98 - (reviewCount * 12));
    }

    const reportId = 'RPT-LM-2026-' + (1050 + Math.floor(Math.random() * 800));
    const inspectionId = 'INS-2026-' + (1050 + Math.floor(Math.random() * 800));

    // Gather Violation fields if any
    const vioTypeInput = document.getElementById('wizard-violation-type');
    const vioSeverityInput = document.getElementById('wizard-violation-severity');
    const vioActionInput = document.getElementById('wizard-violation-action');

    const violationType = (status === 'violation') ? (vioTypeInput ? vioTypeInput.value : 'Declaration & Packaging Violation') : 'None';
    const severity = (status === 'violation') ? (vioSeverityInput ? vioSeverityInput.value : 'High') : 'None';

    const newInspection = {
      id: inspectionId,
      reportId: reportId,
      productId: product.id,
      productName: product.name,
      retailer: retailer,
      officer: user.name + ' (' + (user.govId || 'GOV-LM-2026-4481') + ')',
      department: user.department || 'Legal Metrology Department',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: status,
      statusLabel: statusLabel,
      score: score,
      severity: severity,
      checklist: Object.assign({}, inspectionChecklist),
      violationType: violationType,
      ruleCitation: (status === 'violation') ? 'Legal Metrology Act, 2009 Sec 36(1) & PCR Rule 6 & 18' : 'Compliant under Legal Metrology Rules',
      evidenceCount: activeEvidenceList.length,
      evidenceList: activeEvidenceList.slice(),
      notes: notes
    };

    // Save into state
    MetraScan.App.state.inspections.unshift(newInspection);
    MetraScan.App.saveData('inspections', MetraScan.App.state.inspections);

    // If violation, add to violations
    if (status === 'violation') {
      const newViolation = {
        id: 'VIO-2026-' + (100 + Math.floor(Math.random() * 900)),
        inspectionId: inspectionId,
        productName: product.name,
        retailer: retailer,
        violation: violationType,
        severity: severity,
        clause: 'Rule 18(2) & Rule 24 of Legal Metrology (PC) Rules, 2011',
        status: 'Open Case',
        penalty: vioActionInput ? vioActionInput.value : 'Compounding Notice Issued',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      MetraScan.App.state.violations.unshift(newViolation);
      MetraScan.App.saveData('violations', MetraScan.App.state.violations);
    }

    MetraScan.App.showToast('Inspection report #' + reportId + ' generated successfully!', 'success');
    MetraScan.Nav.navigateTo('ministry-report-confirm', { reportId: reportId });
  }

  /**
   * Render Report Confirmation View
   */
  function renderReportConfirm(reportId) {
    const inspection = (reportId && MetraScan.App.state.inspections.find(i => i.reportId === reportId)) || MetraScan.App.state.inspections[0];
    const container = document.getElementById('report-confirm-details');
    if (!container) return;

    if (!inspection) {
      container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">No inspection records found.</p>';
      return;
    }

    let statusBadge = `<span class="badge badge-success">✓ Fully Compliant</span>`;
    if (inspection.status === 'violation') {
      statusBadge = `<span class="badge badge-danger">✕ Violation Recorded</span>`;
    } else if (inspection.status === 'review') {
      statusBadge = `<span class="badge badge-warning">⚠️ Needs Review</span>`;
    }

    container.innerHTML = `
      <div class="confirm-summary-table">
        <div class="confirm-row">
          <span class="confirm-label">Official Report ID:</span>
          <span class="confirm-val highlight-id">${inspection.reportId}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Inspected Commodity:</span>
          <span class="confirm-val">${inspection.productName}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Inspection Officer:</span>
          <span class="confirm-val">${inspection.officer}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Jurisdiction / Location:</span>
          <span class="confirm-val">${inspection.retailer}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Statutory Compliance Status:</span>
          <span class="confirm-val">${statusBadge}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Total Evidence Attached:</span>
          <span class="confirm-val"><strong>${inspection.evidenceCount} Files</strong> (Tamper-evident logs)</span>
        </div>
      </div>
    `;

    // Bind action buttons
    const viewReportBtn = document.getElementById('btn-confirm-view-report');
    if (viewReportBtn) {
      viewReportBtn.onclick = function() {
        MetraScan.Nav.navigateTo('ministry-report-view', { reportId: inspection.reportId });
      };
    }
  }

  /**
   * Render Official Government Printable Report View
   */
  function renderOfficialReport(reportId) {
    const inspection = (reportId && MetraScan.App.state.inspections.find(i => i.reportId === reportId)) || MetraScan.App.state.inspections[0];
    const container = document.getElementById('official-report-document');
    if (!container) return;

    if (!inspection) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 3rem 1.5rem; text-align: center;">
          <div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
          <h3 style="margin-bottom: 0.5rem;">No Inspection Report Found</h3>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Conduct a field inspection to generate an authenticated MetraCert report.</p>
          <button class="btn btn-primary" data-navigate="ministry-scan">Start Inspection</button>
        </div>
      `;
      return;
    }

    const product = MetraScan.App.getProductById(inspection.productId) || {
      name: inspection.productName || 'Inspected Commodity',
      brand: 'Packaged Commodity',
      category: 'General FMCG',
      mrp: 'Standard Retail Price',
      netQuantity: '1 Standard Unit',
      batchNo: 'N/A',
      mfgDate: 'N/A',
      expDate: 'N/A',
      licenceNo: 'Verified Under Field Audit',
      mfgAddress: 'Inspected Premises'
    };

    let checklistRowsHtml = '';
    const checklistMap = [
      { key: 'labeling', name: 'Product Labeling & Conspicuity', rule: 'Rule 6(1) & Schedule II' },
      { key: 'declarations', name: 'Mandatory Declarations Presence', rule: 'Rule 6(1)(a-g)' },
      { key: 'manufacturer', name: 'Manufacturer Name & Complete Address', rule: 'Rule 6(1)(a)' },
      { key: 'qrRegistration', name: 'QR & Digital National MetraSeal', rule: 'Central Database Synchronized' },
      { key: 'packaging', name: 'Packaging Dimension & Standard Sizes', rule: 'Second Schedule PCR' },
      { key: 'measurement', name: 'Net Quantity / Gravimetric Verification', rule: 'Rule 12 & Rule 24 (MPE)' }
    ];

    checklistMap.forEach(function(item) {
      const state = inspection.checklist[item.key] || 'pass';
      let stateBadge = '<span class="report-check-pass">PASS (Compliant)</span>';
      if (state === 'violation') {
        stateBadge = '<span class="report-check-fail">DEFICIT / VIOLATION</span>';
      } else if (state === 'review') {
        stateBadge = '<span class="report-check-warn">UNDER REVIEW</span>';
      }

      checklistRowsHtml += `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${item.rule}</td>
          <td class="text-center">${stateBadge}</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="official-certificate-sheet">
        <!-- Government Top Header -->
        <div class="cert-gov-header">
          <img src="assets/logo/emblem.svg" alt="Emblem of India" class="cert-emblem-img">
          <div class="cert-gov-titles">
            <h3>GOVERNMENT OF INDIA</h3>
            <h4>MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION</h4>
            <h5>DEPARTMENT OF LEGAL METROLOGY — CENTRAL ENFORCEMENT WING</h5>
            <p class="cert-act-subtitle">Official Verification & Statutory Inspection Certificate under Legal Metrology Act, 2009</p>
          </div>
        </div>

        <div class="cert-divider-gold"></div>

        <!-- Certificate Metadata Grid -->
        <div class="cert-meta-grid">
          <div class="cert-meta-col">
            <p><strong>REPORT REFERENCE:</strong> <span class="mono-text">${inspection.reportId}</span></p>
            <p><strong>INSPECTION RECORD:</strong> <span class="mono-text">${inspection.id}</span></p>
            <p><strong>INSPECTION DATE:</strong> ${inspection.date}</p>
            <p><strong>LOCATION / PREMISES:</strong> ${inspection.retailer}</p>
          </div>
          <div class="cert-meta-col text-right">
            <p><strong>ENFORCEMENT OFFICER:</strong> ${inspection.officer}</p>
            <p><strong>DEPARTMENT:</strong> ${inspection.department}</p>
            <p><strong>COMPLIANCE RATING:</strong> <strong>${inspection.score}% (${inspection.statusLabel.toUpperCase()})</strong></p>
            <p><strong>STATUS:</strong> <span class="badge ${inspection.status === 'verified' ? 'badge-success' : 'badge-danger'}">${inspection.status.toUpperCase()}</span></p>
          </div>
        </div>

        <!-- Product Details Box -->
        <div class="cert-section-box">
          <h4 class="cert-box-title">1. COMMODITY & PACKAGING PARTICULARS</h4>
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
                <td><strong>Batch / Lot No:</strong></td>
                <td>${product.batchNo}</td>
              </tr>
              <tr>
                <td><strong>Manufacturer:</strong></td>
                <td>${product.manufacturer}</td>
                <td><strong>Declared Net Quantity:</strong></td>
                <td>${product.netQuantity}</td>
              </tr>
              <tr>
                <td><strong>Manufacturer Address:</strong></td>
                <td>${product.mfgAddress}</td>
                <td><strong>Maximum Retail Price:</strong></td>
                <td>${product.mrp}</td>
              </tr>
              <tr>
                <td><strong>Barcode / GTIN:</strong></td>
                <td>${product.barcode}</td>
                <td><strong>Unit Sale Price:</strong></td>
                <td>${product.unitSalePrice}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Statutory Checklist Table -->
        <div class="cert-section-box">
          <h4 class="cert-box-title">2. STATUTORY DECLARATION AUDIT RESULTS</h4>
          <table class="cert-table cert-checklist-table">
            <thead>
              <tr>
                <th>Compliance Parameter</th>
                <th>Statutory Provision</th>
                <th class="text-center">Verification Finding</th>
              </tr>
            </thead>
            <tbody>
              ${checklistRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Observations & Findings -->
        <div class="cert-section-box">
          <h4 class="cert-box-title">3. INSPECTOR'S OBSERVATION & STATUTORY DIRECTIVES</h4>
          <div class="cert-notes-box">
            ${inspection.status === 'violation' ? `
              <div class="cert-violation-alert" style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
                <h5 style="color: #991b1b; font-size: 1.05rem; font-weight: 800; margin-bottom: 8px;">
                  ✕ STATUTORY VIOLATION AUDIT: WHAT IS WRONG WITH THIS COMMODITY
                </h5>
                <div style="font-size: 0.88rem; color: #7f1d1d; line-height: 1.6;">
                  <p><strong>1. Recorded Statutory Deficit:</strong> ${inspection.violationType}</p>
                  <p><strong>2. Legal Citation & Rule Violated:</strong> ${inspection.ruleCitation}</p>
                  <p><strong>3. Specific Inspector Field Observations:</strong> ${inspection.notes || 'Mandatory statutory declaration deficit and deceptive packaging detected during market surveillance.'}</p>
                  <p><strong>4. Statutory Directive & Prosecution Notice:</strong> Action initiated under Section 36 of Legal Metrology Act, 2009 and Packaged Commodities Rules, 2011. Formal demand notice served on manufacturer/packer to explain within statutory timeframe.</p>
                </div>
              </div>
            ` : `
              <div class="cert-compliance-success-box" style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
                <h5 style="color: #166534; font-size: 0.98rem; font-weight: 800; margin-bottom: 6px;">
                  ✓ CERTIFIED STATUTORILY COMPLIANT: STRICTLY FOLLOWS ALL LAWS & RECIPE STANDARDS
                </h5>
                <p style="font-size: 0.86rem; color: #166534; line-height: 1.5; margin: 0;">
                  Official surveillance inspection confirms the package strictly satisfies all statutory declarations under Rule 6(1) of Legal Metrology (Packaged Commodities) Rules, 2011, complies with Rule 5 standard packaging quantities, and passes Rule 12 gravimetric net quantity verification. Declared recipe composition and FSSAI standards have been verified with zero legal or metric infractions.
                </p>
              </div>
              <p><strong>Inspector Notes:</strong> ${inspection.notes || 'Surveillance inspection concluded with full compliance certification.'}</p>
            `}
          </div>
        </div>

        <!-- Official Signatures and Seal -->
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
              <span class="digital-sign-font">Rajesh Verma</span>
            </div>
            <p><strong>(Inspector of Legal Metrology)</strong></p>
            <p class="cert-sign-dept">${inspection.department}</p>
            <p class="cert-sign-time">${inspection.date}</p>
          </div>
        </div>

        <div class="cert-footer-disclaimer">
          This is an official computer-generated statutory inspection report authenticated via MetraScan Central Gateway.
        </div>
      </div>
    `;

    // Bind Print & Download Buttons
    const printBtn = document.getElementById('btn-print-official-report');
    if (printBtn) {
      printBtn.onclick = function() {
        window.print();
      };
    }
    const downloadBtn = document.getElementById('btn-download-official-report');
    if (downloadBtn) {
      downloadBtn.onclick = function() {
        window.print();
      };
    }
  }

  /**
   * Inspector Camera Scanner & Field Tooling
   */
  let inspectorCameraStream = null;
  let inspectorCurrentFacingMode = 'environment';
  let inspectorAvailableCameras = [];
  let inspectorAlignmentInterval = null;
  let inspectorOrientationListener = null;
  let inspectorMotionListener = null;
  let inspectorRollAngle = 0;
  let inspectorLastShakeTime = 0;
  let inspectorLastAcc = { x: 0, y: 0, z: 0 };
  let inspectorPrevFrameData = null;

  /**
   * Start Live Camera Alignment & Tilt/Shake Analyzer for Inspector Mode
   * Monitors centering, tilt, shake/motion, brightness, and edge distribution in real-time
   */
  function startInspectorAlignmentAnalyzer() {
    stopInspectorAlignmentAnalyzer();

    const video = document.getElementById('inspector-camera-preview-video');
    const guidancePill = document.getElementById('inspector-guidance-pill');
    const guidanceText = document.getElementById('inspector-guidance-text');
    const guidanceIcon = document.getElementById('inspector-guidance-icon');
    const arrowLeft = document.getElementById('inspector-guidance-arrow-left');
    const arrowRight = document.getElementById('inspector-guidance-arrow-right');
    const arrowUp = document.getElementById('inspector-guidance-arrow-up');
    const arrowDown = document.getElementById('inspector-guidance-arrow-down');
    const horizonLevel = document.getElementById('inspector-guidance-horizon-level');
    const horizonLine = document.getElementById('inspector-guidance-horizon-line');
    const horizonAngle = document.getElementById('inspector-guidance-horizon-angle');
    const frameBox = document.getElementById('inspector-scanner-frame-box');

    // Offscreen canvas for ultra-fast sampling
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 160;
    sampleCanvas.height = 120;
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

    // Gyroscope / orientation listener for straightness detection
    inspectorOrientationListener = function(event) {
      if (event.gamma !== null && event.gamma !== undefined) {
        inspectorRollAngle = Math.round(event.gamma);
      }
    };
    window.addEventListener('deviceorientation', inspectorOrientationListener, true);

    // Accelerometer / devicemotion listener for physical camera shake detection
    inspectorMotionListener = function(event) {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;
      const dx = Math.abs((acc.x || 0) - inspectorLastAcc.x);
      const dy = Math.abs((acc.y || 0) - inspectorLastAcc.y);
      const dz = Math.abs((acc.z || 0) - inspectorLastAcc.z);
      inspectorLastAcc = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 };
      if (dx + dy + dz > 14) {
        inspectorLastShakeTime = Date.now();
      }
    };
    window.addEventListener('devicemotion', inspectorMotionListener, true);

    inspectorAlignmentInterval = setInterval(function() {
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

            if (inspectorPrevFrameData) {
              const pLum = 0.299 * inspectorPrevFrameData[idx] + 0.587 * inspectorPrevFrameData[idx + 1] + 0.114 * inspectorPrevFrameData[idx + 2];
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
        inspectorPrevFrameData = data;

        if (avgJitter > 22) {
          inspectorLastShakeTime = Date.now();
        }

        // Reset active arrow indicators
        if (arrowLeft) arrowLeft.classList.remove('active');
        if (arrowRight) arrowRight.classList.remove('active');
        if (arrowUp) arrowUp.classList.remove('active');
        if (arrowDown) arrowDown.classList.remove('active');

        // Update Horizon Level bar
        const isLevel = Math.abs(inspectorRollAngle) <= 6;
        if (horizonLine) horizonLine.style.transform = `rotate(${inspectorRollAngle}deg)`;
        if (horizonAngle) horizonAngle.textContent = `${inspectorRollAngle > 0 ? '+' : ''}${inspectorRollAngle}°`;
        if (horizonLevel) {
          if (isLevel) horizonLevel.classList.add('is-level');
          else horizonLevel.classList.remove('is-level');
        }

        const isShaking = (Date.now() - inspectorLastShakeTime) < 900;

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
            if (guidanceIcon) guidanceIcon.textContent = inspectorRollAngle > 0 ? '⟲' : '⟳';
            if (guidanceText) guidanceText.textContent = `Align straight (${inspectorRollAngle}° tilt) — Hold device level`;
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

  function stopInspectorAlignmentAnalyzer() {
    if (inspectorAlignmentInterval) {
      clearInterval(inspectorAlignmentInterval);
      inspectorAlignmentInterval = null;
    }
    if (inspectorOrientationListener) {
      window.removeEventListener('deviceorientation', inspectorOrientationListener, true);
      inspectorOrientationListener = null;
    }
    if (inspectorMotionListener) {
      window.removeEventListener('devicemotion', inspectorMotionListener, true);
      inspectorMotionListener = null;
    }
    inspectorPrevFrameData = null;
  }

  function initInspectorScanner() {
    const video = document.getElementById('inspector-camera-preview-video');
    const statusNotice = document.getElementById('inspector-scanner-status-notice');
    const toggleBtn = document.getElementById('btn-inspector-camera-toggle');

    // Immediately stop any existing stream to prevent hardware lock
    stopInspectorCamera();

    // Start guidance & orientation analyzer
    startInspectorAlignmentAnalyzer();

    function startStream(facing) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (statusNotice) {
          statusNotice.textContent = 'Camera not supported in browser. Tap "Upload Label Photo" below.';
          statusNotice.className = 'scanner-status-banner status-sim';
          statusNotice.style.display = 'inline-flex';
        }
        return Promise.reject(new Error('getUserMedia not supported'));
      }

      // First attempt with ideal facingMode and resolution
      return navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      .catch(function(err) {
        console.warn('Primary inspector camera constraint rejected, falling back to basic video:', err);
        return navigator.mediaDevices.getUserMedia({ video: true });
      })
      .then(function(stream) {
        inspectorCameraStream = stream;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.muted = true;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(function(e) {
              console.warn('Inspector video auto-play prevented:', e);
            });
          }
          video.style.display = 'block';
        }
        if (statusNotice) {
          statusNotice.textContent = 'Field Inspector Camera Active. Align package label.';
          statusNotice.className = 'scanner-status-banner status-live';
          statusNotice.style.display = 'inline-flex';
        }
        startInspectorAlignmentAnalyzer();
        return stream;
      });
    }

    startStream(inspectorCurrentFacingMode)
      .catch(function(err) {
        console.warn('Inspector camera completely unavailable or permission denied:', err);
        if (video) video.style.display = 'none';
        if (statusNotice) {
          statusNotice.textContent = 'Camera unavailable. Tap Shutter or "Upload Label Photo" below.';
          statusNotice.className = 'scanner-status-banner status-sim';
          statusNotice.style.display = 'inline-flex';
        }
      });

    // Detect if device has multiple cameras to offer camera toggle
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(function(devices) {
        inspectorAvailableCameras = devices.filter(d => d.kind === 'videoinput');
        if (toggleBtn) {
          toggleBtn.style.display = inspectorAvailableCameras.length > 1 ? 'inline-flex' : 'none';
        }
      }).catch(function() {});
    }

    setupInspectorScannerEvents();
  }

  function stopInspectorCamera() {
    stopInspectorAlignmentAnalyzer();
    if (inspectorCameraStream) {
      inspectorCameraStream.getTracks().forEach(function(track) {
        track.stop();
      });
      inspectorCameraStream = null;
    }
    const video = document.getElementById('inspector-camera-preview-video');
    if (video) {
      video.srcObject = null;
    }
  }

  function setupInspectorScannerEvents() {
    // Camera switch toggle button
    const toggleBtn = document.getElementById('btn-inspector-camera-toggle');
    if (toggleBtn) {
      toggleBtn.onclick = function() {
        inspectorCurrentFacingMode = (inspectorCurrentFacingMode === 'environment') ? 'user' : 'environment';
        initInspectorScanner();
        MetraScan.App.showToast('Switched to ' + (inspectorCurrentFacingMode === 'environment' ? 'Back' : 'Front') + ' Camera', 'info', 1500);
      };
    }

    // Simulation pills
    const simBtns = document.querySelectorAll('.inspector-barcode-sim-pill');
    simBtns.forEach(function(btn) {
      btn.onclick = function() {
        const barcode = this.getAttribute('data-barcode');
        triggerInspectorScanSuccess(barcode);
      };
    });

    // Gallery upload input (Ministry Inspector) — REAL OCR PROCESS
    const fileInput = document.getElementById('inspector-gallery-input');
    if (fileInput) {
      fileInput.onchange = function(e) {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const localUrl = URL.createObjectURL(file);
          processRealInspectorScan(file, file.name, localUrl);
          fileInput.value = '';
        }
      };
    }

    // Upload button trigger
    const uploadBtn = document.getElementById('btn-inspector-upload-trigger');
    if (uploadBtn && fileInput) {
      uploadBtn.onclick = function() {
        fileInput.click();
      };
    }

    // Manual barcode/product entry modal trigger
    const manualBtn = document.getElementById('btn-inspector-manual-trigger');
    if (manualBtn) {
      manualBtn.onclick = function() {
        MetraScan.App.openModal('modal-inspector-manual');
      };
    }

    // Camera Shutter Photo Capture Button (Ministry Inspector) — REAL OCR PROCESS
    const captureBtn = document.getElementById('btn-inspector-capture');
    if (captureBtn) {
      captureBtn.onclick = function() {
        const video = document.getElementById('inspector-camera-preview-video');
        let photoUrl = null;
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          photoUrl = MetraScan.App.capturePhotoFromVideo(video, 'inspector-shutter-flash', null);
        }

        if (!photoUrl) {
          // Fallback if camera stream is not live/ready: prompt camera/gallery file selector
          if (fileInput) {
            MetraScan.App.showToast('Camera feed not ready — select or capture a photo', 'info', 2500);
            fileInput.click();
            return;
          }
          MetraScan.App.showToast('Camera feed is not ready. Please allow camera permissions or upload an image.', 'error', 3500);
          return;
        }

        const file = MetraScan.API.dataUrlToFile(photoUrl, 'inspector-captured-label.jpg');
        if (file) {
          processRealInspectorScan(file, 'Live Inspector Camera Scan', photoUrl);
        } else {
          MetraScan.App.showToast('Could not convert camera frame to file.', 'error');
        }
      };
    }

    // Torch button
    const torchBtn = document.getElementById('btn-inspector-torch');
    if (torchBtn) {
      torchBtn.onclick = function() {
        this.classList.toggle('active');
        const isActive = this.classList.contains('active');
        if (inspectorCameraStream) {
          const track = inspectorCameraStream.getVideoTracks()[0];
          if (track && track.applyConstraints) {
            track.applyConstraints({
              advanced: [{ torch: isActive }]
            }).catch(function() {});
          }
        }
        MetraScan.App.showToast(isActive ? 'Inspector Torch Activated' : 'Torch Deactivated', 'info', 1200);
      };
    }
  }

  /**
   * Real Field Inspector OCR Scan & Rule 6(1) Verification
   * Rejects non-packaging or missing declarations without ambiguous data
   */
  async function processRealInspectorScan(file, sourceName, photoUrl) {
    if (!file) return;

    const procOverlay = document.getElementById('inspector-processing-overlay');
    const procStatus = document.getElementById('inspector-processing-status');
    if (procOverlay) procOverlay.style.display = 'flex';
    if (procStatus) procStatus.textContent = 'Auditing seized packaging with AI OCR Engine...';

    MetraScan.App.showToast('🔍 Analyzing label for Legal Metrology declarations...', 'info', 3000);

    const currentUser = MetraScan.Auth.getCurrentUser();

    try {
      if (procStatus) procStatus.textContent = 'Extracting packaging declarations & checking compliance...';

      const response = await MetraScan.API.scanImages([file], currentUser);

      // If server could not be reached or scan errored out
      if (!response || !response.ok || !response.data) {
        if (procOverlay) procOverlay.style.display = 'none';
        MetraScan.App.playScanBeep(false);
        const errMsg = (response && response.error) ? response.error : 'AI OCR Scanner service is unavailable.';
        MetraScan.App.showToast('⚠️ ' + errMsg, 'error', 5500);
        return;
      }

      const scanData = response.data;
      const verdict = scanData.verdict || {};

      // Check whether real statutory packaging declarations were actually detected
      const hasDeclarations = ['mrp', 'net_quantity', 'mfg_date', 'manufacturer', 'consumer_care', 'country_of_origin'].some(k => {
        return verdict[k] && (verdict[k].found || (verdict[k].value && String(verdict[k].value).trim().length > 0) || (verdict[k].text && String(verdict[k].text).trim().length > 0));
      });
      const hasGenericName = verdict.generic_name && (verdict.generic_name.found || (verdict.generic_name.text && String(verdict.generic_name.text).trim().length > 0));
      const hasIngredients = verdict.ingredient_analysis && verdict.ingredient_analysis.found;
      const hasAnyOcrTokens = (scanData.total_ocr_boxes && scanData.total_ocr_boxes > 2);
      const isValidProduct = scanData.is_valid_product || hasDeclarations || hasGenericName || hasIngredients || hasAnyOcrTokens;

      // If NO statutory packaging declarations were detected:
      if (!isValidProduct) {
        if (procOverlay) procOverlay.style.display = 'none';
        MetraScan.App.playScanBeep(false);
        MetraScan.App.showToast('⚠️ Package missing Rule 6(1) declarations', 'warning', 4000);
        MetraScan.App.showInvalidScanModal(scanData, sourceName || file.name, photoUrl, true);
        return;
      }

      // Valid product detected — ONLY map genuine detected data!
      const product = MetraScan.API.mapVerdictToProduct(scanData, sourceName || file.name, currentUser, photoUrl);
      if (scanData.supabase_id) {
        product.supabaseId = scanData.supabase_id;
      }

      // Save to official product repository and history
      MetraScan.App.addProduct(product);
      MetraScan.App.addScanToHistory(product.id);

      // Sound and visual feedback
      MetraScan.App.playScanBeep(product.status !== 'violation');

      const laser = document.querySelector('.inspector-scanner-laser');
      if (laser) laser.classList.add('scanner-laser-matched');

      const locInput = document.getElementById('inspector-scan-location-input');
      const locationVal = locInput && locInput.value.trim() ? locInput.value.trim() : 'Retail Inspection Point';

      if (procStatus) procStatus.textContent = '✓ Inspection Audit Complete! Loading Case Wizard...';

      // Auto-attach as field evidence
      if (photoUrl) {
        activeEvidenceList.unshift({
          id: 'ev-' + Date.now(),
          type: 'Field Seizure Photo',
          name: 'Seized Packaging (' + (sourceName || 'Live Camera') + ')',
          url: photoUrl,
          time: 'Just now'
        });
      }

      setTimeout(function() {
        if (procOverlay) procOverlay.style.display = 'none';
        if (laser) laser.classList.remove('scanner-laser-matched');
        stopInspectorCamera();
        MetraScan.Nav.navigateTo('consumer-verification', {
          productId: product.id
        });
      }, 500);

    } catch (err) {
      if (procOverlay) procOverlay.style.display = 'none';
      MetraScan.App.playScanBeep(false);
      MetraScan.App.showToast('⚠️ Inspector scanner error: ' + err.message, 'error', 4500);
    }
  }

  function triggerInspectorScanSuccess(barcode) {
    const product = MetraScan.App.getProductByBarcode(barcode);
    if (!product) {
      MetraScan.App.playScanBeep(false);
      MetraScan.App.showToast('Barcode ' + barcode + ' not found in national registry.', 'error');
      return;
    }

    MetraScan.App.playScanBeep(product.status !== 'violation');

    const laser = document.querySelector('.inspector-scanner-laser');
    if (laser) laser.classList.add('scanner-laser-matched');

    const locInput = document.getElementById('inspector-scan-location-input');
    const locationVal = locInput && locInput.value.trim() ? locInput.value.trim() : 'Retail Inspection Point';

    MetraScan.App.showToast('Commodity Identified: ' + product.name, 'success', 1400);

    setTimeout(function() {
      if (laser) laser.classList.remove('scanner-laser-matched');
      stopInspectorCamera();
      MetraScan.Nav.navigateTo('consumer-verification', {
        productId: product.id
      });
    }, 500);
  }

  /**
   * Render Inspector Profile Screen (View & Edit Official Details)
   */
  function renderInspectorProfile() {
    const user = MetraScan.Auth.getCurrentUser() || {
      name: 'Insp. Rajesh Verma',
      govId: 'GOV-LM-DEL-8841',
      designation: 'Senior Inspector of Legal Metrology',
      department: 'Department of Legal Metrology, Ministry of Consumer Affairs',
      badgeNumber: 'LM-DEL-8841',
      jurisdiction: 'South Delhi Division & NCR Circle',
      email: 'rajesh.verma@nic.in',
      phone: '1123389800',
      officeAddress: 'Krishi Bhawan, Dr. Rajendra Prasad Road, New Delhi - 110001',
      signature: 'Rajesh Verma'
    };

    const nameEl = document.getElementById('inspector-profile-display-name');
    const badgeEl = document.getElementById('inspector-profile-display-badge');
    const deptEl = document.getElementById('inspector-profile-display-dept');

    if (nameEl) nameEl.textContent = user.name;
    if (badgeEl) badgeEl.textContent = 'Badge #' + (user.badgeNumber || 'LM-DEL-8841');
    if (deptEl) deptEl.textContent = user.department;

    // Form inputs
    const inputName = document.getElementById('inspector-edit-name');
    const inputGovId = document.getElementById('inspector-edit-govid');
    const inputDesignation = document.getElementById('inspector-edit-designation');
    const inputDept = document.getElementById('inspector-edit-dept');
    const inputBadge = document.getElementById('inspector-edit-badge');
    const inputJurisdiction = document.getElementById('inspector-edit-jurisdiction');
    const inputEmail = document.getElementById('inspector-edit-email');
    const inputPhone = document.getElementById('inspector-edit-phone');
    const inputAddress = document.getElementById('inspector-edit-address');
    const inputSignature = document.getElementById('inspector-edit-signature');

    if (inputName) inputName.value = user.name || '';
    if (inputGovId) inputGovId.value = user.govId || user.id || '';
    if (inputDesignation) inputDesignation.value = user.designation || 'Inspector of Legal Metrology';
    if (inputDept) inputDept.value = user.department || 'Legal Metrology Department';
    if (inputBadge) inputBadge.value = user.badgeNumber || 'LM-DEL-8841';
    if (inputJurisdiction) inputJurisdiction.value = user.jurisdiction || 'South Delhi Division & NCR Circle';
    if (inputEmail) inputEmail.value = user.email || 'rajesh.verma@nic.in';
    if (inputPhone) inputPhone.value = user.phone ? String(user.phone).replace(/^\+?91[\s-]*/, '') : '1123389800';
    if (inputAddress) inputAddress.value = user.officeAddress || 'Krishi Bhawan, New Delhi - 110001';
    if (inputSignature) inputSignature.value = user.signature || user.name || 'Rajesh Verma';

    // Update officer stat pills
    const inspectionsCountEl = document.getElementById('inspector-total-inspections');
    const violationsCountEl = document.getElementById('inspector-total-violations');
    const certsCountEl = document.getElementById('inspector-total-certs');
    if (inspectionsCountEl) inspectionsCountEl.textContent = MetraScan.App.state.inspections.length;
    if (violationsCountEl) violationsCountEl.textContent = MetraScan.App.state.inspections.filter(i => i.status === 'violation').length;
    if (certsCountEl) certsCountEl.textContent = MetraScan.App.state.inspections.length;

    // Profile form submission handler
    const form = document.getElementById('form-inspector-profile');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        const updated = {
          name: inputName ? inputName.value.trim() : user.name,
          govId: inputGovId ? inputGovId.value.trim() : user.govId,
          designation: inputDesignation ? inputDesignation.value.trim() : user.designation,
          department: inputDept ? inputDept.value.trim() : user.department,
          badgeNumber: inputBadge ? inputBadge.value.trim() : user.badgeNumber,
          jurisdiction: inputJurisdiction ? inputJurisdiction.value.trim() : user.jurisdiction,
          email: inputEmail ? inputEmail.value.trim() : user.email,
          phone: inputPhone ? inputPhone.value.trim() : user.phone,
          officeAddress: inputAddress ? inputAddress.value.trim() : user.officeAddress,
          signature: inputSignature ? inputSignature.value.trim() : user.signature
        };

        MetraScan.Auth.updateMinistryProfile(updated);
        if (nameEl) nameEl.textContent = updated.name;
        if (deptEl) deptEl.textContent = updated.department;
        if (badgeEl) badgeEl.textContent = 'Badge #' + updated.badgeNumber;
      };
    }

    // Logout is handled by global event delegation in bootstrap (index.html)
  }

  /**
   * Render Ministry History / Case Registry
   */
  function renderHistory() {
    renderHistoryInspectionsTab();
    setupMinistryHistoryTabs();
  }

  function renderHistoryInspectionsTab() {
    const list = document.getElementById('ministry-history-list');
    if (!list) return;

    const items = MetraScan.App.state.inspections || [];
    if (items.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📋</div>
          <p style="font-size: 1rem; margin-bottom: 0.4rem; font-weight: 600; color: var(--text-main);">No inspection reports filed yet</p>
          <p style="font-size: 0.85rem; margin-bottom: 1.25rem;">Completed field audits and statutory verifications will appear here.</p>
          <button class="btn btn-primary btn-sm" data-navigate="ministry-scan">Start New Inspection</button>
        </div>
      `;
      return;
    }

    let html = '';

    items.forEach(function(item) {
      let badgeClass = 'badge-success';
      if (item.status === 'violation') badgeClass = 'badge-danger';
      if (item.status === 'review') badgeClass = 'badge-warning';

      html += `
        <div class="ministry-history-row" data-navigate="ministry-report-view" data-params='{"reportId":"${item.reportId}"}'>
          <div class="m-hist-col-status">
            <span class="badge ${badgeClass}">${item.statusLabel}</span>
          </div>
          <div class="m-hist-col-info">
            <div class="m-hist-top">
              <span class="m-hist-id">${item.reportId}</span>
              <span class="m-hist-date">${item.date}</span>
            </div>
            <h4 class="m-hist-prod">${item.productName}</h4>
            <p class="m-hist-retailer">📍 ${item.retailer}</p>
          </div>
          <div class="m-hist-col-action">
            <button class="btn btn-sm btn-outline">View Certificate</button>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  function setupMinistryHistoryTabs() {
    const tabs = document.querySelectorAll('.m-hist-tab');
    tabs.forEach(function(tab) {
      tab.onclick = function() {
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        activeMinistryTab = this.getAttribute('data-tab');
        // Render corresponding tab
      };
    });
  }

  // Export Ministry Module API
  window.MetraScan.Ministry = {
    renderDashboard: renderDashboard,
    initInspectorScanner: initInspectorScanner,
    stopInspectorCamera: stopInspectorCamera,
    triggerInspectorScanSuccess: triggerInspectorScanSuccess,
    renderInspectorProfile: renderInspectorProfile,
    initInspectionWizard: initInspectionWizard,
    renderReportConfirm: renderReportConfirm,
    renderOfficialReport: renderOfficialReport,
    renderHistory: renderHistory,
    addEvidenceItem: function(item) { activeEvidenceList.unshift(item); }
  };

})(window);
