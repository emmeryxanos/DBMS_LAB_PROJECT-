from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.models.schemas import AppointmentIn, AppointmentRequestIn
from app.auth import require_role, get_current_user, CurrentUser

router = APIRouter()


@router.get("/doctors", dependencies=[Depends(require_role("doctor", "admin", "patient"))])
async def list_doctors():
    result = supabase.table("doctor") \
        .select("doctor_id, full_name, specialization, chamber") \
        .order("full_name") \
        .execute()
    return result.data or []


@router.get("", dependencies=[Depends(require_role("doctor", "admin", "patient"))])
async def list_appointments(
    patient_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    user: CurrentUser = Depends(get_current_user),
):
    q = supabase.table("appointment").select("*, patient(full_name), doctor(full_name)")
    if user.role == "doctor":
        q = q.eq("doctor_id", user.linked_id)
    elif user.role == "patient":
        q = q.eq("patient_id", user.linked_id)
    elif patient_id:
        q = q.eq("patient_id", patient_id)
    if status_filter:
        q = q.eq("status", status_filter)
    result = q.order("appointment_date", desc=True).execute()
    return result.data or []


@router.post("", dependencies=[Depends(require_role("doctor", "admin"))])
async def create_appointment(body: AppointmentIn, user: CurrentUser = Depends(get_current_user)):
    doctor_id = user.linked_id
    result = supabase.table("appointment").insert({
        "patient_id": body.patient_id,
        "doctor_id": doctor_id,
        "appointment_date": body.appointment_date,
        "symptoms": body.symptoms,
        "status": "scheduled",
    }).execute()
    return result.data[0] if result.data else {}


@router.post("/request", dependencies=[Depends(require_role("patient"))])
async def request_appointment(body: AppointmentRequestIn, user: CurrentUser = Depends(get_current_user)):
    result = supabase.table("appointment").insert({
        "patient_id": user.linked_id,
        "doctor_id": body.doctor_id,
        "appointment_date": body.appointment_date,
        "symptoms": body.symptoms,
        "status": "requested",
    }).execute()
    return result.data[0] if result.data else {}


def _get_appointment_or_404(appointment_id: int):
    appt = supabase.table("appointment").select("*").eq("appointment_id", appointment_id).single().execute()
    if not appt.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    return appt.data


@router.patch("/{appointment_id}/accept", dependencies=[Depends(require_role("doctor"))])
async def accept_appointment(appointment_id: int, user: CurrentUser = Depends(get_current_user)):
    appt = _get_appointment_or_404(appointment_id)
    if appt["doctor_id"] != user.linked_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your appointment")
    result = supabase.table("appointment").update({"status": "scheduled"}).eq("appointment_id", appointment_id).execute()
    return result.data[0] if result.data else {}


@router.patch("/{appointment_id}/reject", dependencies=[Depends(require_role("doctor"))])
async def reject_appointment(appointment_id: int, user: CurrentUser = Depends(get_current_user)):
    appt = _get_appointment_or_404(appointment_id)
    if appt["doctor_id"] != user.linked_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your appointment")
    result = supabase.table("appointment").update({"status": "cancelled"}).eq("appointment_id", appointment_id).execute()
    return result.data[0] if result.data else {}


@router.patch("/{appointment_id}/complete", dependencies=[Depends(require_role("doctor"))])
async def complete_appointment(appointment_id: int, user: CurrentUser = Depends(get_current_user)):
    appt = _get_appointment_or_404(appointment_id)
    if appt["doctor_id"] != user.linked_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your appointment")
    result = supabase.table("appointment").update({"status": "completed"}).eq("appointment_id", appointment_id).execute()
    return result.data[0] if result.data else {}
