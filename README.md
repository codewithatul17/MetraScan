# METRA SCAN — National Product Verification & Legal Metrology Compliance Platform

A production-ready platform bridging Indian consumers and the Department of Legal Metrology (Ministry of Consumer Affairs) to inspect packaged commodities, verify mandatory statutory declarations, identify deceptive practices, and generate tamper-evident compliance audit reports.

---

## Unified Project Architecture

```
METRA/
├── .venv/                      # Python 3.12 Virtual Environment
├── .env                        # Active Environment Variables (Supabase credentials)
├── .env.example                # Template for environment configuration
├── README.md                   # Platform documentation
│
├── frontend/                   # Client Application (Vanilla HTML5 / CSS3 / ES6)
│   ├── index.html              # Main Single-Page Application
│   ├── css/                    # Responsive styles and design system
│   ├── assets/                 # Official logos, emblems, and icons
│   └── js/                     # Modular JavaScript Architecture
│       ├── services/           # Backend API integration & Supabase client
│       ├── auth/               # Google Identity Services & Auth sessions
│       ├── pages/              # Consumer & Ministry portal controllers
│       └── utils/              # State store, navigation router, audio synth
│
└── backend/                    # Modular FastAPI & Computer Vision Backend
    ├── main.py                 # FastAPI application entry point
    ├── requirements.txt        # Python dependencies
    ├── test_rules.py           # Legal Metrology Rule 6 & 7 test suite
    └── app/
        ├── core/               # Environment config & Supabase client factory
        ├── schemas/            # Pydantic data validation schemas
        ├── services/           # Authentication & Scanning business logic
        ├── api/v1/endpoints/   # Modular API routes (system, auth, scans)
        └── ocr/                # PaddleOCR, Legal Metrology rules & calibration
```

---

## Quick Start & Running Instructions

### 1. Run the Backend (FastAPI)
From your terminal:
```cmd
cd C:\Users\HOME\Desktop\METRA\backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```
- API Documentation: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`
- Database Status: `http://127.0.0.1:8000/supabase/status`

### 2. Run the Frontend
- Using **VS Code Live Server**: Open `frontend/index.html` and click **Go Live** (port 5500).
- Or use any static file server:
```cmd
cd C:\Users\HOME\Desktop\METRA\frontend
python -m http.server 5500
```
Then visit `http://127.0.0.1:5500` in your browser.

---

## Running Verification Tests
To run the automated compliance test suite:
```cmd
cd C:\Users\HOME\Desktop\METRA\backend
..\.venv\Scripts\python.exe test_rules.py
```
