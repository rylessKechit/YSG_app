// backend/src/models/Preparation.js
// ✅ Modèle Preparation complet avec toutes les modifications

const mongoose = require('mongoose');
const { PREPARATION_STATUS, PREPARATION_STEPS, DEFAULT_STEPS, TIME_LIMITS } = require('../utils/constants');

// ===== SOUS-SCHÉMAS =====

// Schéma pour les étapes de préparation
const preparationStepSchema = new mongoose.Schema({
  step: {
    type: String,
    enum: Object.values(PREPARATION_STEPS),
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  duration: {
    type: Number, // en minutes
    min: 0
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  photos: [{
    url: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { _id: true });

// Schéma véhicule intégré (données de travail)
const vehicleDataSchema = new mongoose.Schema({
  licensePlate: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  brand: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  // ✅ NOUVEAU : Type de véhicule pour facturation différenciée
  vehicleType: {
    type: String,
    enum: ['particulier', 'utilitaire'],
    required: true,
    default: 'particulier'
  },
  year: {
    type: Number,
    min: 1990,
    max: new Date().getFullYear() + 2
  },
  fuelType: {
    type: String,
    enum: ['essence', 'diesel', 'electrique', 'hybride'],
    default: 'essence'
  },
  color: {
    type: String,
    trim: true,
    maxlength: 30
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  }
}, { _id: false });

// Schéma pour les incidents
const issueSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['damage', 'missing_item', 'technical', 'cleanliness', 'other']
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  photos: [{
    type: String // URLs Cloudinary
  }],
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: {
    type: String,
    maxlength: 500
  }
}, { _id: true });

// Schéma historique changement d'agence
const agencyChangeHistorySchema = new mongoose.Schema({
  fromAgency: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      required: true
    },
    name: String,
    code: String
  },
  toAgency: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      required: true
    },
    name: String,
    code: String
  },
  changedBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    email: String
  },
  reason: String,
  changedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// ✅ NOUVEAU : Schéma modifications admin
const adminModificationSchema = new mongoose.Schema({
  modifiedBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    email: String
  },
  modifiedAt: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: [
      'steps_modification', 
      'agency_change', 
      'status_change', 
      'priority_change',
      'notes_update',
      'assignment_change'
    ],
    required: true
  },
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  adminNotes: String,
  changes: {
    added: [mongoose.Schema.Types.Mixed],
    removed: [mongoose.Schema.Types.Mixed],
    modified: [mongoose.Schema.Types.Mixed]
  }
}, { _id: true });

// ===== SCHÉMA PRINCIPAL =====

const preparationSchema = new mongoose.Schema({
  // Référence vers l'utilisateur (préparateur)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le préparateur est requis'],
    index: true
  },

  // ✅ Champ de compatibilité (sera synchronisé avec user)
  preparateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // Référence vers l'agence
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: [true, 'L\'agence est requise'],
    index: true
  },

  // Référence vers le véhicule (optionnelle, peut être juste les données)
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: false
  },

  // ✅ Données véhicule intégrées (toujours présentes)
  vehicleData: {
    type: vehicleDataSchema,
    required: true
  },

  // Statut de la préparation
  status: {
    type: String,
    enum: Object.values(PREPARATION_STATUS),
    default: PREPARATION_STATUS.PENDING, // ✅ PENDING par défaut pour admin
    index: true
  },

  // ✅ NOUVEAU : Priorité (pour les admins)
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },

  // ✅ NOUVEAU : Qui a créé cette préparation
  createdBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'createdBy.role' // Référence dynamique selon le rôle
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'preparateur'],
      required: true
    }
  },

  // Étapes de préparation
  steps: [preparationStepSchema],

  // ✅ NOUVEAU : Étapes assignées (pour personnalisation admin)  
  assignedSteps: [{
    type: String,
    enum: Object.values(PREPARATION_STEPS)
  }],

  // Timing
  startTime: {
    type: Date,
    default: null // ✅ Null par défaut, sera rempli au démarrage
  },

  endTime: Date,

  totalTime: {
    type: Number, // en minutes
    min: 0
  },

  // Durée courante (calculée en temps réel)
  currentDuration: {
    type: Number,
    default: 0,
    min: 0
  },

  // Pourcentage de progression (calculé)
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Indique si la préparation est dans les temps
  isOnTime: {
    type: Boolean,
    default: null
  },

  // Contrôle qualité (optionnel)
  qualityCheck: {
    passed: {
      type: Boolean,
      default: false
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedAt: Date,
    notes: {
      type: String,
      maxlength: 500
    }
  },

  // Notes générales
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
  },

  // Incidents signalés
  issues: [issueSchema],

  // Historique des changements d'agence
  agencyHistory: [agencyChangeHistorySchema],

  // ✅ NOUVEAU : Historique des modifications admin
  adminModifications: [adminModificationSchema]

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// ===== INDEX POUR PERFORMANCE =====

preparationSchema.index({ user: 1, status: 1 });
preparationSchema.index({ agency: 1, createdAt: -1 });
preparationSchema.index({ 'vehicleData.licensePlate': 1 });
preparationSchema.index({ status: 1, priority: -1, createdAt: -1 });
preparationSchema.index({ preparateur: 1, status: 1 }); // Pour compatibilité
preparationSchema.index({ 'createdBy.id': 1, 'createdBy.role': 1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Synchroniser user et preparateur pour compatibilité
preparationSchema.pre('save', function(next) {
  if (this.user && !this.preparateur) {
    this.preparateur = this.user;
  } else if (this.preparateur && !this.user) {
    this.user = this.preparateur;
  }
  
  // Mettre à jour updatedAt
  this.updatedAt = new Date();
  
  next();
});

// ✅ NOUVEAU : Middleware pour gérer la création admin vs préparateur
preparationSchema.pre('save', function(next) {
  // Si créé par admin, s'assurer que le statut initial est correct
  if (this.isNew && this.createdBy?.role === 'admin') {
    // Pour les créations admin, commencer en PENDING
    if (!this.status || this.status === PREPARATION_STATUS.IN_PROGRESS) {
      this.status = PREPARATION_STATUS.PENDING;
    }
  }

  // Si créé par préparateur, commencer en IN_PROGRESS
  if (this.isNew && this.createdBy?.role === 'preparateur') {
    if (!this.status) {
      this.status = PREPARATION_STATUS.IN_PROGRESS;
    }
    
    // Auto-assigner startTime pour les préparateurs
    if (!this.startTime) {
      this.startTime = new Date();
    }
  }

  // Validation des étapes assignées
  if (this.assignedSteps && this.assignedSteps.length > 0) {
    // S'assurer que toutes les étapes assignées sont dans les étapes du document
    const stepTypes = this.steps.map(s => s.step);
    const missingSteps = this.assignedSteps.filter(step => !stepTypes.includes(step));
    
    if (missingSteps.length > 0) {
      // Ajouter les étapes manquantes
      missingSteps.forEach(stepType => {
        this.steps.push({
          step: stepType,
          completed: false,
          completedAt: null,
          notes: '',
          photos: []
        });
      });
    }
  }

  // Initialiser les étapes par défaut si aucune n'est définie
  if (this.isNew && this.steps.length === 0) {
    const defaultSteps = this.assignedSteps && this.assignedSteps.length > 0 
      ? this.assignedSteps 
      : DEFAULT_STEPS;
      
    this.steps = defaultSteps.map(stepType => ({
      step: stepType,
      completed: false,
      completedAt: null,
      notes: '',
      photos: []
    }));
  }

  next();
});

// ===== VIRTUALS =====

// Calculer la progression automatiquement
preparationSchema.virtual('calculatedProgress').get(function() {
  const totalSteps = this.steps.length;
  if (totalSteps === 0) return 0;
  
  const completedSteps = this.steps.filter(step => step.completed).length;
  return Math.round((completedSteps / totalSteps) * 100);
});

// ===== MÉTHODES D'INSTANCE =====

// ✅ NOUVEAU : Démarrer une préparation (transition PENDING -> IN_PROGRESS)
preparationSchema.methods.startPreparation = function(userId, userName, userEmail) {
  if (this.status !== PREPARATION_STATUS.PENDING) {
    throw new Error('Cette préparation ne peut pas être démarrée');
  }

  this.status = PREPARATION_STATUS.IN_PROGRESS;
  this.startTime = new Date();
  this.updatedAt = new Date();

  // Enregistrer qui a démarré la préparation
  if (!this.adminModifications) this.adminModifications = [];
  this.adminModifications.push({
    modifiedBy: {
      id: userId,
      name: userName || 'Utilisateur',
      email: userEmail || 'user@app.com'
    },
    modifiedAt: new Date(),
    type: 'status_change',
    previousValue: PREPARATION_STATUS.PENDING,
    newValue: PREPARATION_STATUS.IN_PROGRESS,
    adminNotes: 'Préparation démarrée par le préparateur'
  });

  return this.save();
};

// Compléter une étape
preparationSchema.methods.completeStep = function(stepType, photoUrl, notes) {
  const step = this.steps.find(s => s.step === stepType);
  if (!step) {
    throw new Error('Étape non trouvée');
  }

  step.completed = true;
  step.completedAt = new Date();
  step.notes = notes || step.notes;
  
  if (photoUrl) {
    step.photos.push({
      url: photoUrl,
      description: notes || `Photo étape ${stepType}`,
      uploadedAt: new Date()
    });
  }

  // Recalculer la progression
  this.progress = this.calculatedProgress;
  this.updatedAt = new Date();

  return this.save();
};

// Obtenir les étapes disponibles (non complétées)
preparationSchema.methods.getAvailableSteps = function() {
  return this.steps.filter(step => !step.completed);
};

// Obtenir les étapes complétées
preparationSchema.methods.getCompletedSteps = function() {
  return this.steps.filter(step => step.completed);
};

// Obtenir le statut détaillé
preparationSchema.methods.getDetailedStatus = function() {
  const totalSteps = this.steps.length;
  const completedSteps = this.steps.filter(step => step.completed).length;
  const issues = this.issues ? this.issues.length : 0;
  
  return {
    completed: completedSteps,
    total: totalSteps,
    progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    canComplete: completedSteps > 0, // Peut terminer dès qu'une étape est faite
    duration: this.currentDuration,
    isOnTime: this.isOnTime,
    issues,
    status: this.status,
    availableSteps: this.getAvailableSteps(),
    nextSuggestedStep: this.getAvailableSteps()[0] || null
  };
};

// Ajouter un incident
preparationSchema.methods.addIssue = function(issueData) {
  if (!this.issues) {
    this.issues = [];
  }
  
  this.issues.push({
    type: issueData.type,
    description: issueData.description,
    severity: issueData.severity || 'medium',
    photos: issueData.photos || []
  });
  
  this.updatedAt = new Date();
  return this.save();
};

// Résoudre un incident
preparationSchema.methods.resolveIssue = function(issueId, resolvedBy, resolution) {
  const issue = this.issues.id(issueId);
  if (!issue) {
    throw new Error('Incident non trouvé');
  }
  
  issue.resolved = true;
  issue.resolvedAt = new Date();
  issue.resolvedBy = resolvedBy;
  issue.resolution = resolution;
  
  this.updatedAt = new Date();
  return this.save();
};

// ✅ NOUVEAU : Calculer les statistiques admin
preparationSchema.methods.getAdminStats = function() {
  const totalSteps = this.steps.length;
  const completedSteps = this.steps.filter(s => s.completed).length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return {
    id: this._id,
    progress,
    totalSteps,
    completedSteps,
    status: this.status,
    priority: this.priority,
    createdBy: this.createdBy,
    isOverdue: this.isOverdue(),
    timeSpent: this.currentDuration || 0,
    lastModified: this.updatedAt
  };
};

// ✅ NOUVEAU : Vérifier si la préparation est en retard
preparationSchema.methods.isOverdue = function() {
  if (!this.startTime || this.status === PREPARATION_STATUS.COMPLETED) {
    return false;
  }

  const now = new Date();
  const timeSpent = now.getTime() - this.startTime.getTime();
  const maxTime = (TIME_LIMITS.PREPARATION_TIME || 120) * 60 * 1000; // Convertir minutes en millisecondes

  return timeSpent > maxTime;
};

// ===== MÉTHODES STATIQUES =====

// Trouver les préparations en cours pour un utilisateur
preparationSchema.statics.findInProgressByUser = function(userId) {
  return this.findOne({
    user: userId,
    status: PREPARATION_STATUS.IN_PROGRESS
  }).populate(['vehicle', 'agency']);
};

// Statistiques pour un utilisateur
preparationSchema.statics.getStatsForUser = function(userId, period = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: PREPARATION_STATUS.COMPLETED,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalPreparations: { $sum: 1 },
        averageTime: { $avg: '$totalTime' },
        onTimeCount: {
          $sum: {
            $cond: [
              { $lte: ['$totalTime', TIME_LIMITS.PREPARATION_TIME || 120] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalPreparations: 1,
        averageTime: { $round: ['$averageTime', 1] },
        onTimeRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeCount', '$totalPreparations'] }, 100] },
            1
          ]
        }
      }
    }
  ]);
};

// ✅ NOUVEAU : Obtenir les préparations en attente pour un utilisateur
preparationSchema.statics.findPendingByUser = function(userId) {
  return this.find({
    user: userId,
    status: PREPARATION_STATUS.PENDING
  })
  .populate(['agency'])
  .sort({ priority: -1, createdAt: 1 }); // Priorité desc, puis ancien en premier
};

// ✅ NOUVEAU : Statistiques admin globales
preparationSchema.statics.getAdminStats = function(filters = {}) {
  const matchStage = { ...filters };
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPreparations: { $sum: 1 },
        completedPreparations: {
          $sum: { $cond: [{ $eq: ['$status', PREPARATION_STATUS.COMPLETED] }, 1, 0] }
        },
        inProgressPreparations: {
          $sum: { $cond: [{ $eq: ['$status', PREPARATION_STATUS.IN_PROGRESS] }, 1, 0] }
        },
        pendingPreparations: {
          $sum: { $cond: [{ $eq: ['$status', PREPARATION_STATUS.PENDING] }, 1, 0] }
        },
        averageTime: { $avg: '$totalTime' },
        totalIssues: { $sum: { $size: { $ifNull: ['$issues', []] } } }
      }
    },
    {
      $project: {
        _id: 0,
        totalPreparations: 1,
        completedPreparations: 1,
        inProgressPreparations: 1,
        pendingPreparations: 1,
        completionRate: {
          $round: [
            { $multiply: [{ $divide: ['$completedPreparations', '$totalPreparations'] }, 100] },
            1
          ]
        },
        averageTime: { $round: ['$averageTime', 1] },
        totalIssues: 1
      }
    }
  ]);
};

module.exports = mongoose.model('Preparation', preparationSchema);