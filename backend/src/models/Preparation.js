// backend/src/models/Preparation.js
const mongoose = require('mongoose');
const { PREPARATION_STATUS, TIME_LIMITS } = require('../utils/constants');

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
  notes: String,
  photos: [{
    url: String,
    description: String,
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
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    min: 1990,
    max: new Date().getFullYear() + 1
  },
  fuelType: {
    type: String,
    enum: ['essence', 'diesel', 'electrique', 'hybride'],
    default: 'essence'
  }
}, { _id: false });

const preparationSchema = new mongoose.Schema({
  // Support des deux modes (ObjectId ET objet intégré)
  vehicle: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Le véhicule est requis']
  },

  // Informations véhicule intégrées
  vehicleInfo: vehicleInfoSchema,

  // ✅ CORRECTION: Champ principal requis
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le préparateur est requis']
  },

  // ✅ CORRECTION: Champ compatibilité NON requis
  preparateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // ← CHANGEMENT CRITIQUE
  },

  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: [true, 'L\'agence est requise']
  },

  // Informations de préparation
  status: {
    type: String,
    enum: Object.values(PREPARATION_STATUS),
    default: PREPARATION_STATUS.IN_PROGRESS
  },

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

  // Contrôle qualité
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
    notes: String
  },

  // Notes générales
  notes: {
    type: String,
    maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères']
  },

  // Incidents signalés
  issues: [{
    type: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
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
    photos: [String], // URLs des photos
    resolved: {
      type: Boolean,
      default: false
    }
  }],

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

// ===== MIDDLEWARE PRE-SAVE =====

// ✅ AMÉLIORER le middleware de synchronisation
preparationSchema.pre('save', function(next) {
  // Synchroniser user et preparateur
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

// Mettre à jour le timestamp
preparationSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
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

// Middleware pre-save pour calculer totalTime
preparationSchema.pre('save', function(next) {
  // Calculer le temps total si endTime est défini
  if (this.endTime && this.startTime) {
    this.totalTime = Math.round((this.endTime - this.startTime) / (1000 * 60)); // en minutes
  }

  this.updatedAt = new Date();
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

// Respect du délai (30 minutes)
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

// ===== MÉTHODES D'INSTANCE =====

// Compléter une étape
preparationSchema.methods.completeStep = function(stepType, data = {}) {
  const step = this.steps.find(s => s.step === stepType);
  if (!step) {
    throw new Error(`Étape "${stepType}" non trouvée`);
  }
  
  if (step.completed) {
    throw new Error(`Étape "${stepType}" déjà complétée`);
  }
  
  step.completed = true;
  step.completedAt = new Date();
  step.notes = data.notes || '';
  
  if (data.photos && Array.isArray(data.photos)) {
    step.photos = data.photos;
  }
  
  return this.save();
};

// Finaliser la préparation
preparationSchema.methods.complete = function(notes = '') {
  if (this.status !== PREPARATION_STATUS.IN_PROGRESS) {
    throw new Error('Seule une préparation en cours peut être finalisée');
  }
  
  this.status = PREPARATION_STATUS.COMPLETED;
  this.endTime = new Date();
  this.totalTime = this.currentDuration;
  this.notes = notes;
  
  return this.save();
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

module.exports = mongoose.model('Preparation', preparationSchema);