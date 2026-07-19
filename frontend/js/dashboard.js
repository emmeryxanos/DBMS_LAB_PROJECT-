// ============================================================
//  MedTrack | dashboard.js — Overview + Patients section
// ============================================================

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Load all stat cards
async function loadStats() {
  const s = await api.stats();
  setText('s-patients',     s.patients);
  setText('s-alerts',       s.alerts);
  setText('s-rx',           s.active_prescriptions);
  setText('s-meds',         s.medicines);
  setText('s-interactions', s.drug_interactions);
  setText('s-adherence',    s.adherence_pct + '%');
  setText('alert-count',         s.alerts);
  setText('alerts-count-badge',  s.alerts);
}

// ── Active alerts panel
async function loadAlerts() {
  const data = await api.alerts();
  const el   = document.getElementById('alerts-list');
  if (!el) return;

  if (!data?.length) {
    el.innerHTML = '<div class="empty">No active alerts 🎉</div>';
    return;
  }

  el.innerHTML = data.map(a => `
    <div class="alert-item">
      <div class="alert-dot ${a.severity}"></div>
      <div style="flex:1">
        <div class="alert-msg">${a.message}</div>
        <div class="alert-time">${new Date(a.triggered_at).toLocaleString()}</div>
      </div>
      <span class="badge ${a.severity==='critical'?'badge-red':a.severity==='high'?'badge-yellow':'badge-blue'}">${a.severity}</span>
    </div>`).join('');
}

// ── Recent dose activity table
async function loadRecentDoses() {
  const data  = await api.recentDoses();
  const tbody = document.getElementById('recent-doses');
  if (!tbody) return;

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">No dose data</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(d => {
    const badge = d.status==='taken'  ? 'badge-green'  :
                  d.status==='missed' ? 'badge-red'    :
                  d.status==='late'   ? 'badge-yellow' : 'badge-blue';
    return `<tr>
      <td><strong>${d.patient?.full_name ?? '—'}</strong></td>
      <td>${d.medicationschedule?.medicine?.generic_name ?? '—'}</td>
      <td><span class="badge ${badge}">${d.status}</span></td>
    </tr>`;
  }).join('');
}

// ── Patient list with adherence + risk
let patientsById = {};

async function loadPatients(search = '') {
  const data  = await api.patients(search);
  const tbody = document.getElementById('patient-list');
  if (!tbody) return;

  patientsById = Object.fromEntries(data.map(p => [p.patient_id, p]));

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">No patients found</td></tr>';
    return;
  }

  tbody.innerHTML = '<tr><td colspan="9" style="color:var(--muted);padding:12px;font-size:12px">Calculating adherence...</td></tr>';

  const rows = await Promise.all(data.map(async p => {
    const age = new Date().getFullYear() - new Date(p.dob).getFullYear();

    const accessStatus = p.access_status ?? null; // null for admin, who sees all patients unscoped
    const accessBadge  = accessStatus === 'granted' ? 'badge-green'
                        : accessStatus === 'pending' ? 'badge-yellow'
                        : accessStatus === 'denied' || accessStatus === 'revoked' ? 'badge-red'
                        : 'badge-blue';
    const accessAction = accessStatus && accessStatus !== 'granted'
      ? `<button class="row-action-btn" onclick="requestPatientAccess(${p.patient_id})">Request Access</button>`
      : '';

    // Clinical detail (adherence/risk) only loads once access has been granted.
    let adhCell, riskCell;
    if (accessStatus === null || accessStatus === 'granted') {
      try {
        const adh    = await api.patientAdherence(p.patient_id);
        const pct    = adh.pct;
        const missed = adh.missed;
        const color  = pct >= 80 ? 'green' : pct >= 60 ? 'yellow' : 'red';
        const riskCls= missed >= 5 ? 'badge-red' : missed >= 2 ? 'badge-yellow' : 'badge-green';
        const riskTxt= missed >= 5 ? 'High Risk' : missed >= 2 ? 'Medium'       : 'Low Risk';
        adhCell  = `<div class="adh-wrap">
            <div class="adh-bar"><div class="adh-fill" style="width:${pct}%;background:var(--${color})"></div></div>
            <span class="adh-pct" style="color:var(--${color})">${pct}%</span>
          </div>`;
        riskCell = `<span class="badge ${riskCls}">${riskTxt}</span>`;
      } catch {
        adhCell = '<span style="color:var(--muted);font-size:12px">—</span>';
        riskCell = '<span style="color:var(--muted);font-size:12px">—</span>';
      }
    } else {
      adhCell  = '<span style="color:var(--muted);font-size:12px">🔒 Locked</span>';
      riskCell = '<span style="color:var(--muted);font-size:12px">🔒 Locked</span>';
    }

    return `<tr>
      <td><strong>${p.full_name}</strong></td>
      <td>${age}</td>
      <td>${p.gender==='M'?'Male':p.gender==='F'?'Female':'Other'}</td>
      <td>${p.blood_group ?? '—'}</td>
      <td>${p.phone}</td>
      <td>${adhCell}</td>
      <td>${riskCell}</td>
      <td>${accessStatus ? `<span class="badge ${accessBadge}">${accessStatus}</span> ${accessAction}` : '—'}</td>
      <td>
        <div class="row-actions">
          <button class="row-action-btn" onclick="openPatientModal(${p.patient_id})">Edit</button>
          <button class="row-action-btn danger" onclick="deletePatientRow(${p.patient_id})">Delete</button>
        </div>
      </td>
    </tr>`;
  }));

  tbody.innerHTML = rows.join('');
}

async function requestPatientAccess(patientId) {
  try {
    await api.requestAccess(patientId);
    loadPatients(document.getElementById('patient-search')?.value ?? '');
  } catch (ex) {
    alert(ex.message || 'Failed to request access.');
  }
}

function searchPatients(val) { loadPatients(val); }

document.getElementById('alert-pill')?.addEventListener('click', () => {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById('section-overview').classList.add('active');
  document.querySelector('.nav-link')?.classList.add('active');
  document.getElementById('page-title').textContent = 'Dashboard';
  setTimeout(() => {
    document.getElementById('alerts-list')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
});

// ── Init
loadStats();
loadAlerts();
loadRecentDoses();
loadPatients();
