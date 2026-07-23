// ============================================================
//  MedTrack | frontend/js/api.js
//  Thin fetch wrapper that talks to the FastAPI backend.
//  Auth (login/register/logout) still goes through Supabase
//  directly via supabase.js / auth.js.
// ============================================================

const API_BASE = CONFIG.API_BASE;

function _qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

async function apiFetch(path, options = {}) {
  const { data: { session } } = await db.auth.getSession();
  const token      = session?.access_token;
  const activeRole = sessionStorage.getItem('medtrack-active-role');
  const { isFormData, ...fetchOptions } = options;

  const res = await fetch(API_BASE + path, {
    ...fetchOptions,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeRole ? { 'X-Role': activeRole } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    const msg = await res.text().catch(() => res.statusText);
    if (res.status === 401) {
      window.location.href = window.location.pathname.includes('/auth/') ? 'login.html' : 'auth/login.html';
    }
    throw new Error(`API ${res.status}: ${msg}`);
  }

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
  createPatient:   (body)        => apiFetch('/api/patients', { method: 'POST', body: JSON.stringify(body) }),
  updatePatient:   (id, body)    => apiFetch(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePatient:   (id)          => apiFetch(`/api/patients/${id}`, { method: 'DELETE' }),

  // ── Medicines
  medicines: () => apiFetch('/api/medicines'),

  // ── Drug interactions & allergy checks
  interactions:    ()                        => apiFetch('/api/interactions'),
  checkInteraction:(m1, m2)                  => apiFetch(`/api/interactions/check?m1=${m1}&m2=${m2}`),
  allergies:       ()                        => apiFetch('/api/allergies'),
  allergyCatalog:  ()                        => apiFetch('/api/allergies/catalog'),
  checkAllergy:    (patientId, medicineId)   => apiFetch(`/api/allergies/check?patient_id=${patientId}&medicine_id=${medicineId}`),
  addPatientAllergy:   (pid, body) => apiFetch(`/api/patients/${pid}/allergies`, { method: 'POST', body: JSON.stringify(body) }),
  removePatientAllergy:(pid, aid)  => apiFetch(`/api/patients/${pid}/allergies/${aid}`, { method: 'DELETE' }),
  confirmPatientAllergy:(pid, aid) => apiFetch(`/api/patients/${pid}/allergies/${aid}/confirm`, { method: 'PATCH' }),
  rejectPatientAllergy: (pid, aid) => apiFetch(`/api/patients/${pid}/allergies/${aid}/reject`,  { method: 'PATCH' }),
  pendingAllergies:     ()         => apiFetch('/api/allergies?status_filter=pending'),

  // ── Account
  me:                   ()     => apiFetch('/api/account/me'),
  myRoles:              ()     => apiFetch('/api/account/roles'),
  addPatientRole:       (body) => apiFetch('/api/account/add-patient-role', { method: 'POST', body: JSON.stringify(body) }),
  addDoctorRole:        (body) => apiFetch('/api/account/add-doctor-role',  { method: 'POST', body: JSON.stringify(body) }),
  registerPatientRecord:(body) => apiFetch('/api/account/register-patient', { method: 'POST', body: JSON.stringify(body) }),
  registerDoctorRecord: (body) => apiFetch('/api/account/register-doctor',  { method: 'POST', body: JSON.stringify(body) }),

  // ── Appointments
  doctors:           ()           => apiFetch('/api/appointments/doctors'),
  appointments:      (patientId, status) => apiFetch(`/api/appointments${_qs({ patient_id: patientId, status_filter: status })}`),
  createAppointment: (body)      => apiFetch('/api/appointments', { method: 'POST', body: JSON.stringify(body) }),
  requestAppointment:(body)      => apiFetch('/api/appointments/request', { method: 'POST', body: JSON.stringify(body) }),
  acceptAppointment: (id)        => apiFetch(`/api/appointments/${id}/accept`,   { method: 'PATCH' }),
  rejectAppointment: (id)        => apiFetch(`/api/appointments/${id}/reject`,   { method: 'PATCH' }),
  completeAppointment:(id)       => apiFetch(`/api/appointments/${id}/complete`, { method: 'PATCH' }),

  // ── Prescriptions (doctor)
  prescriptions:     (patientId) => apiFetch(`/api/prescriptions?patient_id=${patientId}`),
  createPrescription:(body)      => apiFetch('/api/prescriptions', { method: 'POST', body: JSON.stringify(body) }),

  // ── Doctor-patient record access (consent)
  requestAccess:        (patientId) => apiFetch('/api/access/request', { method: 'POST', body: JSON.stringify({ patient_id: patientId }) }),
  getPendingAccessRequests: ()      => apiFetch('/api/access/pending'),
  getGrantedPatients:   ()          => apiFetch('/api/access/granted'),
  getMyAccessGrants:    ()          => apiFetch('/api/access/mine'),
  approveAccess:        (accessId)  => apiFetch(`/api/access/${accessId}/approve`, { method: 'PATCH' }),
  denyAccess:           (accessId)  => apiFetch(`/api/access/${accessId}/deny`,    { method: 'PATCH' }),
  revokeAccess:         (accessId)  => apiFetch(`/api/access/${accessId}/revoke`,  { method: 'PATCH' }),

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
  portalAllergies:  (pid)  => apiFetch(`/api/portal/allergies/${pid}`),
  reportAllergy:    (body) => apiFetch('/api/portal/allergies', { method: 'POST', body: JSON.stringify(body) }),
  portalReports:    (pid)  => apiFetch(`/api/portal/reports/${pid}`),
  uploadReport:     (formData) => apiFetch('/api/portal/reports', { method: 'POST', body: formData, isFormData: true }),

  // ── Doctor reports/analytics
  reportRisk:               () => apiFetch('/api/reports/risk'),
  reportRollingAdherence:   () => apiFetch('/api/reports/rolling-adherence'),
  reportPerfectAdherence:   () => apiFetch('/api/reports/perfect-adherence'),
  reportDiseaseDistribution:() => apiFetch('/api/reports/disease-distribution'),
  reportSideEffectAlerts:   () => apiFetch('/api/reports/side-effect-alerts'),
  reportRecoveryConcerns:   () => apiFetch('/api/reports/recovery-concerns'),
  reportPatientReports:     () => apiFetch('/api/reports/patient-reports'),
};
