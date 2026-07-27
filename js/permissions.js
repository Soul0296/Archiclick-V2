// ============================================================
// PERMISSIONS.JS — Définition centralisée des rôles Archiclick
// Niveaux d'accès possibles par page : 'full' | 'read' | 'none'
// ============================================================

const ROLE_PERMISSIONS = {
  super_admin: {
    dashboard: 'full', plans: 'full', commandes: 'full', clients: 'full',
    avis: 'full', demandes: 'full', promos: 'full', blog: 'full',
    comptabilite: 'full', taches: 'full', parametres: 'full', admins: 'full'
  },
  admin: {
    dashboard: 'full', plans: 'full', commandes: 'full', clients: 'full',
    avis: 'full', demandes: 'full', promos: 'full', blog: 'full',
    comptabilite: 'full', taches: 'full', parametres: 'full', admins: 'none'
  },
  commercial: {
    dashboard: 'full', plans: 'read', commandes: 'full', clients: 'full',
    avis: 'none', demandes: 'full', promos: 'full', blog: 'none',
    comptabilite: 'none', taches: 'full', parametres: 'none', admins: 'none'
  },
  architecte: {
    dashboard: 'full', plans: 'full', commandes: 'none', clients: 'none',
    avis: 'none', demandes: 'full', promos: 'none', blog: 'none',
    comptabilite: 'none', taches: 'full', parametres: 'none', admins: 'none'
  },
  comptable: {
    dashboard: 'full', plans: 'none', commandes: 'read', clients: 'none',
    avis: 'none', demandes: 'none', promos: 'none', blog: 'none',
    comptabilite: 'full', taches: 'full', parametres: 'none', admins: 'none'
  },
  support: {
    dashboard: 'full', plans: 'none', commandes: 'read', clients: 'full',
    avis: 'full', demandes: 'full', promos: 'none', blog: 'none',
    comptabilite: 'none', taches: 'full', parametres: 'none', admins: 'none'
  },
  marketing: {
    dashboard: 'full', plans: 'none', commandes: 'none', clients: 'none',
    avis: 'read', demandes: 'none', promos: 'full', blog: 'full',
    comptabilite: 'none', taches: 'full', parametres: 'none', admins: 'none'
  },
  technique: {
    dashboard: 'full', plans: 'none', commandes: 'none', clients: 'none',
    avis: 'none', demandes: 'none', promos: 'none', blog: 'none',
    comptabilite: 'none', taches: 'full', parametres: 'full', admins: 'none'
  }
};

// Correspondance clé de page <-> fichier réel + libellé sidebar
const PAGE_LABELS = {
  dashboard:    { file: 'dashboard.html',       label: 'Tableau de bord' },
  plans:        { file: 'db-plans.html',        label: 'Plans' },
  commandes:    { file: 'db-commandes.html',    label: 'Commandes' },
  clients:      { file: 'db-clients.html',      label: 'Clients' },
  avis:         { file: 'db-avis.html',         label: 'Avis clients' },
  demandes:     { file: 'db-demandes.html',     label: 'Demandes sur mesure' },
  promos:       { file: 'db-promos.html',       label: 'Codes Promo' },
  blog:         { file: 'db-blog.html',         label: 'Blog' },
  comptabilite: { file: 'db-comptabilite.html', label: 'Comptabilité' },
  taches:       { file: 'db-taches.html',       label: 'Tâches' },
  parametres:   { file: 'db-parametres.html',   label: 'Paramètres' },
  admins:       { file: 'db-admins.html',       label: 'Gestion des admins' }
};

const ACCESS_ORDER = { none: 0, read: 1, full: 2 };

// Calcule le meilleur niveau d'accès d'un admin sur une page,
// en combinant TOUS ses rôles (le plus permissif l'emporte)
function getAccessLevel(roles, pageKey) {
  let best = 'none';
  (roles || []).forEach(role => {
    const level = (ROLE_PERMISSIONS[role] && ROLE_PERMISSIONS[role][pageKey]) || 'none';
    if (ACCESS_ORDER[level] > ACCESS_ORDER[best]) best = level;
  });
  return best;
}

window.Permissions = { ROLE_PERMISSIONS, PAGE_LABELS, getAccessLevel };