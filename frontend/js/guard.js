// ============================================================
//  MedTrack | guard.js
//  Route protection + role-based access control
//  Include as FIRST script after supabase.js on every page
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

  // Already logged in — don't show auth pages
  if (session && isAuthPage) {
    const { data: profile } = await db
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    const role = profile?.role ?? 'patient';
    window.location.replace(role === 'patient' ? '../patient.html' : '../index.html');
    return;
  }

  if (!session) return;

  // Get full profile
  const { data: profile } = await db
    .from('user_profiles')
    .select('role, full_name, linked_id')
    .eq('id', session.user.id)
    .single();

  const role = profile?.role ?? 'patient';
  const name = profile?.full_name ?? session.user.email;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const linkedId = profile?.linked_id ?? null;

  // Role-based page access
  if (role === 'patient' && page.includes('index.html')) {
    window.location.replace('patient.html');
    return;
  }
  if (role === 'doctor' && page.includes('patient.html')) {
    window.location.replace('index.html');
    return;
  }

  // Store globally
  window.CURRENT_USER = { id: session.user.id, email: session.user.email, role, name, initials, linkedId };

  // Render topbar user widget once DOM is ready
  document.addEventListener('DOMContentLoaded', () => renderUserWidget(name, role, initials));
  if (document.readyState !== 'loading') renderUserWidget(name, role, initials);

})();

function renderUserWidget(name, role, initials) {
  const el = document.getElementById('user-widget');
  if (!el) return;
  const roleColor = role === 'doctor' ? '#3b82f6' : role === 'admin' ? '#8b5cf6' : '#10b981';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
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
        <a class="user-menu-item" onclick="handleLogout()">🚪 Sign Out</a>
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
  await db.auth.signOut();
  window.location.replace('auth/login.html');
}