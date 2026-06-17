# Calendrier Éditorial — Winking 247

Outil de planification et de publication Instagram pour les établissements Oetker Collection (APG, CSM, HDCER, BB).

## Stack technique

- **React 18 + Vite** — UI
- **Firebase Firestore** — stockage des posts, config, librairie
- **Firebase Auth** — authentification email/mot de passe
- **Cloudinary** — stockage et CDN des médias
- **Groq (Llama 4)** — génération de captions IA
- **Vercel** — hébergement + fonction serverless (`api/generate.js`)

## Structure du projet

```
src/
├── App.jsx                   # Composant racine, layout desktop/mobile
├── lib/
│   ├── firebase.js           # Init Firebase + exports Firestore/Auth
│   ├── defaults.js           # Constantes par défaut + Contexts React
│   ├── tokens.js             # Design system (couleurs, polices, styles partagés)
│   ├── dates.js              # Utilitaires dates, constantes, statuts
│   └── ai.js                 # Pipeline IA (analyse image → caption)
├── hooks/
│   └── useIsMobile.js        # Détection mobile (breakpoint 768px)
└── components/
    ├── LoginPage.jsx          # Page de connexion Firebase
    ├── Settings.jsx           # Panneau paramètres (4 onglets)
    ├── OpenClosedPanel.jsx    # Statut ouvert/fermé par compte
    ├── Stats.jsx              # Statistiques mensuelles
    ├── MonthlyRecap.jsx       # Récap objectifs vs réel
    ├── ExportButton.jsx       # Export CSV + vue "Prêt à programmer"
    ├── CalendarMonth.jsx      # Grille calendrier avec drag & drop
    ├── LibraryPicker.jsx      # Sélecteur média (multi-sélection + filtre sous-dossier)
    ├── PostEditor.jsx         # Formulaire d'édition de post
    ├── DayView.jsx            # Panneau d'un jour (CRUD posts)
    ├── FeedPreview.jsx        # Simulation grille Instagram
    ├── Archive.jsx            # Historique par mois
    ├── Library.jsx            # Gestion librairie + batch IA
    ├── Publication.jsx        # Vue publication (Manqué + Programmé uniquement)
    └── Guide.jsx              # Guide d'utilisation
```

## Variables d'environnement

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
GROQ_API_KEY=                  # côté serveur (Vercel), non exposé au client
```

## Statuts des posts

| Statut | Couleur | Signification |
|--------|---------|---------------|
| 🟠 Brouillon | Orange | Post créé, non traité |
| 🔵 En cours | Bleu | En cours de rédaction |
| 🟢 Prêt | Vert clair | Caption validée, prêt à programmer |
| 🟩 Programmé | Vert foncé | Programmé dans Meta Business Suite / Later |
| ⚫ Publié | Gris | Publié et archivé |
| 🔴 Manqué | Rouge | Date passée et non publié — alerte automatique |

> Les posts dont la date est dépassée et dont le statut n'est pas "Publié" passent automatiquement en **Manqué** à l'affichage (calcul dynamique, non persisté en base).

## Onglet Publication

Affiche uniquement :
1. **Posts Manqués** — triés du plus récent au plus ancien (à traiter en priorité)
2. **Posts Programmés** — triés du plus proche au plus lointain

Les posts en Brouillon, En cours, Prêt ou Publié n'apparaissent pas dans cet onglet.

## Librairie

- Upload multi-fichiers par compte et sous-dossier
- Filtre par compte puis par sous-dossier (clic = affichage exclusif)
- **Sélection multiple** depuis le picker de media — valider avec "Valider (N)"
- Mode batch : filtre par sous-dossier, groupes d'images → génération IA → placement automatique dans le calendrier

## Lancer en local

```bash
npm install
npm run dev
```

## Déployer sur Vercel

```bash
vercel --prod
```

Ajouter toutes les variables d'environnement dans le dashboard Vercel. `GROQ_API_KEY` doit être côté serveur uniquement (pas de préfixe `VITE_`).
