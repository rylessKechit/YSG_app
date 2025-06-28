# 📚 Documentation Backend - Admin App Vehicle Prep

## 🏗️ Structure du Backend

```
backend/src/
├── routes/admin/
│   ├── dashboard/
│   │   ├── dashboard.js      ✅ Vue d'ensemble globale
│   │   ├── kpis.js          ✅ KPIs temps réel
│   │   ├── charts.js        ✅ Données graphiques
│   │   └── alerts.js        ✅ Alertes et notifications
│   ├── users/
│   │   ├── users.js         ✅ CRUD utilisateurs
│   │   ├── bulk-actions.js  ✅ Actions en masse
│   │   └── profile-complete.js ✅ Profils détaillés
│   ├── schedules/
│   │   ├── schedules.js     ✅ CRUD plannings
│   │   ├── calendar.js      ✅ Vue calendaire
│   │   ├── templates.js     ✅ Templates de planning
│   │   └── conflicts.js     ✅ Détection conflits
│   ├── agencies.js          ✅ Gestion agences
│   ├── reports.js           ✅ Rapports et exports
│   └── settings.js          ✅ Configuration système
└── models/
    ├── User.js              ✅ Modèle utilisateur
    ├── Agency.js            ✅ Modèle agence
    ├── Schedule.js          ✅ Modèle planning
    ├── Timesheet.js         ✅ Modèle pointage
    ├── Preparation.js       ✅ Modèle préparation
    └── Vehicle.js           ✅ Modèle véhicule
```

---

## 🎯 Dashboard & Analytics

### 📊 Vue d'ensemble globale

```http
GET /api/admin/dashboard/overview
```

**Retourne :** Métriques globales quotidiennes et alertes prioritaires

### 📈 KPIs temps réel

```http
GET /api/admin/dashboard/kpis?period=today|week|month&agencies[]=123
```

**Retourne :**

- Préparateurs (total, actifs, présents, en retard)
- Ponctualité globale et par agence
- Préparations (volume, temps moyen, retards)
- Objectifs vs réalisé

### 📊 Données pour graphiques

```http
GET /api/admin/dashboard/charts?type=timeline|ponctualite|distribution&period=7d
```

**Retourne :**

- Timeline des préparations par heure
- Ponctualité par agence (barres)
- Distribution des temps de préparation
- Heatmap des retards

### 🚨 Alertes et notifications

```http
GET /api/admin/dashboard/alerts
```

**Retourne :**

- Retards en cours (temps réel)
- Préparations dépassées (>30min)
- Alertes système et absences
- Véhicules problématiques

---

## 👥 Gestion Utilisateurs

### 📋 Liste des utilisateurs

```http
GET /api/admin/users?search=jean&agence=123&statut=active&page=1
```

**Filtres :** Recherche, agence, statut, performance, pagination

### 👤 Profil utilisateur complet

```http
GET /api/admin/users/profiles/{id}?period=month&includeHistory=true
```

**Retourne :**

- Statistiques détaillées (ponctualité, performance)
- Évolution des performances (graphiques)
- Historique d'activité
- Plannings futurs
- Badges et recommandations

### ⚡ Actions en masse

```http
POST /api/admin/users/bulk-actions
```

**Body :**

```json
{
  "action": "activate|deactivate|change_agency|export",
  "userIds": ["id1", "id2"],
  "params": {
    "newAgencyId": "123",
    "format": "excel",
    "notify": true
  }
}
```

### ✉️ Vérification email

```http
POST /api/admin/users/check-email
```

**Body :**

```json
{
  "email": "test@example.com",
  "excludeUserId": "123"
}
```

**Retourne :** Disponibilité email et utilisateur en conflit si applicable

### 👤 CRUD utilisateurs

```http
POST /api/admin/users          # Créer
GET /api/admin/users/{id}      # Lire
PUT /api/admin/users/{id}      # Modifier
DELETE /api/admin/users/{id}   # Désactiver
```

---

## 📅 Gestion Plannings

### 📆 Vue calendaire

```http
GET /api/admin/schedules/calendar?month=2024-01&agencies[]=123&users[]=456
```

**Retourne :**

- Structure calendaire par semaines/jours
- Plannings organisés par jour
- Métadonnées (couverture, conflits, heures totales)
- Détection automatique de conflits

### 📝 CRUD plannings

```http
GET /api/admin/schedules        # Liste avec filtres
POST /api/admin/schedules       # Créer/modifier
GET /api/admin/schedules/{id}   # Détails
PUT /api/admin/schedules/{id}   # Modifier
DELETE /api/admin/schedules/{id} # Supprimer
```

### ⚡ Création en masse

```http
POST /api/admin/schedules/bulk-create
```

**Body :**

```json
{
  "template": {
    "startTime": "08:00",
    "endTime": "17:00",
    "breakStart": "12:00",
    "breakEnd": "13:00"
  },
  "assignments": [
    {
      "userId": "123",
      "agencyId": "456",
      "dates": ["2024-01-15", "2024-01-16"]
    }
  ],
  "options": {
    "skipConflicts": true,
    "notifyUsers": false
  }
}
```

### 🔧 Templates de planning

```http
GET /api/admin/schedules/templates                    # Liste
POST /api/admin/schedules/templates                   # Créer
PUT /api/admin/schedules/templates/{id}               # Modifier
DELETE /api/admin/schedules/templates/{id}            # Supprimer
POST /api/admin/schedules/templates/{id}/duplicate    # Dupliquer
POST /api/admin/schedules/apply-template              # Appliquer
```

**Templates inclus :**

- Planning Standard (8h-17h)
- Équipe Matin (6h-14h)
- Équipe Après-midi (14h-22h)
- Weekend (9h-16h)

### ⚠️ Détection de conflits

```http
GET /api/admin/schedules/conflicts?severity=critical&includeResolutions=true
```

**Détecte :**

- **Double booking** : Même personne, même créneau
- **Chevauchements** : Horaires qui se superposent
- **Surcharge** : >35h par semaine
- **Sous-couverture** : Agences mal couvertes
- **Conflits pause** : Pauses trop courtes/mal placées

### 🔨 Résolution de conflits

```http
POST /api/admin/schedules/conflicts/resolve
```

**Body :**

```json
{
  "conflictIds": ["conflict1", "conflict2"],
  "resolutionType": "auto|manual|postpone",
  "parameters": {}
}
```

---

## 🏢 Gestion Agences

### 📋 Liste des agences

```http
GET /api/admin/agencies?includeStats=true
```

**Retourne :** Agences avec statistiques optionnelles

### 🏢 CRUD agences

```http
POST /api/admin/agencies        # Créer
GET /api/admin/agencies/{id}    # Détails
PUT /api/admin/agencies/{id}    # Modifier
DELETE /api/admin/agencies/{id} # Désactiver
```

---

## 📊 Rapports & Analytics

### 📈 Rapport ponctualité

```http
GET /api/admin/reports/punctuality?startDate=2024-01-01&endDate=2024-01-31&agencies[]=123
```

**Retourne :**

- Taux de ponctualité global et par agence
- Évolution dans le temps
- Top performers et utilisateurs à améliorer
- Détails par utilisateur (si includeDetails=true)

### 🎯 Rapport performance

```http
GET /api/admin/reports/performance?period=month&includeComparison=true
```

**Retourne :**

- Temps moyens de préparation
- Évolution des performances
- Comparaison objectifs vs réalisé
- Analyse par agence et utilisateur

### 📤 Export de rapports

```http
POST /api/admin/reports/export
```

**Body :**

```json
{
  "type": "ponctualite|performance|planning|custom",
  "format": "pdf|excel|csv",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "filters": {
    "agencies": ["123"],
    "users": ["user1"],
    "includeGraphiques": true
  },
  "delivery": {
    "method": "download|email",
    "recipients": ["admin@company.com"]
  }
}
```

### 📅 Rapports programmés

```http
GET /api/admin/reports/scheduled                # Liste
POST /api/admin/reports/scheduled               # Créer
PUT /api/admin/reports/scheduled/{id}           # Modifier
DELETE /api/admin/reports/scheduled/{id}        # Supprimer
GET /api/admin/reports/scheduled/{id}/executions # Historique
```

---

## ⚙️ Configuration Système

### 🔧 Paramètres globaux

```http
GET /api/admin/settings          # Lire configuration
PUT /api/admin/settings          # Modifier configuration
```

**Catégories de paramètres :**

- **Général** : Nom entreprise, timezone, langue
- **Objectifs** : Seuils ponctualité, temps cible
- **Alertes** : Seuils retard, notifications email
- **Planification** : Heures ouverture, contraintes
- **Intégrations** : Slack, email, webhooks

### 🧪 Test des intégrations

```http
POST /api/admin/settings/test-slack   # Test Slack
POST /api/admin/settings/test-email   # Test email
```

### 💾 Sauvegarde/Restauration

```http
GET /api/admin/settings/backup       # Export config
POST /api/admin/settings/restore     # Import config
```

---

## 🔐 Authentification & Sécurité

### 🔑 Routes auth (existantes)

```http
POST /api/auth/login              # Connexion admin
GET /api/auth/me                  # Profil connecté
POST /api/auth/refresh            # Refresh token
```

### 🛡️ Middleware de sécurité

- **Rate limiting** : 100 req/15min en prod
- **CORS** configuré pour domaines admin
- **Helmet** pour headers sécurisés
- **Validation Joi** sur tous les endpoints

---

## 📋 Codes de réponse

### ✅ Succès

- **200** : Succès avec données
- **201** : Création réussie
- **204** : Succès sans contenu

### ❌ Erreurs

- **400** : Données invalides
- **401** : Non authentifié
- **403** : Accès refusé (non admin)
- **404** : Ressource introuvable
- **409** : Conflit (email existant, etc.)
- **429** : Trop de requêtes
- **500** : Erreur serveur

---

## 🚀 Format de réponse standard

### ✅ Succès

```json
{
  "success": true,
  "message": "Operation réussie",
  "data": {
    // Données de réponse
  },
  "pagination": {
    // Si applicable
    "page": 1,
    "limit": 25,
    "totalCount": 150,
    "totalPages": 6
  }
}
```

### ❌ Erreur

```json
{
  "success": false,
  "message": "Description de l'erreur",
  "errors": ["Détail erreur 1", "Détail erreur 2"], // Si validation
  "code": "ERROR_CODE" // Optionnel
}
```

---

## 🎯 Points d'entrée principaux pour l'Admin App

### 🏠 Dashboard (page d'accueil)

```javascript
// Données temps réel pour le dashboard
const dashboardData = await Promise.all([
  fetch("/api/admin/dashboard/kpis?period=today"),
  fetch("/api/admin/dashboard/charts?type=all&period=7d"),
  fetch("/api/admin/dashboard/alerts"),
]);
```

### 👥 Page Utilisateurs

```javascript
// Liste avec recherche et pagination
const users = await fetch("/api/admin/users?search=john&page=1&limit=25");

// Profil complet
const profile = await fetch("/api/admin/users/profiles/123?period=month");
```

### 📅 Page Plannings

```javascript
// Vue calendaire
const calendar = await fetch("/api/admin/schedules/calendar?month=2024-01");

// Conflits
const conflicts = await fetch("/api/admin/schedules/conflicts?severity=all");
```

### 📊 Page Rapports

```javascript
// Rapport ponctualité
const punctuality = await fetch("/api/admin/reports/punctuality?period=month");

// Export
const exportResult = await fetch("/api/admin/reports/export", {
  method: "POST",
  body: JSON.stringify({ type: "ponctualite", format: "pdf" }),
});
```

---

## 🔧 Variables d'environnement requises

```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/vehicle-prep

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Slack (optionnel)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Serveur
PORT=4000
NODE_ENV=development|production
```

---

## 🎉 Résumé des fonctionnalités

### ✅ Complètement implémenté

- ✅ **Dashboard temps réel** avec KPIs, graphiques, alertes
- ✅ **Gestion utilisateurs complète** (CRUD, bulk, profils détaillés)
- ✅ **Planning calendaire** avec templates et détection conflits
- ✅ **Création en masse** de plannings
- ✅ **Détection et résolution** de conflits avancée
- ✅ **Rapports et exports** (ponctualité, performance)
- ✅ **Configuration système** complète
- ✅ **Gestion agences** de base

### 🚀 Prêt pour votre Admin App Next.js !

Tous les endpoints sont fonctionnels et documentés. Vous pouvez commencer l'implémentation de votre interface admin en vous connectant à ces APIs.
