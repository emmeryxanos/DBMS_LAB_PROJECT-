// ============================================================
//  MedTrack | guard.js
//  Route protection + role-based access control.
//  One login can hold multiple roles (patient AND doctor) — the
//  "active role" for this tab is resolved from sessionStorage
//  (set at login) or from the page you're on, and is what
//  api.js sends as the X-Role header on every backend call.
//  Include as FIRST script after api.js on every dashboard page.
// ============================================================

(async function () {
  const { data: { session } } = await db.auth.getSession();
  const page = window.location.pathname;
  const isAuthPage = page.includes('/auth/');

  // Not logged in — send to login
  if (!session && !isAuthPage) {
    window.location.replace('auth/login.html');
    return;
  }

  if (!session || isAuthPage) return;

  let roles;
  try {
    roles = await api.myRoles();
  } catch {
    roles = [];
  }

  if (!roles.length) {
    await db.auth.signOut();
    window.location.replace('auth/login.html');
    return;
  }

  const patientRole = roles.find(r => r.role === 'patient');
  const staffRole    = roles.find(r => r.role === 'doctor' || r.role === 'admin');
  const onPatientPage = page.includes('patient.html');
  const storedRole = sessionStorage.getItem('medtrack-active-role');

  // Prefer whichever role belongs on the page you're actually on (lets the
  // role switcher just be a link to the other dashboard), then the stored
  // preference, then whatever the account has.
  let active;
  if (onPatientPage && patientRole) active = patientRole;
  else if (!onPatientPage && staffRole) active = staffRole;
  else if (storedRole) active = roles.find(r => r.role === storedRole);
  if (!active) active = roles[0];

  // Role-based page access — bounce to the dashboard that matches the
  // resolved role if we ended up somewhere it doesn't belong.
  if (active.role === 'patient' && !onPatientPage) {
    sessionStorage.setItem('medtrack-active-role', active.role);
    window.location.replace('patient.html');
    return;
  }
  if (active.role !== 'patient' && onPatientPage) {
    sessionStorage.setItem('medtrack-active-role', active.role);
    window.location.replace('index.html');
    return;
  }

  sessionStorage.setItem('medtrack-active-role', active.role);

  const name = active.full_name ?? session.user.email;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Store globally
  window.CURRENT_USER = {
    id: session.user.id,
    email: session.user.email,
    role: active.role,
    name,
    initials,
    linkedId: active.linked_id ?? null,
  };
  window.CURRENT_USER_ROLES = roles.map(r => r.role);

  // Render topbar user widget once DOM is ready
  const render = () => renderUserWidget(name, active.role, initials, roles);
  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();

})();

function switchActiveRole(role) {
  sessionStorage.setItem('medtrack-active-role', role);
  window.location.href = role === 'patient' ? 'patient.html' : 'index.html';
}

function openAddRoleModal(role) {
  if (document.getElementById('add-role-modal')) return;
  const name = window.CURRENT_USER?.name ?? '';

  const patientFields = `
    <div class="form-group">
      <label class="form-label">Phone Number</label>
      <input class="form-select" id="ar-phone" placeholder="e.g. 01800000001">
    </div>
    <div class="form-group">
      <label class="form-label">Date of Birth</label>
      <input type="date" class="form-select" id="ar-dob">
    </div>
    <div class="form-group">
      <label class="form-label">Gender</label>
      <select class="form-select" id="ar-gender">
        <option value="">Select...</option>
        <option value="M">Male</option>
        <option value="F">Female</option>
        <option value="O">Other</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Blood Group (optional)</label>
      <select class="form-select" id="ar-blood_group">
        <option value="">Unknown</option>
        <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
        <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Address (optional)</label>
      <input class="form-select" id="ar-address" placeholder="e.g. Mirpur, Dhaka">
    </div>`;

  const doctorFields = `
    <div class="form-group">
      <label class="form-label">Phone Number (optional)</label>
      <input class="form-select" id="ar-phone" placeholder="e.g. 01711000001">
    </div>
    <div class="form-group">
      <label class="form-label">Specialization</label>
      <input class="form-select" id="ar-specialization" placeholder="e.g. Cardiologist">
    </div>
    <div class="form-group">
      <label class="form-label">License Number</label>
      <input class="form-select" id="ar-license_no" placeholder="e.g. LIC-004">
    </div>
    <div class="form-group">
      <label class="form-label">Chamber (optional)</label>
      <input class="form-select" id="ar-chamber" placeholder="e.g. Square Hospital, Room 5">
    </div>`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'add-role-modal';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">Add ${role === 'patient' ? 'Patient' : 'Doctor'} Identity</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px">
        This creates a ${role} record linked to your existing login — no new account needed.
      </p>
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input class="form-select" id="ar-full_name" value="${name}">
      </div>
      ${role === 'patient' ? patientFields : doctorFields}
      <div class="modal-error" id="add-role-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost btn-sm" onclick="closeAddRoleModal()">Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" onclick="submitAddRole('${role}')">Add Identity</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function closeAddRoleModal() {
  document.getElementById('add-role-modal')?.remove();
}

async function submitAddRole(role) {
  const err = document.getElementById('add-role-error');
  const fullName = document.getElementById('ar-full_name')?.value.trim();
  const phone = document.getElementById('ar-phone')?.value.trim();

  try {
    if (role === 'patient') {
      const dob = document.getElementById('ar-dob')?.value;
      const gender = document.getElementById('ar-gender')?.value;
      if (!fullName || !phone || !dob || !gender) { err.textContent = 'Please fill in name, phone, date of birth, and gender.'; return; }
      await api.addPatientRole({
        full_name: fullName,
        phone,
        dob,
        gender,
        blood_group: document.getElementById('ar-blood_group')?.value || null,
        address: document.getElementById('ar-address')?.value.trim() || null,
      });
    } else {
      const specialization = document.getElementById('ar-specialization')?.value.trim();
      const licenseNo = document.getElementById('ar-license_no')?.value.trim();
      if (!fullName || !specialization || !licenseNo) { err.textContent = 'Please fill in name, specialization, and license number.'; return; }
      await api.addDoctorRole({
        full_name: fullName,
        phone: phone || null,
        specialization,
        license_no: licenseNo,
        chamber: document.getElementById('ar-chamber')?.value.trim() || null,
      });
    }
    closeAddRoleModal();
    switchActiveRole(role);
  } catch (ex) {
    err.textContent = ex.message?.includes('409')
      ? 'That phone/license number is already registered, or this account already has that identity.'
      : (ex.message || 'Failed to add identity.');
  }
}

function renderUserWidget(name, role, initials, roles) {
  const el = document.getElementById('user-widget');
  if (!el) return;
  const roleColor = role === 'doctor' ? '#3b82f6' : role === 'admin' ? '#8b5cf6' : '#10b981';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const hasPatient = roles.some(r => r.role === 'patient');
  const hasDoctor  = roles.some(r => r.role === 'doctor');

  let roleMenuItems = '';
  if (role !== 'patient' && hasPatient) {
    roleMenuItems += `<a class="user-menu-item" onclick="switchActiveRole('patient')"><i class="icon" data-lucide="repeat"></i> Switch to Patient</a>`;
  }
  if (role !== 'doctor' && hasDoctor) {
    roleMenuItems += `<a class="user-menu-item" onclick="switchActiveRole('doctor')"><i class="icon" data-lucide="repeat"></i> Switch to Doctor</a>`;
  }
  if (!hasPatient) {
    roleMenuItems += `<a class="user-menu-item" onclick="openAddRoleModal('patient')"><i class="icon" data-lucide="user-plus"></i> Add Patient Identity</a>`;
  }
  if (!hasDoctor && role !== 'admin') {
    roleMenuItems += `<a class="user-menu-item" onclick="openAddRoleModal('doctor')"><i class="icon" data-lucide="user-plus"></i> Add Doctor Identity</a>`;
  }

  el.innerHTML = `
    <div class="user-menu-wrap">
      <div class="user-avatar" style="background:${roleColor}" onclick="toggleUserMenu()">
        ${initials}
      </div>
      <div class="user-menu" id="user-menu">
        <div class="user-menu-header">
          <div class="user-menu-avatar" style="background:${roleColor}">${initials}</div>
          <div>
            <div class="user-menu-name">${name}</div>
            <div class="user-menu-role" style="color:${roleColor}">${roleLabel}</div>
          </div>
        </div>
        <div class="user-menu-divider"></div>
        ${roleMenuItems}
        ${roleMenuItems ? '<div class="user-menu-divider"></div>' : ''}
        <a class="user-menu-item" onclick="handleLogout()"><i class="icon" data-lucide="log-out"></i> Sign Out</a>
      </div>
    </div>`;
}

function toggleUserMenu() {
  document.getElementById('user-menu')?.classList.toggle('show');
}

// Close menu on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.user-menu-wrap')) {
    document.getElementById('user-menu')?.classList.remove('show');
  }
});

async function handleLogout() {
  sessionStorage.removeItem('medtrack-active-role');
  await db.auth.signOut();
  window.location.replace('auth/login.html');
}
