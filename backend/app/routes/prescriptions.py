from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.models.schemas import PrescriptionIn
from app.auth import require_role, get_current_user, CurrentUser
from app.services.prescription_service import create_prescription, get_prescription_detail

router = APIRouter(dependencies=[Depends(require_role("doctor", "admin"))])


def _assert_doctor_has_access(user: CurrentUser, patient_id: int):
    if user.role != "doctor":
        return
    access = supabase.table("doctorpatientaccess") \
        .select("access_id") \
        .eq("doctor_id", user.linked_id) \
        .eq("patient_id", patient_id) \
        .eq("status", "granted") \
        .limit(1).execute()
    if not access.data:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this patient")


@router.post("/prescriptions")
async def post_prescription(body: PrescriptionIn):
    return create_prescription(body)


@router.get("/prescriptions/{prescription_id}")
async def get_prescription(prescription_id: int):
    return get_prescription_detail(prescription_id)


@router.get("/prescriptions")
async def list_prescriptions(patient_id: int, user: CurrentUser = Depends(get_current_user)):
    _assert_doctor_has_access(user, patient_id)
    appts = supabase.table("appointment") \
        .select("appointment_id") \
        .eq("patient_id", patient_id) \
        .execute()
    if not appts.data:
        return []
    appt_ids = [a["appointment_id"] for a in appts.data]
    result = supabase.table("prescription") \
        .select("prescription_id, start_date, end_date, notes, status, created_at, appointment(doctor(full_name)), prescriptionmedicine(dosage, duration_days, medicine(generic_name, brand_name))") \
        .in_("appointment_id", appt_ids) \
        .order("created_at", desc=True) \
        .execute()
    return result.data or []
