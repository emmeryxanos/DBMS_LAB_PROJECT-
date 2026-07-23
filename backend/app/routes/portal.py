from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from datetime import datetime
from uuid import uuid4
from app.database import supabase
from app.models.schemas import RecoveryLogIn, SideEffectIn, PatientAllergyIn
from app.auth import CurrentUser, get_current_user, require_self_or_roles, require_self_or_granted_doctor

router = APIRouter()

REPORTS_BUCKET = "patient-reports"
ALLOWED_REPORT_TYPES = {"pdf", "jpg", "jpeg"}
MAX_REPORT_SIZE = 5 * 1024 * 1024


def _assert_patient_self_or_granted(user: CurrentUser, patient_id: int):
    if user.role == "admin":
        return
    if user.role == "patient" and user.linked_id == patient_id:
        return
    if user.role == "doctor":
        access = supabase.table("doctorpatientaccess") \
            .select("access_id") \
            .eq("doctor_id", user.linked_id) \
            .eq("patient_id", patient_id) \
            .eq("status", "granted") \
            .limit(1).execute()
        if access.data:
            return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this patient")


@router.get("/adherence/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_adherence(patient_id: int):
    result = supabase.table("doselog") \
        .select("status") \
        .eq("patient_id", patient_id) \
        .neq("status", "pending") \
        .execute()
    data   = result.data or []
    total  = len(data)
    taken  = sum(1 for d in data if d["status"] == "taken")
    missed = sum(1 for d in data if d["status"] == "missed")
    late   = sum(1 for d in data if d["status"] == "late")
    pct    = round((taken / total) * 100) if total > 0 else 0
    return {"total": total, "taken": taken, "missed": missed, "late": late, "pct": pct}


@router.get("/doses/today/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_today_doses(patient_id: int):
    today  = datetime.now().strftime("%Y-%m-%d")
    result = supabase.table("doselog") \
        .select("log_id, status, scheduled_at, medicationschedule(dose_time, medicine(generic_name, brand_name, dosage_type))") \
        .eq("patient_id", patient_id) \
        .gte("scheduled_at", f"{today}T00:00:00") \
        .lte("scheduled_at", f"{today}T23:59:59") \
        .order("scheduled_at") \
        .execute()
    return result.data or []


@router.patch("/doses/{log_id}/taken")
async def mark_dose_taken(log_id: int, user: CurrentUser = Depends(get_current_user)):
    log = supabase.table("doselog").select("patient_id").eq("log_id", log_id).single().execute()
    if not log.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dose not found")
    _assert_patient_self_or_granted(user, log.data["patient_id"])

    supabase.table("doselog") \
        .update({"status": "taken", "taken_at": datetime.now().isoformat()}) \
        .eq("log_id", log_id) \
        .execute()
    return {"success": True}


@router.get("/doses/history/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_dose_history(patient_id: int):
    result = supabase.table("doselog") \
        .select("status, scheduled_at, taken_at, medicationschedule(medicine(generic_name))") \
        .eq("patient_id", patient_id) \
        .order("scheduled_at", desc=True) \
        .limit(30) \
        .execute()
    return result.data or []


@router.get("/doses/chart/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_dose_chart(patient_id: int):
    result = supabase.table("doselog") \
        .select("scheduled_at, status") \
        .eq("patient_id", patient_id) \
        .neq("status", "pending") \
        .order("scheduled_at") \
        .execute()
    return result.data or []


@router.get("/recovery/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_recovery(patient_id: int):
    result = supabase.table("recoverylog") \
        .select("log_date, symptom_score, recovery_score, notes") \
        .eq("patient_id", patient_id) \
        .order("log_date", desc=True) \
        .execute()
    return result.data or []


@router.get("/recovery/chart/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_recovery_chart(patient_id: int):
    result = supabase.table("recoverylog") \
        .select("log_date, symptom_score, recovery_score") \
        .eq("patient_id", patient_id) \
        .order("log_date") \
        .execute()
    return result.data or []


@router.post("/recovery")
async def submit_recovery(body: RecoveryLogIn, user: CurrentUser = Depends(get_current_user)):
    _assert_patient_self_or_granted(user, body.patient_id)
    supabase.table("recoverylog").upsert({
        "patient_id":     body.patient_id,
        "log_date":       body.log_date,
        "symptom_score":  body.symptom_score,
        "recovery_score": body.recovery_score,
        "notes":          body.notes,
    }, on_conflict="patient_id,log_date").execute()
    return {"success": True}


@router.get("/prescriptions/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_prescriptions(patient_id: int):
    appts = supabase.table("appointment") \
        .select("appointment_id") \
        .eq("patient_id", patient_id) \
        .execute()
    if not appts.data:
        return []
    appt_ids = [a["appointment_id"] for a in appts.data]
    result = supabase.table("prescription") \
        .select("start_date, end_date, notes, status, appointment(doctor(full_name))") \
        .in_("appointment_id", appt_ids) \
        .order("created_at", desc=True) \
        .execute()
    return result.data or []


@router.get("/medicines/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_patient_medicines(patient_id: int):
    appts = supabase.table("appointment") \
        .select("appointment_id") \
        .eq("patient_id", patient_id) \
        .execute()
    if not appts.data:
        return []
    appt_ids = [a["appointment_id"] for a in appts.data]
    rx = supabase.table("prescription") \
        .select("prescription_id") \
        .in_("appointment_id", appt_ids) \
        .execute()
    if not rx.data:
        return []
    rx_ids = [r["prescription_id"] for r in rx.data]
    result = supabase.table("medicationschedule") \
        .select("dose_time, frequency, medicine(generic_name, brand_name, dosage_type)") \
        .in_("prescription_id", rx_ids) \
        .order("dose_time") \
        .execute()
    return result.data or []


@router.get("/side-effects/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_side_effects(patient_id: int):
    result = supabase.table("sideeffectreport") \
        .select("effect_name, severity, reported_at, medicine(generic_name)") \
        .eq("patient_id", patient_id) \
        .order("reported_at", desc=True) \
        .execute()
    return result.data or []


@router.post("/side-effects")
async def submit_side_effect(body: SideEffectIn, user: CurrentUser = Depends(get_current_user)):
    _assert_patient_self_or_granted(user, body.patient_id)
    supabase.table("sideeffectreport").insert({
        "patient_id":  body.patient_id,
        "medicine_id": body.medicine_id,
        "effect_name": body.effect_name,
        "severity":    body.severity,
        "notes":       body.notes,
    }).execute()
    return {"success": True}


@router.get("/appointments/{patient_id}", dependencies=[Depends(require_self_or_roles("doctor", "admin"))])
async def get_appointments(patient_id: int):
    result = supabase.table("appointment") \
        .select("appointment_date, symptoms, status, doctor(full_name)") \
        .eq("patient_id", patient_id) \
        .order("appointment_date", desc=True) \
        .execute()
    return result.data or []


@router.post("/allergies")
async def report_allergy(body: PatientAllergyIn, user: CurrentUser = Depends(get_current_user)):
    _assert_patient_self_or_granted(user, body.patient_id)
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
        "patient_id": body.patient_id,
        "allergy_id": allergy_id,
        "status": "pending",
        "reported_by": "patient",
    }).execute()
    return result.data[0] if result.data else {}


@router.get("/allergies/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_patient_allergies(patient_id: int):
    result = supabase.table("patientallergy") \
        .select("allergy_id, noted_date, status, reported_by, confirmed_at, allergy(allergy_name)") \
        .eq("patient_id", patient_id) \
        .order("noted_date", desc=True) \
        .execute()
    return result.data or []


@router.get("/reports/{patient_id}", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_patient_reports(patient_id: int):
    result = supabase.table("patientreport") \
        .select("report_id, file_name, file_type, storage_path, uploaded_at") \
        .eq("patient_id", patient_id) \
        .order("uploaded_at", desc=True) \
        .execute()
    reports = result.data or []
    for r in reports:
        signed = supabase.storage.from_(REPORTS_BUCKET).create_signed_url(r["storage_path"], 3600)
        r["url"] = signed.get("signedURL") or signed.get("signed_url")
    return reports


@router.post("/reports")
async def upload_patient_report(
    patient_id: int = Form(...),
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
):
    _assert_patient_self_or_granted(user, patient_id)

    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "").lower()
    if ext not in ALLOWED_REPORT_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only PDF, JPG, or JPEG files are allowed")

    contents = await file.read()
    if len(contents) > MAX_REPORT_SIZE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File exceeds the 5MB size limit")

    storage_path = f"{patient_id}/{uuid4().hex}_{file.filename}"
    content_type = "application/pdf" if ext == "pdf" else f"image/{ext}"
    supabase.storage.from_(REPORTS_BUCKET).upload(
        storage_path, contents, {"content-type": content_type}
    )

    result = supabase.table("patientreport").insert({
        "patient_id":   patient_id,
        "file_name":    file.filename,
        "file_type":    ext,
        "storage_path": storage_path,
    }).execute()
    return result.data[0] if result.data else {"success": True}
