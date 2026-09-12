# MetraScan — National Product Verification Platform

MetraScan is a mobile-first, responsive government product verification platform built with pure **HTML5, CSS3, and Vanilla JavaScript** (zero frameworks or third-party dependencies). It bridges Indian consumers and the Department of Legal Metrology (Ministry of Consumer Affairs) to inspect packaged commodities, verify mandatory statutory declarations, identify deceptive practices, and generate tamper-evident compliance audit reports.

---

## Folder Structure

```
MetraScan/
│
├── index.html                  # Single-Page Application (SPA) container & templates
│
├── css/
│   ├── style.css               # Design system, tokens, typography, government fintech theme
│   └── responsive.css          # Fluid layouts (375px, 430px, 768px, 1024px, 1366px, 1920px) & @media print
│
├── js/
│   ├── app.js                  # Central data store, audio synthesizer, toast alerts, modal manager
│   ├── auth.js                 # Real Google Identity Services (GIS), session management & demo auth
│   ├── navigation.js           # SPA routing, history stack, and bottom navigation controller
│   ├── consumer.js             # Camera scanner, barcode simulation, verification breakdown & bookmarks
│   └── ministry.js             # Field command center, 5-step inspection wizard, evidence & report generator
│
├── assets/
│   ├── images/                 # High-resolution SVG product graphics and avatars
│   ├── icons/                  # Scalable vector interface icons
│   └── logo/                   # MetraScan emblem and National Legal Metrology seal
│
└── README.md                   # Comprehensive documentation & Google OAuth setup guide
```

---

## Key Features

### 1. Two Dedicated Portals
* **Consumer Portal**:
  * **Verify Before You Buy**: Instant barcode and MetraSeal QR scanning with camera access or instant sample presets.
  * **Statutory Declarations Audit**: 6-point legal metrology checklist compliant with Rule 6(1) of Legal Metrology (Packaged Commodities) Rules, 2011.
  * **Central Registry Verification**: Cross-checks with Central Packaged Commodity Database and FSSAI records.
  * **Saved Products & Scan History**: Persistent bookmarking in `localStorage` with category filtering and keyword search.
  * **Consumer Grievance Reporting**: One-click filing of overcharging, weight deficit, and missing declaration complaints.
  * **Dark Mode Theme Support**: Universal toggle button in headers and settings slider in Profile with persistent preference and smooth transitions.
  * **Mobile-First Bottom Navigation**: Native app bar with a raised, floating scanner action button.

* **Ministry Official Portal (Field Command Center)**:
  * **Operations Dashboard**: Live metrics for 248+ inspections, 86% compliance rate, violations, and open court cases.
  * **Compliance Pulse Gauge**: Interactive SVG donut chart visualizing compliant vs. non-compliant commodities.
  * **5-Step Inspection Wizard**:
    1. *Product Identification*: Barcode lookup, batch number, and retailer location.
    2. *Declaration Review*: Mandatory legal parameters comparison.
    3. *6-Point Interactive Checklist*: Toggles for Compliant, Needs Review, or Violation.
    4. *Evidence Management*: Photo attachments with thumbnail gallery and inspector observations.
    5. *Violation Filing*: Categorization, severity ranking, and statutory citations.
  * **Print-Ready Official Certificate**: Complete Government of India inspection certificate with Ashoka Emblem, digital seal, QR code, and print-optimized CSS (`@media print`).

---

## Real Google OAuth Setup Instructions

MetraScan includes **real Google Identity Services (GIS)** integration in `js/auth.js`. Follow these steps to configure your live Google Cloud Client ID:

### Step 1: Create a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name your project (e.g., `MetraScan-Product-Verifier`) and click **Create**.

### Step 2: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** → **OAuth consent screen**.
2. Select **External** user type and click **Create**.
3. Fill in the required fields:
   * **App name**: `MetraScan`
   * **User support email**: Your email address
   * **Developer contact information**: Your email address
4. Click **Save and Continue** through the Scopes and Test Users steps.

### Step 3: Create OAuth 2.0 Client ID
1. Navigate to **APIs & Services** → **Credentials**.
2. Click **+ Create Credentials** → **OAuth client ID**.
3. In the **Application type** dropdown, select **Web application**.
4. Name the client (e.g., `MetraScan Web Client`).

### Step 4: Add Authorized JavaScript Origins
Under **Authorized JavaScript origins**, click **+ Add URI** and add the origin from which you serve the application:
* For VS Code Live Server: `http://127.0.0.1:5500` or `http://localhost:5500`
* For Python HTTP server: `http://localhost:8000` or `http://127.0.0.1:8000`
* For Node/http-server: `http://localhost:3000` or `http://localhost:8080`

> **IMPORTANT**: Google Identity Services does not allow OAuth authentication on the `file:///` protocol. The app must be served via an HTTP server (see *Running the Application* below).

### Step 5: Update Client ID in `js/auth.js`
1. Copy the generated **Client ID** (looks like `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`).
2. Open `js/auth.js` in your editor.
3. Locate line 15:
   ```javascript
   const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";
   ```
4. Replace `"YOUR_GOOGLE_CLIENT_ID"` with your copied Client ID:
   ```javascript
   const GOOGLE_CLIENT_ID = "1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com";
   ```
5. Save `js/auth.js`.

### Step 6: Security Notice
* **Never** put a Google Client Secret in frontend code. MetraScan uses Google Identity Services credential response (JWT token) directly on the client, requiring only the public Client ID.
* If `GOOGLE_CLIENT_ID` is left as `"YOUR_GOOGLE_CLIENT_ID"`, MetraScan displays an advisory notice with a 1-click **Continue with Google (Demo Profile)** button, ensuring smooth demonstrations anywhere.

---

## Running the Application

To run MetraScan locally, serve the `metrascan` directory with any static web server:

### Option A: Python Built-in Server
```bash
cd MetraScan
python -m http.server 8000
```
Open `http://localhost:8000` in your web browser.

### Option B: Node.js `npx serve`
```bash
cd MetraScan
npx serve .
```

### Option C: VS Code Live Server
Right-click `index.html` and click **Open with Live Server**.

---

## Test Walkthrough & Demo Presets

MetraScan includes 4 pre-configured test commodities covering all compliance states:

| Commodity | Barcode | Status | Legal Finding |
| :--- | :--- | :--- | :--- |
| **NatureFresh Groundnut Oil** | `8901234567890` | **Verified Compliant** (98%) | All 6 mandatory declarations verified; volume verified |
| **Organic Sharbati Atta** | `8907654321098` | **Verified Compliant** (96%) | Standard packaging and registered FSSAI license |
| **VitalBoost Energy Drink** | `8905551234567` | **Needs Review** (72%) | Unit sale price printed below mandatory 1mm font size |
| **CrunchyBite Choco Cookies** | `8909998887776` | **Critical Violation** (34%) | Dual MRP over-stickering, weight deficit, missing mfr PIN |

### Quick Test Accounts:
1. **Consumer**: Tap **⚡ Quick Demo Login (Priya Sharma)** on the Consumer Sign In screen.
2. **Ministry Official**: Tap **⚡ Quick Official Demo (Insp. Rajesh Verma)** on the Ministry Sign In screen.

---

## Statutory Legal Metrology Reference
The 6 mandatory declarations audited by MetraScan under **Rule 6(1)** of the **Legal Metrology (Packaged Commodities) Rules, 2011**:
1. Common / Generic name of commodity.
2. Name and complete address of the manufacturer / packer / importer.
3. Net quantity in standard SI units (mass or measure).
4. Month and year in which the commodity is manufactured, packed, or imported.
5. Maximum Retail Price (MRP) inclusive of all taxes, with unit sale price.
6. Consumer grievance contact details (telephone, address, email).
