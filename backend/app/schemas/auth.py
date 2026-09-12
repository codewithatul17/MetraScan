"""
Pydantic data models & request/response schemas for authentication.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel


class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "consumer"
    govId: Optional[str] = None
    department: Optional[str] = None
    badgeNumber: Optional[str] = None
    designation: Optional[str] = None
    jurisdiction: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    language: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
