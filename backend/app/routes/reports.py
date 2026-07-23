# ============================================================
#  MedTrack | backend/app/routes/reports.py
#  Doctor dashboard analytics: risk classification, rolling
#  adherence, perfect-adherence patients, disease distribution,
#  critical side-effect alerts, and auto-detected recovery
#  concerns. Scoped to the patients a doctor currently has
#  granted DoctorPatientAccess for; admins see everyone.
# ============================================================

from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends
from app.database import supabase
from app.auth import require_role, get_current_user, CurrentUser

router = APIRouter(dependencies=[Depends(require_role("doctor", "admin"))])

REPORTS_BUCKET = "patient-reports"


def _scoped_patient_ids(user: CurrentUser) -> Optional[list[int]]:
    """None means 'no scoping' (admin sees everyone). Empty list means
    'scoped but nothing to show' — callers must short-circuit on that."""
    if user.role == "admin":
        return None
    access = supabase.table("doctorpatientaccess") \
        .select("patient_id") \
        .eq("doctor_id", user.linked_id) \
        .eq("status", "granted") \
        .execute()
    return [a["patient_id"] for a in (access.data or [])]


@router.get("/risk")
async def risk_classification(user: CurrentUser = Depends(get_current_user)):
    patient_ids = _scoped_patient_ids(user)
    if patient_ids is not None and not patient_ids:
        return []

    pq = supabase.table("patient").select("patient_id, full_name")
    if patient_ids is not None:
        pq = pq.in_("patient_id", patient_ids)
    patients = pq.execute().data or []

    dq = supabase.table("doselog").select("patient_id, status").neq("status", "pending")
    if patient_ids is not None:
        dq = dq.in_("patient_id", patient_ids)
    doses = dq.execute().data or []

    dose_stats = defaultdict(lambda: {"taken": 0, "missed": 0, "late": 0, "total": 0})
    for d in doses:
        s = dose_stats[d["patient_id"]]
        s["total"] += 1
        s[d["status"]] = s.get(d["status"], 0) + 1

    rq = supabase.table("recoverylog").select("patient_id, recovery_score")
    if patient_ids is not None:
        rq = rq.in_("patient_id", patient_ids)
    recovery_scores = defaultdict(list)
    for r in (rq.execute().data or []):
        recovery_scores[r["patient_id"]].append(r["recovery_score"])

    rows = []
    for p in patients:
        pid = p["patient_id"]
        s = dose_stats.get(pid, {"taken": 0, "missed": 0, "late": 0, "total": 0})
        total = s["total"]
        pct = round(s["taken"] / total * 100) if total else 0
        missed = s["missed"]
        risk_level = "High Risk" if missed >= 5 or pct < 60 else "Medium Risk" if missed >= 2 or pct < 80 else "Low Risk"
        scores = recovery_scores.get(pid)
        avg_recovery = round(sum(scores) / len(scores), 1) if scores else None
        rows.append({
            "patient_id": pid,
            "full_name": p["full_name"],
            "pct": pct,
            "taken": s["taken"],
            "missed": missed,
            "late": s["late"],
            "risk_level": risk_level,
            "avg_recovery": avg_recovery,
        })
    rows.sort(key=lambda r: r["pct"])
    return rows


@router.get("/rolling-adherence")
async def rolling_adherence(user: CurrentUser = Depends(get_current_user)):
    patient_ids = _scoped_patient_ids(user)
    if patient_ids is not None and not patient_ids:
        return []

    q = supabase.table("doselog").select("patient_id, scheduled_at, status, patient(full_name)").neq("status", "pending")
    if patient_ids is not None:
        q = q.in_("patient_id", patient_ids)
    doses = q.order("scheduled_at").execute().data or []

    by_patient_date = defaultdict(lambda: defaultdict(lambda: {"total": 0, "taken": 0}))
    names = {}
    for d in doses:
        pid = d["patient_id"]
        names[pid] = (d.get("patient") or {}).get("full_name", "—")
        date = d["scheduled_at"].split("T")[0]
        by_patient_date[pid][date]["total"] += 1
        if d["status"] == "taken":
            by_patient_date[pid][date]["taken"] += 1

    rows = []
    for pid, dates in by_patient_date.items():
        daily_pcts = []
        for date in sorted(dates.keys()):
            stats = dates[date]
            daily_pct = round(stats["taken"] / stats["total"] * 100, 1) if stats["total"] else 0.0
            daily_pcts.append(daily_pct)
            window = daily_pcts[-7:]
            rolling_avg = round(sum(window) / len(window), 1)
            rows.append({
                "patient_id": pid,
                "full_name": names[pid],
                "date": date,
                "daily_pct": daily_pct,
                "rolling_7day_avg": rolling_avg,
            })
    rows.sort(key=lambda r: (r["full_name"], r["date"]))
    return rows


@router.get("/perfect-adherence")
async def perfect_adherence(user: CurrentUser = Depends(get_current_user)):
    patient_ids = _scoped_patient_ids(user)
    if patient_ids is not None and not patient_ids:
        return []

    pq = supabase.table("patient").select("patient_id, full_name")
    if patient_ids is not None:
        pq = pq.in_("patient_id", patient_ids)
    patients = pq.execute().data or []

    mq = supabase.table("doselog").select("patient_id").eq("status", "missed")
    if patient_ids is not None:
        mq = mq.in_("patient_id", patient_ids)
    missed_ids = {m["patient_id"] for m in (mq.execute().data or [])}

    return [p for p in patients if p["patient_id"] not in missed_ids]


@router.get("/disease-distribution")
async def disease_distribution(user: CurrentUser = Depends(get_current_user)):
    patient_ids = _scoped_patient_ids(user)
    if patient_ids is not None and not patient_ids:
        return []

    q = supabase.table("patientdiseasehistory").select("patient_id, disease(disease_name)")
    if patient_ids is not None:
        q = q.in_("patient_id", patient_ids)
    rows = q.execute().data or []

    counts = defaultdict(int)
    for r in rows:
        name = (r.get("disease") or {}).get("disease_name", "Unknown")
        counts[name] += 1

    return [{"disease_name": k, "count": v} for k, v in sorted(counts.items(), key=lambda kv: -kv[1])]


@router.get("/side-effect-alerts")
async def side_effect_alerts(user: CurrentUser = Depends(get_current_user)):
    """Critical Side Effect Alerts — medium/high severity reports, straight from SideEffectReport."""
    patient_ids = _scoped_patient_ids(user)
    if patient_ids is not None and not patient_ids:
        return []

    q = supabase.table("sideeffectreport") \
        .select("report_id, effect_name, severity, reported_at, notes, patient(full_name), medicine(generic_name, brand_name)") \
        .in_("severity", ["medium", "high"])
    if patient_ids is not None:
        q = q.in_("patient_id", patient_ids)
    result = q.order("reported_at", desc=True).execute()
    return result.data or []


@router.get("/recovery-concerns")
async def recovery_concerns(user: CurrentUser = Depends(get_current_user)):
    """Auto-detected concerns from RecoveryLog trends: rising symptom_score
    ("pain increasing") or falling recovery_score over the patient's most
    recent logs."""
    patient_ids = _scoped_patient_ids(user)
    if patient_ids is not None and not patient_ids:
        return []

    q = supabase.table("recoverylog").select("patient_id, log_date, symptom_score, recovery_score, patient(full_name)")
    if patient_ids is not None:
        q = q.in_("patient_id", patient_ids)
    rows = q.order("log_date").execute().data or []

    by_patient = defaultdict(list)
    for r in rows:
        by_patient[r["patient_id"]].append(r)

    concerns = []
    for pid, logs in by_patient.items():
        logs.sort(key=lambda r: r["log_date"])
        recent = logs[-3:]
        if len(recent) < 2:
            continue
        name = (recent[0].get("patient") or {}).get("full_name", "—")
        symptom_trend = recent[-1]["symptom_score"] - recent[0]["symptom_score"]
        recovery_trend = recent[-1]["recovery_score"] - recent[0]["recovery_score"]

        if symptom_trend > 0:
            concerns.append({
                "patient_id": pid,
                "full_name": name,
                "concern_type": "Pain/Symptoms Increasing",
                "detail": f"Symptom score rose from {recent[0]['symptom_score']} to {recent[-1]['symptom_score']} over the last {len(recent)} logs",
                "severity": "critical" if symptom_trend >= 3 else "high",
            })
        if recovery_trend < 0:
            concerns.append({
                "patient_id": pid,
                "full_name": name,
                "concern_type": "Recovery Declining",
                "detail": f"Recovery score dropped from {recent[0]['recovery_score']} to {recent[-1]['recovery_score']} over the last {len(recent)} logs",
                "severity": "critical" if recovery_trend <= -3 else "high",
            })
    return concerns


@router.get("/patient-reports")
async def patient_reports(user: CurrentUser = Depends(get_current_user)):
    """Test reports (PDF/JPG) uploaded by patients, across the doctor's granted patients."""
    patient_ids = _scoped_patient_ids(user)
    if patient_ids is not None and not patient_ids:
        return []

    q = supabase.table("patientreport").select("report_id, file_name, file_type, storage_path, uploaded_at, patient(full_name)")
    if patient_ids is not None:
        q = q.in_("patient_id", patient_ids)
    rows = q.order("uploaded_at", desc=True).execute().data or []

    for r in rows:
        r["full_name"] = (r.pop("patient", None) or {}).get("full_name", "—")
        signed = supabase.storage.from_(REPORTS_BUCKET).create_signed_url(r["storage_path"], 3600)
        r["url"] = signed.get("signedURL") or signed.get("signed_url")
    return rows
