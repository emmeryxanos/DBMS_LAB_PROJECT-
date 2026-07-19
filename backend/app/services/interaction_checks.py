# ============================================================
#  MedTrack | backend/app/services/interaction_checks.py
#  Shared drug-interaction / allergy-conflict lookups, used by
#  both the standalone checker endpoints (routes/interactions.py)
#  and the prescription-creation workflow (routes/prescriptions.py).
# ============================================================

from app.database import supabase


def check_interaction_pair(m1: int, m2: int) -> list[dict]:
    result = supabase.table("druginteraction") \
        .select("severity, warning_message, medicine1_id, medicine2_id") \
        .or_(f"and(medicine1_id.eq.{m1},medicine2_id.eq.{m2}),and(medicine1_id.eq.{m2},medicine2_id.eq.{m1})") \
        .execute()
    return result.data or []


def check_allergy_conflicts(patient_id: int, medicine_id: int) -> list[dict]:
    allergies = supabase.table("patientallergy") \
        .select("allergy_id") \
        .eq("patient_id", patient_id) \
        .execute()

    if not allergies.data:
        return []

    allergy_ids = [a["allergy_id"] for a in allergies.data]
    conflicts = supabase.table("medicineallergyconflict") \
        .select("reaction, severity, allergy_id, allergy(allergy_name)") \
        .eq("medicine_id", medicine_id) \
        .in_("allergy_id", allergy_ids) \
        .execute()

    return conflicts.data or []
