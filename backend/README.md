# Application de Gestion Véhicules - Backend

## 📋 Description du Projet

Application métier pour la gestion des préparations de véhicules dans une entreprise de nettoyage et convoyage. L'application permet aux préparateurs de pointer leurs heures, suivre leurs tâches et aux administrateurs de gérer les équipes et plannings.

## 🏗️ Architecture du Projet

```
vehicle-prep-backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Configuration MongoDB
│   │   └── email.js             # Configuration emails
│   ├── models/
│   │   ├── User.js              # Modèle utilisateur (admin/préparateur)
│   │   ├── Agency.js            # Modèle agence
│   │   ├── Schedule.js          # Modèle planning
│   │   ├── Timesheet.js         # Modèle pointage
│   │   ├── Vehicle.js           # Modèle véhicule
│   │   └── Preparation.js       # Modèle préparation véhicule
│   ├── routes/
│   │   ├── auth.js              # Authentification
│   │   ├── admin/
│   │   │   ├── users.js         # Gestion utilisateurs
│   │   │   ├── agencies.js      # Gestion agences
│   │   │   ├── schedules.js     # Gestion plannings
│   │   │   └── dashboard.js     # Dashboard admin
│   │   ├── preparateur/
│   │   │   ├── timesheets.js    # Pointages
│   │   │   ├── preparations.js  # Gestion préparations
│   │   │   └── profile.js       # Profil utilisateur
│   │   └── common/
│   │       ├── agencies.js      # Routes communes agences
│   │       └── stats.js         # Statistiques
│   ├── middleware/
│   │   ├── auth.js              # Middleware authentification
│   │   ├── adminAuth.js         # Middleware admin
│   │   ├── upload.js            # Middleware upload photos Cloudinary
│   │   └── validation.js        # Middleware validation données
│   ├── services/
│   │   ├── emailService.js      # Service emails (alertes retard)
│   │   ├── statsService.js      # Service calcul statistiques
│   │   └── cloudinaryService.js # Service upload images Cloudinary
│   ├── jobs/
│   │   └── checkLateTimesheets.js # Job vérification retards
│   ├── utils/
│   │   ├── validators.js        # Fonctions validation
│   │   ├── helpers.js           # Fonctions utilitaires
│   │   └── constants.js         # Constantes application
│   └── app.js                   # Configuration Express
├── uploads/                     # Dossier temporaire (avant upload Cloudinary)
├── tests/
│   ├── unit/                    # Tests unitaires
│   └── integration/             # Tests d'intégration
├── .env.example                 # Variables d'environnement exemple
├── package.json
├── server.js                    # Point d'entrée serveur
└── README.md
```

## 🎯 Fonctionnalités

### 👨‍💼 Côté Admin

- **Gestion utilisateurs** : Créer/modifier/désactiver des préparateurs
- **Gestion agences** : Créer et configurer les agences
- **Planification** : Créer et modifier les plannings des équipes
- **Suivi temps réel** : Dashboard avec vue d'ensemble des pointages
- **Alertes automatiques** : Emails en cas de retard >15min
- **Rapports** : Statistiques de ponctualité et performance

### 👨‍🔧 Côté Préparateur

- **Planning personnel** : Voir son planning de la semaine
- **Pointage** : Pointer début/fin service et pauses
- **Préparations véhicules** : Workflow avec 6 étapes
- **Photos justificatives** : Une photo par étape réalisée
- **Suivi temps** : Chronomètre 30min avec alertes
- **Statistiques** : Voir ses performances personnelles
- **Multi-agences** : Travailler sur plusieurs agences

## 🔧 Technologies Utilisées

- **Backend** : Node.js + Express.js
- **Base de données** : MongoDB + Mongoose
- **Authentification** : JWT
- **Upload photos** : Cloudinary (CDN global + optimisations)
- **Stockage temporaire** : Multer (buffer en mémoire)
- **Emails** : Nodemailer
- **Tâches programmées** : node-cron
- **Validation** : Joi
- **Tests** : Jest + Supertest

## 📊 Modèles de Données

### User (Utilisateur)

```javascript
{
  email: String (unique),
  password: String (hashé),
  firstName: String,
  lastName: String,
  role: Enum ['admin', 'preparateur'],
  agencies: [ObjectId], // Agences assignées
  phone: String,
  isActive: Boolean,
  stats: {
    totalPreparations: Number,
    averageTime: Number,
    onTimeRate: Number
  },
  createdAt: Date,
  lastLogin: Date
}
```

### Agency (Agence)

```javascript
{
  name: String,
  address: String,
  code: String (unique),
  client: String, // SIXT, etc.
  workingHours: {
    start: String, // "08:00"
    end: String    // "18:00"
  },
  isActive: Boolean,
  createdAt: Date
}
```

### Schedule (Planning)

```javascript
{
  user: ObjectId,
  agency: ObjectId,
  date: Date,
  startTime: String, // "08:00"
  endTime: String,   // "17:00"
  breakStart: String, // "12:00" (optionnel)
  breakEnd: String,   // "13:00" (optionnel)
  createdBy: ObjectId, // Admin qui a créé
  createdAt: Date,
  updatedAt: Date
}
```

### Timesheet (Pointage)

```javascript
{
  user: ObjectId,
  agency: ObjectId,
  date: Date,
  startTime: Date,
  endTime: Date,
  breakStart: Date,
  breakEnd: Date,
  schedule: ObjectId, // Référence planning prévu
  delays: {
    startDelay: Number, // minutes de retard
    endDelay: Number,
    breakStartDelay: Number,
    breakEndDelay: Number
  },
  alertsSent: {
    lateStart: Boolean,
    lateEnd: Boolean
  },
  totalWorkedMinutes: Number,
  notes: String,
  createdAt: Date
}
```

### Vehicle (Véhicule)

```javascript
{
  licensePlate: String (unique),
  brand: String,
  model: String,
  agency: ObjectId,
  status: Enum ['available', 'in_preparation', 'ready', 'rented'],
  currentPreparation: ObjectId,
  createdAt: Date
}
```

### Preparation (Préparation)

```javascript
{
  vehicle: ObjectId,
  user: ObjectId,
  agency: ObjectId,
  startTime: Date,
  endTime: Date,
  totalMinutes: Number,
  steps: [{
    type: Enum ['exterior', 'interior', 'fuel', 'tires_fluids', 'special_wash', 'parking'],
    completed: Boolean,
    photoUrl: String,
    completedAt: Date,
    notes: String
  }],
  status: Enum ['in_progress', 'completed', 'cancelled'],
  notes: String, // Notes générales/incidents
  isOnTime: Boolean, // Respect des 30min
  createdAt: Date
}
```

## 🔐 Sécurité

- **Authentification JWT** avec tokens de rafraîchissement
- **Hashage bcrypt** pour les mots de passe
- **Middleware de validation** sur toutes les routes
- **Contrôle d'accès basé sur les rôles** (admin/préparateur)
- **Validation des données** avec Joi
- **Protection contre les injections**

## 📧 Système d'Alertes

### Retards de Pointage

- Vérification automatique toutes les 5 minutes
- Email envoyé aux admins si retard >15min
- Une seule alerte par incident
- Logs des alertes dans la base

### Types d'Alertes

- Retard début de service
- Absence non justifiée
- Dépassement temps de préparation (>30min)

## 📈 Statistiques & Reporting

### Métriques Préparateur

- Nombre de véhicules traités
- Temps moyen par préparation
- Taux de respect des délais (30min)
- Taux de ponctualité

### Métriques Admin

- Vue d'ensemble équipe
- Rapport de ponctualité période
- Performance par agence
- Statistiques de production

## 🚀 Installation et Démarrage

```bash
# Cloner le projet
git clone [url-repo]
cd vehicle-prep-backend

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Démarrer en développement
npm run dev

# Démarrer en production
npm start

# Lancer les tests
npm test
```

## 🌍 Variables d'Environnement

```bash
# Base de données
MONGODB_URI=mongodb://localhost:27017/vehicle-prep-app

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret

# Email (pour alertes)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_EMAILS=admin1@company.com,admin2@company.com

# Cloudinary (upload images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Upload
MAX_FILE_SIZE=5242880

# Serveur
PORT=5000
NODE_ENV=development
```

## 📝 API Routes

### Authentification

- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur connecté
- `POST /api/auth/refresh` - Rafraîchir token

### Admin - Utilisateurs

- `POST /api/admin/users` - Créer préparateur
- `GET /api/admin/users` - Liste préparateurs
- `PUT /api/admin/users/:id` - Modifier préparateur
- `DELETE /api/admin/users/:id` - Désactiver préparateur

### Admin - Agences

- `POST /api/admin/agencies` - Créer agence
- `GET /api/admin/agencies` - Liste agences
- `PUT /api/admin/agencies/:id` - Modifier agence

### Admin - Plannings

- `POST /api/admin/schedules` - Créer/modifier planning
- `GET /api/admin/schedules` - Consulter plannings
- `DELETE /api/admin/schedules/:id` - Supprimer planning

### Admin - Dashboard

- `GET /api/admin/dashboard` - Vue d'ensemble
- `GET /api/admin/punctuality-report` - Rapport ponctualité

### Préparateur - Pointage

- `POST /api/timesheets/clock-in` - Pointer début service
- `POST /api/timesheets/clock-out` - Pointer fin service
- `POST /api/timesheets/break-start` - Début pause
- `POST /api/timesheets/break-end` - Fin pause
- `GET /api/timesheets/today-status` - Statut pointage jour

### Préparateur - Préparations

- `GET /api/preparations/available-vehicles` - Véhicules disponibles
- `POST /api/preparations/start` - Démarrer préparation
- `PUT /api/preparations/:id/step` - Compléter étape
- `POST /api/preparations/:id/complete` - Terminer préparation
- `GET /api/preparations/my-stats` - Mes statistiques

## 🧪 Tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Coverage
npm run test:coverage
```

## 🔄 Prochaines Étapes

1. **Phase 1** : Développement backend complet
2. **Phase 2** : Frontend Next.js pour préparateurs
3. **Phase 3** : Interface admin
4. **Phase 4** : Application mobile (PWA)
5. **Phase 5** : Intégrations tierces (API SIXT, etc.)
