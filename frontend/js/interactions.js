// ============================================================
//  MedTrack | interactions.js
//  Drug interaction checker + allergy conflict checker
// ============================================================

// ── Load medicine dropdowns
async function loadMedicineDropdowns() {
  const data = await api.medicines();

  const opts = `<option value="">Select medicine...</option>` +
    data.map(m => `<option value="${m.medicine_id}">${m.generic_name} (${m.brand_name ?? '—'})</option>`).join('');

  const d1 = document.getElementById('drug1');
  const d2 = document.getElementById('drug2');
  const am = document.getElementById('allergy-medicine');
  if (d1) d1.innerHTML = opts;
  if (d2) d2.innerHTML = opts;
  if (am) am.innerHTML = opts;
}

// ── Load patient dropdown for allergy checker (any patient with an appointment —
//    this endpoint isn't access-gated, it's just a pre-prescribing safety check)
async function loadAllergyPatientDropdown() {
  const data = await api.patients();
  const sel = document.getElementById('allergy-patient');
  if (sel) sel.innerHTML = `<option value="">Select patient...</option>` +
    data.map(p => `<option value="${p.patient_id}">${p.full_name}</option>`).join('');
}

// ── Load patient dropdown for "Add Allergy to Patient" — must be scoped to
//    patients the doctor currently has GRANTED record access to, since the
//    backend rejects writes to a patient's clinical record otherwise.
async function loadGrantedPatientDropdown() {
  const newSel = document.getElementById('new-allergy-patient');
  if (!newSel) return;

  if (window.CURRENT_USER?.role === 'admin') {
    const data = await api.patients();
    newSel.innerHTML = `<option value="">Select patient...</option>` +
      data.map(p => `<option value="${p.patient_id}">${p.full_name}</option>`).join('');
    return;
  }

  const data = await api.getGrantedPatients();
  if (!data?.length) {
    newSel.innerHTML = `<option value="">No patients have granted you access yet</option>`;
    return;
  }
  newSel.innerHTML = `<option value="">Select patient...</option>` +
    data.map(g => `<option value="${g.patient.patient_id}">${g.patient.full_name}</option>`).join('');
}

// ── Load allergy catalog dropdown (for attaching an existing allergy)
async function loadAllergyCatalogDropdown() {
  const data = await api.allergyCatalog();
  const sel  = document.getElementById('new-allergy-existing');
  if (!sel) return;
  sel.innerHTML = `<option value="">Select allergy...</option>` +
    data.map(a => `<option value="${a.allergy_id}">${a.allergy_name}</option>`).join('');
}

// ── Check drug interaction
async function checkInteraction() {
  const m1 = parseInt(document.getElementById('drug1')?.value);
  const m2 = parseInt(document.getElementById('drug2')?.value);
  const el = document.getElementById('interaction-result');
  if (!el) return;

  if (!m1 || !m2) {
    el.innerHTML = `<div class="result-warning"><div class="result-title"><i class="icon" data-lucide="alert-triangle"></i>Select both medicines first</div></div>`;
    return;
  }
  if (m1 === m2) {
    el.innerHTML = `<div class="result-warning"><div class="result-title"><i class="icon" data-lucide="alert-triangle"></i>Please select two different medicines</div></div>`;
    return;
  }

  el.innerHTML = `<div style="color:var(--muted);font-size:13px">Checking...</div>`;

  const data = await api.checkInteraction(m1, m2);

  if (!data?.length) {
    el.innerHTML = `
      <div class="result-safe">
        <div class="result-title"><i class="icon" data-lucide="check-circle"></i>No Known Interaction</div>
        <div class="result-msg">These two medicines can be safely prescribed together based on current records.</div>
      </div>`;
    return;
  }

  const i   = data[0];
  const cls = i.severity === 'severe'   ? 'result-danger'  :
              i.severity === 'moderate' ? 'result-warning' : 'result-safe';
  const icon= i.severity === 'severe'   ? 'siren' :
              i.severity === 'moderate' ? 'alert-triangle' : 'info';

  el.innerHTML = `
    <div class="${cls}">
      <div class="result-title"><i class="icon" data-lucide="${icon}"></i>${i.severity.toUpperCase()} Interaction Detected</div>
      <div class="result-msg">${i.warning_message}</div>
    </div>`;
}

// ── Load all known interactions table
async function loadAllInteractions() {
  const data  = await api.interactions();
  const tbody = document.getElementById('interactions-list');
  if (!tbody) return;

  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No drug interactions recorded yet</td></tr>`;
    return;
  }

  const meds   = await api.medicines();
  const medMap = Object.fromEntries(meds.map(m => [m.medicine_id, m.generic_name]));

  tbody.innerHTML = data.map(i => {
    const badge = i.severity === 'severe'   ? 'badge-red'    :
                  i.severity === 'moderate' ? 'badge-yellow' : 'badge-green';
    return `<tr>
      <td><strong>${medMap[i.medicine1_id] ?? '—'}</strong></td>
      <td><strong>${medMap[i.medicine2_id] ?? '—'}</strong></td>
      <td><span class="badge ${badge}">${i.severity}</span></td>
      <td>${i.warning_message}</td>
    </tr>`;
  }).join('');
}

// ── Check allergy conflict
async function checkAllergyConflict() {
  const pid = parseInt(document.getElementById('allergy-patient')?.value);
  const mid = parseInt(document.getElementById('allergy-medicine')?.value);
  const el  = document.getElementById('allergy-result');
  if (!el) return;

  if (!pid || !mid) {
    el.innerHTML = `<div class="result-warning"><div class="result-title"><i class="icon" data-lucide="alert-triangle"></i>Select both patient and medicine</div></div>`;
    return;
  }

  el.innerHTML = `<div style="color:var(--muted);font-size:13px">Checking...</div>`;

  const conflicts = await api.checkAllergy(pid, mid);

  if (!conflicts?.length) {
    el.innerHTML = `
      <div class="result-safe">
        <div class="result-title"><i class="icon" data-lucide="check-circle"></i>Safe to Prescribe</div>
        <div class="result-msg">No allergy conflicts found between this patient and this medicine.</div>
      </div>`;
    return;
  }

  const c   = conflicts[0];
  const cls = c.severity === 'severe' ? 'result-danger' : 'result-warning';
  el.innerHTML = `
    <div class="${cls}">
      <div class="result-title"><i class="icon" data-lucide="siren"></i>ALLERGY CONFLICT DETECTED</div>
      <div class="result-msg">
        Patient is allergic to <strong>${c.allergy?.allergy_name ?? '—'}</strong>.<br>
        Severity: <strong>${c.severity}</strong> — Reaction: ${c.reaction}
      </div>
    </div>`;
}

// ── Load allergy records table
async function loadAllergyList() {
  const data  = await api.allergies();
  const tbody = document.getElementById('allergy-list');
  if (!tbody) return;

  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No allergy records found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(a => {
    const badge = a.status === 'confirmed' ? 'badge-green' : a.status === 'rejected' ? 'badge-red' : 'badge-yellow';
    return `<tr>
      <td><strong>${a.patient?.full_name ?? '—'}</strong></td>
      <td><span class="badge badge-orange">${a.allergy?.allergy_name ?? '—'}</span></td>
      <td><span class="badge ${badge}">${a.status}</span></td>
      <td>${a.noted_date ?? '—'}</td>
      <td>
        <button class="row-action-btn danger" onclick="removeAllergyFromPatient(${a.patient_id}, ${a.allergy_id})">Remove</button>
      </td>
    </tr>`;
  }).join('');
}

// ── Pending patient-reported allergies awaiting doctor confirmation
async function loadPendingAllergies() {
  const tbody = document.getElementById('pending-allergy-list');
  if (!tbody) return;
  const data = await api.pendingAllergies();

  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No pending reports</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(a => `<tr>
    <td><strong>${a.patient?.full_name ?? '—'}</strong></td>
    <td><span class="badge badge-orange">${a.allergy?.allergy_name ?? '—'}</span></td>
    <td>${a.noted_date ?? '—'} (${a.reported_by})</td>
    <td>
      <div class="row-actions">
        <button class="row-action-btn" onclick="respondToAllergyReport(${a.patient_id}, ${a.allergy_id}, 'confirm')">Confirm</button>
        <button class="row-action-btn danger" onclick="respondToAllergyReport(${a.patient_id}, ${a.allergy_id}, 'reject')">Reject</button>
      </div>
    </td>
  </tr>`).join('');
}

async function respondToAllergyReport(patientId, allergyId, action) {
  if (action === 'confirm') await api.confirmPatientAllergy(patientId, allergyId);
  else await api.rejectPatientAllergy(patientId, allergyId);
  loadPendingAllergies();
  loadAllergyList();
}

// ── Add allergy to patient (existing lookup or new allergy name)
async function addAllergyToPatient() {
  const pid      = parseInt(document.getElementById('new-allergy-patient')?.value);
  const allergyId= document.getElementById('new-allergy-existing')?.value;
  const newName  = document.getElementById('new-allergy-name')?.value.trim();
  const err      = document.getElementById('add-allergy-error');
  if (!err) return;
  err.textContent = '';

  if (!pid) { err.textContent = 'Select a patient.'; return; }
  if (!allergyId && !newName) { err.textContent = 'Pick an existing allergy or enter a new one.'; return; }

  const body = {
    patient_id: pid,
    allergy_id: allergyId ? parseInt(allergyId) : null,
    new_allergy_name: allergyId ? null : newName,
  };

  try {
    await api.addPatientAllergy(pid, body);
    document.getElementById('new-allergy-existing').value = '';
    document.getElementById('new-allergy-name').value = '';
    await loadAllergyCatalogDropdown();
    await loadAllergyList();
  } catch (ex) {
    err.textContent = ex.message?.includes('403')
      ? "You no longer have access to this patient's record — access may have been revoked."
      : (ex.message || 'Failed to add allergy.');
  }
}

// ── Remove allergy from patient
async function removeAllergyFromPatient(patientId, allergyId) {
  if (!confirm('Remove this allergy record?')) return;
  await api.removePatientAllergy(patientId, allergyId);
  loadAllergyList();
}

// ── Init
loadMedicineDropdowns();
loadAllergyPatientDropdown();
loadGrantedPatientDropdown();
loadAllergyCatalogDropdown();
loadAllInteractions();
loadAllergyList();
loadPendingAllergies();
