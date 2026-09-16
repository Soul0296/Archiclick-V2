// Connexion à Supabase — fichier commun à toutes les pages
// Protégé contre une éventuelle double exécution du script sur la même page
if (typeof window.__supabaseClient === 'undefined') {
  const SUPABASE_URL = 'https://hhtkrdklyukhkybutxyb.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodGtyZGtseXVraGt5YnV0eHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTg3MTIsImV4cCI6MjA5NjEzNDcxMn0.Hgf5THjrt3465-h5NBF9nurgUXDpXsYJzgFTH4yHM7Q';

  // "storage: sessionStorage" : la connexion n'est gardée que le temps où le
  // navigateur reste ouvert. Dès que le navigateur est complètement fermé,
  // cette mémoire est vidée automatiquement — au retour, le mot de passe
  // sera redemandé. Naviguer entre les pages du dashboard, ou rafraîchir
  // une page, ne déconnecte pas : seule la fermeture complète du navigateur
  // le fait.
  window.__supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.sessionStorage
    }
  });
}

var supabase = window.__supabaseClient;