// ============================================================
//  MedTrack | frontend/js/auth.js
//  Handles login, register, logout, password reset
// ============================================================

// ── Toggle password visibility
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector('.icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
}

// ── Password strength checker
function checkStrength(pw) {
  const fill = document.getElementById('strength-fill');
  const text = document.getElementById('strength-text');
  if (!fill || !text) return;

  let score = 0;
  if (pw.length >= 8)              score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))    score++;

  const levels = [
    { pct: '0%',   color: 'transparent', label: 'Enter a password' },
    { pct: '25%',  color: '#ef4444',     label: 'Weak' },
    { pct: '50%',  color: '#f59e0b',     label: 'Fair' },
    { pct: '75%',  color: '#3b82f6',     label: 'Good' },
    { pct: '100%', color: '#10b981',     label: 'Strong' },
  ];
  const lvl = levels[score];
  fill.style.width      = lvl.pct;
  fill.style.background = lvl.color;
  text.textContent      = lvl.label;
  text.style.color      = lvl.color;
}

// ── Show alert helper
function showAlert(type, msg) {
  document.querySelectorAll('.alert').forEach(a => a.classList.remove('show'));
  const el = document.getElementById(`alert-${type}`);
  const msgEl = document.getElementById(`alert-${type}-msg`);
  if (el && msgEl) {
    msgEl.textContent = (typeof msg === 'string' && msg) ? msg : (msg?.message || JSON.stringify(msg) || 'An unexpected error occurred');
    el.classList.add('show');
  }
}

// ── Extract readable message from Supabase error
function errMsg(error) {
  if (!error) return 'An unexpected error occurred';
  if (typeof error.message === 'string' && error.message && error.message !== '{}') return error.message;
  if (error.msg) return error.msg;
  if (error.error_description) return error.error_description;
  return 'Something went wrong. Please try again.';
}

// ── Set button loading state
function setLoading(btnId, textId, loading, defaultText) {
  const btn  = document.getElementById(btnId);
  const text = document.getElementById(textId);
  if (!btn || !text) return;
  btn.disabled = loading;
  text.innerHTML = loading
    ? '<div class="spinner"></div>'
    : defaultText;
}

// ── Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── LOGIN
async function handleLogin() {
  const email      = document.getElementById('email')?.value.trim();
  const password   = document.getElementById('password')?.value;
  const wantedRole = document.querySelector('input[name="login-role"]:checked')?.value ?? 'patient';

  // Validate
  if (!email || !password) { showAlert('error', 'Please fill in all fields.'); return; }
  if (!isValidEmail(email)) { showAlert('error', 'Please enter a valid email address.'); return; }
  if (password.length < 6)  { showAlert('error', 'Password must be at least 6 characters.'); return; }

  setLoading('login-btn', 'login-btn-text', true, 'Sign In');

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    setLoading('login-btn', 'login-btn-text', false, 'Sign In');
    showAlert('error', error.message === 'Invalid login credentials'
      ? 'Incorrect email or password. Please try again.'
      : errMsg(error));
    return;
  }

  // One login can hold multiple roles (e.g. both patient and doctor), but
  // signing in as a specific role must only succeed if the account actually
  // HAS that role — never silently fall back to a different one just
  // because it's the only role present (that would let a patient-only
  // account "log in as doctor" by picking the wrong toggle).
  let roles;
  try {
    roles = await api.myRoles();
  } catch {
    roles = [];
  }

  setLoading('login-btn', 'login-btn-text', false, 'Sign In');

  const match = roles.find(r => r.role === wantedRole);
  // The toggle only offers patient/doctor. A role outside that set (i.e.
  // admin) has no toggle option to match, so it's the one legitimate
  // single-role fallback.
  const nonToggleRole = roles.length === 1 && !['patient', 'doctor'].includes(roles[0].role) ? roles[0] : null;

  let activeRole;
  if (match) {
    activeRole = match.role;
  } else if (nonToggleRole) {
    activeRole = nonToggleRole.role;
  } else {
    await db.auth.signOut();
    showAlert('error', roles.length === 0
      ? 'No profile found for this account. Please contact support.'
      : `This account has no ${wantedRole} identity. Sign in as the role you registered with, then use "Add ${wantedRole === 'doctor' ? 'Doctor' : 'Patient'} Identity" from the account menu to add it.`);
    return;
  }

  sessionStorage.setItem('medtrack-active-role', activeRole);
  showAlert('success', 'Login successful! Redirecting...');

  setTimeout(() => {
    window.location.href = activeRole === 'patient' ? '../patient.html' : '../index.html';
  }, 800);
}

// ── Show/hide role-specific fields on the register form
function onRoleChange() {
  const role = document.querySelector('input[name="role"]:checked')?.value ?? 'patient';
  const patientFields = ['field-dob', 'field-gender', 'field-blood_group', 'field-address'];
  const doctorFields  = ['field-specialization', 'field-license_no', 'field-chamber'];
  const phoneField    = document.getElementById('field-phone');

  patientFields.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = role === 'patient' ? '' : 'none'; });
  doctorFields.forEach(id  => { const el = document.getElementById(id); if (el) el.style.display = role === 'doctor'  ? '' : 'none'; });
  if (phoneField) phoneField.style.display = role === 'admin' ? 'none' : '';
}

// ── REGISTER
async function handleRegister() {
  const fullname  = document.getElementById('fullname')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const password  = document.getElementById('password')?.value;
  const confirm   = document.getElementById('confirm-password')?.value;
  const role      = document.querySelector('input[name="role"]:checked')?.value ?? 'patient';
  const phone     = document.getElementById('phone')?.value.trim();

  // Validate
  if (!fullname || !email || !password || !confirm) {
    showAlert('error', 'Please fill in all fields.'); return;
  }
  if (!isValidEmail(email)) {
    showAlert('error', 'Please enter a valid email address.'); return;
  }
  if (password.length < 8) {
    showAlert('error', 'Password must be at least 8 characters.'); return;
  }
  if (password !== confirm) {
    showAlert('error', 'Passwords do not match.'); return;
  }
  if (role !== 'admin' && !phone) {
    showAlert('error', 'Please enter a phone number.'); return;
  }

  let patientBody = null, doctorBody = null;
  if (role === 'patient') {
    const dob    = document.getElementById('dob')?.value;
    const gender = document.getElementById('gender')?.value;
    if (!dob || !gender) { showAlert('error', 'Please fill in your date of birth and gender.'); return; }
    patientBody = {
      full_name:   fullname,
      phone,
      dob,
      gender,
      blood_group: document.getElementById('blood_group')?.value || null,
      address:     document.getElementById('address')?.value.trim() || null,
    };
  } else if (role === 'doctor') {
    const specialization = document.getElementById('specialization')?.value.trim();
    const licenseNo       = document.getElementById('license_no')?.value.trim();
    if (!specialization || !licenseNo) { showAlert('error', 'Please fill in your specialization and license number.'); return; }
    doctorBody = {
      full_name: fullname,
      phone,
      specialization,
      license_no: licenseNo,
      chamber: document.getElementById('chamber')?.value.trim() || null,
    };
  }

  setLoading('register-btn', 'register-btn-text', true, 'Create Account');

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullname, role }
    }
  });

  if (error) {
    setLoading('register-btn', 'register-btn-text', false, 'Create Account');
    const alreadyRegistered = /already registered|already exists|user_already_exists/i.test(error.message || '');
    showAlert('error', alreadyRegistered
      ? `An account with this email already exists. Sign in instead, and — if you need a ${role} identity too — use "Add ${role === 'doctor' ? 'Doctor' : 'Patient'} Identity" from the account menu after logging in.`
      : errMsg(error));
    return;
  }

  // Profile is auto-created by the handle_new_user() DB trigger.
  // If email confirmation is required, session will be null — the clinical
  // record gets created on first login instead (see login flow).
  if (!data.session) {
    setLoading('register-btn', 'register-btn-text', false, 'Create Account');
    showAlert('success', 'Account created! Check your email to confirm, then log in.');
    return;
  }

  try {
    if (patientBody) await api.registerPatientRecord(patientBody);
    if (doctorBody)  await api.registerDoctorRecord(doctorBody);
  } catch (ex) {
    setLoading('register-btn', 'register-btn-text', false, 'Create Account');
    showAlert('error', ex.message?.includes('409')
      ? 'That phone number or license number is already registered.'
      : (ex.message || 'Account created, but the clinical record could not be created.'));
    return;
  }

  setLoading('register-btn', 'register-btn-text', false, 'Create Account');
  showAlert('success', 'Account created! Redirecting...');
  setTimeout(() => { window.location.href = 'login.html'; }, 1500);
}

// ── FORGOT PASSWORD
async function handleReset() {
  const email = document.getElementById('email')?.value.trim();

  if (!email) { showAlert('error', 'Please enter your email address.'); return; }
  if (!isValidEmail(email)) { showAlert('error', 'Please enter a valid email address.'); return; }

  setLoading('reset-btn', 'reset-btn-text', true, 'Send Reset Link');

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/frontend/auth/login.html'
  });

  setLoading('reset-btn', 'reset-btn-text', false, 'Send Reset Link');

  if (error) { showAlert('error', error.message); return; }

  showAlert('success', 'Reset link sent! Check your inbox and spam folder.');
}

// ── LOGOUT (call from dashboard)
async function handleLogout() {
  await db.auth.signOut();
  window.location.href = 'auth/login.html';
}

// ── Allow Enter key to submit
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('login-btn'))    handleLogin();
  if (document.getElementById('register-btn')) handleRegister();
  if (document.getElementById('reset-btn'))    handleReset();
});