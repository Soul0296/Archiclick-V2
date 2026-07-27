// ============================================================
// AUTH-GUARD.JS — À inclure sur CHAQUE page admin, après
// supabase.js et permissions.js.
// Vérifie la session, charge l'admin + ses rôles, contrôle
// l'accès à la page courante, et adapte la sidebar.
// Déclenche l'événement "adminReady" une fois prêt.
// ============================================================

window.ADMIN = null;

(async function initAuthGuard() {
  // 1. Session active ?
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // 2. Récupération de l'admin + ses rôles
  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, email, nom, roles')
    .eq('email', session.user.email)
    .maybeSingle();

  if (error || !admin || !admin.roles || admin.roles.length === 0) {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
    return;
  }

  // 3. Expose l'admin courant globalement, avec une méthode d'accès pratique
  window.ADMIN = admin;
  window.ADMIN.access = (pageKey) => Permissions.getAccessLevel(admin.roles, pageKey);
  window.ADMIN.hasAnyAccess = () =>
    Object.keys(Permissions.PAGE_LABELS).some(key => window.ADMIN.access(key) !== 'none');

  // 4. Contrôle d'accès à la page courante
  const currentFile = window.location.pathname.split('/').pop();
  const currentPageKey = Object.keys(Permissions.PAGE_LABELS)
    .find(key => Permissions.PAGE_LABELS[key].file === currentFile);

  if (currentPageKey && window.ADMIN.access(currentPageKey) === 'none') {
    const fallbackKey = Object.keys(Permissions.PAGE_LABELS)
      .find(key => window.ADMIN.access(key) !== 'none');

    window.location.href = fallbackKey ? Permissions.PAGE_LABELS[fallbackKey].file : 'login.html';
    return;
  }

  // 5. Masque les liens de la sidebar vers lesquels l'admin n'a pas accès
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    const key = link.dataset.page;
    if (window.ADMIN.access(key) === 'none') {
      link.style.display = 'none';
    }
  });

  // 6. Déconnexion commune
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // 7. Signale aux scripts de la page que tout est prêt
  document.dispatchEvent(new CustomEvent('adminReady'));
})();