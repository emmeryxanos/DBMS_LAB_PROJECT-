from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.models.schemas import PatientAllergyIn
from app.auth import require_role, get_current_user, CurrentUser
from app.services.interaction_checks import check_interaction_pair, check_allergy_conflicts

router = APIRouter(dependencies=[Depends(require_role("doctor", "admin"))])


@router.get("/interactions")
async def get_all_interactions():
    result = supabase.table("druginteraction") \
        .select("severity, warning_message, medicine1_id, medicine2_id") \
        .order("severity") \
        .execute()
    return result.data or []


@router.get("/interactions/check")
async def check_interaction(m1: int, m2: int):
    return check_interaction_pair(m1, m2)


@router.get("/allergies")
async def get_all_allergies(status_filter: Optional[str] = None, user: CurrentUser = Depends(get_current_user)):
    q = supabase.table("patientallergy") \
        .select("patient_id, allergy_id, noted_date, status, reported_by, confirmed_at, patient(full_name), allergy(allergy_name)")

    if user.role == "doctor":
        granted = supabase.table("doctorpatientaccess") \
            .select("patient_id") \
            .eq("doctor_id", user.linked_id) \
            .eq("status", "granted") \
            .execute()
        patient_ids = [g["patient_id"] for g in (granted.data or [])]
        if not patient_ids:
            return []
        q = q.in_("patient_id", patient_ids)

    if status_filter:
        q = q.eq("status", status_filter)

    result = q.order("noted_date", desc=True).execute()
    return result.data or []


@router.get("/allergies/check")
async def check_allergy_conflict(patient_id: int, medicine_id: int):
    return check_allergy_conflicts(patient_id, medicine_id)


@router.get("/allergies/catalog")
async def list_allergy_catalog():
    result = supabase.table("allergy").select("*").order("allergy_name").execute()
    return result.data or []


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


@router.post("/patients/{patient_id}/allergies")
async def add_patient_allergy(patient_id: int, body: PatientAllergyIn, user: CurrentUser = Depends(get_current_user)):
    _assert_doctor_has_access(user, patient_id)
    allergy_id = body.allergy_id

    if not allergy_id and body.new_allergy_name:
        existing = supabase.table("allergy") \
            .select("allergy_id") \
            .eq("allergy_name", body.new_allergy_name) \
            .execute()
        if existing.data:
            allergy_id = existing.data[0]["allergy_id"]
        else:
            created = supabase.table("allergy").insert({
                "allergy_name": body.new_allergy_name,
                "description": body.description,
            }).execute()
            allergy_id = created.data[0]["allergy_id"]

    result = supabase.table("patientallergy").insert({
        "patient_id": patient_id,
        "allergy_id": allergy_id,
        "status": "confirmed",
        "reported_by": "doctor",
        "confirmed_by": user.linked_id,
        "confirmed_at": datetime.now().isoformat(),
    }).execute()
    return result.data[0] if result.data else {}


@router.patch("/patients/{patient_id}/allergies/{allergy_id}/confirm")
async def confirm_patient_allergy(patient_id: int, allergy_id: int, user: CurrentUser = Depends(get_current_user)):
    _assert_doctor_has_access(user, patient_id)
    result = supabase.table("patientallergy").update({
        "status": "confirmed",
        "confirmed_by": user.linked_id,
        "confirmed_at": datetime.now().isoformat(),
    }).eq("patient_id", patient_id).eq("allergy_id", allergy_id).execute()
    return result.data[0] if result.data else {}


@router.patch("/patients/{patient_id}/allergies/{allergy_id}/reject")
async def reject_patient_allergy(patient_id: int, allergy_id: int, user: CurrentUser = Depends(get_current_user)):
    _assert_doctor_has_access(user, patient_id)
    result = supabase.table("patientallergy").update({
        "status": "rejected",
        "confirmed_by": user.linked_id,
        "confirmed_at": datetime.now().isoformat(),
    }).eq("patient_id", patient_id).eq("allergy_id", allergy_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/patients/{patient_id}/allergies/{allergy_id}")
async def remove_patient_allergy(patient_id: int, allergy_id: int, user: CurrentUser = Depends(get_current_user)):
    _assert_doctor_has_access(user, patient_id)
    supabase.table("patientallergy") \
        .delete() \
        .eq("patient_id", patient_id) \
        .eq("allergy_id", allergy_id) \
        .execute()
    return {"success": True}
