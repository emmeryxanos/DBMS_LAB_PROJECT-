// ============================================================
//  MedTrack | reports.js
//  Doctor reports: side-effect alerts, recovery concerns,
//  rolling adherence, perfect-adherence patients, disease mix.
// ============================================================

async function loadSideEffectAlerts() {
  const tbody = document.getElementById('side-effect-alerts-list');
  if (!tbody) return;
  const data = await api.reportSideEffectAlerts();

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty"><i class="icon" data-lucide="check-circle"></i>No critical side effects reported</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(s => {
    const badge = s.severity === 'high' ? 'badge-red' : 'badge-yellow';
    return `<tr>
      <td><strong>${s.patient?.full_name ?? '—'}</strong></td>
      <td>${s.medicine?.generic_name ?? '—'} <span style="color:var(--muted)">(${s.medicine?.brand_name ?? '—'})</span></td>
      <td><span class="badge ${badge}">${s.severity}</span></td>
      <td>${new Date(s.reported_at).toLocaleDateString()}</td>
      <td>${s.effect_name}</td>
      <td>${s.notes ?? '—'}</td>
    </tr>`;
  }).join('');
}

async function loadRecoveryConcerns() {
  const el = document.getElementById('recovery-concerns-list');
  if (!el) return;
  const data = await api.reportRecoveryConcerns();

  if (!data?.length) {
    el.innerHTML = '<div class="empty"><i class="icon" data-lucide="check-circle"></i>No recovery concerns detected</div>';
    return;
  }

  el.innerHTML = data.map(c => {
    const badge = c.severity === 'critical' ? 'badge-red' : 'badge-yellow';
    return `<div class="alert-item">
      <div class="alert-dot ${c.severity}"></div>
      <div style="flex:1">
        <div class="alert-msg"><strong>${c.full_name}</strong> — ${c.concern_type}</div>
        <div class="alert-time">${c.detail}</div>
      </div>
      <span class="badge ${badge}">${c.severity}</span>
    </div>`;
  }).join('');
}

async function loadRollingAdherence() {
  const tbody = document.getElementById('rolling-list');
  if (!tbody) return;
  const data = await api.reportRollingAdherence();

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">No dose data yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(r => `<tr>
    <td><strong>${r.full_name}</strong></td>
    <td>${r.date}</td>
    <td>${r.daily_pct}%</td>
    <td>${r.rolling_7day_avg}%</td>
  </tr>`).join('');
}

async function loadPerfectAdherence() {
  const el = document.getElementById('perfect-list');
  if (!el) return;
  const data = await api.reportPerfectAdherence();

  if (!data?.length) {
    el.innerHTML = '<div class="empty">No patients with perfect adherence yet</div>';
    return;
  }

  el.innerHTML = data.map(p => `<div class="dose-row">
    <div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:7px"><i class="icon icon-sm" data-lucide="check-circle" style="color:var(--green)"></i>${p.full_name}</div>
  </div>`).join('');
}

async function loadDiseaseChart() {
  const ctx = document.getElementById('chart-disease');
  if (!ctx) return;
  const data = await api.reportDiseaseDistribution();
  if (!data?.length) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.disease_name),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: ['#5c8de8', '#3fa987', '#c99435', '#e1637a', '#9b7fd4', '#d98249', '#6e62e5', '#4fb8c7'],
        borderWidth: 0,
      }]
    },
    options: { responsive: true, plugins: { legend: { labels: { color: '#e2e8f0' } } } }
  });
}

// ── Init
loadSideEffectAlerts();
loadRecoveryConcerns();
loadRollingAdherence();
loadPerfectAdherence();
loadDiseaseChart();
