# Tuesday — Intégration du logo, de l'animation et du loader

Logo retenu : **piste 01 « Bloc », V1**. Loader retenu : **01 « Empilement »**.
Tout est en SVG + CSS pur, sans librairie d'animation.

---

## 1. Ce que contient le kit

```
tuesday-brand/
├── CURSOR.md                      ← ce fichier
├── components/brand/
│   ├── tuesday-brand.css          ← tokens couleur + toutes les animations
│   ├── TuesdayMark.tsx            ← le symbole (fixe / entrée / boucle)
│   ├── TuesdayLogo.tsx            ← symbole + mot « Tuesday »
│   ├── TuesdayLoader.tsx          ← loader inline + loader de page
│   ├── TuesdaySplash.tsx          ← écran plein écran du 1er chargement
│   └── index.ts
├── app/
│   ├── icon.svg                   ← favicon (s'adapte au mode sombre du navigateur)
│   └── apple-icon.png             ← icône iOS 180 px
├── public/brand/
│   ├── tuesday-mark.svg           ← couleur, fond clair
│   ├── tuesday-mark-dark-bg.svg   ← couleur, fond sombre
│   ├── tuesday-mark-black.svg     ← monochrome noir
│   ├── tuesday-mark-white.svg     ← monochrome blanc
│   ├── tuesday-loader.svg         ← loader animé autonome (utilisable en <img>)
│   ├── icon-192.png / icon-512.png ← PWA / manifest
└── examples/
    ├── app/layout.snippet.tsx     ← police + import CSS
    ├── app/loading.tsx            ← loader de route Next.js
    └── usage.tsx                  ← sidebar, splash, bouton, colonne
```

## 2. Mise en place (5 min)

1. Copier `components/brand/` dans `components/brand/` du projet.
2. Copier `app/icon.svg` et `app/apple-icon.png` dans `app/`.
   **Supprimer** l'ancien `favicon.ico` / ancien logo s'il existe, sinon il prend le dessus.
3. Copier `public/brand/` dans `public/brand/`.
4. Ouvrir Cursor, mode **Agent**, glisser le dossier `components/brand` et ce fichier dans le contexte, puis coller le prompt ci-dessous.

## 3. Prompt à coller dans Cursor

```
Contexte : Tuesday est notre outil de gestion de tâches (Next.js, App Router).
On remplace l'ancien logo par la nouvelle identité. Les composants sont déjà
dans components/brand/ — NE PAS modifier leur géométrie ni leurs couleurs.
Lis CURSOR.md en entier avant de commencer.

Fais, dans cet ordre, en me montrant le diff à chaque étape :

1. Layout racine (app/layout.tsx) :
   - importer "@/components/brand/tuesday-brand.css" une seule fois ;
   - charger Inter Tight 700 via next/font/google avec
     variable "--font-tue-display" et l'ajouter en className sur <html> ;
   - exporter `viewport = { themeColor: "#F6F1EA" }` ;
   - vérifier que app/icon.svg et app/apple-icon.png sont bien servis
     et supprimer tout ancien favicon qui les écraserait.

2. Sidebar : remplacer l'ancien logo (image + texte "Tues"/"day") par
   <TuesdayLogo size={36} intro /> dans un lien vers le tableau de bord.
   Garder le sous-titre "Service Communication · IDENA" en dessous, tel quel.
   Si la sidebar a un état replié, utiliser markOnly quand elle est repliée.
   Le logo doit rester monté entre les navigations (dans le layout), pour que
   l'animation d'entrée ne se joue qu'au chargement complet de la page.

3. Chargement de route : créer app/loading.tsx (et/ou dans le segment
   du dashboard) qui rend <TuesdayPageLoader />.

4. Premier chargement des données : trouver où le dashboard charge les
   tâches / l'utilisateur (hook, Supabase, SWR, React Query…). Monter
   <TuesdaySplash ready={...} /> au plus haut niveau du shell client du
   dashboard, avec ready = true quand les données du premier écran sont là.
   Le splash ne doit apparaître qu'au premier chargement, jamais ensuite.

5. Remplacer TOUS les spinners / textes "Chargement..." existants par
   <TuesdayLoader /> :
   - dans les boutons en cours d'envoi : size={16}, tone adapté au fond
     du bouton ("white" sur le bouton terracotta "Nouvelle tâche") ;
   - dans les colonnes kanban, listes, calendrier : size={24 à 28} ;
   - toujours passer un label explicite ("Enregistrement…",
     "Chargement des tâches…").
   Liste-moi d'abord tous les endroits trouvés avant de modifier.

6. Vérifications (voir §6 de CURSOR.md) puis résumé de ce qui a changé.

Contraintes :
- Pas de nouvelle dépendance (pas de framer-motion, lottie, etc.).
- Ne pas dupliquer le SVG du logo ailleurs : toujours passer par
  TuesdayMark / TuesdayLogo / TuesdayLoader.
- Respecter prefers-reduced-motion (déjà géré par le CSS, ne pas le casser).
- Si le projet n'est pas en Next.js App Router, adapter selon §7.
```

## 4. Les composants en bref

| Composant | Usage | Props utiles |
|---|---|---|
| `<TuesdayMark />` | Symbole seul | `size`, `tone`, `animation: "none" \| "once" \| "loop"`, `title` |
| `<TuesdayLogo />` | Symbole + mot | `size` (hauteur du symbole), `tone`, `intro`, `markOnly` |
| `<TuesdayLoader />` | Loader inline | `size`, `tone`, `label`, `showLabel` |
| `<TuesdayPageLoader />` | Loader de zone / plein écran | `label`, `fullscreen` |
| `<TuesdaySplash />` | 1er chargement de l'app | `ready`, `minDuration` (700), `delay` (150) |

**Tons** : `light` (fond crème/blanc, défaut) · `dark` (fond encre) · `mono` (prend `currentColor`) · `white` (sur terracotta ou photo).

**Tailles recommandées** : favicon 16 · bouton 16 · liste/colonne 24–28 · sidebar 36–40 · page 64 · splash 80.

## 5. Les trois comportements d'animation

| | Quand | Ce qui se passe | Durée |
|---|---|---|---|
| **Entrée** (`once`) | Logo de la sidebar au chargement de la page | Les 3 blocs tombent un à un, le bloc terracotta sort de la barre et se pose avec un léger tassement, puis le mot glisse | ~0,9 s + 0,5 s pour le mot |
| **Loader** (`loop`) | Toute attente | Même chute, maintien, fondu, recommence | 1,8 s par cycle |
| **Mouvement réduit** | Utilisateur avec « réduire les animations » activé | Logo fixe ; le loader pulse doucement en opacité | — |

Règles anti-clignotement déjà intégrées :
- le loader de page n'apparaît qu'**après 150 ms** : un chargement rapide n'affiche rien ;
- le splash, une fois affiché, reste **au moins 700 ms** puis sort en **fondu de 300 ms**.

## 6. Checklist de recette

- [ ] Favicon visible dans l'onglet, en clair **et** en sombre (changer le thème de l'OS).
- [ ] Recharger la page (Cmd+Shift+R) : les blocs tombent dans la sidebar, une seule fois.
- [ ] Naviguer Kanban → Liste → Calendrier : le logo ne rejoue **pas** son animation.
- [ ] Throttler le réseau (DevTools › Network › Slow 4G) : le splash apparaît, l'animation tourne, il sort en fondu.
- [ ] Réseau normal : pas de flash de splash.
- [ ] macOS › Accessibilité › Réduire les animations : plus de chute, le loader pulse.
- [ ] Lecteur d'écran (VoiceOver) : le loader annonce son label.
- [ ] Aucun décalage de mise en page quand le loader apparaît ou disparaît.
- [ ] Bouton « Nouvelle tâche » en envoi : loader blanc de 16 px, bouton désactivé.

## 7. Si le projet n'est pas en Next.js App Router

- **Pages Router** : importer le CSS dans `pages/_app.tsx` ; favicon via `<link rel="icon" href="/brand/tuesday-mark.svg" type="image/svg+xml">` dans `_document.tsx` (copier `app/icon.svg` dans `public/icon.svg` et pointer dessus) ; pas de `loading.tsx` → utiliser `TuesdayPageLoader` dans les états de chargement.
- **Vite / React** : importer le CSS dans `main.tsx` ; favicon dans `index.html` ; police via Google Fonts `<link>` (Inter Tight 700) ou `@fontsource/inter-tight`.
- **Hors React** (email, page statique) : utiliser les SVG de `public/brand/`. `tuesday-loader.svg` s'anime même dans une balise `<img>`.

## 8. Règles d'usage du logo

- **Zone de protection** : un bloc (≈ 27 % de la taille du symbole) tout autour.
- **Taille mini** : 16 px pour le symbole, 20 px de hauteur de symbole pour le logotype complet.
- **Ne pas** : changer les couleurs des blocs, étirer, ajouter une ombre ou un contour, faire tourner, utiliser le symbole terracotta sur fond terracotta (utiliser `tone="white"`).
- Le bloc terracotta est **toujours** en bas, au centre. C'est la tâche qui se pose.

## 9. Tokens

| Token | Valeur | Rôle |
|---|---|---|
| `--tue-ink` | `#1E1A16` | Blocs du haut, texte |
| `--tue-cream` | `#F6F1EA` | Fond de l'app |
| `--tue-paper` | `#FBF8F3` | Cartes / surfaces |
| `--tue-clay` | `#C4532F` | Bloc tâche, accent |
| Police logotype | Inter Tight 700, interlettrage −0,035 em | Mot « Tuesday » |

> Note : le mot « Tuesday » est pour l'instant composé en Inter Tight (texte réel). Une version vectorisée et crénée à la main reste à produire pour les supports print.
