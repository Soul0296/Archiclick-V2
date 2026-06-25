# Plan de Correction - Archiclick V2
## Vers une architecture production-ready

---

## 1. Problématiques critiques identifiées

| # | Problème | Sévérité | Fichier concerné |
|---|----------|----------|------------------|
| 1 | Clé Supabase anon exposée en clair | **CRITIQUE** | `js/supabase.js` |
| 2 | Logique métier (filtres, prix, promo) côté client | **CRITIQUE** | Toutes les pages `.html` |
| 3 | Panier en `localStorage` = manipulable + volatile | **HAUTE** | `panier.html`, `plan-detail.html` |
| 4 | EmailJS côté client = clé exposée + spoofable | **HAUTE** | `plan-detail.html` |
| 5 | Pas de système d'authentification | **HAUTE** | Pages admin, compte |
| 6 | Pas de CSRF / validation serveur | **MOYENNE** | Formulaires |
| 7 | Mix CSS (Tailwind + custom + variables) | **FAIBLE** | `style.css`, `<style>` inline |

---

## 2. Architecture cible recommandée

```
┌─────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                              │
│                    (Browser / Mobile)                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Vercel /    │  │  Supabase    │  │  MTN / Orange Money  │  │
│  │  Netlify     │  │  (Backend)   │  │  (Paiement)          │  │
│  │  (Frontend)  │  │              │  │                      │  │
│  │              │  │  • Auth      │  │  • API marchand      │  │
│  │  Next.js 14  │  │  • Database  │  │  • Webhook           │  │
│  │  (App Router)│  │  • Storage   │  │  • Confirmation      │  │
│  │  • SSR/SSG   │  │  • Edge Fn   │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Supabase    │  │  Resend /    │  │  Edge Functions      │  │
│  │  Auth        │  │  SendGrid    │  │  Supabase            │  │
│  │  (JWT +      │  │  (Emails     │  │  (Logique métier)    │  │
│  │  OAuth)      │  │  serveur)    │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Phases de migration

### Phase 1 : Sécurisation immédiate (1-2 semaines)

#### 3.1 RLS Supabase (priorité MAX)
```sql
-- Exemple de règles RLS strictes pour la table `plans`
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (actif = true);

-- Tout le reste est bloqué par défaut
-- Seules les Edge Functions ou les roles "service_role" peuvent écrire
```

**Tables à sécuriser :** `plans`, `promos`, `commandes`, `clients`, `paiements`

#### 3.2 Masquer la clé Supabase
```javascript
// AVANT (js/supabase.js) - DANGEREUX
const SUPABASE_KEY = 'eyJhb...';

// APRÈS : Appel via Edge Function
const { data, error } = await fetch('/api/plans', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwt_token}` }
});
```

#### 3.3 Supprimer EmailJS côté client
```javascript
// AVANT (plan-detail.html ligne 771)
await emailjs.send('service_kwivmyg', 'template_k6pwdx9', {...});

// APRÈS : Edge Function
// POST /api/customize-request
// → La fonction envoie l'email via Resend
// → L'API key Resend n'est jamais exposée
```

---

### Phase 2 : Refonte front-end (2-3 semaines)

#### 2.1 Migration vers Next.js 14 (App Router)

| Page actuelle | Route Next.js | Type |
|---------------|---------------|------|
| `index.html` | `app/page.tsx` | SSG |
| `catalogue.html` | `app/catalogue/page.tsx` | SSR (filtres via URL) |
| `plan-detail.html` | `app/plan/[id]/page.tsx` | SSG + ISR |
| `panier.html` | `app/panier/page.tsx` | Client Component |
| `admin/*.html` | `app/admin/(dashboard)/page.tsx` | Route Group protégée |

#### 2.2 Server Actions pour les mutations
```typescript
// app/actions/panier.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export async function addToCart(planId: string, options: Options) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // Stocker en cookie temporaire (panier invité)
    // OU rediriger vers login
    return { error: 'AUTH_REQUIRED' };
  }
  
  const { data, error } = await supabase
    .from('panier')
    .upsert({ user_id: user.id, plan_id: planId, options })
    .select();
    
  return { data, error };
}
```

#### 2.3 Supabase Auth pour le login
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Toujours publique, mais RLS protège
);
```

```typescript
// middleware.ts - Protection routes admin
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

### Phase 3 : Paiement sécurisé (1-2 semaines)

#### 3.1 Architecture paiement Mobile Money
```
Utilisateur
    │
    ▼
[Choisit plan + options] → POST /api/initier-paiement
    │                        (Server Action : calcule prix, 
    │                         crée commande en statut "en_attente")
    ▼
[Redirection MTN/Orange API] → Paiement externe
    │
    ▼
[Webhook MTN/Orange] → POST /api/webhook/paiement
    │                    (Edge Function : valide la commande,
    │                     envoie email confirmation, 
    │                     génère lien de téléchargement)
    ▼
[Confirmation] → Page success + lien de téléchargement
```

#### 3.2 Table commandes
```sql
CREATE TABLE commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plan_id UUID REFERENCES plans(id),
  options JSONB,
  prix_total INTEGER NOT NULL,
  status VARCHAR(20) CHECK (status IN ('en_attente','paye','livre','annule')),
  transaction_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paye_at TIMESTAMPTZ
);
```

---

### Phase 4 : Optimisation & monitoring (1 semaine)

| Tâche | Outil | Bénéfice |
|-------|-------|----------|
| Analytics | Vercel Analytics / Plausible | Comprendre le trafic |
| Monitoring erreurs | Sentry | Catch les erreurs client/serveur |
| Logs | Supabase Logs / Logtail | Audit trail |
| Cache | Next.js ISR + Redis | Performance catalogue |
| Images | Next.js `<Image>` | Optimisation auto, WebP |
| SEO | `next-seo` | Sitemap, robots, meta auto |

---

## 4. Checklist migration

- [ ] **Jour 1-2** : Activer RLS sur toutes les tables, tester les lectures
- [ ] **Jour 3-5** : Créer projet Next.js, migrer la home page (SSG)
- [ ] **Jour 6-10** : Migrer catalogue + fiches plans (SSR + ISR)
- [ ] **Jour 11-14** : Implémenter Supabase Auth (login/register/middleware)
- [ ] **Jour 15-18** : Migrer panier en Server Actions + table `panier` DB
- [ ] **Jour 19-22** : Edge Function pour email personnalisation (remplace EmailJS)
- [ ] **Jour 23-26** : Intégration MTN/Orange Money + webhook
- [ ] **Jour 27-30** : Pages admin protégées + dashboard
- [ ] **Jour 31-35** : Tests E2E (Playwright), déploiement staging
- [ ] **Jour 36** : Go production

---

## 5. Coût estimé (infrastructure)

| Service | Plan | Coût mensuel |
|---------|------|-------------|
| Vercel (hébergement) | Pro | ~$20 |
| Supabase | Pro | ~$25 |
| Resend (emails) | Free tier (3000/jour) | $0 |
| Sentry | Developer | $0 |
| MTN/Orange API | Selon volume | Variable |
| **Total fixe** | | **~$45/mois** |

---

## 6. Fichiers à créer (structure Next.js cible)

```
archiclick-v3/
├── app/
│   ├── page.tsx                    # Home (SSG)
│   ├── layout.tsx                  # Root layout + providers
│   ├── globals.css                 # Tailwind + variables
│   ├── catalogue/
│   │   └── page.tsx                # Catalogue (SSR)
│   ├── plan/
│   │   └── [id]/
│   │       └── page.tsx            # Fiche plan (SSG + ISR)
│   ├── panier/
│   │   └── page.tsx                # Panier (Client)
│   ├── compte/
│   │   └── page.tsx                # Espace client
│   ├── admin/
│   │   ├── layout.tsx              # Layout admin protégé
│   │   ├── page.tsx                # Dashboard
│   │   ├── plans/
│   │   ├── commandes/
│   │   └── ...
│   ├── api/
│   │   ├── initier-paiement/
│   │   └── webhook/
│   │       └── paiement/
│   └── login/
│       └── page.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server client
│   ├── actions/
│   │   ├── panier.ts               # Server Actions
│   │   └── commandes.ts
│   └── utils/
│       └── formatPrice.ts
│
├── components/
│   ├── ui/                         # Boutons, inputs, cartes
│   ├── layout/                     # Navbar, footer, drawer
│   ├── plan/                       # Galerie, options, prix
│   └── admin/                      # Tables, graphs, forms
│
├── types/
│   └── index.ts                    # Types TypeScript
│
├── public/
│   └── images/
│
├── supabase/
│   └── migrations/                 # SQL migrations
│
├── .env.local                      # Variables (NEVER commit)
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 7. Ressources utiles

- **Supabase Auth + Next.js** : https://supabase.com/docs/guides/auth/server-side/nextjs
- **Edge Functions** : https://supabase.com/docs/guides/functions
- **RLS** : https://supabase.com/docs/guides/auth/row-level-security
- **Next.js App Router** : https://nextjs.org/docs/app
- **Resend (emails)** : https://resend.com/docs
- **MTN MoMo API** : https://momodeveloper.mtn.com/

---

*Document généré le : Juin 2025*
*Version : 1.0*
