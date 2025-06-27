# 📱 Frontend Next.js Mobile - Application Préparations Véhicules

## 🎯 Vue d'Ensemble

Application mobile-first développée en Next.js pour les préparateurs de véhicules SIXT. Interface optimisée pour smartphones (Android/iOS) permettant la gestion complète des pointages et préparations de véhicules avec workflow photo.

## 🏗️ Architecture Technique

### Stack Technologique

- **Framework** : Next.js 14 (App Router)
- **TypeScript** : Pour la robustesse du code
- **Styling** : Tailwind CSS + Shadcn/UI
- **State Management** : Zustand
- **HTTP Client** : Axios avec intercepteurs JWT
- **PWA** : Support offline et installation
- **Camera** : API native + compression client
- **Notifications** : Push notifications web

### Structure du Projet

```
vehicle-prep-mobile/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── profile/
│   │   ├── preparations/
│   │   ├── timesheets/
│   │   └── layout.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn)
│   ├── auth/
│   ├── dashboard/
│   ├── preparations/
│   ├── timesheets/
│   └── shared/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── stores/
│   └── types/
├── hooks/
│   ├── useAuth.ts
│   ├── useCamera.ts
│   └── usePreparation.ts
└── public/
    ├── icons/
    ├── manifest.json
    └── sw.js
```

## 📱 Pages & Fonctionnalités

### 🔐 Authentification (`/login`)

- **Connexion** : Email/mot de passe
- **Validation** : Formulaire sécurisé
- **Auto-login** : Token persistant
- **Redirection** : Vers dashboard après connexion

### 🏠 Dashboard (`/dashboard`)

- **Statut du jour** : Pointage actuel, temps travaillé
- **Préparation en cours** : Carte avec progression temps réel
- **Actions rapides** : Boutons pointer/démarrer préparation
- **Statistiques semaine** : Résumé performances
- **Notifications** : Alertes et informations importantes

### ⏰ Pointage (`/timesheets`)

- **Statut actuel** : Arrivé/parti, pause en cours
- **Actions de pointage** : 4 boutons (arrivée/départ/pause début/fin)
- **Sélection agence** : Dropdown des agences assignées
- **Planning du jour** : Horaires prévus vs réels
- **Historique** : Liste pointages avec filtres date/agence

### 🚗 Préparations (`/preparations`)

#### Page Principale

- **Nouvelle préparation** : Bouton CTA principal
- **Préparation active** : Interface workflow si en cours
- **Historique** : Liste préparations avec recherche par plaque
- **Statistiques** : Performances personnelles

#### Démarrage Préparation (`/preparations/new`)

- **Sélection agence** : Dropdown avec agence par défaut du planning
- **Saisie véhicule** :
  - Plaque d'immatriculation (validation format)
  - Marque (liste prédéfinie + saisie libre)
  - Modèle (saisie libre)
  - Couleur (optionnel)
  - Année (optionnel)
  - État général (dropdown)
- **Notes** : Commentaires optionnels
- **Validation** : Vérification données + démarrage

#### Workflow Préparation (`/preparations/[id]`)

- **Header fixe** : Véhicule, chrono 30min, progression
- **6 Étapes obligatoires** :
  1. 🚗 Préparation extérieure
  2. 🪑 Préparation intérieure
  3. ⛽ Mise à niveau essence
  4. 🛞 Pression pneus + lave-glace
  5. 🧽 Lavage spécial
  6. 🅿️ Stationnement

- **Interface étape** :
  - Photo obligatoire (caméra native)
  - Preview et validation photo
  - Notes optionnelles
  - Validation étape

- **Incidents** : Bouton signaler problème avec photo
- **Finalisation** : Résumé complet + validation finale

### 👤 Profil (`/profile`)

- **Informations** : Nom, email, agences assignées
- **Statistiques** : Graphiques performances détaillées
- **Planning semaine** : Vue calendaire des créneaux
- **Badges** : Système gamification (ponctualité, rapidité, etc.)
- **Paramètres** : Thème, notifications, déconnexion

## 🎨 Design System

### Principes Mobile-First

- **Écrans** : Optimisé 375px-428px (iPhone/Android)
- **Touch targets** : Minimum 44px pour navigation tactile
- **Navigation** : Bottom tabs pour usage une main
- **Dark mode** : Support thème sombre automatique
- **Accessibilité** : Contraste WCAG AA, labels ARIA

### Palette de Couleurs

```css
:root {
  --primary: #2563eb; /* Bleu SIXT */
  --secondary: #10b981; /* Vert validation */
  --warning: #f59e0b; /* Orange alertes */
  --error: #ef4444; /* Rouge erreurs */
  --background: #ffffff;
  --surface: #f8fafc;
  --text-primary: #1e293b;
}

[data-theme="dark"] {
  --background: #0f172a;
  --surface: #1e293b;
  --text-primary: #f1f5f9;
}
```

### Composants Clés

- **BottomNavigation** : 4 onglets principaux
- **ActionButton** : Boutons d'action larges et visibles
- **PhotoCapture** : Interface caméra optimisée mobile
- **ProgressBar** : Indicateur visuel workflow
- **StepCard** : Carte étape avec photo et validation
- **Toast** : Notifications non-intrusives

## 🔄 Gestion d'État (Zustand)

### AuthStore

```typescript
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

### TimesheetStore

```typescript
interface TimesheetStore {
  todayStatus: TimesheetStatus | null;
  clockIn: (agencyId: string) => Promise<void>;
  clockOut: (agencyId: string, notes?: string) => Promise<void>;
  startBreak: (agencyId: string) => Promise<void>;
  endBreak: (agencyId: string) => Promise<void>;
}
```

### PreparationStore

```typescript
interface PreparationStore {
  currentPreparation: Preparation | null;
  userAgencies: Agency[];
  startPreparation: (data: VehicleData) => Promise<void>;
  completeStep: (stepType: string, photo: File) => Promise<void>;
  completePreparation: () => Promise<void>;
  addIssue: (type: string, description: string, photo?: File) => Promise<void>;
}
```

## 📱 Fonctionnalités Natives

### PWA (Progressive Web App)

- **Installation** : Ajout écran d'accueil Android/iOS
- **Offline** : Cache données essentielles + interface
- **Notifications** : Push web pour alertes importantes
- **Icons** : Icônes adaptatives toutes résolutions

### Caméra & Photos

- **Capture native** : getUserMedia avec fallback
- **Compression** : Réduction automatique qualité/taille
- **Formats** : JPEG optimisé pour upload Cloudinary
- **Preview** : Aperçu avant validation
- **Retry** : Reprendre photo si nécessaire

### Performance

- **Code splitting** : Chargement par route
- **Image optimization** : Next.js Image component
- **Bundle size** : <500KB initial, <1MB total
- **Lazy loading** : Composants et données
- **Service Worker** : Cache intelligent

## 🔌 Intégration Backend

### API Endpoints Utilisées

```typescript
// Authentification
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout

// Pointages
GET /api/timesheets/today-status
POST /api/timesheets/clock-in
POST /api/timesheets/clock-out
POST /api/timesheets/break-start
POST /api/timesheets/break-end
GET /api/timesheets/history

// Préparations
GET /api/preparations/user-agencies
POST /api/preparations/start
GET /api/preparations/current
PUT /api/preparations/:id/step
POST /api/preparations/:id/complete
POST /api/preparations/:id/issue
GET /api/preparations/history
GET /api/preparations/my-stats

// Profil
GET /api/profile/dashboard
GET /api/profile/schedule/week
GET /api/profile/performance
```

### Types TypeScript

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "preparateur";
  agencies: Agency[];
  stats: UserStats;
}

interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
}

interface Preparation {
  id: string;
  vehicle: Vehicle;
  agency: Agency;
  startTime: Date;
  endTime?: Date;
  status: "in_progress" | "completed" | "cancelled";
  steps: PreparationStep[];
  progress: number;
  currentDuration: number;
  isOnTime?: boolean;
}

interface PreparationStep {
  type: string;
  label: string;
  completed: boolean;
  photoUrl?: string;
  completedAt?: Date;
  notes?: string;
}
```

## 🧪 Tests & Qualité

### Stratégie de Tests

- **Unit Tests** : Jest + React Testing Library
- **E2E Tests** : Playwright workflows critiques
- **Visual Testing** : Storybook + Chromatic
- **Device Testing** : iOS Safari + Android Chrome

### Performance Monitoring

- **Core Web Vitals** : LCP, FID, CLS
- **Bundle Analysis** : webpack-bundle-analyzer
- **Lighthouse CI** : Score >90 mobile
- **Sentry** : Error tracking et performance

## 🚀 Installation & Développement

### Prérequis

```bash
Node.js >= 18
npm ou yarn
```

### Installation

```bash
# Cloner le projet frontend
git clone [url] vehicle-prep-mobile
cd vehicle-prep-mobile

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local avec l'URL backend
```

### Variables d'Environnement

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME="Vehicle Prep"

# PWA
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_key

# Sentry (optionnel)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Scripts de Développement

```bash
# Développement
npm run dev

# Build production
npm run build

# Démarrer production
npm start

# Tests
npm test
npm run test:e2e

# Linting
npm run lint
npm run type-check
```

## 📊 Métriques & Analytics

### Métriques Business

- **Adoption** : Taux installation PWA
- **Engagement** : Sessions/jour, durée moyenne
- **Efficiency** : Temps moyen pointage/préparation
- **Quality** : Taux completion workflow

### Monitoring Technique

- **Performance** : Core Web Vitals, bundle size
- **Erreurs** : Crash rate, API failures
- **Usage** : Features les plus utilisées
- **Offline** : Fréquence mode hors-ligne

---

## ✅ Compatibilité Backend

### 🎯 **Fonctionnalités 100% Supportées**

✅ **Authentification**

- Login/logout ← `POST /api/auth/login`
- Refresh token ← `GET /api/auth/me`
- Gestion JWT ← Middleware `auth` complet

✅ **Pointages**

- Clock in/out ← `POST /api/timesheets/clock-in|out`
- Gestion pauses ← `POST /api/timesheets/break-start|end`
- Statut du jour ← `GET /api/timesheets/today-status`
- Historique ← `GET /api/timesheets/history`

✅ **Préparations**

- Création avec véhicule ← `POST /api/preparations/start` (nouveau schéma)
- Workflow 6 étapes ← `PUT /api/preparations/:id/step`
- Upload photos ← Middleware `uploadPreparationPhoto`
- Finalisation ← `POST /api/preparations/:id/complete`
- Incidents ← `POST /api/preparations/:id/issue`

✅ **Agences & Flexibilité**

- Agences utilisateur ← `GET /api/preparations/user-agencies` (nouvelle route)
- Changement agence facturation ← Support dans `startWithVehicle`
- Agence par défaut du planning ← Logique dans backend

✅ **Données Riches**

- Profil complet ← `GET /api/profile/dashboard`
- Statistiques ← `GET /api/preparations/my-stats`
- Historique véhicule ← `GET /api/preparations/vehicle-history/:plate`

### 🔧 **Ce qui nécessite les nouvelles routes**

1. **Route agences utilisateur** : `GET /api/preparations/user-agencies`
2. **Validation véhicule intégré** : Schéma `startWithVehicle`
3. **Upload middleware** : Déjà présent et fonctionnel

### 🎯 **Conclusion**

**Le backend supporte à 100% toutes les fonctionnalités prévues pour le frontend !** 🚀

Les seules additions nécessaires sont :

- ✅ Nouvelle route `/api/preparations/user-agencies` (fournie)
- ✅ Nouveau schéma de validation (fourni)
- ✅ Route historique par plaque (fournie)

**Le frontend Next.js peut être développé immédiatement avec l'architecture backend actuelle !** 💪

---

## 🎯 Prochaines Étapes

1. **Setup projet Next.js** avec structure recommandée
2. **Configuration PWA** et service worker
3. **Développement MVP** : Auth + Dashboard + Pointage basique
4. **Workflow préparations** avec caméra et upload photos
5. **Tests dispositifs** réels iOS/Android
6. **Optimisations performance** et bundle size
7. **Déploiement production** avec CI/CD

**Le développement peut commencer immédiatement !** 🚀
