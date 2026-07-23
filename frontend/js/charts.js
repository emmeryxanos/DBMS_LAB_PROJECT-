// ============================================================
//  MedTrack | charts.js
//  Adherence and recovery charts using Chart.js (doctor view)
// ============================================================

async function loadAdherenceChart(patientId) {
  const data = await api.portalDoseChart(patientId);
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

  const ctx = document.getElementById('adherence-chart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Adherence %',
        data: values,
        borderColor: '#3fa987',
        backgroundColor: 'rgba(63,169,135,0.12)',
        tension: 0.4, fill: true,
        pointBackgroundColor: '#3fa987', pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#e2e8f0' } } },
      scales: {
        x: { ticks: { color: '#8892a4' }, grid: { color: '#2a2d3e' } },
        y: { ticks: { color: '#8892a4', callback: v => v + '%' }, grid: { color: '#2a2d3e' }, min: 0, max: 100 }
      }
    }
  });
}

async function loadRecoveryChart(patientId) {
  const data = await api.portalRecoveryChart(patientId);
  if (!data?.length) return;

  const ctx = document.getElementById('recovery-chart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.log_date),
      datasets: [
        {
          label: 'Recovery Score',
          data: data.map(d => d.recovery_score),
          borderColor: '#5c8de8', backgroundColor: 'rgba(92,141,232,0.12)',
          tension: 0.4, fill: true, pointBackgroundColor: '#5c8de8', pointRadius: 4,
        },
        {
          label: 'Symptom Score',
          data: data.map(d => d.symptom_score),
          borderColor: '#e1637a', backgroundColor: 'rgba(225,99,122,0.12)',
          tension: 0.4, fill: true, pointBackgroundColor: '#e1637a', pointRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#e2e8f0' } } },
      scales: {
        x: { ticks: { color: '#8892a4' }, grid: { color: '#2a2d3e' } },
        y: { ticks: { color: '#8892a4' }, grid: { color: '#2a2d3e' }, min: 0, max: 10 }
      }
    }
  });
}

async function loadDoseStatusChart(patientId) {
  const data = await api.portalDoseChart(patientId);
  if (!data?.length) return;

  const taken  = data.filter(d => d.status === 'taken').length;
  const missed = data.filter(d => d.status === 'missed').length;
  const late   = data.filter(d => d.status === 'late').length;

  const ctx = document.getElementById('status-chart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Taken', 'Missed', 'Late'],
      datasets: [{ data: [taken, missed, late], backgroundColor: ['#3fa987', '#e1637a', '#c99435'], borderWidth: 0 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#e2e8f0' } } }
    }
  });
}
