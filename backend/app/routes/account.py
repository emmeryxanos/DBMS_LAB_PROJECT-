# ============================================================
#  MedTrack | backend/app/routes/account.py
#  Creates the clinical record (Patient/Doctor row) for a freshly
#  registered account and links it immediately. Signup only ever
#  sets role/full_name on user_profiles — nothing else populates
#  linked_id, so the frontend calls one of these right after
#  supabase.auth.signUp() succeeds, before ever reaching a
#  dashboard.
#
#  One login (one auth.users row / one email) can hold BOTH a
#  patient and a doctor identity — user_profiles' primary key is
#  (id, role). /roles lists what a login currently has; /add-*-role
#  lets an already-authenticated user add the identity they're
#  missing, without a second Supabase signup (which would fail —
#  Supabase auth emails must be globally unique).
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.models.schemas import PatientSignupIn, DoctorSignupIn
from app.auth import CurrentUser, get_current_user, decode_bearer_token

router = APIRouter()


@router.get("/me")
async def get_me(user: CurrentUser = Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "role": user.role,
        "linked_id": user.linked_id,
        "full_name": user.full_name,
    }


@router.get("/roles")
async def list_my_roles(user_id: str = Depends(decode_bearer_token)):
    """All roles this login currently has, e.g. [{"role":"patient",...}, {"role":"doctor",...}]."""
    result = supabase.table("user_profiles").select("role, linked_id, full_name").eq("id", user_id).execute()
    return result.data or []


@router.post("/register-patient")
async def register_patient_record(body: PatientSignupIn, user: CurrentUser = Depends(get_current_user)):
    if user.role != "patient":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only patient accounts can create a patient record")
    if user.linked_id is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Account already has a linked record")

    try:
        created = supabase.table("patient").insert(body.model_dump()).execute()
    except Exception:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create patient record")

    patient_id = created.data[0]["patient_id"]
    supabase.table("user_profiles").update({"linked_id": patient_id}) \
        .eq("id", user.user_id).eq("role", "patient").execute()
    return {"linked_id": patient_id}


@router.post("/register-doctor")
async def register_doctor_record(body: DoctorSignupIn, user: CurrentUser = Depends(get_current_user)):
    if user.role != "doctor":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only doctor accounts can create a doctor record")
    if user.linked_id is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Account already has a linked record")

    try:
        created = supabase.table("doctor").insert(body.model_dump()).execute()
    except Exception:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create doctor record")

    doctor_id = created.data[0]["doctor_id"]
    supabase.table("user_profiles").update({"linked_id": doctor_id}) \
        .eq("id", user.user_id).eq("role", "doctor").execute()
    return {"linked_id": doctor_id}


@router.post("/add-patient-role")
async def add_patient_role(body: PatientSignupIn, user_id: str = Depends(decode_bearer_token)):
    """Adds a patient identity to a login that doesn't have one yet (e.g. an
    existing doctor account). Creates the patient record + a new
    user_profiles row for the same login — no new Supabase signup."""
    existing = supabase.table("user_profiles").select("role").eq("id", user_id).eq("role", "patient").execute()
    if existing.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "This account already has a patient identity")

    try:
        created = supabase.table("patient").insert(body.model_dump()).execute()
    except Exception:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create patient record")

    patient_id = created.data[0]["patient_id"]
    supabase.table("user_profiles").insert({
        "id": user_id,
        "role": "patient",
        "full_name": body.full_name,
        "linked_id": patient_id,
    }).execute()
    return {"role": "patient", "linked_id": patient_id}


@router.post("/add-doctor-role")
async def add_doctor_role(body: DoctorSignupIn, user_id: str = Depends(decode_bearer_token)):
    """Adds a doctor identity to a login that doesn't have one yet."""
    existing = supabase.table("user_profiles").select("role").eq("id", user_id).eq("role", "doctor").execute()
    if existing.data:
        raise HTTPException(status.HTTP_409_CONFLICT, "This account already has a doctor identity")

    try:
        created = supabase.table("doctor").insert(body.model_dump()).execute()
    except Exception:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create doctor record")

    doctor_id = created.data[0]["doctor_id"]
    supabase.table("user_profiles").insert({
        "id": user_id,
        "role": "doctor",
        "full_name": body.full_name,
        "linked_id": doctor_id,
    }).execute()
    return {"role": "doctor", "linked_id": doctor_id}
