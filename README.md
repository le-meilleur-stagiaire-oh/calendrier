# Calendrier Éditorial — Guide de déploiement

## Ce que contient ce projet

Un outil de gestion des réseaux sociaux pour 4 comptes Instagram :
- **APG** — L'Apogée Courchevel
- **CSM** — Château Saint-Martin & Spa
- **HDCER** — Hôtel du Cap-Eden-Roc
- **BB** — Beefbar Courchevel

Fonctionnalités : calendrier mensuel, vue semaine, génération automatique de captions par IA, banque de hashtags, récap mensuel, export, preview du feed, archive, duplication de posts, gestion des médias.

---

## Déploiement sur Vercel — Pas à pas

### Pré-requis

- Un compte GitHub (gratuit) — https://github.com
- Un compte Vercel (gratuit) — https://vercel.com
- Une clé API Anthropic — https://console.anthropic.com

### Étape 1 : Obtenir une clé API Gemini (gratuit)

1. Allez sur https://aistudio.google.com/apikey
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key"
4. Copiez la clé (elle commence par `AIza...`)
5. Gardez-la quelque part, vous en aurez besoin à l'étape 5

> C'est 100% gratuit. Le quota gratuit (15 requêtes/minute) est largement suffisant pour vos besoins.

### Étape 2 : Mettre le code sur GitHub

1. Allez sur https://github.com et connectez-vous
2. Cliquez sur le bouton "+" en haut à droite, puis "New repository"
3. Nom : `calendrier-editorial`
4. Laissez en "Public" ou mettez en "Private" (les deux marchent)
5. Cliquez "Create repository"
6. Sur la page du repo vide, cliquez "uploading an existing file"
7. Glissez-déposez TOUS les fichiers de ce dossier :
   - `package.json`
   - `vite.config.js`
   - `vercel.json`
   - `index.html`
   - `.gitignore`
   - Le dossier `src/` (avec `main.jsx` et `App.jsx`)
   - Le dossier `api/` (avec `generate.js`)
8. Cliquez "Commit changes"

> IMPORTANT : ne mettez PAS le fichier `.env.example` ni votre clé API sur GitHub.

### Étape 3 : Créer un compte Vercel

1. Allez sur https://vercel.com
2. Cliquez "Sign Up"
3. Choisissez "Continue with GitHub"
4. Autorisez Vercel à accéder à votre GitHub

### Étape 4 : Déployer le projet

1. Sur Vercel, cliquez "Add New" → "Project"
2. Vous verrez votre repo `calendrier-editorial` — cliquez "Import"
3. Framework Preset : Vercel devrait détecter "Vite" automatiquement
4. Cliquez "Deploy"
5. Attendez 1-2 minutes que le build se termine

### Étape 5 : Configurer la clé API

1. Sur Vercel, allez dans votre projet
2. Cliquez sur "Settings" (en haut)
3. Dans le menu à gauche, cliquez "Environment Variables"
4. Ajoutez une variable :
   - Name : `GEMINI_API_KEY`
   - Value : collez votre clé `AIza...`
   - Environment : cochez les 3 (Production, Preview, Development)
5. Cliquez "Save"
6. Retournez dans "Deployments" et cliquez "Redeploy" sur le dernier déploiement

### Étape 6 : C'est en ligne !

Vercel vous donne une URL du type :
```
https://calendrier-editorial.vercel.app
```

Partagez cette URL avec votre collègue. Vous pouvez y accéder depuis n'importe quel appareil.

---

## Utilisation quotidienne

### Jour 1 — Planification
1. Ouvrez l'URL
2. Passez chaque hôtel en "Ouvert" ou "Fermé" selon la saison
3. Cliquez sur un jour du calendrier, puis sur une semaine
4. Ajoutez vos posts : compte, type, sujet
5. La caption se génère automatiquement
6. Ajoutez les crédits et les liens médias Google Drive

### Jour 2 — Programmation
1. Allez dans l'onglet "Récap"
2. Vérifiez que chaque compte a le bon nombre de posts
3. Cliquez "Exporter toutes les captions du mois"
4. Ouvrez Meta Business Suite (business.facebook.com)
5. Pour chaque post : importez le média, collez la caption, programmez

---

## En cas de problème

- **La génération de caption ne marche pas** : vérifiez que la clé API Gemini est bien configurée dans Vercel (Settings → Environment Variables → `GEMINI_API_KEY`) et que vous avez redéployé après l'ajout.
- **L'URL ne marche pas** : vérifiez que le déploiement est bien terminé (vert) dans Vercel → Deployments.
- **Les données sont perdues** : les données sont sauvegardées dans le navigateur (localStorage). Si vous changez de navigateur ou videz le cache, les données sont perdues. Pensez à exporter régulièrement.

---

## Personnalisation

Pour modifier les hashtags, les comptes ou les couleurs, éditez le fichier `src/App.jsx` :
- `ACCOUNTS` : liste des comptes (nom, couleur)
- `HASHTAG_BANK` : banques de hashtags par compte
- `BEST_TIMES` : horaires de publication suggérés
