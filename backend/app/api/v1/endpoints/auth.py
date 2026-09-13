"""
Authentication API endpoints.
"""

from fastapi import APIRouter
from app.schemas.auth import SignupRequest, LoginRequest, UpdateProfileRequest
from app.services.auth_service import signup_user, login_user, list_users, update_profile, check_phone_exists

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/check-phone")
def handle_check_phone(phone: str):
    exists = check_phone_exists(phone)
    return {"exists": exists, "phone": phone}


@router.post("/signup")
def handle_signup(req: SignupRequest):
    return signup_user(req)


@router.post("/login")
def handle_login(req: LoginRequest):
    return login_user(req)


@router.get("/users")
def handle_list_users():
    return list_users()


@router.post("/update-profile")
def handle_update_profile(req: UpdateProfileRequest):
    return update_profile(req)
