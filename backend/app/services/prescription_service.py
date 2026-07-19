# ============================================================
#  MedTrack | backend/app/services/prescription_service.py
#  Doctor prescription creation: interaction/allergy warnings
#  (non-blocking), prescription + medicine rows, and the
#  medication schedule / dose log rows that drive adherence.
# ============================================================

from datetime import datetime, timedelta, date, time
from itertools import combinations
from fastapi import HTTPException, status

from app.database import supabase
from app.models.schemas import PrescriptionIn
from app.services.interaction_checks import check_interaction_pair, check_allergy_conflicts

_DOSES_PER_DAY = {
    "once_daily": 1,
    "twice_daily": 2,
    "thrice_daily": 3,
    "weekly": 1,
}
_HOURS_BETWEEN_DOSES = {
    "once_daily": 0,
    "twice_daily": 12,
    "thrice_daily": 8,
    "weekly": 0,
}


def _resolve_patient_id(appointment_id: int) -> int:
    appt = supabase.table("appointment") \
        .select("patient_id") \
        .eq("appointment_id", appointment_id) \
        .single() \
        .execute()
    if not appt.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    return appt.data["patient_id"]


def _collect_warnings(patient_id: int, medicines: list) -> dict:
    interaction_warnings = []
    for a, b in combinations(medicines, 2):
        hits = check_interaction_pair(a.medicine_id, b.medicine_id)
        for hit in hits:
            interaction_warnings.append({
                "medicine1_id": a.medicine_id,
                "medicine2_id": b.medicine_id,
                "severity": hit["severity"],
                "warning_message": hit["warning_message"],
            })

    allergy_warnings = []
    for m in medicines:
        hits = check_allergy_conflicts(patient_id, m.medicine_id)
        for hit in hits:
            allergy_warnings.append({
                "medicine_id": m.medicine_id,
                "allergy_name": hit.get("allergy", {}).get("allergy_name"),
                "severity": hit["severity"],
                "reaction": hit["reaction"],
            })

    return {"interactions": interaction_warnings, "allergies": allergy_warnings}


def _generate_dose_datetimes(start: date, duration_days: int, dose_time: time, frequency: str) -> list[datetime]:
    per_day = _DOSES_PER_DAY[frequency]
    gap_hours = _HOURS_BETWEEN_DOSES[frequency]
    out = []

    if frequency == "weekly":
        weeks = max(1, duration_days // 7)
        for w in range(weeks):
            out.append(datetime.combine(start + timedelta(days=7 * w), dose_time))
        return out

    for d in range(duration_days):
        day = start + timedelta(days=d)
        for i in range(per_day):
            out.append(datetime.combine(day, dose_time) + timedelta(hours=gap_hours * i))
    return out


def create_prescription(body: PrescriptionIn) -> dict:
    if not body.medicines:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At least one medicine is required")

    patient_id = _resolve_patient_id(body.appointment_id)
    warnings = _collect_warnings(patient_id, body.medicines)

    rx = supabase.table("prescription").insert({
        "appointment_id": body.appointment_id,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "notes": body.notes,
    }).execute()
    prescription = rx.data[0]
    prescription_id = prescription["prescription_id"]

    pm_rows = [{
        "prescription_id": prescription_id,
        "medicine_id": m.medicine_id,
        "dosage": m.dosage,
        "duration_days": m.duration_days,
        "instructions": m.instructions,
    } for m in body.medicines]
    supabase.table("prescriptionmedicine").insert(pm_rows).execute()

    start = datetime.strptime(body.start_date, "%Y-%m-%d").date()

    for m in body.medicines:
        dose_time = datetime.strptime(m.dose_time, "%H:%M").time()

        schedule = supabase.table("medicationschedule").insert({
            "prescription_id": prescription_id,
            "medicine_id": m.medicine_id,
            "dose_time": m.dose_time,
            "frequency": m.frequency,
        }).execute()
        schedule_id = schedule.data[0]["schedule_id"]

        dose_datetimes = _generate_dose_datetimes(start, m.duration_days, dose_time, m.frequency)
        dose_rows = [{
            "schedule_id": schedule_id,
            "patient_id": patient_id,
            "scheduled_at": dt.isoformat(),
            "status": "pending",
        } for dt in dose_datetimes]
        if dose_rows:
            supabase.table("doselog").insert(dose_rows).execute()

    return {"prescription": prescription, "warnings": warnings}


def get_prescription_detail(prescription_id: int) -> dict:
    rx = supabase.table("prescription") \
        .select("*, appointment(patient_id, doctor(full_name)), prescriptionmedicine(dosage, duration_days, instructions, medicine(generic_name, brand_name))") \
        .eq("prescription_id", prescription_id) \
        .single() \
        .execute()
    if not rx.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prescription not found")
    return rx.data
