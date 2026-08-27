/**
 * client-sync.js
 * Synchronise automatiquement un client dans la table `clients` de Supabase.
 * À appeler après chaque insertion réussie dans :
 *  - demandes_sur_mesure (contact.html, plan-detail.html)
 *  - commandes (confirmation.html)
 *
 * Utilise l'email comme clé de correspondance :
 *  - si un client avec cet email existe déjà -> mise à jour du nom/téléphone
 *  - sinon -> création d'une nouvelle fiche client
 *
 * Doit être chargé APRÈS js/supabase.js (dépend de window.supabase / la variable `supabase`).
 */
async function syncClientToDB(nom, email, telephone) {
    if (!email) {
        console.warn('syncClientToDB: email manquant, synchronisation ignorée.');
        return;
    }

    try {
        const { data: existing, error: selectError } = await supabase
            .from('clients')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            const { error: updateError } = await supabase
                .from('clients')
                .update({
                    nom: nom || undefined,
                    telephone: telephone || undefined
                })
                .eq('id', existing.id);

            if (updateError) throw updateError;
        } else {
            const { error: insertError } = await supabase
                .from('clients')
                .insert([{
                    nom: nom || '',
                    email: email,
                    telephone: telephone || ''
                }]);

            if (insertError) throw insertError;
        }
    } catch (err) {
        // On ne bloque jamais le parcours principal (contact, demande, commande)
        // à cause d'un souci de synchronisation client — on log seulement.
        console.error('Erreur syncClientToDB:', err);
    }
}

window.syncClientToDB = syncClientToDB;