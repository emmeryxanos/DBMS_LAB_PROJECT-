// ============================================================
//  MedTrack | appointments.js
//  Doctor-facing appointment request inbox (accept/reject) and
//  upcoming scheduled appointments.
// ============================================================

async function loadAppointmentRequests() {
  const tbody = document.getElementById('appt-requests');
  if (!tbody) return;
  const data = await api.appointments(null, 'requested');

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">No pending appointment requests</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(a => `<tr>
    <td><strong>${a.patient?.full_name ?? '—'}</strong></td>
    <td>${new Date(a.appointment_date).toLocaleString()}</td>
    <td>${a.symptoms ?? '—'}</td>
    <td>
      <div class="row-actions">
        <button class="row-action-btn" onclick="respondToAppointment(${a.appointment_id}, 'accept')">Accept</button>
        <button class="row-action-btn danger" onclick="respondToAppointment(${a.appointment_id}, 'reject')">Reject</button>
      </div>
    </td>
  </tr>`).join('');
}

async function loadScheduledAppointments() {
  const tbody = document.getElementById('appt-scheduled');
  if (!tbody) return;
  const data = await api.appointments(null, 'scheduled');

  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No upcoming appointments</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(a => `<tr>
    <td><strong>${a.patient?.full_name ?? '—'}</strong></td>
    <td>${new Date(a.appointment_date).toLocaleString()}</td>
    <td>${a.symptoms ?? '—'}</td>
    <td><span class="badge badge-blue">${a.status}</span></td>
    <td>
      <button class="row-action-btn" onclick="respondToAppointment(${a.appointment_id}, 'complete')">Mark Completed</button>
    </td>
  </tr>`).join('');
}

async function respondToAppointment(appointmentId, action) {
  if (action === 'accept')   await api.acceptAppointment(appointmentId);
  if (action === 'reject')   await api.rejectAppointment(appointmentId);
  if (action === 'complete') await api.completeAppointment(appointmentId);
  loadAppointmentRequests();
  loadScheduledAppointments();
  if (typeof loadPatients === 'function') loadPatients(document.getElementById('patient-search')?.value ?? '');
}

// ── Init
loadAppointmentRequests();
loadScheduledAppointments();
