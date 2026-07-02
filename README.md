# IDENA — Service Communication

Application web de **gestion de projet et de communication** pour le service Communication IDENA. Elle centralise les tâches, les événements (salons), les réseaux sociaux, le stock de supports et la boîte à idées, avec une interface standard (V1) et une interface avancée expérimentale (V2).

**Dépôt :** [github.com/jbcoroyer/project-management-communication](https://github.com/jbcoroyer/project-management-communication)

---

## Vue d'ensemble

| | V1 (interface standard) | V2 (interface avancée) |
|---|---|---|
| **Accès** | Par défaut après connexion | Activable dans **Paramètres → Interface avancée** |
| **URL** | `/dashboard`, `/events`, `/stock`, … | `/v2/*` |
| **Focus** | Kanban, modules métier, simplicité | Vue liste type Monday, IA, automatisations, intake |

La V2 est protégée par un garde d'accès : sans activation dans les paramètres, les routes `/v2/*` redirigent vers l'équivalent V1.

---

## Fonctionnalités

### Tableau de bord & tâches

Disponible en V1 (`/dashboard/*`) et V2 (`/v2/dashboard/*`).

- **Kanban** — colonnes personnalisables, glisser-déposer, sous-tâches, priorités, domaines et marques
- **Ma To-Do List** — tâches personnelles filtrées par assigné
- **Calendrier** — échéances et travail projeté par jour
- **Charge équipe** — répartition de la charge par membre
- **Analytics** — indicateurs de performance et d'avancement
- **Archives** — tâches terminées et archivées
- **Recherche** et barre de commandes (V2 : palette `Cmd+K`)
- **Notifications** in-app et animation de fin de tâche

**Spécifique V2 :**

- **Inbox** — file de notifications et actions rapides
- **Vue liste** — tableau dense type Monday (groupement, édition inline, champs personnalisés)
- **Triage** — qualification des demandes entrantes (intake)
- **Présence** — indicateur des collaborateurs connectés
- **Automatisations** — règles « si… alors… » (création, changement de colonne, échéance dépassée, tâche terminée)
- **Templates de tâches** et ajout rapide
- **Auto-archivage** configurable

### Mon espace (V2)

`/v2/todo` — agenda du jour généré à partir des tâches assignées, avec suggestions IA pour optimiser la journée et accès à l'inbox.

### Planning & capacité (V2)

- **Planning** (`/v2/planning`) — vues semaine, mois, timeline et charge ; détection de conflits
- **Charge d'équipe** (`/v2/capacity`) — heatmap sur 8 semaines, scénarios avec placeholders, suggestions de staffing

### Assistant IA & agents (V2)

`/v2/assistant`

- **Agents contextuels** — synthèse hebdomadaire, tâches en retard, stand-up, tâches sans échéance
- **Recherche en langage naturel** sur les tâches, événements et stock
- **Panneau flottant** contextuel selon la page visitée
- Backend **OpenRouter** si `OPENROUTER_API_KEY` est configurée, sinon repli local déterministe

### Intake & demandes

- **Formulaire public** `/v2/asks` — soumission de demandes au service Communication (titre, description, échéance, budget, priorité, demandeur…)
- **Triage** (`/v2/dashboard/triage`) — accepter, rejeter ou convertir une demande en tâche Kanban
- Suggestion automatique de domaine à partir du texte

### Événements (salons)

V1 : `/events` — V2 : `/v2/events`

- **Hub événementiel** — liste des salons, budget annuel engagé, timeline
- **Fiche événement** — tâches liées, budget, dépenses, documents, réserves stock, run-of-show, jalons, checklist de préparation
- **Kanban événement** — tâches spécifiques au salon
- **RETEX** (V2, `/v2/events/retex`) — post-mortem structuré avec enrichissement IA

### Réseaux sociaux

V1 : `/social` — V2 : `/v2/social`

- Calendrier éditorial (mois, semaine, liste)
- Création et édition de posts (statuts, responsable, marque)
- Conversion d'un post en tâche Kanban en un clic
- Statistiques LinkedIn (followers via API)
- Repurposing IA multi-réseaux (LinkedIn, Instagram, Facebook, X)

### Stock

V1 : `/stock` — V2 : `/v2/stock`

- Inventaire multi-catégories : **impressions**, **PLV**, **goodies**
- Mouvements entrée/sortie, historique, dashboard analytique
- Alertes de seuil avec webhook **Slack** (`SLACK_WEBHOOK_URL`)
- Projets stock et réapprovisionnement
- Regroupement des impressions par espèce (volaille, ruminants, porcs…) et filiale

### Boîte à idées

- **V1** `/ideas` — accessible aussi **sans compte** (soumission publique)
- **V2** `/v2/ideas` — votes, conversion d'une idée en tâche Kanban
- Catégories : matériel, process, communication, autre
- Workflow : Nouvelle → À creuser → Adoptée → Archives
- API publique : `GET/POST /api/public/ideas`

### DAM — bibliothèque d'assets (V2)

`/v2/dam` — centralisation de logos, visuels et templates par marque, avec tags et recherche.

### OKR (V2)

`/v2/okr` — objectifs et résultats clés reliés aux domaines, avec progression calculée depuis les tâches.

### Paramètres & administration

`/settings` (V1) et `/v2/settings` (V2)

- Gestion des **membres d'équipe**, **marques**, **domaines** et **colonnes** Kanban
- Couleurs d'assignation, logo IDENA (`NEXT_PUBLIC_IDENA_MARK_SRC`)
- **Connexion Outlook / Microsoft 365** — synchronisation du travail projeté vers l'agenda personnel
- **Interface avancée V2** — interrupteur d'activation
- **Automatisations** (V2) — configuration des règles et auto-archivage

### Authentification

- Connexion / inscription via **Supabase Auth** (`/login`)
- Profil : nom, poste, photo
- Réinitialisation du mot de passe (`/login/reset-password`)
- Callback OAuth (`/auth/callback`) et protection des routes par middleware

### Intégrations

| Intégration | Usage |
|---|---|
| **Supabase** | Base PostgreSQL, Auth, Storage, Realtime |
| **Microsoft 365 / Outlook** | Sync calendrier (travail projeté → événements Outlook) |
| **OpenRouter** | Synthèses et agents IA (optionnel) |
| **Slack** | Alertes stock sous seuil (optionnel) |
| **Vercel** | Hébergement et déploiement |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | React 19, Tailwind CSS 4, Framer Motion, Lucide |
| Données | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Formulaires | React Hook Form + Zod |
| Kanban / DnD | `@dnd-kit/core` |
| Calendrier | `react-big-calendar`, `date-fns` |
| Graphiques | Recharts |
| Tests | Vitest |
| Déploiement | Vercel |

---

## Installation & développement local

### Prérequis

- Node.js 20+
- Un projet [Supabase](https://supabase.com) configuré

### Étapes

```bash
git clone https://github.com/jbcoroyer/project-management-communication.git
cd project-management-communication
npm install
```

Créez un fichier `.env.local` à la racine :

```env
# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optionnel — logo IDENA personnalisé
NEXT_PUBLIC_IDENA_MARK_SRC=/idena-mark.png

# Optionnel — IA (OpenRouter)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini

# Optionnel — Microsoft 365 / Outlook
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT_ID=common
MS_REDIRECT_URI=
MS_TIMEZONE=Romance Standard Time
MS_OUTLOOK_CATEGORY_NAME=IDENA Planification
MS_OUTLOOK_CATEGORY_COLOR=preset1

# Optionnel — alertes stock Slack
SLACK_WEBHOOK_URL=

# Optionnel — scripts de migration SQL locaux
SUPABASE_DB_PASSWORD=
```

Lancez le serveur de développement :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

### Scripts utiles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm test` | Tests Vitest |
| `npm run db:ideas-public` | Migration boîte à idées publique |
| `npm run db:event-organization` | Migration organisation événements |
| `npm run db:outlook-calendar-sync` | Migration sync Outlook |
| `npm run db:v2-automations-intake` | Migration automatisations & intake V2 |

---

## Déploiement

### Vercel

1. Importer le dépôt GitHub sur [Vercel](https://vercel.com)
2. Configurer les variables d'environnement (voir section ci-dessus)
3. Déployer — Next.js est détecté automatiquement

`NEXT_PUBLIC_APP_URL` est dérivé de `VERCEL_URL` au build si non défini.

#### Outlook 365 sur Vercel

Les variables `MS_*` de `.env.local` ne sont **pas** déployées automatiquement. Copiez-les dans **Vercel → Projet → Settings → Environment Variables** (cible **Production**, et Preview si besoin) :

| Variable | Obligatoire |
|---|---|
| `MS_CLIENT_ID` | Oui |
| `MS_CLIENT_SECRET` | Oui |
| `MS_TENANT_ID` | Recommandé (`common` par défaut) |
| `MS_TIMEZONE` | Optionnel (`Romance Standard Time`) |
| `MS_OUTLOOK_CATEGORY_NAME` | Optionnel (`IDENA Planification`) |
| `MS_OUTLOOK_CATEGORY_COLOR` | Optionnel (`preset1` = orange Outlook) |
| `MS_REDIRECT_URI` | Optionnel — sinon dérivé de l’URL publique |

Dans **Azure Portal → App registrations → API permissions**, ajoutez aussi `MailboxSettings.ReadWrite` (délégué) pour la catégorie colorée, puis **Grant admin consent**. Les utilisateurs déjà connectés doivent **déconnecter puis reconnecter** Outlook pour obtenir la nouvelle permission.

Dans **Azure Portal → App registrations → votre app → Authentication**, ajoutez l’URI de redirection :

`https://<votre-domaine-vercel>/api/outlook/callback`

Puis **redéployez** le projet (un simple ajout de variables ne recharge pas les fonctions déjà déployées).

### Supabase — migrations

Les migrations SQL se trouvent dans `supabase/migrations/` :

| Fichier | Contenu |
|---|---|
| `20260529120000_stock_ideas_public_anon.sql` | Accès public boîte à idées |
| `20260601120000_event_organization.sql` | Organisation événements |
| `20260630120000_outlook_calendar_sync.sql` | Connexions et sync Outlook |
| `20260701120000_v2_automations_intake.sql` | Automatisations et intake V2 |
| `20260702100000_intake_extended_fields.sql` | Champs étendus intake |

Appliquez-les via le SQL Editor Supabase, la CLI `supabase db push`, ou les scripts `npm run db:*` (nécessitent `SUPABASE_DB_PASSWORD` dans `.env.local`).

---

## Structure du projet

```
app/                    # Routes Next.js (App Router)
  api/                  # Routes API (Outlook, IA, stock, idées publiques)
  auth/                 # Callback OAuth Supabase
  dashboard/            # Tableau de bord V1
  events/               # Module événements V1
  ideas/                # Boîte à idées (accès public)
  login/                # Authentification
  settings/             # Paramètres V1
  social/               # Réseaux sociaux V1
  stock/                # Stock V1
  v2/                   # Interface avancée V2
components/             # Composants React (UI, kanban, événements, V2…)
lib/                    # Logique métier, hooks, types, clients Supabase
  server/               # Code serveur (IA, Outlook, webhooks)
  v2/                   # Modules spécifiques V2 (automations, intake, agents…)
supabase/migrations/    # Migrations PostgreSQL
scripts/                # Scripts d'application des migrations
public/                 # Assets statiques
```

---

## Licence

Projet privé — usage interne IDENA.
