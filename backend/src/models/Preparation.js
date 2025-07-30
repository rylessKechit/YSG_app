// backend/src/models/Preparation.js - VERSION CORRIGÉE COMPLÈTE
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

// ✅ SCHÉMA VÉHICULE UNIFIÉ (remplace vehicleInfo ET vehicleData)
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
    default: 'N/A' // ✅ Valeur par défaut pour éviter les chaînes vides
  },
  model: {
    type: String,
    required: true,
    trim: true,
    default: 'Véhicule'
  },
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
    maxlength: 30,
    default: ''
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
    enum: ['damage', 'cleanliness', 'missing_item', 'mechanical', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
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
  photos: [String],
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: String
}, { _id: true });

// ===== SCHÉMA PRINCIPAL UNIFIÉ =====

const preparationSchema = new mongoose.Schema({
  // Référence vers l'utilisateur (préparateur)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le préparateur est requis'],
    index: true
  },

  // ✅ COMPATIBILITÉ : Ancien champ préparateur (sera supprimé après migration)
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

  // Référence vers le véhicule (optionnelle)
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: false
  },

  // ✅ DONNÉES VÉHICULE UNIFIÉES (source unique de vérité)
  vehicleData: {
    type: vehicleDataSchema,
    required: true
  },

  // ✅ COMPATIBILITÉ : Ancien champ vehicleInfo (DEPRECATED - sera supprimé)
  vehicleInfo: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },

  // Statut de la préparation
  status: {
    type: String,
    enum: Object.values(PREPARATION_STATUS),
    default: PREPARATION_STATUS.PENDING,
    index: true
  },

  // Priorité
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },

  // Qui a créé cette préparation
  createdBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: false // ✅ Optionnel pour anciennes préparations
    },
    name: {
      type: String,
      required: false
    },
    email: {
      type: String,
      required: false
    },
    role: {
      type: String,
      enum: ['admin', 'preparateur'],
      required: false
    }
  },

  // Étapes de préparation
  steps: [preparationStepSchema],

  // Temps de début
  startTime: {
    type: Date,
    default: Date.now
  },

  // Temps de fin
  endTime: Date,

  // Durée totale en minutes
  totalTime: {
    type: Number,
    min: 0
  },

  // Durée actuelle en minutes
  currentDuration: {
    type: Number,
    default: 0,
    min: 0
  },

  // Progression en pourcentage
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Dans les temps
  isOnTime: Boolean,

  // Notes générales
  notes: {
    type: String,
    maxlength: 1000,
    default: ''
  },

  // Incidents signalés
  issues: [issueSchema],

  // Historique des agences
  agencyHistory: [{
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== INDEXES =====
preparationSchema.index({ user: 1, status: 1 });
preparationSchema.index({ agency: 1, status: 1 });
preparationSchema.index({ 'vehicleData.licensePlate': 1 });
preparationSchema.index({ createdAt: -1 });
preparationSchema.index({ status: 1, createdAt: -1 });

// ===== MIDDLEWARE DE MIGRATION AUTOMATIQUE =====

// ✅ AVANT SAUVEGARDE : Migrer vehicleInfo vers vehicleData
preparationSchema.pre('save', function(next) {
  // Si vehicleInfo existe mais pas vehicleData, migrer automatiquement
  if (this.vehicleInfo && !this.vehicleData) {
    console.log(`🔄 Migration automatique vehicleInfo -> vehicleData pour ${this._id}`);
    
    this.vehicleData = {
      licensePlate: this.vehicleInfo.licensePlate || 'N/A',
      brand: this.vehicleInfo.brand || 'N/A',
      model: this.vehicleInfo.model || 'Véhicule',
      vehicleType: this.vehicleInfo.vehicleType || 'particulier',
      year: this.vehicleInfo.year,
      fuelType: this.vehicleInfo.fuelType || 'essence',
      color: this.vehicleInfo.color || '',
      condition: this.vehicleInfo.condition || 'good'
    };
  }

  // Assurer que vehicleData est valide
  if (this.vehicleData) {
    if (!this.vehicleData.brand || this.vehicleData.brand.trim() === '') {
      this.vehicleData.brand = 'N/A';
    }
    if (!this.vehicleData.model || this.vehicleData.model.trim() === '') {
      this.vehicleData.model = 'Véhicule';
    }
    if (!this.vehicleData.vehicleType) {
      this.vehicleData.vehicleType = 'particulier';
    }
  }

  // Synchroniser preparateur avec user pour compatibilité
  if (this.user && !this.preparateur) {
    this.preparateur = this.user;
  }

  next();
});

// ✅ APRÈS SAUVEGARDE : Synchroniser avec véhicule lié si disponible
preparationSchema.post('save', async function(doc) {
  if (doc.vehicle && doc.vehicleData && (!doc.vehicleData.brand || doc.vehicleData.brand === 'N/A')) {
    try {
      const Vehicle = mongoose.model('Vehicle');
      const vehicle = await Vehicle.findById(doc.vehicle);
      
      if (vehicle && vehicle.brand && vehicle.brand.trim() !== '') {
        doc.vehicleData.brand = vehicle.brand;
        await doc.save({ validateBeforeSave: false });
        console.log(`✅ Synchronisé brand depuis véhicule: ${vehicle.brand}`);
      }
    } catch (error) {
      console.warn('⚠️ Erreur synchronisation vehicleData:', error.message);
    }
  }
});

// ===== MÉTHODES D'INSTANCE =====

// Obtenir le nom complet du véhicule
preparationSchema.methods.getVehicleFullName = function() {
  if (!this.vehicleData) return 'Véhicule inconnu';
  
  const brand = this.vehicleData.brand && this.vehicleData.brand !== 'N/A' 
    ? this.vehicleData.brand 
    : '';
  const model = this.vehicleData.model || 'Véhicule';
  
  return brand ? `${brand} ${model}` : model;
};

// Calculer la progression
preparationSchema.methods.calculateProgress = function() {
  if (!this.steps || this.steps.length === 0) return 0;
  
  const completedSteps = this.steps.filter(step => step.completed).length;
  return Math.round((completedSteps / this.steps.length) * 100);
};

// Vérifier si dans les temps
preparationSchema.methods.checkIfOnTime = function() {
  if (!this.currentDuration) return null;
  
  // Limite standard : 90 minutes
  const timeLimit = TIME_LIMITS[this.vehicleData?.vehicleType] || TIME_LIMITS.particulier;
  return this.currentDuration <= timeLimit;
};

// ===== MÉTHODES STATIQUES =====

// Trouver par plaque d'immatriculation (compatible ancien/nouveau)
preparationSchema.statics.findByLicensePlate = function(licensePlate) {
  const plateUpper = licensePlate.toUpperCase();
  
  return this.find({
    $or: [
      { 'vehicleData.licensePlate': plateUpper },
      { 'vehicleInfo.licensePlate': plateUpper } // Compatibilité
    ]
  }).populate(['user', 'agency', 'vehicle']);
};

// Trouver préparations actives d'un utilisateur
preparationSchema.statics.findActiveByUser = function(userId) {
  return this.findOne({
    user: userId,
    status: { $in: [PREPARATION_STATUS.PENDING, PREPARATION_STATUS.IN_PROGRESS] }
  }).populate(['agency', 'vehicle']);
};

// ===== VIRTUALS =====

preparationSchema.virtual('vehicleFullName').get(function() {
  return this.getVehicleFullName();
});

preparationSchema.virtual('isActive').get(function() {
  return [PREPARATION_STATUS.PENDING, PREPARATION_STATUS.IN_PROGRESS].includes(this.status);
});

module.exports = mongoose.model('Preparation', preparationSchema);