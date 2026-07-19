# ============================================================
#  MedTrack | backend/app/auth.py
#  Verifies Supabase JWTs server-side and exposes role/self
#  authorization dependencies for FastAPI routes.
# ============================================================

import os
from dataclasses import dataclass
from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import Depends, Header, HTTPException, status

from app.database import supabase

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Legacy HS256 shared secret — only present on older Supabase projects.
# Newer projects sign with an asymmetric key (ES256/RS256) published via JWKS,
# so both paths are tried below.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

_jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", cache_keys=True) if SUPABASE_URL else None


@dataclass
class CurrentUser:
    user_id: str
    role: str
    linked_id: Optional[int]
    full_name: str


def _decode_token(token: str) -> Optional[dict]:
    if _jwks_client is not None:
        try:
            signing_key = _jwks_client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
        except Exception:
            pass

    if SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.PyJWTError:
            pass

    return None


async def get_current_user(authorization: str = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()

    payload = _decode_token(token)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token payload")

    profile = supabase.table("user_profiles") \
        .select("id, role, linked_id, full_name") \
        .eq("id", user_id) \
        .single() \
        .execute()

    if not profile.data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No profile for this account")

    return CurrentUser(
        user_id=user_id,
        role=profile.data["role"],
        linked_id=profile.data.get("linked_id"),
        full_name=profile.data.get("full_name") or "",
    )


def require_role(*roles: str):
    async def dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this resource")
        return user
    return dependency


def require_self_or_roles(*roles: str):
    """
    Protects routes shaped as /{patient_id}/... — the authenticated patient
    may only access their own linked_id; the listed roles bypass that check.
    """
    async def dependency(patient_id: int, user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role in roles:
            return user
        if user.role == "patient" and user.linked_id == patient_id:
            return user
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this patient")
    return dependency


def require_self_or_granted_doctor(*bypass_roles: str):
    """
    Protects routes shaped as /{patient_id}/... — the authenticated patient
    may only access their own linked_id. A doctor may access it only if the
    patient has granted them record access via DoctorPatientAccess (an
    Appointment alone is not enough). Roles in bypass_roles skip the check.
    """
    async def dependency(patient_id: int, user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role in bypass_roles:
            return user
        if user.role == "patient" and user.linked_id == patient_id:
            return user
        if user.role == "doctor":
            access = supabase.table("doctorpatientaccess") \
                .select("access_id") \
                .eq("doctor_id", user.linked_id) \
                .eq("patient_id", patient_id) \
                .eq("status", "granted") \
                .limit(1) \
                .execute()
            if access.data:
                return user
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this patient")
    return dependency
