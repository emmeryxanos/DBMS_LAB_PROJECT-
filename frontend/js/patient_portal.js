// ============================================================
//  MedTrack | patient_portal.js
//  All logic for the patient portal — loads data for the
//  currently logged-in patient only
// ============================================================

let PATIENT_ID = null;

// ── Tab navigation
function showTab(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (el) el.classList.add('active');
  const titles = {
    overview: 'My Health Overview', medicines: 'My Medicines',
    recovery: 'Recovery Log', prescriptions: 'My Prescriptions',
    sideeffects: 'Side Effects', history: 'My History'
  };
  document.getElementById('page-title').textContent = titles[name] || name;
}

// ── Score range label
function updateScoreLabel(inputId, labelId) {
  document.getElementById(labelId).textContent = document.getElementById(inputId).value;
}

// ── Wait for auth then boot
async function init() {
  let waited = 0;
  while (!window.CURRENT_USER && waited < 3000) {
    await new Promise(r => setTimeout(r, 100));
    waited += 100;
  }

  const user = window.CURRENT_USER;
  if (!user) { window.location.replace('auth/login.html'); return; }

  const { data: profile } = await db
    .from('user_profiles')
    .select('linked_id, full_name, role')
    .eq('id', user.id)
    .single();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('welcome-name').textContent = `${greeting}, ${profile?.full_name ?? user.name}!`;

  if (!profile?.linked_id) {
    document.getElementById('welcome-sub').textContent = 'Your account is not linked to a patient record yet. Please contact your doctor.';
    showNoPatientMessage();
    return;
  }

  PATIENT_ID = profile.linked_id;
  document.getElementById('welcome-sub').textContent = "Here's your health summary for today";

  loadAdherenceStats();
  loadTodayDoses();
  loadAdherenceChart();
  loadRecoveryChart();
  loadMyMedicines();
  loadDoseHistory();
  loadRecoveryHistory();
  loadMyPrescriptions();
  loadMedicineDropdown();
  loadMySideEffects();
  loadMyReports();
  loadMyAppointments();
  loadStatusChart();
  loadDoctorsDropdown();
  loadPendingAccessRequests();
  loadMyAccessGrants();
  loadMyAllergies();
}

function showNoPatientMessage() {
  ['today-doses','my-medicines','dose-history','my-prescriptions','my-side-effects','my-appointments','recovery-history']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<tr><td colspan="6" class="empty">No patient record linked to your account yet.</td></tr>';
    });
}

// ── Adherence stats
async function loadAdherenceStats() {
  const s = await api.portalAdherence(PATIENT_ID);
  document.getElementById('p-adherence').textContent = s.pct + '%';
  document.getElementById('p-taken').textContent     = s.taken;
  document.getElementById('p-missed').textContent    = s.missed;
  document.getElementById('p-late').textContent      = s.late;
}

// ── Today's doses
async function loadTodayDoses() {
  const data = await api.portalTodayDoses(PATIENT_ID);
  const el   = document.getElementById('today-doses');
  document.getElementById('today-count').textContent = data?.length ?? 0;

  if (!data?.length) {
    el.innerHTML = '<div class="empty"><i class="icon" data-lucide="check-circle"></i>No doses scheduled for today</div>';
    return;
  }

  el.innerHTML = data.map(d => {
    const med   = d.medicationschedule?.medicine;
    const badge = d.status === 'taken'  ? 'badge-green'  :
                  d.status === 'missed' ? 'badge-red'    :
                  d.status === 'late'   ? 'badge-yellow' : 'badge-blue';
    const btn = (d.status === 'pending' || d.status === 'missed')
      ? `<button class="btn btn-green" style="padding:5px 12px;font-size:12px" onclick="markTaken(${d.log_id})"><i class="icon icon-sm" data-lucide="check"></i>Mark Taken</button>`
      : `<span class="badge ${badge}">${d.status}</span>`;
    return `<div class="dose-row">
      <div>
        <div style="font-size:13px;font-weight:500">${med?.generic_name ?? '—'} <span style="color:var(--muted);font-weight:400">(${med?.brand_name ?? ''})</span></div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">${d.medicationschedule?.dose_time ?? ''} · ${med?.dosage_type ?? ''}</div>
      </div>
      ${btn}
    </div>`;
  }).join('');
}

// ── Mark dose as taken
async function markTaken(logId) {
  await api.markDoseTaken(logId);
  loadTodayDoses();
  loadAdherenceStats();
}

// ── Adherence chart
async function loadAdherenceChart() {
  const data = await api.portalDoseChart(PATIENT_ID);
  if (!data?.length) return;

  const byDate = {};
  data.forEach(d => {
    const date = d.scheduled_at.split('T')[0];
    if (!byDate[date]) byDate[date] = { taken: 0, total: 0 };
    byDate[date].total++;
    if (d.status === 'taken') byDate[date].taken++;
  });
  const labels = Object.keys(byDate).sort();
  const values = labels.map(d => Math.round((byDate[d].taken / byDate[d].total) * 100));

  new Chart(document.getElementById('p-adherence-chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Adherence %', data: values, borderColor: '#8b7fd6',
        backgroundColor: 'rgba(139,127,214,0.12)', tension: 0.4, fill: true, pointRadius: 4 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: '#1f2937' } },
        y: { min: 0, max: 100, ticks: { color: '#64748b', callback: v => v + '%' }, grid: { color: '#1f2937' } }
      }
    }
  });
}

// ── Recovery chart
async function loadRecoveryChart() {
  const data = await api.portalRecoveryChart(PATIENT_ID);
  if (!data?.length) return;

  new Chart(document.getElementById('p-recovery-chart'), {
    type: 'line',
    data: {
      labels: data.map(d => d.log_date),
      datasets: [
        { label: 'Recovery', data: data.map(d => d.recovery_score), borderColor: '#5c8de8', backgroundColor: 'rgba(92,141,232,0.12)', tension: 0.4, fill: true },
        { label: 'Symptoms', data: data.map(d => d.symptom_score),  borderColor: '#e1637a', backgroundColor: 'rgba(225,99,122,0.12)',  tension: 0.4, fill: true }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color: '#64748b' }, grid: { color: '#1f2937' } },
        y: { min: 0, max: 10, ticks: { color: '#64748b' }, grid: { color: '#1f2937' } }
      }
    }
  });
}

// ── Status doughnut chart
async function loadStatusChart() {
  const data = await api.portalDoseChart(PATIENT_ID);
  if (!data?.length) return;
  const taken  = data.filter(d => d.status === 'taken').length;
  const missed = data.filter(d => d.status === 'missed').length;
  const late   = data.filter(d => d.status === 'late').length;
  new Chart(document.getElementById('p-status-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Taken', 'Missed', 'Late'],
      datasets: [{ data: [taken, missed, late], backgroundColor: ['#8b7fd6', '#e1637a', '#c99435'], borderWidth: 0 }]
    },
    options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } } }
  });
}

// ── My medicines
async function loadMyMedicines() {
  const data  = await api.portalMedicines(PATIENT_ID);
  const tbody = document.getElementById('my-medicines');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No medicines scheduled</td></tr>'; return; }
  tbody.innerHTML = data.map(s => `<tr>
    <td><strong>${s.medicine?.generic_name ?? '—'}</strong></td>
    <td>${s.medicine?.brand_name ?? '—'}</td>
    <td>${s.dose_time ?? '—'}</td>
    <td><span class="badge badge-blue">${s.frequency?.replace(/_/g, ' ') ?? '—'}</span></td>
    <td><span class="badge badge-purple">${s.medicine?.dosage_type ?? '—'}</span></td>
  </tr>`).join('');
}

// ── Dose history
async function loadDoseHistory() {
  const data  = await api.portalDoseHistory(PATIENT_ID);
  const tbody = document.getElementById('dose-history');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No dose history</td></tr>'; return; }
  tbody.innerHTML = data.map(d => {
    const badge = d.status === 'taken' ? 'badge-green' : d.status === 'missed' ? 'badge-red' : d.status === 'late' ? 'badge-yellow' : 'badge-blue';
    return `<tr>
      <td>${d.medicationschedule?.medicine?.generic_name ?? '—'}</td>
      <td>${new Date(d.scheduled_at).toLocaleString()}</td>
      <td>${d.taken_at ? new Date(d.taken_at).toLocaleString() : '—'}</td>
      <td><span class="badge ${badge}">${d.status}</span></td>
    </tr>`;
  }).join('');
}

// ── Recovery history
async function loadRecoveryHistory() {
  const data  = await api.portalRecovery(PATIENT_ID);
  const tbody = document.getElementById('recovery-history');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No recovery logs yet</td></tr>'; return; }
  tbody.innerHTML = data.map(r => `<tr>
    <td>${r.log_date}</td>
    <td><span class="badge badge-${r.symptom_score >= 7 ? 'red' : r.symptom_score >= 4 ? 'yellow' : 'green'}">${r.symptom_score}/10</span></td>
    <td><span class="badge badge-${r.recovery_score >= 7 ? 'green' : r.recovery_score >= 4 ? 'yellow' : 'red'}">${r.recovery_score}/10</span></td>
    <td>${r.notes ?? '—'}</td>
  </tr>`).join('');
}

// ── Submit recovery log
async function submitRecoveryLog() {
  const symptom  = parseInt(document.getElementById('symptom-score').value);
  const recovery = parseInt(document.getElementById('recovery-score').value);
  const notes    = document.getElementById('recovery-notes').value;
  const today    = new Date().toISOString().split('T')[0];
  const msgEl    = document.getElementById('recovery-log-msg');

  try {
    await api.submitRecovery({ patient_id: PATIENT_ID, log_date: today, symptom_score: symptom, recovery_score: recovery, notes });
    msgEl.innerHTML = `<div class="result-safe" style="padding:8px 12px;border-radius:6px;display:flex;align-items:center;gap:7px"><i class="icon icon-sm" data-lucide="check-circle"></i>Recovery log saved!</div>`;
    loadRecoveryHistory();
    setTimeout(() => msgEl.innerHTML = '', 3000);
  } catch (e) {
    msgEl.innerHTML = `<div class="result-danger" style="padding:8px 12px;border-radius:6px">Error: ${e.message}</div>`;
  }
}

// ── My prescriptions
async function loadMyPrescriptions() {
  const data  = await api.portalPrescriptions(PATIENT_ID);
  const tbody = document.getElementById('my-prescriptions');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No prescriptions found</td></tr>'; return; }
  tbody.innerHTML = data.map(r => {
    const badge = r.status === 'active' ? 'badge-green' : r.status === 'completed' ? 'badge-blue' : 'badge-red';
    return `<tr>
      <td>${r.appointment?.doctor?.full_name ?? '—'}</td>
      <td>${r.start_date}</td>
      <td>${r.end_date}</td>
      <td>${r.notes ?? '—'}</td>
      <td><span class="badge ${badge}">${r.status}</span></td>
    </tr>`;
  }).join('');
}

// ── Medicine dropdown for side effects
async function loadMedicineDropdown() {
  const data = await api.medicines();
  const sel  = document.getElementById('se-medicine');
  sel.innerHTML = '<option value="">Select medicine...</option>' +
    data.map(m => `<option value="${m.medicine_id}">${m.generic_name} (${m.brand_name ?? '—'})</option>`).join('');
}

// ── Submit side effect
async function submitSideEffect() {
  const med      = parseInt(document.getElementById('se-medicine').value);
  const effect   = document.getElementById('se-effect').value.trim();
  const severity = document.getElementById('se-severity').value;
  const notes    = document.getElementById('se-notes').value;
  const msgEl    = document.getElementById('se-msg');

  if (!med || !effect) {
    msgEl.innerHTML = `<div class="result-warning" style="padding:8px 12px;border-radius:6px">Please select a medicine and describe the effect.</div>`;
    return;
  }

  try {
    await api.submitSideEffect({ patient_id: PATIENT_ID, medicine_id: med, effect_name: effect, severity, notes });
    msgEl.innerHTML = `<div class="result-safe" style="padding:8px 12px;border-radius:6px;display:flex;align-items:center;gap:7px"><i class="icon icon-sm" data-lucide="check-circle"></i>Side effect reported!</div>`;
    loadMySideEffects();
    document.getElementById('se-effect').value = '';
    document.getElementById('se-notes').value  = '';
    setTimeout(() => msgEl.innerHTML = '', 3000);
  } catch (e) {
    msgEl.innerHTML = `<div class="result-danger" style="padding:8px 12px;border-radius:6px">Error: ${e.message}</div>`;
  }
}

// ── My side effects
async function loadMySideEffects() {
  const data  = await api.portalSideEffects(PATIENT_ID);
  const tbody = document.getElementById('my-side-effects');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No side effects reported</td></tr>'; return; }
  tbody.innerHTML = data.map(s => {
    const badge = s.severity === 'high' ? 'badge-red' : s.severity === 'medium' ? 'badge-yellow' : 'badge-green';
    return `<tr>
      <td>${s.medicine?.generic_name ?? '—'}</td>
      <td>${s.effect_name}</td>
      <td><span class="badge ${badge}">${s.severity}</span></td>
      <td>${new Date(s.reported_at).toLocaleDateString()}</td>
    </tr>`;
  }).join('');
}

// ── Upload test report
const REPORT_MAX_SIZE  = 5 * 1024 * 1024;
const REPORT_ALLOWED_EXT = ['pdf', 'jpg', 'jpeg'];

async function uploadReport() {
  const fileInput = document.getElementById('report-file');
  const file       = fileInput.files[0];
  const msgEl      = document.getElementById('report-msg');

  if (!file) {
    msgEl.innerHTML = `<div class="result-warning" style="padding:8px 12px;border-radius:6px">Please choose a file to upload.</div>`;
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  if (!REPORT_ALLOWED_EXT.includes(ext)) {
    msgEl.innerHTML = `<div class="result-warning" style="padding:8px 12px;border-radius:6px">Only PDF, JPG, or JPEG files are allowed.</div>`;
    return;
  }
  if (file.size > REPORT_MAX_SIZE) {
    msgEl.innerHTML = `<div class="result-warning" style="padding:8px 12px;border-radius:6px">File exceeds the 5MB size limit.</div>`;
    return;
  }

  try {
    const formData = new FormData();
    formData.append('patient_id', PATIENT_ID);
    formData.append('file', file);
    await api.uploadReport(formData);
    msgEl.innerHTML = `<div class="result-safe" style="padding:8px 12px;border-radius:6px;display:flex;align-items:center;gap:7px"><i class="icon icon-sm" data-lucide="check-circle"></i>Report uploaded!</div>`;
    fileInput.value = '';
    loadMyReports();
    setTimeout(() => msgEl.innerHTML = '', 3000);
  } catch (e) {
    msgEl.innerHTML = `<div class="result-danger" style="padding:8px 12px;border-radius:6px">Error: ${e.message}</div>`;
  }
}

// ── My uploaded reports
async function loadMyReports() {
  const data  = await api.portalReports(PATIENT_ID);
  const tbody = document.getElementById('my-reports');
  if (!tbody) return;
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No reports uploaded yet</td></tr>'; return; }
  tbody.innerHTML = data.map(r => `<tr>
    <td>${r.file_name}</td>
    <td>${r.file_type.toUpperCase()}</td>
    <td>${new Date(r.uploaded_at).toLocaleDateString()}</td>
    <td>${r.url ? `<a href="${r.url}" target="_blank" rel="noopener">View</a>` : '—'}</td>
  </tr>`).join('');
}

// ── My appointments
async function loadMyAppointments() {
  const data  = await api.portalAppointments(PATIENT_ID);
  const tbody = document.getElementById('my-appointments');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No appointments found</td></tr>'; return; }
  tbody.innerHTML = data.map(a => {
    const badge = a.status === 'completed' ? 'badge-green' : a.status === 'scheduled' ? 'badge-blue'
                : a.status === 'requested' ? 'badge-yellow' : 'badge-red';
    return `<tr>
      <td>${a.doctor?.full_name ?? '—'}</td>
      <td>${new Date(a.appointment_date).toLocaleDateString()}</td>
      <td>${a.symptoms ?? '—'}</td>
      <td><span class="badge ${badge}">${a.status}</span></td>
    </tr>`;
  }).join('');
}

// ── Doctors dropdown for appointment request
async function loadDoctorsDropdown() {
  const data = await api.doctors();
  const sel  = document.getElementById('req-doctor');
  sel.innerHTML = '<option value="">Select doctor...</option>' +
    data.map(d => `<option value="${d.doctor_id}">${d.full_name} — ${d.specialization}</option>`).join('');
}

// ── Request an appointment
async function submitAppointmentRequest() {
  const doctorId  = parseInt(document.getElementById('req-doctor').value);
  const date      = document.getElementById('req-date').value;
  const symptoms  = document.getElementById('req-symptoms').value;
  const msgEl     = document.getElementById('req-msg');

  if (!doctorId || !date) {
    msgEl.innerHTML = `<div class="result-warning" style="padding:8px 12px;border-radius:6px">Please select a doctor and a date/time.</div>`;
    return;
  }

  try {
    await api.requestAppointment({ doctor_id: doctorId, appointment_date: date, symptoms });
    msgEl.innerHTML = `<div class="result-safe" style="padding:8px 12px;border-radius:6px;display:flex;align-items:center;gap:7px"><i class="icon icon-sm" data-lucide="check-circle"></i>Appointment requested! Awaiting doctor confirmation.</div>`;
    document.getElementById('req-symptoms').value = '';
    loadMyAppointments();
    setTimeout(() => msgEl.innerHTML = '', 4000);
  } catch (e) {
    msgEl.innerHTML = `<div class="result-danger" style="padding:8px 12px;border-radius:6px">Error: ${e.message}</div>`;
  }
}

// ── Pending access requests (doctor wants access to my record)
async function loadPendingAccessRequests() {
  const data = await api.getPendingAccessRequests();
  const el   = document.getElementById('access-pending');
  if (!data?.length) { el.innerHTML = '<div class="empty">No pending requests</div>'; return; }
  el.innerHTML = data.map(r => `<div class="dose-row">
    <div>
      <div style="font-size:13px;font-weight:500">${r.doctor?.full_name ?? '—'}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px">${r.doctor?.specialization ?? ''} wants access to your medical record</div>
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-green" style="padding:5px 12px;font-size:12px" onclick="respondToAccess(${r.access_id}, 'approve')">Allow</button>
      <button class="btn btn-red" style="padding:5px 12px;font-size:12px" onclick="respondToAccess(${r.access_id}, 'deny')">Deny</button>
    </div>
  </div>`).join('');
}

async function respondToAccess(accessId, action) {
  if (action === 'approve') await api.approveAccess(accessId);
  else await api.denyAccess(accessId);
  loadPendingAccessRequests();
  loadMyAccessGrants();
}

// ── Doctors with access to my record
async function loadMyAccessGrants() {
  const data  = await api.getMyAccessGrants();
  const tbody = document.getElementById('my-access-grants');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">No doctors have requested access yet</td></tr>'; return; }
  tbody.innerHTML = data.map(g => {
    const badge = g.status === 'granted' ? 'badge-green' : g.status === 'pending' ? 'badge-yellow' : g.status === 'revoked' ? 'badge-red' : 'badge-blue';
    const action = g.status === 'granted'
      ? `<button class="btn btn-red" style="padding:5px 12px;font-size:12px" onclick="revokeDoctorAccess(${g.access_id})">Revoke</button>`
      : '';
    return `<tr>
      <td>${g.doctor?.full_name ?? '—'}</td>
      <td>${g.doctor?.specialization ?? '—'}</td>
      <td><span class="badge ${badge}">${g.status}</span></td>
      <td>${g.granted_at ? new Date(g.granted_at).toLocaleDateString() : '—'}</td>
      <td>${action}</td>
    </tr>`;
  }).join('');
}

async function revokeDoctorAccess(accessId) {
  await api.revokeAccess(accessId);
  loadMyAccessGrants();
}

// ── Report an allergy
async function submitAllergyReport() {
  const name  = document.getElementById('al-name').value.trim();
  const desc  = document.getElementById('al-desc').value;
  const msgEl = document.getElementById('al-msg');

  if (!name) {
    msgEl.innerHTML = `<div class="result-warning" style="padding:8px 12px;border-radius:6px">Please enter an allergy name.</div>`;
    return;
  }

  try {
    await api.reportAllergy({ patient_id: PATIENT_ID, new_allergy_name: name, description: desc });
    msgEl.innerHTML = `<div class="result-safe" style="padding:8px 12px;border-radius:6px;display:flex;align-items:center;gap:7px"><i class="icon icon-sm" data-lucide="check-circle"></i>Allergy reported — awaiting doctor confirmation.</div>`;
    document.getElementById('al-name').value = '';
    document.getElementById('al-desc').value = '';
    loadMyAllergies();
    setTimeout(() => msgEl.innerHTML = '', 4000);
  } catch (e) {
    msgEl.innerHTML = `<div class="result-danger" style="padding:8px 12px;border-radius:6px">Error: ${e.message}</div>`;
  }
}

// ── My allergies
async function loadMyAllergies() {
  const data  = await api.portalAllergies(PATIENT_ID);
  const tbody = document.getElementById('my-allergies');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="3" class="empty">No allergies recorded</td></tr>'; return; }
  tbody.innerHTML = data.map(a => {
    const badge = a.status === 'confirmed' ? 'badge-green' : a.status === 'rejected' ? 'badge-red' : 'badge-yellow';
    return `<tr>
      <td>${a.allergy?.allergy_name ?? '—'}</td>
      <td><span class="badge ${badge}">${a.status}</span></td>
      <td>${a.reported_by}</td>
    </tr>`;
  }).join('');
}

// ── Boot
document.addEventListener('DOMContentLoaded', init);
