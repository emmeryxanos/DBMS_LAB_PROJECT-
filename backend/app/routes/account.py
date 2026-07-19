# ============================================================
#  MedTrack | backend/app/routes/account.py
#  Creates the clinical record (Patient/Doctor row) for a freshly
#  registered account and links it immediately. Signup only ever
#  sets role/full_name on user_profiles — nothing else populates
#  linked_id, so the frontend calls one of these right after
#  supabase.auth.signUp() succeeds, before ever reaching a
#  dashboard.
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.models.schemas import PatientSignupIn, DoctorSignupIn
from app.auth import CurrentUser, get_current_user

router = APIRouter()


@router.get("/me")
async def get_me(user: CurrentUser = Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "role": user.role,
        "linked_id": user.linked_id,
        "full_name": user.full_name,
    }


@router.post("/register-patient")
async def register_patient_record(body: PatientSignupIn, user: CurrentUser = Depends(get_current_user)):
    if user.role != "patient":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only patient accounts can create a patient record")
    if user.linked_id is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Account already has a linked record")

    try:
        created = supabase.table("patient").insert(body.model_dump()).execute()
    except Exception as e:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Could not create patient record: {e}")

    patient_id = created.data[0]["patient_id"]
    supabase.table("user_profiles").update({"linked_id": patient_id}).eq("id", user.user_id).execute()
    return {"linked_id": patient_id}


@router.post("/register-doctor")
async def register_doctor_record(body: DoctorSignupIn, user: CurrentUser = Depends(get_current_user)):
    if user.role != "doctor":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only doctor accounts can create a doctor record")
    if user.linked_id is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Account already has a linked record")

    try:
        created = supabase.table("doctor").insert(body.model_dump()).execute()
    except Exception as e:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Could not create doctor record: {e}")

    doctor_id = created.data[0]["doctor_id"]
    supabase.table("user_profiles").update({"linked_id": doctor_id}).eq("id", user.user_id).execute()
    return {"linked_id": doctor_id}
