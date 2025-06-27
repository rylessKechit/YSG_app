const mongoose = require('mongoose');
const { PREPARATION_STATUS, PREPARATION_STEPS, TIME_LIMITS } = require('../utils/constants');

// Schéma pour les informations véhicule (intégré)
const vehicleInfoSchema = new mongoose.Schema({
  licensePlate: {
    type: String,
    required: [true, 'La plaque d\'immatriculation est requise'],
    uppercase: true,
    trim: true,
    maxlength: [15, 'La plaque ne peut pas dépasser 15 caractères'],
    match: [
      /^[A-Z0-9\-]{2,15}$/,
      'Format de plaque invalide'
    ]
  },
  brand: {
    type: String,
    required: [true, 'La marque est requise'],
    trim: true,
    maxlength: [50, 'La marque ne peut pas dépasser 50 caractères']
  },
  model: {
    type: String,
    required: [true, 'Le modèle est requis'],
    trim: true,
    maxlength: [50, 'Le modèle ne peut pas dépasser 50 caractères']
  },
  color: {
    type: String,
    trim: true,
    maxlength: [30, 'La couleur ne peut pas dépasser 30 caractères']
  },
  year: {
    type: Number,
    min: [1990, 'L\'année ne peut pas être antérieure à 1990'],
    max: [new Date().getFullYear() + 1, 'L\'année ne peut pas être dans le futur']
  },
  fuelType: {
    type: String,
    enum: ['essence', 'diesel', 'electrique', 'hybride', 'autre'],
    default: 'essence'
  },
  condition: {
    type: String,
    enum: ['excellent', 'bon', 'moyen', 'mauvais'],
    default: 'bon'
  },
  notes: {
    type: String,
    maxlength: [500, 'Les notes véhicule ne peuvent pas dépasser 500 caractères']
  }
}, { _id: false });

// Schéma pour une étape de préparation (inchangé)
const stepSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: {
      values: Object.values(PREPARATION_STEPS),
      message: 'Type d\'étape invalide'
    },
    required: [true, 'Le type d\'étape est requis']
  },
  completed: {
    type: Boolean,
    default: false
  },
  photoUrl: {
    type: String,
    validate: {
      validator: function(value) {
        return !this.completed || (value && value.length > 0);
      },
      message: 'Une photo est requise pour valider une étape'
    }
  },
  photoPublicId: {
    type: String
  },
  completedAt: {
    type: Date,
    validate: {
      validator: function(value) {
        return !this.completed || value;
      },
      message: 'La date de completion est requise pour une étape terminée'
    }
  },
  notes: {
    type: String,
    maxlength: [200, 'Les notes d\'étape ne peuvent pas dépasser 200 caractères']
  },
  duration: {
    type: Number,
    min: 0
  }
}, {
  _id: true,
  timestamps: true
});

// Schéma principal de préparation (simplifié)
const preparationSchema = new mongoose.Schema({
  // ✅ Informations véhicule directement intégrées
  vehicle: {
    type: vehicleInfoSchema,
    required: [true, 'Les informations véhicule sont requises']
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },

  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: [true, 'L\'agence est requise']
  },

  startTime: {
    type: Date,
    default: Date.now,
    required: [true, 'L\'heure de début est requise']
  },

  endTime: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true;
        return value > this.startTime;
      },
      message: 'L\'heure de fin doit être après l\'heure de début'
    }
  },

  totalMinutes: {
    type: Number,
    min: 0
  },

  steps: [stepSchema],

  status: {
    type: String,
    enum: {
      values: Object.values(PREPARATION_STATUS),
      message: 'Statut de préparation invalide'
    },
    default: PREPARATION_STATUS.IN_PROGRESS
  },

  notes: {
    type: String,
    maxlength: [1000, 'Les notes ne peuvent pas dépasser 1000 caractères']
  },

  isOnTime: {
    type: Boolean,
    default: null
  },

  issues: [{
    type: {
      type: String,
      enum: ['damage', 'missing_key', 'fuel_problem', 'cleanliness', 'mechanical', 'other'],
      required: true
    },
    description: {
      type: String,
      required: [true, 'La description du problème est requise'],
      maxlength: [300, 'La description ne peut pas dépasser 300 caractères']
    },
    photoUrl: String,
    photoPublicId: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],

  qualityRating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [300, 'Le commentaire ne peut pas dépasser 300 caractères']
    },
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ratedAt: Date
  },

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
      return ret;
    }
  }
});

// ===== INDEX =====
preparationSchema.index({ 'vehicle.licensePlate': 1, createdAt: -1 });
preparationSchema.index({ user: 1, createdAt: -1 });
preparationSchema.index({ agency: 1, createdAt: -1 });
preparationSchema.index({ status: 1, createdAt: -1 });

// ===== MIDDLEWARE PRE-SAVE =====
preparationSchema.pre('save', function(next) {
  // Calculer le temps total si terminé
  if (this.endTime && this.startTime) {
    this.totalMinutes = Math.round((this.endTime - this.startTime) / (1000 * 60));
    this.isOnTime = this.totalMinutes <= TIME_LIMITS.PREPARATION_MAX_MINUTES;
  }

  // Initialiser les étapes si nouvelles
  if (this.isNew && this.steps.length === 0) {
    this.steps = Object.values(PREPARATION_STEPS).map(stepType => ({
      type: stepType,
      completed: false
    }));
  }

  // Mettre à jour le statut
  if (this.status === PREPARATION_STATUS.IN_PROGRESS) {
    const completedSteps = this.steps.filter(step => step.completed);
    if (completedSteps.length > 0 && this.endTime) {
      this.status = PREPARATION_STATUS.COMPLETED;
    }
  }

  // Formater la plaque en majuscules
  if (this.vehicle && this.vehicle.licensePlate) {
    this.vehicle.licensePlate = this.vehicle.licensePlate.toUpperCase();
  }

  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Obtenir le nom complet du véhicule
preparationSchema.methods.getVehicleFullName = function() {
  const parts = [this.vehicle.brand, this.vehicle.model].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Véhicule';
};

// Obtenir le pourcentage d'avancement
preparationSchema.methods.getProgress = function() {
  if (this.steps.length === 0) return 0;
  const completedSteps = this.steps.filter(step => step.completed);
  return Math.round((completedSteps.length / this.steps.length) * 100);
};

// Compléter une étape
preparationSchema.methods.completeStep = function(stepType, photoUrl, photoPublicId = null, notes = '') {
  const step = this.steps.find(s => s.type === stepType);
  
  if (!step) {
    throw new Error('Type d\'étape invalide');
  }
  
  if (step.completed) {
    throw new Error('Cette étape est déjà terminée');
  }

  step.completed = true;
  step.completedAt = new Date();
  step.photoUrl = photoUrl;
  step.photoPublicId = photoPublicId;
  step.notes = notes;

  return step;
};

// Terminer la préparation
preparationSchema.methods.complete = function(notes = '') {
  const completedSteps = this.steps.filter(step => step.completed);
  
  if (completedSteps.length === 0) {
    throw new Error('Au moins une étape doit être complétée pour terminer la préparation');
  }

  this.endTime = new Date();
  this.status = PREPARATION_STATUS.COMPLETED;
  if (notes) this.notes = notes;

  return this;
};

// Ajouter un problème
preparationSchema.methods.addIssue = function(type, description, photoUrl = null, photoPublicId = null) {
  this.issues.push({
    type,
    description,
    photoUrl,
    photoPublicId,
    reportedAt: new Date()
  });

  return this;
};

// ===== MÉTHODES STATIQUES =====

// Trouver par plaque d'immatriculation
preparationSchema.statics.findByLicensePlate = function(licensePlate, limit = 10) {
  return this.find({
    'vehicle.licensePlate': licensePlate.toUpperCase()
  })
  .populate('user', 'firstName lastName')
  .populate('agency', 'name code client')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Statistiques véhicules les plus préparés
preparationSchema.statics.getVehicleStats = function(filters = {}) {
  const matchQuery = { status: PREPARATION_STATUS.COMPLETED };
  
  if (filters.startDate && filters.endDate) {
    matchQuery.createdAt = { $gte: filters.startDate, $lte: filters.endDate };
  }
  if (filters.userId) matchQuery.user = filters.userId;
  if (filters.agencyId) matchQuery.agency = filters.agencyId;

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          licensePlate: '$vehicle.licensePlate',
          brand: '$vehicle.brand',
          model: '$vehicle.model'
        },
        totalPreparations: { $sum: 1 },
        averageTime: { $avg: '$totalMinutes' },
        lastPreparation: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        licensePlate: '$_id.licensePlate',
        brand: '$_id.brand',
        model: '$_id.model',
        fullName: { $concat: ['$_id.brand', ' ', '$_id.model'] },
        totalPreparations: 1,
        averageTime: { $round: ['$averageTime', 1] },
        lastPreparation: 1
      }
    },
    { $sort: { totalPreparations: -1 } },
    { $limit: 20 }
  ]);
};

// ===== VIRTUAL FIELDS =====
preparationSchema.virtual('vehicleFullName').get(function() {
  return this.getVehicleFullName();
});

preparationSchema.virtual('progress').get(function() {
  return this.getProgress();
});

preparationSchema.virtual('currentDuration').get(function() {
  if (this.endTime) return this.totalMinutes;
  const now = new Date();
  return Math.round((now - this.startTime) / (1000 * 60));
});

preparationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Preparation', preparationSchema);