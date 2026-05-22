# Calendrier Éditorial — OH

Outil de gestion de contenu Instagram pour les établissements Oetker Collection.

---

## Établissements

| Code | Établissement |
|------|---------------|
| APG | L'Apogée Courchevel |
| CSM | Château Saint-Martin & Spa |
| HDCER | Hôtel du Cap-Eden-Roc |
| BB | Beefbar Courchevel |

---

## Stack technique

| Service | Usage | Gratuit ? |
|---------|-------|-----------|
| **Vercel** | Hébergement & API serverless | ✅ Plan Hobby |
| **Firebase Firestore** | Base de données (posts, settings, hashtags) | ✅ Plan Spark |
| **Firebase Auth** | Authentification par email | ✅ Plan Spark |
| **Cloudinary** | Stockage images & vidéos | ✅ Plan Free |
| **Groq** | Génération de captions par IA (Llama 4) | ✅ Plan Free |
| **GitHub** | Versioning & déploiement continu | ✅ |

---

## Variables d'environnement (Vercel)

À configurer dans **Vercel → Settings → Environment Variables** :

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
GROQ_API_KEY
```

---

## Déploiement

1. **Firebase** — Créer un projet, activer Firestore + Auth (email/password), récupérer les clés de config
2. **Cloudinary** — Créer un compte, créer un upload preset "Unsigned" (`oh_gallery`)
3. **Groq** — Créer un compte sur console.groq.com, générer une clé API
4. **GitHub** — Pusher le code sur un repository
5. **Vercel** — Importer le repo GitHub, ajouter les variables d'environnement, déployer

### Règles Firestore (Security Rules)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Fonctionnalités

### Calendrier
- Vue mensuelle avec drag & drop des posts entre les jours
- Génération automatique du planning selon le rythme défini par établissement
- Répartition configurable par type (Reels / Carrousels / Photos)
- Panneau jour (bottom sheet sur mobile)

### Fiches post
- Sélection du compte, type, statut
- Analyse d'image par IA → génération automatique du sujet + caption
- Captions personnalisées par établissement (ton, style, règles propres)
- Exactement 5 hashtags par caption (obligatoires + aléatoires)
- Upload média ou sélection depuis la Librairie
- Duplication vers une autre date / un autre compte

### Librairie
- Organisation par établissement et sous-dossiers (Chambres, Extérieur, F&B…)
- Sélection multiple pour modifier les tags en lot
- Génération batch : grouper des images, générer des posts complets en une fois

### Publication
- Vue complète image + caption par post
- Copie de caption en un clic
- Téléchargement d'image individuel ou groupé
- Modification du statut directement depuis la vue

### Preview
- Simulation du feed Instagram par compte
- Navigation dans les carrousels (images + vidéos)

### Récap & Export
- Statistiques mensuelles par compte
- Export CSV compatible Later / Buffer
- Détection des doublons

---

## Mobile

L'interface s'adapte automatiquement aux écrans < 768px :
- Navigation par tab bar en bas (style iOS)
- Panneau jour en bottom sheet
- Cartes Publication en colonne (image + caption empilées)
- Inputs à 16px pour éviter le zoom iOS

---

## Structure du projet

```
/
├── api/
│   └── generate.js       # Endpoint Vercel (Groq : texte + vision)
├── src/
│   ├── App.jsx            # Application complète (composants + logique)
│   └── main.jsx           # Point d'entrée React
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

## Dépannage

**Écran blanc au chargement**
→ Vérifier la console navigateur (F12). Probablement une variable d'environnement manquante ou une erreur de syntaxe après modification du code.

**La génération de caption ne fonctionne pas**
→ Vérifier `GROQ_API_KEY` dans Vercel → Environment Variables. Redéployer après modification.

**Les images ne s'uploadent pas**
→ Vérifier `VITE_CLOUDINARY_CLOUD_NAME` et `VITE_CLOUDINARY_UPLOAD_PRESET`. S'assurer que le preset est bien en mode "Unsigned" dans Cloudinary.

**Les données ne se sauvegardent pas**
→ Vérifier les règles Firestore (l'utilisateur doit être authentifié). Vérifier `VITE_FIREBASE_PROJECT_ID`.

**Build Vercel échoue**
→ Lire les logs de build dans Vercel → Deployments → View Build Logs. Souvent une erreur de syntaxe JSX ou une variable non définie.
