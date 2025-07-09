// backend/src/models/Preparation.js
// ✅ Modèle Preparation complet avec workflow flexible

const mongoose = require('mongoose');
const { PREPARATION_STATUS, TIME_LIMITS, STEP_LABELS, STEP_DESCRIPTIONS, STEP_ICONS } = require('../utils/constants');

// ===== SOUS-SCHÉMAS =====

// Schéma pour les étapes de préparation
const preparationStepSchema = new mongoose.Schema({
  step: {
    type: String,
    enum: ['exterior', 'interior', 'fuel', 'tires_fluids', 'special_wash', 'parking'],
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

// Schéma véhicule intégré
const vehicleInfoSchema = new mongoose.Schema({
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
  // ✅ NOUVEAU : Type de véhicule pour facturation
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
    enum: ['damage', 'cleanliness', 'missing_item', 'mechanical', 'other']
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
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
  }
}, { _id: true });

// ===== SCHÉMA PRINCIPAL =====

const preparationSchema = new mongoose.Schema({
  // Support des deux modes (ObjectId ET objet intégré)
  vehicle: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Le véhicule est requis']
  },

  // Informations véhicule intégrées (backup)
  vehicleInfo: vehicleInfoSchema,

  // ✅ Champ principal requis
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le préparateur est requis']
  },

  // ✅ Champ compatibilité (sera synchronisé avec user)
  preparateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // Agence de facturation
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: [true, 'L\'agence est requise']
  },

  // Statut de la préparation
  status: {
    type: String,
    enum: Object.values(PREPARATION_STATUS),
    default: PREPARATION_STATUS.IN_PROGRESS
  },

  // ✅ Étapes avec ordre flexible
  steps: [preparationStepSchema],

  // Timing
  startTime: {
    type: Date,
    default: Date.now
  },

  endTime: Date,

  totalTime: {
    type: Number, // en minutes
    min: 0
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

  // ✅ Incidents signalés
  issues: [issueSchema],

  // Métadonnées
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      
      // Normaliser les données véhicule pour l'API
      if (ret.vehicle && typeof ret.vehicle === 'object' && !mongoose.Types.ObjectId.isValid(ret.vehicle)) {
        // C'est un objet véhicule intégré, on le garde tel quel
      } else if (ret.vehicleInfo) {
        // Utiliser vehicleInfo si vehicle est un ObjectId
        ret.vehicle = ret.vehicleInfo;
        delete ret.vehicleInfo;
      }
      
      return ret;
    }
  }
});

// ===== INDEX =====
preparationSchema.index({ user: 1, status: 1 });
preparationSchema.index({ agency: 1, createdAt: -1 });
preparationSchema.index({ 'vehicle.licensePlate': 1 });
preparationSchema.index({ status: 1, createdAt: -1 });
preparationSchema.index({ preparateur: 1, status: 1 }); // Pour compatibilité

// ===== MIDDLEWARE PRE-SAVE =====

// Synchroniser user et preparateur
preparationSchema.pre('save', function(next) {
  if (this.user && !this.preparateur) {
    this.preparateur = this.user;
  } else if (this.preparateur && !this.user) {
    this.user = this.preparateur;
  }
  next();
});

// Gérer les informations véhicule
preparationSchema.pre('save', function(next) {
  // Si vehicle est un objet (pas un ObjectId), le copier vers vehicleInfo
  if (this.vehicle && typeof this.vehicle === 'object' && !mongoose.Types.ObjectId.isValid(this.vehicle)) {
    this.vehicleInfo = this.vehicle;
  }
  next();
});

// Initialiser les étapes par défaut
preparationSchema.pre('save', function(next) {
  if (this.isNew && (!this.steps || this.steps.length === 0)) {
    this.steps = [
      { step: 'exterior', completed: false },
      { step: 'interior', completed: false },
      { step: 'fuel', completed: false },
      { step: 'tires_fluids', completed: false },
      { step: 'special_wash', completed: false },
      { step: 'parking', completed: false }
    ];
  }
  next();
});

// Mettre à jour le timestamp
preparationSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Middleware pre-save pour calculer totalTime
preparationSchema.pre('save', function(next) {
  // Calculer le temps total si endTime est défini
  if (this.endTime && this.startTime) {
    this.totalTime = Math.round((this.endTime - this.startTime) / (1000 * 60)); // en minutes
  }
  next();
});

// ===== MÉTHODES VIRTUELLES =====

// Progression en pourcentage
preparationSchema.virtual('progress').get(function() {
  if (!this.steps || this.steps.length === 0) return 0;
  const completedSteps = this.steps.filter(step => step.completed).length;
  return Math.round((completedSteps / this.steps.length) * 100);
});

// Durée actuelle en minutes
preparationSchema.virtual('currentDuration').get(function() {
  if (!this.startTime) return 0;
  const endTime = this.endTime || new Date();
  return Math.floor((endTime - this.startTime) / (1000 * 60));
});

// Respect du délai (30 minutes par défaut)
preparationSchema.virtual('isOnTime').get(function() {
  return this.currentDuration <= (TIME_LIMITS.PREPARATION_TIME || 30);
});

// Informations résumées
preparationSchema.virtual('summary').get(function() {
  const completed = this.steps.filter(s => s.completed).length;
  const total = this.steps.length;
  const issues = this.issues ? this.issues.length : 0;
  
  return {
    completed,
    total,
    progress: this.progress,
    duration: this.currentDuration,
    isOnTime: this.isOnTime,
    issues,
    status: this.status
  };
});

// ===== MÉTHODES D'INSTANCE MODIFIÉES POUR WORKFLOW FLEXIBLE =====

// ✅ Compléter une étape - SANS VALIDATION D'ORDRE
preparationSchema.methods.completeStep = function(stepType, data = {}) {
  const step = this.steps.find(s => s.step === stepType);
  if (!step) {
    throw new Error(`Étape "${stepType}" non trouvée`);
  }
  
  if (step.completed) {
    throw new Error(`Étape "${stepType}" déjà complétée`);
  }
  
  // ✅ SUPPRESSION : Plus de vérification que les étapes précédentes sont complétées
  // L'étape peut être complétée dans n'importe quel ordre
  
  step.completed = true;
  step.completedAt = new Date();
  step.notes = data.notes || '';
  
  if (data.photos && Array.isArray(data.photos)) {
    step.photos = data.photos;
  }
  
  return this.save();
};

// ✅ Finaliser la préparation - FLEXIBLE
preparationSchema.methods.complete = function(notes = '') {
  if (this.status !== PREPARATION_STATUS.IN_PROGRESS) {
    throw new Error('Seule une préparation en cours peut être finalisée');
  }
  
  // ✅ SUPPRESSION : Plus de validation "toutes les étapes complétées"
  // Vérifier qu'au moins UNE étape est complétée
  const completedSteps = this.steps.filter(step => step.completed).length;
  if (completedSteps === 0) {
    throw new Error('Au moins une étape doit être complétée pour terminer la préparation');
  }
  
  this.status = PREPARATION_STATUS.COMPLETED;
  this.endTime = new Date();
  this.totalTime = this.currentDuration;
  this.notes = notes;
  
  return this.save();
};

// ✅ Méthode utilitaire pour vérifier si une étape peut être complétée
preparationSchema.methods.canCompleteStep = function(stepType) {
  const step = this.steps.find(s => s.step === stepType);
  if (!step) {
    return { canComplete: false, reason: 'Étape non trouvée' };
  }
  
  if (step.completed) {
    return { canComplete: false, reason: 'Étape déjà complétée' };
  }
  
  if (this.status !== PREPARATION_STATUS.IN_PROGRESS) {
    return { canComplete: false, reason: 'Préparation non en cours' };
  }
  
  // ✅ NOUVELLE LOGIQUE : Toutes les étapes peuvent être complétées à tout moment
  return { canComplete: true, reason: null };
};

// ✅ Méthode utilitaire pour vérifier si la préparation peut être finalisée
preparationSchema.methods.canComplete = function() {
  if (this.status !== PREPARATION_STATUS.IN_PROGRESS) {
    return { canComplete: false, reason: 'Préparation non en cours' };
  }
  
  const completedSteps = this.steps.filter(step => step.completed).length;
  if (completedSteps === 0) {
    return { canComplete: false, reason: 'Aucune étape complétée' };
  }
  
  // ✅ NOUVELLE LOGIQUE : Peut être finalisée dès qu'une étape est faite
  return { canComplete: true, reason: null };
};

// ✅ Méthode pour obtenir les étapes disponibles (toutes les étapes non complétées)
preparationSchema.methods.getAvailableSteps = function() {
  return this.steps.filter(step => !step.completed).map(step => ({
    step: step.step,
    label: STEP_LABELS[step.step] || step.step,
    description: STEP_DESCRIPTIONS[step.step] || '',
    icon: STEP_ICONS[step.step] || '📋'
  }));
};

// ✅ Méthode pour obtenir les statistiques flexibles
preparationSchema.methods.getFlexibleStats = function() {
  const completedSteps = this.steps.filter(s => s.completed).length;
  const totalSteps = this.steps.length;
  const issues = this.issues ? this.issues.length : 0;
  
  return {
    completed: completedSteps,
    total: totalSteps,
    progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    canComplete: completedSteps > 0, // ✅ NOUVEAU : Peut terminer dès qu'une étape est faite
    duration: this.currentDuration,
    isOnTime: this.isOnTime,
    issues,
    status: this.status,
    availableSteps: this.getAvailableSteps(),
    nextSuggestedStep: this.getAvailableSteps()[0] || null // Première étape non complétée
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
  
  return this.save();
};

// Résoudre un incident
preparationSchema.methods.resolveIssue = function(issueId, resolvedBy) {
  const issue = this.issues.id(issueId);
  if (!issue) {
    throw new Error('Incident non trouvé');
  }
  
  issue.resolved = true;
  issue.resolvedAt = new Date();
  issue.resolvedBy = resolvedBy;
  
  return this.save();
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
              { $lte: ['$totalTime', TIME_LIMITS.PREPARATION_TIME || 30] },
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

module.exports = mongoose.model('Preparation', preparationSchema);