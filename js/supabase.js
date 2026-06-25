// Connexion à Supabase — fichier commun à toutes les pages
const SUPABASE_URL = 'https://hhtkrdklyukhkybutxyb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodGtyZGtseXVraGt5YnV0eHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTg3MTIsImV4cCI6MjA5NjEzNDcxMn0.Hgf5THjrt3465-h5NBF9nurgUXDpXsYJzgFTH4yHM7Q';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);