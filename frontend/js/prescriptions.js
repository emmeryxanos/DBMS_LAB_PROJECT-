// ============================================================
//  MedTrack | prescriptions.js
//  Doctor prescription creation with automatic interaction /
//  allergy warnings (non-blocking).
// ============================================================

let rxMedicineCache = [];
let rxRowCount = 0;

async function loadRxPatientDropdown() {
  const data = await api.patients();
  const sel  = document.getElementById('rx-patient');
  if (!sel) return;
  sel.innerHTML = `<option value="">Select patient...</option>` +
    data.map(p => `<option value="${p.patient_id}">${p.full_name}</option>`).join('');
}

async function loadRxMedicineCache() {
  rxMedicineCache = await api.medicines();
}

function toggleNewAppointmentForm() {
  const el = document.getElementById('rx-new-appointment');
  if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

async function onRxPatientChange() {
  const pid = parseInt(document.getElementById('rx-patient')?.value);
  const apptSel = document.getElementById('rx-appointment');
  const rxTbody = document.getElementById('rx-list');
  if (!pid) {
    if (apptSel) apptSel.innerHTML = `<option value="">Select appointment...</option>`;
    if (rxTbody) rxTbody.innerHTML = `<tr><td colspan="4" class="empty">Select a patient to view prescriptions</td></tr>`;
    return;
  }
  await Promise.all([loadRxAppointments(pid), loadRxPrescriptionsForPatient(pid)]);
}

async function loadRxAppointments(patientId) {
  const data = await api.appointments(patientId);
  const sel  = document.getElementById('rx-appointment');
  if (!sel) return;
  sel.innerHTML = `<option value="">Select appointment...</option>` +
    data.map(a => `<option value="${a.appointment_id}">${new Date(a.appointment_date).toLocaleString()} — ${a.symptoms ?? 'No symptoms noted'}</option>`).join('');
}

async function createRxAppointment() {
  const pid = parseInt(document.getElementById('rx-patient')?.value);
  const err = document.getElementById('rx-form-error');
  err.textContent = '';
  if (!pid) { err.textContent = 'Select a patient first.'; return; }

  const dateVal = document.getElementById('rx-appt-date')?.value;
  if (!dateVal) { err.textContent = 'Pick an appointment date/time.'; return; }

  try {
    await api.createAppointment({
      patient_id: pid,
      appointment_date: new Date(dateVal).toISOString(),
      symptoms: document.getElementById('rx-appt-symptoms')?.value.trim() || null,
    });
    document.getElementById('rx-appt-date').value = '';
    document.getElementById('rx-appt-symptoms').value = '';
    toggleNewAppointmentForm();
    await loadRxAppointments(pid);
  } catch (ex) {
    err.textContent = ex.message || 'Failed to create appointment.';
  }
}

function addRxMedicineRow() {
  const container = document.getElementById('rx-medicine-rows');
  if (!container) return;
  const rowId = rxRowCount++;

  const medOpts = `<option value="">Select medicine...</option>` +
    rxMedicineCache.map(m => `<option value="${m.medicine_id}">${m.generic_name} (${m.brand_name ?? '—'})</option>`).join('');

  const row = document.createElement('div');
  row.className = 'checker-row rx-medicine-row';
  row.dataset.rowId = rowId;
  row.style.marginTop = '10px';
  row.innerHTML = `
    <div class="form-group">
      <label class="form-label">Medicine</label>
      <select class="form-select rx-med-select" onchange="renderRxWarnings()">${medOpts}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Dosage</label>
      <input class="form-select rx-med-dosage" placeholder="e.g. 500mg">
    </div>
    <div class="form-group">
      <label class="form-label">Duration (days)</label>
      <input type="number" min="1" class="form-select rx-med-duration" value="7">
    </div>
    <div class="form-group">
      <label class="form-label">Dose Time</label>
      <input type="time" class="form-select rx-med-time" value="08:00">
    </div>
    <div class="form-group">
      <label class="form-label">Frequency</label>
      <select class="form-select rx-med-frequency">
        <option value="once_daily">Once daily</option>
        <option value="twice_daily">Twice daily</option>
        <option value="thrice_daily">Thrice daily</option>
        <option value="weekly">Weekly</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Instructions</label>
      <input class="form-select rx-med-instructions" placeholder="e.g. After meals">
    </div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="removeRxMedicineRow(this)">Remove</button>
  `;
  container.appendChild(row);
}

function removeRxMedicineRow(btn) {
  btn.closest('.rx-medicine-row')?.remove();
  renderRxWarnings();
}

function readRxMedicineRows() {
  return [...document.querySelectorAll('.rx-medicine-row')].map(row => ({
    medicine_id:   parseInt(row.querySelector('.rx-med-select')?.value) || null,
    dosage:        row.querySelector('.rx-med-dosage')?.value.trim(),
    duration_days: parseInt(row.querySelector('.rx-med-duration')?.value) || null,
    dose_time:     row.querySelector('.rx-med-time')?.value,
    frequency:     row.querySelector('.rx-med-frequency')?.value,
    instructions:  row.querySelector('.rx-med-instructions')?.value.trim() || null,
  }));
}

// ── Live warnings as medicines are picked (client-side pre-check;
//    the authoritative check happens again server-side on submit)
async function renderRxWarnings() {
  const el  = document.getElementById('rx-warnings');
  const pid = parseInt(document.getElementById('rx-patient')?.value);
  if (!el) return;

  const meds = readRxMedicineRows().filter(m => m.medicine_id);
  if (!pid || meds.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = `<div style="color:var(--muted);font-size:13px">Checking interactions & allergies...</div>`;

  const interactionChecks = [];
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      interactionChecks.push(api.checkInteraction(meds[i].medicine_id, meds[j].medicine_id));
    }
  }
  const allergyChecks = meds.map(m => api.checkAllergy(pid, m.medicine_id));

  const [interactionResults, allergyResults] = await Promise.all([
    Promise.all(interactionChecks),
    Promise.all(allergyChecks),
  ]);

  renderWarningsPanel(el, interactionResults.flat(), allergyResults.flat());
}

function renderWarningsPanel(el, interactions, allergies) {
  if (!interactions.length && !allergies.length) {
    el.innerHTML = `<div class="result-safe"><div class="result-title"><i class="icon" data-lucide="check-circle"></i>No known interactions or allergy conflicts</div></div>`;
    return;
  }

  const sevClass = s => s === 'severe' ? 'result-danger' : s === 'moderate' ? 'result-warning' : 'result-safe';
  const sevIcon  = s => s === 'severe' ? 'siren' : s === 'moderate' ? 'alert-triangle' : 'info';

  const interactionHtml = interactions.map(i => `
    <div class="${sevClass(i.severity)}">
      <div class="result-title"><i class="icon" data-lucide="${sevIcon(i.severity)}"></i>${i.severity.toUpperCase()} Drug Interaction</div>
      <div class="result-msg">${i.warning_message}</div>
    </div>`).join('');

  const allergyHtml = allergies.map(a => `
    <div class="${sevClass(a.severity)}">
      <div class="result-title"><i class="icon" data-lucide="siren"></i>Allergy Conflict — ${a.severity.toUpperCase()}</div>
      <div class="result-msg">Patient is allergic to <strong>${a.allergy?.allergy_name ?? '—'}</strong>. Reaction: ${a.reaction}</div>
    </div>`).join('');

  el.innerHTML = interactionHtml + allergyHtml;
}

async function submitPrescription() {
  const err = document.getElementById('rx-form-error');
  err.textContent = '';

  const appointmentId = parseInt(document.getElementById('rx-appointment')?.value);
  const startDate = document.getElementById('rx-start-date')?.value;
  const endDate   = document.getElementById('rx-end-date')?.value;
  const notes     = document.getElementById('rx-notes')?.value.trim() || null;
  const medicines = readRxMedicineRows();

  if (!appointmentId) { err.textContent = 'Select or create an appointment.'; return; }
  if (!startDate || !endDate) { err.textContent = 'Set a start and end date.'; return; }
  if (!medicines.length) { err.textContent = 'Add at least one medicine.'; return; }
  if (medicines.some(m => !m.medicine_id || !m.dosage || !m.duration_days || !m.dose_time || !m.frequency)) {
    err.textContent = 'Fill in every field for each medicine row.';
    return;
  }

  try {
    const result = await api.createPrescription({
      appointment_id: appointmentId,
      start_date: startDate,
      end_date: endDate,
      notes,
      medicines,
    });

    renderWarningsPanel(
      document.getElementById('rx-warnings'),
      result.warnings?.interactions ?? [],
      result.warnings?.allergies ?? [],
    );

    document.getElementById('rx-medicine-rows').innerHTML = '';
    document.getElementById('rx-notes').value = '';

    const pid = parseInt(document.getElementById('rx-patient')?.value);
    if (pid) await loadRxPrescriptionsForPatient(pid);

    err.textContent = '';
    err.style.color = 'var(--green, #10b981)';
    err.textContent = 'Prescription created successfully.';
  } catch (ex) {
    err.style.color = '';
    err.textContent = ex.message || 'Failed to create prescription.';
  }
}

async function loadRxPrescriptionsForPatient(patientId) {
  const tbody = document.getElementById('rx-list');
  if (!tbody) return;
  let data;
  try {
    data = await api.prescriptions(patientId);
  } catch (ex) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty"><i class="icon" data-lucide="lock"></i>You don't have record access for this patient yet. Request access from the Patients tab.</td></tr>`;
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No prescriptions for this patient yet</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(rx => {
    const meds = (rx.prescriptionmedicine || [])
      .map(pm => `${pm.medicine?.generic_name ?? '—'} (${pm.dosage})`)
      .join(', ');
    const badge = rx.status === 'active' ? 'badge-green' : rx.status === 'cancelled' ? 'badge-red' : 'badge-yellow';
    return `<tr>
      <td>${rx.appointment?.doctor?.full_name ?? '—'}</td>
      <td>${rx.start_date} → ${rx.end_date}</td>
      <td>${meds || '—'}</td>
      <td><span class="badge ${badge}">${rx.status}</span></td>
    </tr>`;
  }).join('');
}

// ── Init
loadRxPatientDropdown();
loadRxMedicineCache();
addRxMedicineRow();
