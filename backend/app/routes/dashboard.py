from fastapi import APIRouter, Depends
from app.database import supabase
from app.auth import require_role

router = APIRouter(dependencies=[Depends(require_role("doctor", "admin"))])


@router.get("/stats")
async def get_stats():
    patients     = supabase.table("patient").select("*", count="exact").execute()
    alerts       = supabase.table("adherencealert").select("*", count="exact").eq("resolved", False).execute()
    rx           = supabase.table("prescription").select("*", count="exact").eq("status", "active").execute()
    meds         = supabase.table("medicine").select("*", count="exact").execute()
    interactions = supabase.table("druginteraction").select("*", count="exact").execute()
    doses        = supabase.table("doselog").select("status").neq("status", "pending").execute()

    dose_data = doses.data or []
    total     = len(dose_data)
    taken     = sum(1 for d in dose_data if d["status"] == "taken")
    adherence = round((taken / total) * 100) if total > 0 else 0

    return {
        "patients":             patients.count     or 0,
        "alerts":               alerts.count       or 0,
        "active_prescriptions": rx.count           or 0,
        "medicines":            meds.count         or 0,
        "drug_interactions":    interactions.count or 0,
        "adherence_pct":        adherence,
    }


@router.get("/alerts")
async def get_alerts():
    result = supabase.table("adherencealert") \
        .select("*, patient(full_name)") \
        .eq("resolved", False) \
        .order("triggered_at", desc=True) \
        .limit(8) \
        .execute()
    return result.data or []


@router.get("/recent-doses")
async def get_recent_doses():
    result = supabase.table("doselog") \
        .select("status, scheduled_at, patient(full_name), medicationschedule(medicine(generic_name))") \
        .order("scheduled_at", desc=True) \
        .limit(8) \
        .execute()
    return result.data or []
