// ============================================================
//  MedTrack | patient_reports.js
//  Doctor dashboard: PDF/JPG test reports uploaded by patients.
// ============================================================

async function loadPatientReports() {
  const tbody = document.getElementById('patient-reports-list');
  if (!tbody) return;
  const data = await api.reportPatientReports();

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty"><i class="icon" data-lucide="file-text"></i>No patient reports uploaded yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(r => `<tr>
    <td><strong>${r.full_name}</strong></td>
    <td>${r.file_name}</td>
    <td>${r.file_type.toUpperCase()}</td>
    <td>${new Date(r.uploaded_at).toLocaleDateString()}</td>
    <td>${r.url ? `<a href="${r.url}" target="_blank" rel="noopener">View</a>` : '—'}</td>
  </tr>`).join('');
}

// ── Init
loadPatientReports();
