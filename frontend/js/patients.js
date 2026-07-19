// ============================================================
//  MedTrack | patients.js
//  Patient create / edit / delete
// ============================================================

function openPatientModal(patientId) {
  const modal = document.getElementById('patient-modal');
  const form  = document.getElementById('patient-form');
  const err   = document.getElementById('patient-form-error');
  if (!modal || !form) return;

  err.textContent = '';
  form.dataset.editingId = '';

  const p = patientId ? patientsById[patientId] : null;

  document.getElementById('patient-modal-title').textContent = p ? 'Edit Patient' : 'Add Patient';
  document.getElementById('pf-full_name').value    = p?.full_name ?? '';
  document.getElementById('pf-dob').value          = p?.dob ?? '';
  document.getElementById('pf-gender').value       = p?.gender ?? '';
  document.getElementById('pf-blood_group').value  = p?.blood_group ?? '';
  document.getElementById('pf-phone').value        = p?.phone ?? '';
  document.getElementById('pf-address').value      = p?.address ?? '';

  if (p) form.dataset.editingId = String(p.patient_id);
  modal.classList.add('active');
}

function closePatientModal() {
  document.getElementById('patient-modal')?.classList.remove('active');
}

// Other sections (e.g. Allergy Conflicts) cache their own patient dropdown —
// keep it in sync whenever the patient list changes here.
function refreshPatientDropdowns() {
  if (typeof loadAllergyPatientDropdown === 'function') loadAllergyPatientDropdown();
}

async function deletePatientRow(patientId) {
  if (!confirm('Delete this patient? This also removes their linked records.')) return;
  await api.deletePatient(patientId);
  loadPatients(document.getElementById('patient-search')?.value ?? '');
  refreshPatientDropdowns();
}

document.getElementById('patient-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('patient-form-error');
  err.textContent = '';

  const body = {
    full_name:   document.getElementById('pf-full_name').value.trim(),
    dob:         document.getElementById('pf-dob').value,
    gender:      document.getElementById('pf-gender').value,
    blood_group: document.getElementById('pf-blood_group').value || null,
    phone:       document.getElementById('pf-phone').value.trim(),
    address:     document.getElementById('pf-address').value.trim() || null,
  };

  if (!body.full_name || !body.dob || !body.gender || !body.phone) {
    err.textContent = 'Full name, date of birth, gender, and phone are required.';
    return;
  }

  const editingId = document.getElementById('patient-form').dataset.editingId;

  try {
    if (editingId) {
      await api.updatePatient(editingId, body);
    } else {
      await api.createPatient(body);
    }
    closePatientModal();
    loadPatients(document.getElementById('patient-search')?.value ?? '');
    refreshPatientDropdowns();
  } catch (ex) {
    err.textContent = ex.message || 'Failed to save patient.';
  }
});
