"""
METRA SCAN — National Product Verification & Legal Metrology Compliance API
FastAPI Entry Point
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import PROJECT_NAME, VERSION
from app.api.v1.api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("metra")

# Initialize FastAPI Application
app = FastAPI(
    title=PROJECT_NAME,
    version=VERSION,
    description="Backend service for National Legal Metrology statutory declaration verification, OCR audits, and multi-user isolation."
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Modular Routers
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    from app.core.config import HOST, PORT
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
