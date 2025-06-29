const mongoose = require('mongoose');
const { PREPARATION_STATUS, PREPARATION_STEPS, TIME_LIMITS } = require('../utils/constants');

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

const preparationSchema = new mongoose.Schema({
  // Références
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Le véhicule est requis']
  },

  preparateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le préparateur est requis']
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
  notes: String,

  // Signature de fin
  signature: {
    preparateur: String, // Base64 de la signature
    signedAt: Date
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
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== INDEX =====
preparationSchema.index({ preparateur: 1, createdAt: -1 });
preparationSchema.index({ agency: 1, createdAt: -1 });
preparationSchema.index({ vehicle: 1 });
preparationSchema.index({ status: 1, createdAt: -1 });

// ===== VIRTUELS =====

// Durée en format lisible
preparationSchema.virtual('formattedDuration').get(function() {
  if (!this.totalTime) return '--';
  
  const hours = Math.floor(this.totalTime / 60);
  const minutes = this.totalTime % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
});

// Statut de retard
preparationSchema.virtual('isOvertime').get(function() {
  if (!this.totalTime) return false;
  return this.totalTime > TIME_LIMITS.PREPARATION_MAX_MINUTES;
});

// Pourcentage de completion
preparationSchema.virtual('completionPercentage').get(function() {
  if (!this.steps || this.steps.length === 0) return 0;
  
  const completedSteps = this.steps.filter(step => step.completed).length;
  return Math.round((completedSteps / this.steps.length) * 100);
});

// ===== MIDDLEWARE =====

// Middleware pre-save pour calculer totalTime
preparationSchema.pre('save', function(next) {
  // Calculer le temps total si endTime est défini
  if (this.endTime && this.startTime) {
    this.totalTime = Math.round((this.endTime - this.startTime) / (1000 * 60)); // en minutes
  }

  this.updatedAt = new Date();
  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Marquer une étape comme complétée
preparationSchema.methods.completeStep = function(stepName, notes = '', photos = []) {
  const step = this.steps.find(s => s.step === stepName);
  
  if (!step) {
    throw new Error(`Étape ${stepName} non trouvée`);
  }

  if (step.completed) {
    throw new Error(`Étape ${stepName} déjà complétée`);
  }

  step.completed = true;
  step.completedAt = new Date();
  step.notes = notes;
  step.photos = photos;

  // Si c'était la première étape, enregistrer l'heure de début
  const firstCompletedStep = this.steps.find(s => s.completed);
  if (!firstCompletedStep || firstCompletedStep.step === stepName) {
    if (!this.startTime) {
      this.startTime = new Date();
    }
  }

  return this.save();
};

// Terminer la préparation
preparationSchema.methods.complete = function(signature = null) {
  // Vérifier que toutes les étapes sont complétées
  const incompleteSteps = this.steps.filter(step => !step.completed);
  
  if (incompleteSteps.length > 0) {
    throw new Error(`Étapes incomplètes: ${incompleteSteps.map(s => s.step).join(', ')}`);
  }

  this.status = PREPARATION_STATUS.COMPLETED;
  this.endTime = new Date();
  
  if (signature) {
    this.signature = {
      preparateur: signature,
      signedAt: new Date()
    };
  }

  return this.save();
};

// Annuler la préparation
preparationSchema.methods.cancel = function(reason = '') {
  this.status = PREPARATION_STATUS.CANCELLED;
  this.notes = this.notes ? `${this.notes}\n\nAnnulé: ${reason}` : `Annulé: ${reason}`;
  
  return this.save();
};

// ===== MÉTHODES STATIQUES =====

// Trouver les préparations en retard - MÉTHODE AJOUTÉE
preparationSchema.statics.findOvertime = function(filters = {}) {
  return this.find({
    ...filters,
    status: PREPARATION_STATUS.IN_PROGRESS,
    $expr: {
      $gt: [
        { $divide: [{ $subtract: [new Date(), '$startTime'] }, 1000 * 60] },
        TIME_LIMITS.PREPARATION_MAX_MINUTES
      ]
    }
  })
  .populate('preparateur', 'firstName lastName email')
  .populate('vehicle', 'licensePlate model')
  .populate('agency', 'name')
  .sort({ startTime: 1 });
};

// Statistiques par préparateur
preparationSchema.statics.getPreparateurStats = function(preparateurId, dateRange = {}) {
  const matchStage = {
    preparateur: preparateurId,
    status: PREPARATION_STATUS.COMPLETED
  };

  if (dateRange.start && dateRange.end) {
    matchStage.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPreparations: { $sum: 1 },
        averageTime: { $avg: '$totalTime' },
        minTime: { $min: '$totalTime' },
        maxTime: { $max: '$totalTime' },
        onTimePreparations: {
          $sum: {
            $cond: [
              { $lte: ['$totalTime', TIME_LIMITS.PREPARATION_MAX_MINUTES] },
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
        minTime: 1,
        maxTime: 1,
        onTimePreparations: 1,
        onTimeRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimePreparations', '$totalPreparations'] }, 100] },
            1
          ]
        }
      }
    }
  ]);
};

// Statistiques par agence
preparationSchema.statics.getAgencyStats = function(agencyId, dateRange = {}) {
  const matchStage = {
    agency: agencyId,
    status: PREPARATION_STATUS.COMPLETED
  };

  if (dateRange.start && dateRange.end) {
    matchStage.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$preparateur',
        totalPreparations: { $sum: 1 },
        averageTime: { $avg: '$totalTime' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'preparateur'
      }
    },
    {
      $unwind: '$preparateur'
    },
    {
      $project: {
        _id: 0,
        preparateur: {
          _id: '$preparateur._id',
          firstName: '$preparateur.firstName',
          lastName: '$preparateur.lastName'
        },
        totalPreparations: 1,
        averageTime: { $round: ['$averageTime', 1] }
      }
    },
    {
      $sort: { totalPreparations: -1 }
    }
  ]);
};

// Récupérer les préparations du jour pour un préparateur
preparationSchema.statics.getTodayPreparations = function(preparateurId) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  return this.find({
    preparateur: preparateurId,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  })
  .populate('vehicle', 'licensePlate model brand')
  .populate('agency', 'name')
  .sort({ createdAt: -1 });
};

// Récupérer les préparations en cours
preparationSchema.statics.getInProgress = function(filters = {}) {
  return this.find({
    ...filters,
    status: PREPARATION_STATUS.IN_PROGRESS
  })
  .populate('preparateur', 'firstName lastName')
  .populate('vehicle', 'licensePlate model')
  .populate('agency', 'name')
  .sort({ startTime: 1 });
};

// Statistiques globales
preparationSchema.statics.getGlobalStats = function(dateRange = {}) {
  const matchStage = {
    status: PREPARATION_STATUS.COMPLETED
  };

  if (dateRange.start && dateRange.end) {
    matchStage.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPreparations: { $sum: 1 },
        averageTime: { $avg: '$totalTime' },
        minTime: { $min: '$totalTime' },
        maxTime: { $max: '$totalTime' },
        onTimePreparations: {
          $sum: {
            $cond: [
              { $lte: ['$totalTime', TIME_LIMITS.PREPARATION_MAX_MINUTES] },
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
        minTime: 1,
        maxTime: 1,
        onTimePreparations: 1,
        onTimeRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimePreparations', '$totalPreparations'] }, 100] },
            1
          ]
        }
      }
    }
  ]);
};

// Générer les étapes par défaut pour un véhicule
preparationSchema.statics.generateDefaultSteps = function() {
  return Object.values(PREPARATION_STEPS).map(step => ({
    step,
    completed: false
  }));
};

// Recherche avancée
preparationSchema.statics.advancedSearch = function(filters = {}) {
  const {
    preparateur,
    agency,
    vehicle,
    status,
    dateStart,
    dateEnd,
    isOvertime,
    search,
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc'
  } = filters;

  const matchStage = {};

  // Filtres de base
  if (preparateur) matchStage.preparateur = preparateur;
  if (agency) matchStage.agency = agency;
  if (vehicle) matchStage.vehicle = vehicle;
  if (status) matchStage.status = status;

  // Filtre de dates
  if (dateStart || dateEnd) {
    matchStage.createdAt = {};
    if (dateStart) matchStage.createdAt.$gte = new Date(dateStart);
    if (dateEnd) matchStage.createdAt.$lte = new Date(dateEnd);
  }

  // Filtre overtime
  if (isOvertime !== undefined) {
    if (isOvertime) {
      matchStage.totalTime = { $gt: TIME_LIMITS.PREPARATION_MAX_MINUTES };
    } else {
      matchStage.totalTime = { $lte: TIME_LIMITS.PREPARATION_MAX_MINUTES };
    }
  }

  const aggregationPipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'preparateur',
        foreignField: '_id',
        as: 'preparateurInfo'
      }
    },
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicle',
        foreignField: '_id',
        as: 'vehicleInfo'
      }
    },
    {
      $lookup: {
        from: 'agencies',
        localField: 'agency',
        foreignField: '_id',
        as: 'agencyInfo'
      }
    },
    {
      $unwind: '$preparateurInfo'
    },
    {
      $unwind: '$vehicleInfo'
    },
    {
      $unwind: '$agencyInfo'
    }
  ];

  // Recherche textuelle
  if (search) {
    aggregationPipeline.push({
      $match: {
        $or: [
          { 'preparateurInfo.firstName': { $regex: search, $options: 'i' } },
          { 'preparateurInfo.lastName': { $regex: search, $options: 'i' } },
          { 'vehicleInfo.licensePlate': { $regex: search, $options: 'i' } },
          { 'vehicleInfo.model': { $regex: search, $options: 'i' } },
          { 'agencyInfo.name': { $regex: search, $options: 'i' } }
        ]
      }
    });
  }

  // Tri
  const sortStage = {};
  sortStage[sort] = order === 'desc' ? -1 : 1;
  aggregationPipeline.push({ $sort: sortStage });

  // Pagination
  const skip = (page - 1) * limit;
  aggregationPipeline.push({ $skip: skip });
  aggregationPipeline.push({ $limit: parseInt(limit) });

  return this.aggregate(aggregationPipeline);
};

module.exports = mongoose.model('Preparation', preparationSchema);