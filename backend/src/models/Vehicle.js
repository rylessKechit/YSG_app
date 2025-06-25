const mongoose = require('mongoose');
const { VEHICLE_STATUS } = require('../utils/constants');

const vehicleSchema = new mongoose.Schema({
  licensePlate: {
    type: String,
    required: [true, 'La plaque d\'immatriculation est requise'],
    unique: true,
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
    trim: true,
    maxlength: [50, 'La marque ne peut pas dépasser 50 caractères']
  },

  model: {
    type: String,
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
    max: [new Date().getFullYear() + 1, 'L\'année ne peut pas être dans le futur'],
    validate: {
      validator: Number.isInteger,
      message: 'L\'année doit être un nombre entier'
    }
  },

  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: [true, 'L\'agence est requise']
  },

  status: {
    type: String,
    enum: {
      values: Object.values(VEHICLE_STATUS),
      message: 'Statut de véhicule invalide'
    },
    default: VEHICLE_STATUS.AVAILABLE
  },

  // Référence vers la préparation en cours (si applicable)
  currentPreparation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Preparation'
  },

  // Informations techniques
  specifications: {
    fuelType: {
      type: String,
      enum: ['essence', 'diesel', 'electrique', 'hybride', 'autre'],
      default: 'essence'
    },
    transmission: {
      type: String,
      enum: ['manuelle', 'automatique'],
      default: 'manuelle'
    },
    seats: {
      type: Number,
      min: 2,
      max: 9,
      default: 5
    },
    category: {
      type: String,
      enum: ['citadine', 'compacte', 'berline', 'break', 'suv', 'utilitaire', 'luxe'],
      default: 'compacte'
    }
  },

  // Dernière préparation
  lastPreparation: {
    date: Date,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    duration: Number, // en minutes
    issues: [String] // Problèmes signalés
  },

  // Statistiques du véhicule
  stats: {
    totalPreparations: {
      type: Number,
      default: 0,
      min: 0
    },
    averagePreparationTime: {
      type: Number,
      default: 0,
      min: 0 // en minutes
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    }
  },

  // État et notes
  condition: {
    type: String,
    enum: ['excellent', 'bon', 'moyen', 'mauvais'],
    default: 'bon'
  },

  notes: {
    type: String,
    maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères']
  },

  // Flags spéciaux
  isActive: {
    type: Boolean,
    default: true
  },

  requiresSpecialCare: {
    type: Boolean,
    default: false
  },

  // Métadonnées
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
vehicleSchema.index({ licensePlate: 1, isActive: 1 });
vehicleSchema.index({ agency: 1, status: 1 });
vehicleSchema.index({ status: 1, agency: 1 });
vehicleSchema.index({ brand: 1, model: 1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Formater la plaque d'immatriculation
vehicleSchema.pre('save', function(next) {
  if (this.isModified('licensePlate')) {
    this.licensePlate = this.licensePlate.toUpperCase().replace(/\s+/g, '');
  }
  next();
});

// Mettre à jour le timestamp
vehicleSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Valider la cohérence du statut
vehicleSchema.pre('save', function(next) {
  // Si le véhicule est en préparation, il doit avoir une currentPreparation
  if (this.status === VEHICLE_STATUS.IN_PREPARATION && !this.currentPreparation) {
    return next(new Error('Un véhicule en préparation doit avoir une préparation associée'));
  }
  
  // Si le véhicule n'est pas en préparation, il ne doit pas avoir de currentPreparation
  if (this.status !== VEHICLE_STATUS.IN_PREPARATION && this.currentPreparation) {
    this.currentPreparation = undefined;
  }
  
  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Obtenir le nom complet du véhicule
vehicleSchema.methods.getFullName = function() {
  const parts = [this.brand, this.model].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Véhicule';
};

// Vérifier si le véhicule est disponible pour préparation
vehicleSchema.methods.isAvailableForPreparation = function() {
  return this.isActive && this.status === VEHICLE_STATUS.AVAILABLE;
};

// Démarrer une préparation
vehicleSchema.methods.startPreparation = async function(preparationId) {
  if (!this.isAvailableForPreparation()) {
    throw new Error('Ce véhicule n\'est pas disponible pour une préparation');
  }
  
  this.status = VEHICLE_STATUS.IN_PREPARATION;
  this.currentPreparation = preparationId;
  
  return await this.save();
};

// Terminer une préparation
vehicleSchema.methods.completePreparation = async function(preparationData = {}) {
  this.status = VEHICLE_STATUS.READY;
  this.currentPreparation = undefined;
  
  // Mettre à jour les informations de dernière préparation
  if (preparationData.user) {
    this.lastPreparation = {
      date: new Date(),
      user: preparationData.user,
      duration: preparationData.duration || 0,
      issues: preparationData.issues || []
    };
  }
  
  // Mettre à jour les statistiques
  await this.updateStats();
  
  return await this.save();
};

// Mettre le véhicule en location
vehicleSchema.methods.setRented = async function() {
  if (this.status !== VEHICLE_STATUS.READY) {
    throw new Error('Seul un véhicule prêt peut être loué');
  }
  
  this.status = VEHICLE_STATUS.RENTED;
  return await this.save();
};

// Remettre le véhicule disponible
vehicleSchema.methods.setAvailable = async function() {
  this.status = VEHICLE_STATUS.AVAILABLE;
  this.currentPreparation = undefined;
  return await this.save();
};

// Mettre à jour les statistiques
vehicleSchema.methods.updateStats = async function() {
  try {
    const Preparation = mongoose.model('Preparation');
    
    // Recalculer les stats basées sur toutes les préparations terminées
    const stats = await Preparation.aggregate([
      { 
        $match: { 
          vehicle: this._id, 
          status: 'completed' 
        }
      },
      {
        $group: {
          _id: null,
          totalPreparations: { $sum: 1 },
          averageTime: { $avg: '$totalMinutes' }
        }
      }
    ]);

    if (stats.length > 0) {
      const result = stats[0];
      this.stats.totalPreparations = result.totalPreparations;
      this.stats.averagePreparationTime = Math.round(result.averageTime || 0);
      this.stats.lastCalculated = new Date();
      
      await this.save();
    }
  } catch (error) {
    console.error('Erreur mise à jour stats véhicule:', error);
  }
};

// Obtenir l'historique des préparations
vehicleSchema.methods.getPreparationHistory = function(limit = 10) {
  const Preparation = mongoose.model('Preparation');
  
  return Preparation.find({ vehicle: this._id })
    .populate('user', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// ===== MÉTHODES STATIQUES =====

// Trouver les véhicules disponibles dans une agence
vehicleSchema.statics.findAvailable = function(agencyId) {
  return this.find({
    agency: agencyId,
    status: VEHICLE_STATUS.AVAILABLE,
    isActive: true
  }).sort({ licensePlate: 1 });
};

// Recherche avec filtres
vehicleSchema.statics.findWithFilters = function(filters = {}) {
  const query = { isActive: true };
  
  if (filters.agency) query.agency = filters.agency;
  if (filters.status) query.status = filters.status;
  if (filters.brand) query.brand = { $regex: filters.brand, $options: 'i' };
  if (filters.fuelType) query['specifications.fuelType'] = filters.fuelType;
  if (filters.category) query['specifications.category'] = filters.category;
  
  if (filters.search) {
    query.$or = [
      { licensePlate: { $regex: filters.search, $options: 'i' } },
      { brand: { $regex: filters.search, $options: 'i' } },
      { model: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  return this.find(query)
    .populate('agency', 'name code')
    .populate('currentPreparation', 'startTime user')
    .sort({ licensePlate: 1 });
};

// Obtenir les statistiques des véhicules
vehicleSchema.statics.getStats = function(agencyId = null) {
  const matchQuery = { isActive: true };
  if (agencyId) matchQuery.agency = agencyId;
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        statusCounts: {
          $push: {
            status: '$_id',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
};

// Trouver les véhicules nécessitant une attention
vehicleSchema.statics.findNeedingAttention = function() {
  return this.find({
    $or: [
      { requiresSpecialCare: true },
      { condition: { $in: ['moyen', 'mauvais'] } },
      { 
        status: VEHICLE_STATUS.IN_PREPARATION,
        'lastPreparation.date': { 
          $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) // Plus de 2h en préparation
        }
      }
    ],
    isActive: true
  })
  .populate('agency', 'name code')
  .populate('currentPreparation', 'startTime user')
  .sort({ updatedAt: -1 });
};

// ===== VIRTUAL FIELDS =====

// Nom complet virtuel
vehicleSchema.virtual('fullName').get(function() {
  return this.getFullName();
});

// Statut d'alerte virtuel
vehicleSchema.virtual('needsAttention').get(function() {
  return this.requiresSpecialCare || 
         ['moyen', 'mauvais'].includes(this.condition) ||
         (this.status === VEHICLE_STATUS.IN_PREPARATION && 
          this.lastPreparation?.date && 
          (new Date() - this.lastPreparation.date) > 2 * 60 * 60 * 1000);
});

// Durée en préparation virtuelle
vehicleSchema.virtual('preparationDuration').get(function() {
  if (this.status !== VEHICLE_STATUS.IN_PREPARATION || !this.lastPreparation?.date) {
    return 0;
  }
  return Math.floor((new Date() - this.lastPreparation.date) / (1000 * 60));
});

// Assurer que les champs virtuels sont inclus dans JSON
vehicleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);