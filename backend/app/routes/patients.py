from fastapi import APIRouter, Depends
from app.database import supabase
from app.models.schemas import PatientIn
from app.auth import CurrentUser, get_current_user, require_role, require_self_or_granted_doctor

router = APIRouter()


@router.get("", dependencies=[Depends(require_role("doctor", "admin"))])
async def list_patients(search: str = "", user: CurrentUser = Depends(get_current_user)):
    if user.role == "doctor":
        appts = supabase.table("appointment") \
            .select("patient_id") \
            .eq("doctor_id", user.linked_id) \
            .neq("status", "cancelled") \
            .execute()
        patient_ids = list({a["patient_id"] for a in (appts.data or [])})
        if not patient_ids:
            return []
        access = supabase.table("doctorpatientaccess") \
            .select("patient_id, status") \
            .eq("doctor_id", user.linked_id) \
            .in_("patient_id", patient_ids) \
            .execute()
        access_by_patient = {a["patient_id"]: a["status"] for a in (access.data or [])}
        q = supabase.table("patient").select("*").in_("patient_id", patient_ids).order("full_name")
        if search:
            q = q.ilike("full_name", f"%{search}%")
        rows = q.execute().data or []
        for r in rows:
            r["access_status"] = access_by_patient.get(r["patient_id"], "none")
        return rows

    q = supabase.table("patient").select("*").order("full_name")
    if search:
        q = q.ilike("full_name", f"%{search}%")
    return q.execute().data or []


@router.post("", dependencies=[Depends(require_role("doctor", "admin"))])
async def create_patient(body: PatientIn):
    result = supabase.table("patient").insert(body.model_dump()).execute()
    return result.data[0] if result.data else {}


@router.put("/{patient_id}", dependencies=[Depends(require_role("doctor", "admin"))])
async def update_patient(patient_id: int, body: PatientIn):
    result = supabase.table("patient") \
        .update(body.model_dump()) \
        .eq("patient_id", patient_id) \
        .execute()
    return result.data[0] if result.data else {}


@router.delete("/{patient_id}", dependencies=[Depends(require_role("doctor", "admin"))])
async def delete_patient(patient_id: int):
    supabase.table("patient").delete().eq("patient_id", patient_id).execute()
    return {"success": True}


@router.get("/{patient_id}/adherence", dependencies=[Depends(require_self_or_granted_doctor("admin"))])
async def get_patient_adherence(patient_id: int):
    result = supabase.table("doselog") \
        .select("status") \
        .eq("patient_id", patient_id) \
        .neq("status", "pending") \
        .execute()
    data = result.data or []
    total  = len(data)
    taken  = sum(1 for d in data if d["status"] == "taken")
    missed = sum(1 for d in data if d["status"] == "missed")
    pct    = round((taken / total) * 100) if total > 0 else 0
    return {"total": total, "taken": taken, "missed": missed, "pct": pct}
