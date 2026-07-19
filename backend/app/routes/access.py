# ============================================================
#  MedTrack | backend/app/routes/access.py
#  Patient-consent gate for record access: a doctor may only
#  see a patient's clinical data (prescriptions, recovery,
#  adherence, allergies) once the patient has approved a
#  DoctorPatientAccess request. An Appointment alone is not
#  enough — it only proves a doctor and patient know of each
#  other, not that the patient has agreed to share their record.
# ============================================================

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.models.schemas import AccessRequestIn
from app.auth import CurrentUser, get_current_user, require_role

router = APIRouter()


def _get_access_or_404(access_id: int):
    row = supabase.table("doctorpatientaccess").select("*").eq("access_id", access_id).single().execute()
    if not row.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Access request not found")
    return row.data


@router.post("/request", dependencies=[Depends(require_role("doctor"))])
async def request_access(body: AccessRequestIn, user: CurrentUser = Depends(get_current_user)):
    relationship = supabase.table("appointment") \
        .select("appointment_id") \
        .eq("doctor_id", user.linked_id) \
        .eq("patient_id", body.patient_id) \
        .neq("status", "cancelled") \
        .limit(1).execute()
    if not relationship.data:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No appointment with this patient")

    existing = supabase.table("doctorpatientaccess") \
        .select("access_id") \
        .eq("doctor_id", user.linked_id) \
        .eq("patient_id", body.patient_id) \
        .execute()

    if existing.data:
        result = supabase.table("doctorpatientaccess").update({
            "status": "pending",
            "requested_at": datetime.now().isoformat(),
            "granted_at": None,
            "revoked_at": None,
        }).eq("access_id", existing.data[0]["access_id"]).execute()
    else:
        result = supabase.table("doctorpatientaccess").insert({
            "doctor_id": user.linked_id,
            "patient_id": body.patient_id,
            "status": "pending",
        }).execute()

    return result.data[0] if result.data else {}


@router.get("/pending", dependencies=[Depends(require_role("patient"))])
async def list_pending_requests(user: CurrentUser = Depends(get_current_user)):
    result = supabase.table("doctorpatientaccess") \
        .select("access_id, requested_at, doctor(full_name, specialization)") \
        .eq("patient_id", user.linked_id) \
        .eq("status", "pending") \
        .order("requested_at", desc=True) \
        .execute()
    return result.data or []


@router.get("/granted", dependencies=[Depends(require_role("doctor"))])
async def list_granted_patients(user: CurrentUser = Depends(get_current_user)):
    result = supabase.table("doctorpatientaccess") \
        .select("access_id, granted_at, patient(patient_id, full_name)") \
        .eq("doctor_id", user.linked_id) \
        .eq("status", "granted") \
        .execute()
    return result.data or []


@router.get("/mine", dependencies=[Depends(require_role("patient"))])
async def list_my_access_grants(user: CurrentUser = Depends(get_current_user)):
    result = supabase.table("doctorpatientaccess") \
        .select("access_id, status, requested_at, granted_at, revoked_at, doctor(full_name, specialization)") \
        .eq("patient_id", user.linked_id) \
        .order("requested_at", desc=True) \
        .execute()
    return result.data or []


@router.patch("/{access_id}/approve", dependencies=[Depends(require_role("patient"))])
async def approve_access(access_id: int, user: CurrentUser = Depends(get_current_user)):
    row = _get_access_or_404(access_id)
    if row["patient_id"] != user.linked_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your access request")
    result = supabase.table("doctorpatientaccess").update({
        "status": "granted",
        "granted_at": datetime.now().isoformat(),
    }).eq("access_id", access_id).execute()
    return result.data[0] if result.data else {}


@router.patch("/{access_id}/deny", dependencies=[Depends(require_role("patient"))])
async def deny_access(access_id: int, user: CurrentUser = Depends(get_current_user)):
    row = _get_access_or_404(access_id)
    if row["patient_id"] != user.linked_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your access request")
    result = supabase.table("doctorpatientaccess").update({"status": "denied"}).eq("access_id", access_id).execute()
    return result.data[0] if result.data else {}


@router.patch("/{access_id}/revoke", dependencies=[Depends(require_role("patient"))])
async def revoke_access(access_id: int, user: CurrentUser = Depends(get_current_user)):
    row = _get_access_or_404(access_id)
    if row["patient_id"] != user.linked_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your access request")
    if row["status"] != "granted":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Access is not currently granted")
    result = supabase.table("doctorpatientaccess").update({
        "status": "revoked",
        "revoked_at": datetime.now().isoformat(),
    }).eq("access_id", access_id).execute()
    return result.data[0] if result.data else {}
