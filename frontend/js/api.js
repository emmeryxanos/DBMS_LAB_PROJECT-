// ============================================================
//  MedTrack | frontend/js/api.js
//  Thin fetch wrapper that talks to the FastAPI backend.
//  Auth (login/register/logout) still goes through Supabase
//  directly via supabase.js / auth.js.
// ============================================================

// Change this to your deployed backend URL after deploying the backend to Vercel
// e.g. 'https://medtrack-api.vercel.app'
const API_BASE = 'https://dbms-lab-project-a3uo.onrender.com';

async function apiFetch(path, options = {}) {
  const { data: { session } } = await db.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${msg}`);
  }
  return res.json();
}

const api = {
  // ── Dashboard
  stats:       ()           => apiFetch('/api/dashboard/stats'),
  alerts:      ()           => apiFetch('/api/dashboard/alerts'),
  recentDoses: ()           => apiFetch('/api/dashboard/recent-doses'),

  // ── Patients
  patients:        (search = '') => apiFetch(`/api/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  patientAdherence: (id)         => apiFetch(`/api/patients/${id}/adherence`),

  // ── Medicines
  medicines: () => apiFetch('/api/medicines'),

  // ── Drug interactions & allergy checks
  interactions:    ()                        => apiFetch('/api/interactions'),
  checkInteraction:(m1, m2)                  => apiFetch(`/api/interactions/check?m1=${m1}&m2=${m2}`),
  allergies:       ()                        => apiFetch('/api/allergies'),
  checkAllergy:    (patientId, medicineId)   => apiFetch(`/api/allergies/check?patient_id=${patientId}&medicine_id=${medicineId}`),

  // ── Patient portal
  portalAdherence:  (pid)  => apiFetch(`/api/portal/adherence/${pid}`),
  portalTodayDoses: (pid)  => apiFetch(`/api/portal/doses/today/${pid}`),
  portalDoseHistory:(pid)  => apiFetch(`/api/portal/doses/history/${pid}`),
  portalDoseChart:  (pid)  => apiFetch(`/api/portal/doses/chart/${pid}`),
  markDoseTaken:    (logId)=> apiFetch(`/api/portal/doses/${logId}/taken`, { method: 'PATCH' }),
  portalRecovery:   (pid)  => apiFetch(`/api/portal/recovery/${pid}`),
  portalRecoveryChart:(pid)=> apiFetch(`/api/portal/recovery/chart/${pid}`),
  submitRecovery:   (body) => apiFetch('/api/portal/recovery',      { method: 'POST', body: JSON.stringify(body) }),
  portalPrescriptions:(pid)=> apiFetch(`/api/portal/prescriptions/${pid}`),
  portalMedicines:  (pid)  => apiFetch(`/api/portal/medicines/${pid}`),
  portalSideEffects:(pid)  => apiFetch(`/api/portal/side-effects/${pid}`),
  submitSideEffect: (body) => apiFetch('/api/portal/side-effects', { method: 'POST', body: JSON.stringify(body) }),
  portalAppointments:(pid) => apiFetch(`/api/portal/appointments/${pid}`),
};
