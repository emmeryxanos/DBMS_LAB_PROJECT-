// ============================================================
//  MedTrack | risk.js
//  Patient risk classification + recovery/adherence correlation
// ============================================================

async function loadRiskList() {
  const tbody = document.getElementById('risk-list');
  if (!tbody) return;
  const data = await api.reportRisk();

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No patients with dose data yet</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(r => {
    const color   = r.pct >= 80 ? 'green' : r.pct >= 60 ? 'yellow' : 'red';
    const riskCls = r.risk_level === 'High Risk' ? 'badge-red' : r.risk_level === 'Medium Risk' ? 'badge-yellow' : 'badge-green';
    return `<tr>
      <td><strong>${r.full_name}</strong></td>
      <td>
        <div class="adh-wrap">
          <div class="adh-bar"><div class="adh-fill" style="width:${r.pct}%;background:var(--${color})"></div></div>
          <span class="adh-pct" style="color:var(--${color})">${r.pct}%</span>
        </div>
      </td>
      <td>${r.taken}</td>
      <td>${r.missed}</td>
      <td>${r.late}</td>
      <td><span class="badge ${riskCls}">${r.risk_level}</span></td>
    </tr>`;
  }).join('');
}

async function loadCorrelationChart() {
  const ctx = document.getElementById('chart-correlation');
  if (!ctx) return;
  const data = (await api.reportRisk()).filter(r => r.avg_recovery != null);
  if (!data.length) return;

  new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Patients (Adherence % vs Avg Recovery Score)',
        data: data.map(r => ({ x: r.pct, y: r.avg_recovery, label: r.full_name })),
        backgroundColor: '#3b82f6',
        pointRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e2e8f0' } },
        tooltip: { callbacks: { label: (c) => `${c.raw.label}: ${c.raw.x}% adherence, ${c.raw.y}/10 recovery` } },
      },
      scales: {
        x: { title: { display: true, text: 'Adherence %', color: '#8892a4' }, ticks: { color: '#8892a4' }, grid: { color: '#2a2d3e' }, min: 0, max: 100 },
        y: { title: { display: true, text: 'Avg Recovery Score', color: '#8892a4' }, ticks: { color: '#8892a4' }, grid: { color: '#2a2d3e' }, min: 0, max: 10 },
      }
    }
  });
}

// ── Init
loadRiskList();
loadCorrelationChart();
