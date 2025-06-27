# 🔧 Extensions Backend - Support Application Admin

## Vue d'ensemble

Extensions nécessaires au backend actuel pour supporter l'application d'administration complète. Ces ajouts complètent l'API existante sans modifier l'architecture actuelle.

## 📊 **1. DASHBOARD ADMIN - Routes Analytics**

### `/api/admin/dashboard/overview` ✅ (Existe déjà)

**Métriques globales temps réel**

### `/api/admin/dashboard/kpis` ⭐ (À créer)

```javascript
GET /api/admin/dashboard/kpis?period=today|week|month&agencies=[]

Response: {
  success: true,
  data: {
    preparateurs: {
      total: 25,
      active: 18,
      present: 16,
      late: 2
    },
    ponctualite: {
      global: 87.5,
      parAgence: [
        { agenceId: "...", nom: "Paris Nord", taux: 92.1 },
        { agenceId: "...", nom: "Lyon Centre", taux: 83.4 }
      ]
    },
    preparations: {
      aujourdhui: 45,
      tempsMoyen: 24.5,
      enRetard: 3,
      terminees: 42
    },
    objectifs: {
      ponctualiteTarget: 90,
      tempsTarget: 25,
      volumeTarget: 50
    }
  }
}
```

### `/api/admin/dashboard/charts` ⭐ (À créer)

```javascript
GET /api/admin/dashboard/charts?type=timeline|ponctualite|distribution&period=7d&agencies=[]

Response: {
  success: true,
  data: {
    timeline: [
      { heure: "08:00", preparations: 5, ponctualite: 95 },
      { heure: "09:00", preparations: 8, ponctualite: 87 },
      // ...
    ],
    ponctualiteParAgence: [
      { agence: "Paris Nord", ponctualite: 92, retards: 3 },
      // ...
    ],
    distributionTemps: [
      { tranche: "0-20min", count: 15 },
      { tranche: "20-25min", count: 22 },
      { tranche: "25-30min", count: 8 },
      { tranche: ">30min", count: 3 }
    ]
  }
}
```

### `/api/admin/dashboard/alerts` ⭐ (À créer)

```javascript
GET /api/admin/dashboard/alerts

Response: {
  success: true,
  data: {
    retardsEnCours: [
      {
        userId: "...",
        userName: "Jean Dupont",
        agence: "Paris Nord",
        retard: 25, // minutes
        heurePrevu: "08:00"
      }
    ],
    preparationsDepassees: [
      {
        preparationId: "...",
        vehicule: "AB-123-CD",
        duree: 35, // minutes
        userName: "Marie Martin"
      }
    ],
    alertesSysteme: [
      {
        type: "absence_non_prevue",
        message: "Paul Durand absent sans planning",
        timestamp: "2024-01-15T08:30:00Z"
      }
    ]
  }
}
```

## 👥 **2. GESTION UTILISATEURS AVANCÉE**

### Routes existantes à étendre

#### `GET /api/admin/users` ✅ (Existe - à étendre)

**Ajouter filtres avancés et métadonnées**

```javascript
GET /api/admin/users?search=jean&agence=123&statut=active&performance=good&page=1&limit=25&sort=lastName&order=asc

// Ajouter à la réponse existante:
Response: {
  success: true,
  data: {
    users: [...], // existant
    pagination: {...}, // existant
    // NOUVEAU:
    metadata: {
      totalActifs: 25,
      totalInactifs: 3,
      parAgence: [
        { agenceId: "123", nom: "Paris Nord", count: 8 },
        { agenceId: "456", nom: "Lyon", count: 12 }
      ],
      performanceDistribution: {
        excellent: 8,
        bon: 15,
        moyen: 4,
        faible: 1
      }
    }
  }
}
```

### Routes nouvelles à créer

#### `/api/admin/users/bulk-actions` ⭐ (À créer)

```javascript
POST /api/admin/users/bulk-actions
{
  action: "activate|deactivate|change_agency|export",
  userIds: ["id1", "id2", "id3"],
  params: {
    newAgencyId: "123", // pour change_agency
    format: "excel", // pour export
    notify: true // envoi email notification
  }
}

Response: {
  success: true,
  data: {
    processed: 3,
    failed: 0,
    results: [
      { userId: "id1", status: "success" },
      { userId: "id2", status: "success" },
      { userId: "id3", status: "success" }
    ]
  }
}
```

#### `/api/admin/users/:id/profile-complete` ⭐ (À créer)

```javascript
GET /api/admin/users/:id/profile-complete

Response: {
  success: true,
  data: {
    user: {
      // Données user complètes existantes
      ...
    },
    statistics: {
      ponctualite: {
        taux: 87.5,
        evolution: +2.3, // vs mois précédent
        graphique30j: [85, 86, 89, 87, 88, ...] // 30 valeurs
      },
      performance: {
        tempsMoyen: 24.5,
        evolution: -1.2,
        objectif: 25,
        graphique30j: [26, 25, 24, 25, 24, ...]
      },
      activite: {
        totalPreparations: 145,
        dernierPointage: "2024-01-15T16:30:00Z",
        joursTravailles: 22,
        heuresTotal: 176
      }
    },
    historiqueActivite: [
      {
        date: "2024-01-15",
        pointages: {
          arrivee: "08:05",
          depart: "17:02",
          pauses: ["12:00-13:00"]
        },
        preparations: [
          {
            vehicule: "AB-123-CD",
            duree: 23,
            agence: "Paris Nord"
          }
        ]
      }
    ],
    planningsFuturs: [
      {
        date: "2024-01-16",
        agence: "Paris Nord",
        horaires: "08:00-17:00",
        pause: "12:00-13:00"
      }
    ]
  }
}
```

#### `/api/admin/users/check-email` ⭐ (À créer)

```javascript
POST /api/admin/users/check-email
{
  email: "test@example.com",
  excludeUserId: "123" // pour édition
}

Response: {
  success: true,
  data: {
    available: false,
    message: "Email déjà utilisé par Jean Dupont"
  }
}
```

## 📅 **3. GESTION PLANNINGS AVANCÉE**

### Routes existantes à étendre

#### `GET /api/admin/schedules` ✅ (Existe - à étendre)

**Ajouter vue calendaire et métadonnées**

```javascript
GET /api/admin/schedules?view=calendar&month=2024-01&agencies[]=123&users[]=456

// Ajouter format calendaire:
Response: {
  success: true,
  data: {
    // Format existant pour vue liste
    schedules: [...],
    pagination: {...},

    // NOUVEAU: Format calendaire
    calendar: {
      month: "2024-01",
      weeks: [
        {
          weekNumber: 1,
          days: [
            {
              date: "2024-01-01",
              dayName: "Lundi",
              schedules: [
                {
                  userId: "123",
                  userName: "Jean Dupont",
                  agenceId: "456",
                  agenceName: "Paris Nord",
                  startTime: "08:00",
                  endTime: "17:00",
                  breakStart: "12:00",
                  breakEnd: "13:00",
                  status: "confirmed|tentative|conflicted"
                }
              ]
            }
          ]
        }
      ]
    },

    // Métadonnées utiles
    metadata: {
      totalHours: 1280,
      coverage: {
        "Paris Nord": 85, // % couverture
        "Lyon Centre": 92
      },
      conflicts: [
        {
          date: "2024-01-15",
          userId: "123",
          type: "overlap|absence|overwork",
          message: "Chevauchement avec congés"
        }
      ]
    }
  }
}
```

### Routes nouvelles à créer

#### `/api/admin/schedules/bulk-create` ⭐ (À créer)

```javascript
POST /api/admin/schedules/bulk-create
{
  template: {
    startTime: "08:00",
    endTime: "17:00",
    breakStart: "12:00",
    breakEnd: "13:00"
  },
  assignments: [
    {
      userId: "123",
      agencyId: "456",
      dates: ["2024-01-15", "2024-01-16", "2024-01-17"]
    },
    {
      userId: "789",
      agencyId: "456",
      dates: ["2024-01-15", "2024-01-18"]
    }
  ],
  options: {
    skipConflicts: true,
    notifyUsers: false
  }
}

Response: {
  success: true,
  data: {
    created: 5,
    skipped: 2,
    conflicts: [
      {
        userId: "123",
        date: "2024-01-16",
        reason: "Congés planifiés"
      }
    ]
  }
}
```

#### `/api/admin/schedules/templates` ⭐ (À créer)

```javascript
// Création template
POST /api/admin/schedules/templates
{
  name: "Équipe matin",
  description: "Service 6h-14h avec pause",
  template: {
    startTime: "06:00",
    endTime: "14:00",
    breakStart: "10:00",
    breakEnd: "10:30"
  },
  defaultAgencies: ["123", "456"]
}

// Liste templates
GET /api/admin/schedules/templates

// Application template
POST /api/admin/schedules/apply-template
{
  templateId: "template123",
  userIds: ["user1", "user2"],
  dateRange: {
    start: "2024-01-15",
    end: "2024-01-21"
  },
  agencyId: "456"
}
```

#### `/api/admin/schedules/conflicts` ⭐ (À créer)

```javascript
GET /api/admin/schedules/conflicts?date=2024-01-15&userId=123

Response: {
  success: true,
  data: {
    conflicts: [
      {
        type: "user_double_booking",
        severity: "error",
        description: "Jean Dupont programmé sur 2 agences",
        suggestions: [
          {
            action: "move_to_different_time",
            description: "Décaler créneau Paris Nord à 14h-22h"
          }
        ]
      }
    ],
    suggestions: [
      {
        userId: "789",
        userName: "Marie Martin",
        agenceId: "456",
        availability: "08:00-17:00",
        reason: "Disponible et même agence"
      }
    ]
  }
}
```

#### `/api/admin/schedules/optimization` ⭐ (À créer)

```javascript
POST /api/admin/schedules/optimization
{
  period: {
    start: "2024-01-15",
    end: "2024-01-21"
  },
  constraints: {
    minCoveragePerAgency: 80,
    maxHoursPerUser: 35,
    preferredShifts: ["morning", "afternoon"]
  },
  agencies: ["123", "456"]
}

Response: {
  success: true,
  data: {
    currentScore: 75,
    optimizedScore: 89,
    changes: [
      {
        action: "move_shift",
        userId: "123",
        from: { date: "2024-01-15", time: "08:00-17:00" },
        to: { date: "2024-01-15", time: "14:00-22:00" },
        reason: "Améliore couverture soirée"
      }
    ],
    implementation: {
      estimatedTime: "2 minutes",
      affectedUsers: 5,
      requiresNotification: true
    }
  }
}
```

## 🏢 **4. GESTION AGENCES ÉTENDUE**

### Routes existantes à étendre

#### `GET /api/admin/agencies` ✅ (Existe - à étendre)

**Ajouter métriques et statistiques**

```javascript
GET /api/admin/agencies?includeStats=true&period=month

// Ajouter à la réponse existante:
Response: {
  success: true,
  data: {
    agencies: [
      {
        // Données existantes
        id: "123",
        name: "Paris Nord",
        code: "PN",
        client: "SIXT",

        // NOUVEAU: Statistiques
        stats: {
          preparateurs: {
            total: 8,
            actifs: 7,
            moyenne_ponctualite: 89.2
          },
          performance: {
            preparations_mois: 245,
            temps_moyen: 23.5,
            taux_ponctualite: 89.2,
            satisfaction_client: 4.2
          },
          capacite: {
            max_simultane: 4,
            utilisation_moyenne: 85,
            pics_activite: ["09:00-11:00", "14:00-16:00"]
          }
        }
      }
    ]
  }
}
```

### Routes nouvelles à créer

#### `/api/admin/agencies/:id/analytics` ⭐ (À créer)

```javascript
GET /api/admin/agencies/:id/analytics?period=month&metrics=all

Response: {
  success: true,
  data: {
    agence: {
      id: "123",
      name: "Paris Nord",
      code: "PN"
    },
    performance: {
      ponctualite: {
        taux: 89.2,
        evolution: +2.1,
        objectif: 90,
        graphique: [87, 88, 89, 90, 89, 91, 89] // 30 derniers jours
      },
      tempsPreparation: {
        moyenne: 23.5,
        evolution: -1.2,
        objectif: 25,
        distribution: {
          "0-20min": 15,
          "20-25min": 45,
          "25-30min": 35,
          ">30min": 5
        }
      },
      volume: {
        totalPreparations: 245,
        moyenneJour: 8.2,
        evolution: +5.2,
        graphiqueVolume: [6, 8, 9, 7, 8, 10, 8] // par jour
      }
    },
    equipe: {
      repartitionCharge: [
        { userId: "456", nom: "Jean Dupont", pourcentage: 23 },
        { userId: "789", nom: "Marie Martin", pourcentage: 28 }
      ],
      turnover: {
        entrees: 1,
        sorties: 0,
        taux: 2.1 // %
      }
    },
    operational: {
      heuresOuverture: ["08:00-18:00", "08:00-18:00", "..."], // L-D
      capaciteUtilisation: [
        { heure: "08:00", utilisation: 75 },
        { heure: "09:00", utilisation: 95 }
      ],
      incidents: {
        total: 3,
        resolus: 2,
        types: [
          { type: "retard", count: 2 },
          { type: "materiel", count: 1 }
        ]
      }
    }
  }
}
```

#### `/api/admin/agencies/:id/configuration` ⭐ (À créer)

```javascript
GET /api/admin/agencies/:id/configuration
PUT /api/admin/agencies/:id/configuration

{
  operationnel: {
    horairesOuverture: {
      lundi: { debut: "08:00", fin: "18:00", ferme: false },
      mardi: { debut: "08:00", fin: "18:00", ferme: false },
      // ... autres jours
    },
    capacites: {
      preparateursMax: 4,
      placesParking: 20,
      equipements: ["lavage", "aspirateur", "compresseur"]
    }
  },
  reglesMetier: {
    tempsStandard: {
      "citadine": 20,
      "berline": 25,
      "suv": 30,
      "premium": 35
    },
    seuilsAlertes: {
      retardMax: 15, // minutes
      depassementMax: 30,
      absenceNonJustifiee: true
    },
    protocoles: {
      controleQualite: true,
      photoObligatoire: true,
      validationClient: false
    }
  },
  notifications: {
    alertesEmail: ["manager@agence.com"],
    smsUrgence: ["+33123456789"],
    slackWebhook: "https://hooks.slack.com/...",
    frequenceRapports: "daily"
  }
}
```

## 📈 **5. RAPPORTS & ANALYTICS AVANCÉS**

### Routes nouvelles à créer

#### `/api/admin/reports/ponctualite` ⭐ (À créer)

```javascript
GET /api/admin/reports/ponctualite?period=month&agencies[]=123&format=json

Response: {
  success: true,
  data: {
    periode: {
      debut: "2024-01-01",
      fin: "2024-01-31",
      jours: 31
    },
    global: {
      tauxPonctualite: 87.5,
      evolution: +2.3,
      objectif: 90,
      totalPointages: 1250,
      pointagesEnRetard: 156
    },
    parAgence: [
      {
        agenceId: "123",
        nom: "Paris Nord",
        taux: 89.2,
        evolution: +1.8,
        totalPointages: 248,
        retards: 27,
        retardMoyen: 8.5 // minutes
      }
    ],
    parPreparateur: [
      {
        userId: "456",
        nom: "Jean Dupont",
        agence: "Paris Nord",
        taux: 95.2,
        evolution: +3.1,
        totalJours: 22,
        retards: 1,
        performance: "excellent"
      }
    ],
    tendances: {
      parJourSemaine: [
        { jour: "Lundi", taux: 85.2 },
        { jour: "Mardi", taux: 89.1 },
        // ...
      ],
      parHeure: [
        { heure: "08:00", taux: 78.5 },
        { heure: "09:00", taux: 92.1 },
        // ...
      ]
    },
    topFlop: {
      meilleursPerformers: [
        { userId: "456", nom: "Jean Dupont", taux: 98.5 },
        { userId: "789", nom: "Marie Martin", taux: 96.2 }
      ],
      aAmeliorer: [
        { userId: "321", nom: "Paul Durand", taux: 76.8 }
      ]
    }
  }
}
```

#### `/api/admin/reports/performance` ⭐ (À créer)

```javascript
GET /api/admin/reports/performance?period=month&groupBy=agency&metrics=all

Response: {
  success: true,
  data: {
    global: {
      tempsPreparationMoyen: 24.5,
      objectif: 25,
      evolution: -1.2,
      totalPreparations: 1876,
      tempsTotal: 765 // heures
    },
    parAgence: [
      {
        agenceId: "123",
        nom: "Paris Nord",
        tempsMoyen: 23.8,
        totalPreparations: 456,
        efficacite: 95.2, // % vs objectif
        tendance: "amelioration"
      }
    ],
    qualite: {
      tauxIncidents: 2.1,
      typeIncidents: [
        { type: "retard_preparation", count: 15 },
        { type: "qualite_insatisfaisante", count: 8 }
      ],
      satisfactionClient: 4.2
    },
    productivite: {
      vehiculesParHeure: 2.4,
      evolution: +0.2,
      picActivite: {
        heure: "14:00-16:00",
        vehiculesParHeure: 3.1
      }
    }
  }
}
```

#### `/api/admin/reports/export` ⭐ (À créer)

```javascript
POST /api/admin/reports/export
{
  type: "ponctualite|performance|planning|custom",
  format: "pdf|excel|csv",
  period: {
    start: "2024-01-01",
    end: "2024-01-31"
  },
  filters: {
    agencies: ["123", "456"],
    users: ["user1", "user2"],
    includeGraphiques: true
  },
  template: "standard|executive|detailed",
  delivery: {
    method: "download|email",
    recipients: ["admin@company.com"]
  }
}

Response: {
  success: true,
  data: {
    exportId: "export_123456",
    status: "processing|completed|failed",
    downloadUrl: "https://api.example.com/exports/123456.pdf", // si download
    estimatedTime: 30, // secondes
    fileSize: 2048576 // bytes
  }
}
```

#### `/api/admin/reports/scheduled` ⭐ (À créer)

```javascript
// Créer rapport automatique
POST /api/admin/reports/scheduled
{
  name: "Rapport ponctualité hebdomadaire",
  type: "ponctualite",
  frequency: "weekly|daily|monthly",
  schedule: {
    dayOfWeek: 1, // Lundi
    hour: 9,
    timezone: "Europe/Paris"
  },
  recipients: ["manager@company.com"],
  filters: {
    agencies: ["123"],
    format: "pdf"
  },
  active: true
}

// Liste rapports programmés
GET /api/admin/reports/scheduled

// Historique exécutions
GET /api/admin/reports/scheduled/:id/executions
```

## 📊 **6. ANALYTICS TEMPS RÉEL**

### Routes nouvelles à créer

#### `/api/admin/realtime/status` ⭐ (À créer)

```javascript
GET /api/admin/realtime/status

Response: {
  success: true,
  data: {
    timestamp: "2024-01-15T14:30:00Z",
    preparateurs: {
      total: 25,
      enService: 18,
      enPause: 3,
      enRetard: 2,
      absents: 2
    },
    preparations: {
      enCours: 12,
      terminées: 34,
      enRetard: 2, // >30min
      moyenne: 23.5 // temps actuel
    },
    agences: [
      {
        id: "123",
        nom: "Paris Nord",
        preparateursActifs: 6,
        preparationsEnCours: 4,
        chargeActuelle: 85 // %
      }
    ],
    alertes: [
      {
        type: "retard_pointage",
        userId: "456",
        message: "Jean Dupont en retard de 25min",
        timestamp: "2024-01-15T14:25:00Z"
      }
    ]
  }
}
```

#### `/api/admin/realtime/notifications` ⭐ (À créer)

```javascript
// WebSocket endpoint pour notifications temps réel
WS /api/admin/realtime/notifications

// Messages envoyés:
{
  type: "retard_pointage|preparation_depassee|incident|urgence",
  data: {
    userId: "456",
    userName: "Jean Dupont",
    agence: "Paris Nord",
    message: "Retard de pointage: 25 minutes",
    severity: "warning|error|info",
    actionRequired: true,
    timestamp: "2024-01-15T14:30:00Z"
  }
}

// Configuration notifications
POST /api/admin/realtime/notifications/config
{
  userId: "admin123", // admin qui configure
  preferences: {
    retardPointage: { enabled: true, seuil: 15 },
    preparationDepassee: { enabled: true, seuil: 30 },
    incident: { enabled: true },
    rapportsQuotidiens: { enabled: true, heure: "18:00" }
  },
  channels: {
    web: true,
    email: true,
    slack: false
  }
}
```

## 🔐 **7. SÉCURITÉ & AUDIT**

### Routes nouvelles à créer

#### `/api/admin/audit/logs` ⭐ (À créer)

```javascript
GET /api/admin/audit/logs?action=all&userId=123&startDate=2024-01-01&page=1

Response: {
  success: true,
  data: {
    logs: [
      {
        id: "log123",
        timestamp: "2024-01-15T14:30:00Z",
        userId: "456",
        userName: "Jean Dupont",
        action: "user_created|user_updated|schedule_created|login|logout",
        resource: "users",
        resourceId: "789",
        details: {
          changes: {
            email: { from: "old@email.com", to: "new@email.com" }
          },
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0..."
        },
        severity: "info|warning|error"
      }
    ],
    pagination: {
      page: 1,
      limit: 50,
      totalCount: 1250,
      totalPages: 25
    },
    filters: {
      actions: ["user_created", "user_updated", "..."],
      resources: ["users", "schedules", "agencies"]
    }
  }
}
```

#### `/api/admin/audit/security` ⭐ (À créer)

```javascript
GET /api/admin/audit/security?period=7d

Response: {
  success: true,
  data: {
    loginAttempts: {
      total: 1250,
      successful: 1198,
      failed: 52,
      suspicious: 3
    },
    failedLogins: [
      {
        email: "test@example.com",
        ipAddress: "192.168.1.100",
        timestamp: "2024-01-15T14:30:00Z",
        reason: "invalid_password",
        attempts: 3
      }
    ],
    suspiciousActivity: [
      {
        userId: "456",
        type: "multiple_ip_addresses",
        description: "Connexions depuis 3 IP différentes en 1h",
        risk: "medium",
        timestamp: "2024-01-15T14:30:00Z"
      }
    ],
    sessionStats: {
      activeSessions: 15,
      averageDuration: 2.5, // heures
      longestSession: 8.2
    }
  }
}
```

#### `/api/admin/audit/changes` ⭐ (À créer)

```javascript
GET /api/admin/audit/changes/:resourceType/:resourceId

Response: {
  success: true,
  data: {
    resource: {
      type: "user",
      id: "456",
      currentData: { /* état actuel */ }
    },
    changes: [
      {
        timestamp: "2024-01-15T14:30:00Z",
        userId: "admin123",
        userName: "Admin User",
        action: "update",
        changes: {
          email: { from: "old@email.com", to: "new@email.com" },
          agencies: {
            from: ["123"],
            to: ["123", "456"],
            added: ["456"]
          }
        },
        reason: "Affectation nouvelle agence"
      }
    ]
  }
}
```

## 📱 **8. NOTIFICATIONS & COMMUNICATIONS**

### Routes nouvelles à créer

#### `/api/admin/notifications/send` ⭐ (À créer)

```javascript
POST /api/admin/notifications/send
{
  type: "email|sms|push|slack",
  recipients: {
    userIds: ["456", "789"],
    agencyIds: ["123"], // tous users de l'agence
    roles: ["preparateur"], // tous avec ce rôle
    custom: ["email@example.com"]
  },
  message: {
    subject: "Planning modifié",
    content: "Votre planning de demain a été modifié...",
    template: "schedule_change", // template prédéfini
    variables: {
      userName: "Jean",
      date: "2024-01-16",
      newTime: "09:00-18:00"
    }
  },
  options: {
    priority: "normal|high|urgent",
    trackDelivery: true,
    allowUnsubscribe: true
  }
}

Response: {
  success: true,
  data: {
    notificationId: "notif123",
    sent: 15,
    failed: 0,
    status: "sent|processing|failed",
    deliveryTracking: true
  }
}
```

#### `/api/admin/notifications/templates` ⭐ (À créer)

```javascript
// Gestion templates notifications
GET /api/admin/notifications/templates
POST /api/admin/notifications/templates
PUT /api/admin/notifications/templates/:id

{
  name: "Modification planning",
  type: "email",
  subject: "Planning modifié - {{date}}",
  content: "Bonjour {{userName}}, votre planning du {{date}} a été modifié...",
  variables: ["userName", "date", "newTime", "agence"],
  category: "planning|urgence|information"
}
```

## 🔧 **9. CONFIGURATION SYSTÈME**

### Routes nouvelles à créer

#### `/api/admin/settings/global` ⭐ (À créer)

```javascript
GET /api/admin/settings/global
PUT /api/admin/settings/global

{
  metier: {
    tempsStandardPreparation: {
      "citadine": 20,
      "berline": 25,
      "suv": 30,
      "premium": 35
    },
    seuilsAlertes: {
      retardPointage: 15, // minutes
      depassementPreparation: 30,
      absenceNonJustifiee: true
    },
    horairesLegaux: {
      heuresMaxSemaine: 35,
      pauseMinimumDuree: 30,
      pauseObligatoireSi: 6 // heures continues
    },
    joursFeries: [
      { date: "2024-01-01", nom: "Nouvel An" },
      { date: "2024-05-01", nom: "Fête du Travail" }
    ]
  },
  notifications: {
    email: {
      smtp: {
        host: "smtp.company.com",
        port: 587,
        secure: true,
        auth: { user: "...", pass: "..." }
      },
      expediteur: {
        nom: "Vehicle Prep System",
        email: "noreply@company.com"
      }
    },
    sms: {
      provider: "twilio",
      config: { /* config Twilio */ }
    },
    slack: {
      webhookUrl: "https://hooks.slack.com/...",
      defaultChannel: "#alerts"
    }
  },
  securite: {
    sessionTimeout: 8, // heures
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false
    },
    maxLoginAttempts: 5,
    lockoutDuration: 30 // minutes
  }
}
```

#### `/api/admin/settings/agencies/:id` ⭐ (À créer)

```javascript
// Configuration spécifique par agence
GET /api/admin/settings/agencies/:id
PUT /api/admin/settings/agencies/:id

{
  // Configuration hérite des globaux mais peut override
  tempsStandard: {
    "citadine": 18, // override global
    "berline": 25   // hérite global
  },
  horairesOuverture: {
    // Comme défini précédemment
  },
  // etc.
}
```

## 📊 **10. INTÉGRATIONS & WEBHOOKS**

### Routes nouvelles à créer

#### `/api/admin/integrations/webhooks` ⭐ (À créer)

```javascript
// Gestion webhooks sortants
POST /api/admin/integrations/webhooks
{
  name: "Notification Slack retards",
  url: "https://hooks.slack.com/services/...",
  events: ["user_late", "preparation_overtime"],
  filters: {
    agencies: ["123"],
    severity: ["warning", "error"]
  },
  headers: {
    "Authorization": "Bearer token123",
    "Content-Type": "application/json"
  },
  active: true
}

// Test webhook
POST /api/admin/integrations/webhooks/:id/test

// Logs webhooks
GET /api/admin/integrations/webhooks/:id/logs
```

#### `/api/admin/integrations/exports` ⭐ (À créer)

```javascript
// Configuration exports automatiques
POST /api/admin/integrations/exports
{
  name: "Export quotidien pointages",
  type: "timesheets",
  format: "csv",
  schedule: {
    frequency: "daily",
    time: "23:00",
    timezone: "Europe/Paris"
  },
  destination: {
    type: "ftp|sftp|email|webhook",
    config: {
      host: "ftp.company.com",
      username: "export_user",
      path: "/pointages/"
    }
  },
  filters: {
    agencies: ["123", "456"],
    includeArchived: false
  }
}
```

---

## 📋 **Résumé des extensions à développer**

### 🔥 **Priorité HAUTE (MVP Admin)**

- [ ] Dashboard KPIs et graphiques (`/api/admin/dashboard/kpis`, `/charts`)
- [ ] Gestion utilisateurs étendue (bulk actions, profil complet)
- [ ] Planning calendaire et templates
- [ ] Rapports de base (ponctualité, performance)
- [ ] Configuration système de base

### 🚀 **Priorité MOYENNE (Fonctionnalités avancées)**

- [ ] Analytics temps réel et notifications
- [ ] Optimisation planning automatique
- [ ] Exports avancés et rapports programmés
- [ ] Audit et sécurité complets
- [ ] Gestion agences étendue

### ⭐ **Priorité BASSE (Nice to have)**

- [ ] Intégrations webhooks
- [ ] Templates notifications avancés
- [ ] IA prédictive charge travail
- [ ] API publique pour clients

### 📊 **Estimation développement**

- **MVP (Priorité haute)** : 6-8 semaines
- **Fonctionnalités avancées** : 4-6 semaines
- **Features complètes** : 2-4 semaines

**Total estimé : 12-18 semaines**
