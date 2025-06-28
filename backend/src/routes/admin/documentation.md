# 📚 Documentation API Complète - Admin Vehicle Prep

## 🎯 **Vue d'ensemble**

API REST complète pour l'administration de l'application Vehicle Prep avec authentification JWT, validation Joi et gestion d'erreurs standardisée.

**Base URL :** `http://localhost:4000/api`

## 🔐 **Authentification**

Toutes les routes admin nécessitent un token JWT dans le header :

```http
Authorization: Bearer <your_jwt_token>
```

### **Login Admin**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Réponse :**

```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "...",
      "email": "admin@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

---

## 👥 **GESTION UTILISATEURS**

### **1. Créer un utilisateur**

```http
POST /api/admin/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33123456789",
  "agencies": ["agency_id_1", "agency_id_2"],
  "role": "preparateur"
}
```

**Réponse :**

```json
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "data": {
    "user": {
      "id": "user_id",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+33123456789",
      "role": "preparateur",
      "agencies": [...],
      "isActive": true,
      "stats": {
        "totalPreparations": 0,
        "averageTime": 0,
        "onTimeRate": 0
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### **2. Liste des utilisateurs avec filtres**

```http
GET /api/admin/users?page=1&limit=20&search=john&agence=agency_id&statut=active&role=preparateur&sort=firstName&order=asc
Authorization: Bearer <token>
```

**Paramètres optionnels :**

- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre d'éléments par page (défaut: 20, max: 100)
- `search` : Recherche par nom, prénom ou email
- `agence` : Filtrer par agence
- `statut` : `all` | `active` | `inactive`
- `role` : `admin` | `preparateur`
- `sort` : Champ de tri (défaut: `createdAt`)
- `order` : `asc` | `desc`

**Réponse :**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "email": "john.doe@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+33123456789",
        "role": "preparateur",
        "agencies": [...],
        "isActive": true,
        "stats": {...},
        "lastLogin": "2024-01-15T08:00:00.000Z",
        "createdAt": "2024-01-10T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    },
    "filters": {
      "search": "john",
      "agence": null,
      "statut": "active",
      "role": null
    },
    "stats": {
      "totalUsers": 45,
      "activeUsers": 42,
      "inactiveUsers": 3,
      "preparateurs": 40,
      "admins": 5
    }
  }
}
```

### **3. Détail d'un utilisateur**

```http
GET /api/admin/users/{user_id}
Authorization: Bearer <token>
```

### **4. Modifier un utilisateur**

```http
PUT /api/admin/users/{user_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "phone": "+33987654321",
  "agencies": ["new_agency_id"],
  "isActive": true
}
```

### **5. Désactiver un utilisateur**

```http
DELETE /api/admin/users/{user_id}
Authorization: Bearer <token>
```

### **6. Vérifier la disponibilité d'un email**

```http
POST /api/admin/users/check-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "test@example.com",
  "excludeUserId": "optional_user_id"
}
```

**Réponse :**

```json
{
  "success": true,
  "available": true,
  "message": "Email disponible"
}
```

### **7. Actions en masse**

```http
POST /api/admin/users/bulk-actions
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "activate",
  "userIds": ["user1", "user2", "user3"],
  "params": {
    "newAgencyId": "agency_id",
    "notify": true
  }
}
```

**Actions possibles :**

- `activate` : Activer les utilisateurs
- `deactivate` : Désactiver les utilisateurs
- `change_agency` : Changer d'agence (nécessite `newAgencyId`)
- `export` : Exporter les données

### **8. Profil utilisateur complet**

```http
GET /api/admin/users/profiles/{user_id}?period=month&includeHistory=true&includeFuture=true
Authorization: Bearer <token>
```

**Paramètres :**

- `period` : `week` | `month` | `quarter` | `year`
- `includeHistory` : Inclure l'historique d'activité
- `includeFuture` : Inclure les plannings futurs

---

## 🏢 **GESTION AGENCES**

### **1. Créer une agence**

```http
POST /api/admin/agencies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "SIXT Paris Nord",
  "address": "123 Avenue des Champs-Élysées, 75008 Paris",
  "code": "PNO",
  "client": "SIXT",
  "workingHours": {
    "start": "08:00",
    "end": "18:00"
  },
  "contact": {
    "phone": "+33123456789",
    "email": "contact@sixt-paris-nord.com"
  }
}
```

### **2. Liste des agences**

```http
GET /api/admin/agencies?page=1&limit=20&search=sixt&client=SIXT&isActive=true&includeStats=true
Authorization: Bearer <token>
```

**Réponse avec statistiques :**

```json
{
  "success": true,
  "data": {
    "agencies": [
      {
        "id": "agency_id",
        "name": "SIXT Paris Nord",
        "address": "123 Avenue...",
        "code": "PNO",
        "client": "SIXT",
        "workingHours": {
          "start": "08:00",
          "end": "18:00"
        },
        "contact": {...},
        "isActive": true,
        "stats": {
          "totalUsers": 8,
          "activeSchedules": 15,
          "totalPreparations": 245,
          "lastActivity": "2024-01-15T16:30:00.000Z"
        },
        "createdAt": "2024-01-01T10:00:00.000Z"
      }
    ],
    "pagination": {...},
    "stats": {
      "totalAgencies": 12,
      "activeAgencies": 11,
      "inactiveAgencies": 1,
      "uniqueClients": 3
    }
  }
}
```

### **3. Détail d'une agence**

```http
GET /api/admin/agencies/{agency_id}
Authorization: Bearer <token>
```

### **4. Modifier une agence**

```http
PUT /api/admin/agencies/{agency_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "SIXT Paris Nord - Nouveau nom",
  "workingHours": {
    "start": "07:00",
    "end": "19:00"
  }
}
```

### **5. Désactiver une agence**

```http
DELETE /api/admin/agencies/{agency_id}
Authorization: Bearer <token>
```

### **6. Réactiver une agence**

```http
POST /api/admin/agencies/{agency_id}/activate
Authorization: Bearer <token>
```

---

## 📅 **GESTION PLANNINGS**

### **1. Créer un planning**

```http
POST /api/admin/schedules
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user_id",
  "agencyId": "agency_id",
  "date": "2024-01-20",
  "startTime": "08:00",
  "endTime": "17:00",
  "breakStart": "12:00",
  "breakEnd": "13:00",
  "notes": "Planning standard"
}
```

### **2. Liste des plannings**

```http
GET /api/admin/schedules?page=1&startDate=2024-01-15&endDate=2024-01-21&agencyId=agency_id&userId=user_id
Authorization: Bearer <token>
```

### **3. Vue calendaire**

```http
GET /api/admin/schedules/calendar?month=2024-01&view=month&agencies[]=agency1&users[]=user1&includeMetadata=true&includeConflicts=true
Authorization: Bearer <token>
```

**Réponse calendaire :**

```json
{
  "success": true,
  "data": {
    "calendar": [
      {
        "weekStart": "2024-01-01T00:00:00.000Z",
        "weekEnd": "2024-01-07T23:59:59.999Z",
        "days": [
          {
            "date": "2024-01-01T00:00:00.000Z",
            "dateKey": "2024-01-01",
            "isCurrentMonth": true,
            "isToday": false,
            "schedules": [
              {
                "id": "schedule_id",
                "user": {
                  "id": "user_id",
                  "name": "John Doe",
                  "email": "john@example.com"
                },
                "agency": {
                  "id": "agency_id",
                  "name": "SIXT Paris",
                  "code": "PAR"
                },
                "startTime": "08:00",
                "endTime": "17:00",
                "workingHours": 8,
                "status": "active"
              }
            ],
            "conflicts": [],
            "stats": {
              "totalSchedules": 1,
              "totalHours": 8,
              "agencies": 1
            }
          }
        ],
        "stats": {
          "totalSchedules": 5,
          "totalHours": 40,
          "workingDays": 5
        }
      }
    ],
    "metadata": {
      "summary": {
        "totalSchedules": 25,
        "totalHours": 200,
        "averageHoursPerSchedule": 8,
        "uniqueUsers": 8,
        "uniqueAgencies": 3
      },
      "coverage": {
        "daysWithSchedules": 20,
        "totalDaysInPeriod": 31
      }
    }
  }
}
```

### **4. Création en masse**

```http
POST /api/admin/schedules/bulk-create
Authorization: Bearer <token>
Content-Type: application/json

{
  "template": {
    "startTime": "08:00",
    "endTime": "17:00",
    "breakStart": "12:00",
    "breakEnd": "13:00"
  },
  "assignments": [
    {
      "userId": "user1",
      "agencyId": "agency1",
      "dates": ["2024-01-20", "2024-01-21", "2024-01-22"]
    },
    {
      "userId": "user2",
      "agencyId": "agency1",
      "dates": ["2024-01-20", "2024-01-21"]
    }
  ],
  "options": {
    "skipConflicts": true,
    "notifyUsers": false,
    "overwrite": false
  }
}
```

---

## 📋 **TEMPLATES DE PLANNING**

### **1. Liste des templates**

```http
GET /api/admin/schedules/templates?category=all&includeUsage=true
Authorization: Bearer <token>
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template_standard",
        "name": "Planning Standard",
        "description": "Horaires classiques 8h-17h avec pause déjeuner",
        "category": "standard",
        "template": {
          "startTime": "08:00",
          "endTime": "17:00",
          "breakStart": "12:00",
          "breakEnd": "13:00"
        },
        "isDefault": true,
        "usageCount": 45,
        "recentUsage": 12
      }
    ],
    "categories": {
      "standard": 1,
      "shifts": 2,
      "special": 1,
      "custom": 3
    }
  }
}
```

### **2. Créer un template**

```http
POST /api/admin/schedules/templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Planning Personnalisé",
  "description": "Horaires spéciaux pour équipe de nuit",
  "category": "custom",
  "template": {
    "startTime": "22:00",
    "endTime": "06:00",
    "breakStart": "02:00",
    "breakEnd": "02:30"
  },
  "defaultAgencies": ["agency1", "agency2"]
}
```

### **3. Appliquer un template**

```http
POST /api/admin/schedules/apply-template
Authorization: Bearer <token>
Content-Type: application/json

{
  "templateId": "template_standard",
  "userIds": ["user1", "user2", "user3"],
  "dateRange": {
    "start": "2024-01-22",
    "end": "2024-01-26"
  },
  "agencyId": "agency_id",
  "options": {
    "skipConflicts": true,
    "notifyUsers": false,
    "overwrite": false
  }
}
```

### **4. Dupliquer un template**

```http
POST /api/admin/schedules/templates/{template_id}/duplicate
Authorization: Bearer <token>
```

---

## ⚠️ **DÉTECTION DE CONFLITS**

### **1. Analyser les conflits**

```http
GET /api/admin/schedules/conflicts?startDate=2024-01-15&endDate=2024-01-29&severity=all&includeResolutions=true
Authorization: Bearer <token>
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "conflicts": [
      {
        "id": "user_conflict_123_456",
        "type": "user_double_booking",
        "severity": "critical",
        "message": "John Doe a des plannings qui se chevauchent",
        "affectedSchedules": ["schedule1", "schedule2"],
        "users": [...],
        "agencies": [...],
        "details": {
          "date": "2024-01-20",
          "overlap": {
            "start": "14:00",
            "end": "17:00",
            "duration": 180
          }
        },
        "autoFixable": false
      }
    ],
    "statistics": {
      "total": 8,
      "bySeverity": {
        "critical": 2,
        "warning": 5,
        "info": 1
      },
      "byType": {
        "user_double_booking": 2,
        "weekly_overwork": 3,
        "break_too_short": 3
      },
      "autoFixable": 6
    },
    "priorities": {
      "immediate": [...],
      "thisWeek": [...],
      "planned": [...]
    },
    "recommendations": [
      {
        "type": "urgent",
        "message": "2 conflit(s) critique(s) nécessitent une attention immédiate",
        "action": "Résoudre en priorité les doubles plannings"
      }
    ]
  }
}
```

### **2. Résoudre des conflits**

```http
POST /api/admin/schedules/conflicts/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "conflictIds": ["conflict1", "conflict2"],
  "resolutionType": "auto",
  "parameters": {}
}
```

---

## 📊 **DASHBOARD & ANALYTICS**

### **1. Vue d'ensemble dashboard**

```http
GET /api/admin/dashboard/overview
Authorization: Bearer <token>
```

### **2. KPIs temps réel**

```http
GET /api/admin/dashboard/kpis?period=today&agencies[]=agency1
Authorization: Bearer <token>
```

**Réponse KPIs :**

```json
{
  "success": true,
  "data": {
    "preparateurs": {
      "total": 25,
      "actifs": 23,
      "presents": 18,
      "enRetard": 2
    },
    "ponctualite": {
      "global": 94.5,
      "parAgence": [
        {"agencyId": "agency1", "name": "SIXT Paris", "rate": 96.2},
        {"agencyId": "agency2", "name": "SIXT Lyon", "rate": 92.8}
      ]
    },
    "preparations": {
      "quotidien": 45,
      "tempsMoyen": 24.5,
      "retards": 3,
      "objectifJour": 50
    },
    "performance": {
      "objectifVsRealise": 90,
      "evolutionSemaine": 2.3,
      "topPerformers": [...]
    }
  }
}
```

### **3. Données pour graphiques**

```http
GET /api/admin/dashboard/charts?type=all&period=7d&granularity=day
Authorization: Bearer <token>
```

### **4. Alertes système**

```http
GET /api/admin/dashboard/alerts?priority=critical&limit=10
Authorization: Bearer <token>
```

---

## 📈 **RAPPORTS**

### **1. Rapport ponctualité**

```http
GET /api/admin/reports/ponctualite?period=month&startDate=2024-01-01&endDate=2024-01-31&agencies[]=agency1&format=json&includeDetails=true
Authorization: Bearer <token>
```

### **2. Rapport performance**

```http
GET /api/admin/reports/performance?period=month&includeComparison=true
Authorization: Bearer <token>
```

### **3. Export de rapport**

```http
POST /api/admin/reports/export
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "ponctualite",
  "format": "excel",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "filters": {
    "agencies": ["agency1"],
    "includeGraphiques": true
  },
  "delivery": {
    "method": "download"
  }
}
```

---

## 📋 **CODES DE RÉPONSE STANDARD**

### **✅ Succès**

- **200** : Requête réussie avec données
- **201** : Ressource créée avec succès
- **204** : Succès sans contenu de retour

### **❌ Erreurs**

- **400** : Données invalides ou manquantes
- **401** : Token d'authentification manquant ou invalide
- **403** : Accès refusé (permissions insuffisantes)
- **404** : Ressource non trouvée
- **409** : Conflit (email existant, etc.)
- **422** : Erreur de validation des données
- **500** : Erreur interne du serveur

### **Structure d'erreur standard :**

```json
{
  "success": false,
  "message": "Description de l'erreur",
  "errors": [
    {
      "field": "email",
      "message": "Format d'email invalide"
    }
  ]
}
```

---

## 🔧 **CONSEILS D'UTILISATION**

### **Headers requis :**

```http
Authorization: Bearer <token>
Content-Type: application/json
```

### **Pagination :**

Toutes les listes supportent la pagination avec :

- `page` : Numéro de page (défaut: 1)
- `limit` : Éléments par page (max: 100)

### **Filtres de date :**

Format ISO 8601 : `YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ss.sssZ`

### **Tri :**

- `sort` : Nom du champ
- `order` : `asc` ou `desc`

### **Recherche :**

La plupart des endpoints supportent un paramètre `search` pour recherche textuelle.

---

## 🚀 **EXEMPLES D'INTÉGRATION FRONTEND**

### **React/Next.js avec Axios**

```javascript
// Configuration Axios
const api = axios.create({
  baseURL: "http://localhost:4000/api",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// Récupérer les utilisateurs
const getUsers = async (filters = {}) => {
  const { data } = await api.get("/admin/users", { params: filters });
  return data;
};

// Créer un planning
const createSchedule = async (scheduleData) => {
  const { data } = await api.post("/admin/schedules", scheduleData);
  return data;
};
```

Cette documentation couvre tous les endpoints disponibles pour développer votre admin app efficacement ! 🎯
