const mongoose = require('mongoose');
const { PREPARATION_STATUS, PREPARATION_STEPS, TIME_LIMITS } = require('../utils/constants');

// Schéma pour une étape de préparation
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
        // Si l'étape est complétée, une photo est requise
        return !this.completed || (value && value.length > 0);
      },
      message: 'Une photo est requise pour valider une étape'
    }
  },

  photoPublicId: {
    type: String // ID Cloudinary pour pouvoir supprimer l'image si besoin
  },

  completedAt: {
    type: Date,
    validate: {
      validator: function(value) {
        // Si l'étape est complétée, la date de completion est requise
        return !this.completed || value;
      },
      message: 'La date de completion est requise pour une étape terminée'
    }
  },

  notes: {
    type: String,
    maxlength: [200, 'Les notes d\'étape ne peuvent pas dépasser 200 caractères']
  },

  // Temps passé sur cette étape (en minutes)
  duration: {
    type: Number,
    min: 0
  }

}, {
  _id: true,
  timestamps: true
});

// Schéma principal de préparation
const preparationSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Le véhicule est requis']
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
        if (!value) return true; // Optionnel si pas encore terminé
        return value > this.startTime;
      },
      message: 'L\'heure de fin doit être après l\'heure de début'
    }
  },

  // Temps total en minutes (calculé automatiquement)
  totalMinutes: {
    type: Number,
    min: 0
  },

  // Les 6 étapes de préparation
  steps: [stepSchema],

  status: {
    type: String,
    enum: {
      values: Object.values(PREPARATION_STATUS),
      message: 'Statut de préparation invalide'
    },
    default: PREPARATION_STATUS.IN_PROGRESS
  },

  // Notes générales ou incidents
  notes: {
    type: String,
    maxlength: [1000, 'Les notes ne peuvent pas dépasser 1000 caractères']
  },

  // Respect du délai de 30min
  isOnTime: {
    type: Boolean,
    default: null // Calculé automatiquement à la fin
  },

  // Problèmes rencontrés
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

  // Évaluation de qualité (optionnelle)
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
      return ret;
    }
  }
});

// ===== INDEX =====

// Index pour les recherches fréquentes
preparationSchema.index({ vehicle: 1, status: 1 });
preparationSchema.index({ user: 1, createdAt: -1 });
preparationSchema.index({ agency: 1, createdAt: -1 });
preparationSchema.index({ status: 1, createdAt: -1 });
preparationSchema.index({ startTime: 1, agency: 1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Calculer automatiquement les durées et statuts
preparationSchema.pre('save', function(next) {
  // Calculer le temps total si la préparation est terminée
  if (this.endTime && this.startTime) {
    this.totalMinutes = Math.round((this.endTime - this.startTime) / (1000 * 60));
    this.isOnTime = this.totalMinutes <= TIME_LIMITS.PREPARATION_MAX_MINUTES;
  }

  // Initialiser les étapes si elles n'existent pas
  if (this.isNew && this.steps.length === 0) {
    this.steps = Object.values(PREPARATION_STEPS).map(stepType => ({
      type: stepType,
      completed: false
    }));
  }

  // Mettre à jour le statut selon l'état des étapes
  if (this.status === PREPARATION_STATUS.IN_PROGRESS) {
    const completedSteps = this.steps.filter(step => step.completed);
    if (completedSteps.length > 0 && this.endTime) {
      this.status = PREPARATION_STATUS.COMPLETED;
    }
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

// ===== MÉTHODES D'INSTANCE =====

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
  // Vérifier qu'au moins une étape est complétée
  const completedSteps = this.steps.filter(step => step.completed);
  
  if (completedSteps.length === 0) {
    throw new Error('Au moins une étape doit être complétée pour terminer la préparation');
  }

  this.endTime = new Date();
  this.status = PREPARATION_STATUS.COMPLETED;
  if (notes) this.notes = notes;

  return this;
};

// Annuler la préparation
preparationSchema.methods.cancel = function(reason = '') {
  this.status = PREPARATION_STATUS.CANCELLED;
  this.endTime = new Date();
  if (reason) this.notes = reason;

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

// Obtenir un résumé de la préparation
preparationSchema.methods.getSummary = function() {
  const formatTime = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${mins}min`;
  };

  return {
    id: this._id,
    startTime: formatTime(this.startTime),
    endTime: formatTime(this.endTime),
    duration: formatDuration(this.totalMinutes),
    progress: this.getProgress(),
    isOnTime: this.isOnTime,
    status: this.status,
    completedSteps: this.steps.filter(step => step.completed).length,
    totalSteps: this.steps.length,
    hasIssues: this.issues.length > 0
  };
};

// ===== MÉTHODES STATIQUES =====

// Trouver les préparations en cours
preparationSchema.statics.findInProgress = function(agencyId = null) {
  const query = { status: PREPARATION_STATUS.IN_PROGRESS };
  if (agencyId) query.agency = agencyId;

  return this.find(query)
    .populate('vehicle', 'licensePlate brand model')
    .populate('user', 'firstName lastName')
    .populate('agency', 'name code')
    .sort({ startTime: 1 });
};

// Obtenir les statistiques de préparation
preparationSchema.statics.getStats = function(filters = {}) {
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
        _id: null,
        totalPreparations: { $sum: 1 },
        averageTime: { $avg: '$totalMinutes' },
        onTimeCount: {
          $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] }
        },
        minTime: { $min: '$totalMinutes' },
        maxTime: { $max: '$totalMinutes' },
        totalIssues: { $sum: { $size: '$issues' } }
      }
    },
    {
      $project: {
        totalPreparations: 1,
        averageTime: { $round: ['$averageTime', 1] },
        onTimeRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeCount', '$totalPreparations'] }, 100] },
            2
          ]
        },
        minTime: 1,
        maxTime: 1,
        totalIssues: 1,
        issueRate: {
          $round: [
            { $multiply: [{ $divide: ['$totalIssues', '$totalPreparations'] }, 100] },
            2
          ]
        }
      }
    }
  ]);
};

// Trouver les préparations qui dépassent le temps limite
preparationSchema.statics.findOvertime = function() {
  const cutoffTime = new Date(Date.now() - TIME_LIMITS.PREPARATION_MAX_MINUTES * 60 * 1000);
  
  return this.find({
    status: PREPARATION_STATUS.IN_PROGRESS,
    startTime: { $lt: cutoffTime }
  })
  .populate('vehicle', 'licensePlate')
  .populate('user', 'firstName lastName email')
  .populate('agency', 'name code')
  .sort({ startTime: 1 });
};

// ===== VIRTUAL FIELDS =====

// Progression virtuelle
preparationSchema.virtual('progress').get(function() {
  return this.getProgress();
});

// Résumé virtuel
preparationSchema.virtual('summary').get(function() {
  return this.getSummary();
});

// Durée actuelle virtuelle (pour les préparations en cours)
preparationSchema.virtual('currentDuration').get(function() {
  if (this.endTime) return this.totalMinutes;
  
  const now = new Date();
  return Math.round((now - this.startTime) / (1000 * 60));
});

// Assurer que les champs virtuels sont inclus dans JSON
preparationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Preparation', preparationSchema);