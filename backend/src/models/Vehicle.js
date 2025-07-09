// backend/src/models/Vehicle.js
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
    required: false,
    trim: true,
    maxlength: [50, 'La marque ne peut pas dépasser 50 caractères'],
    default: ''
  },

  model: {
    type: String,
    required: [true, 'Le modèle est requis'],
    trim: true,
    maxlength: [50, 'Le modèle ne peut pas dépasser 50 caractères']
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

  // Métadonnées essentielles
  isActive: {
    type: Boolean,
    default: true
  },

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

  // ❌ SUPPRIMÉ TOUS LES CHAMPS INUTILES :
  // - year
  // - fuelType
  // - color
  // - specifications (transmission, doors, seats, power, consumption)
  // - lastPreparation
  // - stats
  // - maintenance
  // - notes

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

// ✅ Middleware de validation simplifié
vehicleSchema.pre('save', function(next) {
  // Seulement nettoyer currentPreparation si le statut n'est PAS en préparation
  if (this.status !== VEHICLE_STATUS.IN_PREPARATION && this.currentPreparation) {
    this.currentPreparation = undefined;
  }
  next();
});

// ===== MÉTHODES D'INSTANCE SIMPLIFIÉES =====

// Obtenir le nom complet du véhicule
vehicleSchema.methods.getFullName = function() {
  const parts = [this.brand, this.model].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Véhicule';
};

// Vérifier si le véhicule est disponible pour préparation
vehicleSchema.methods.isAvailableForPreparation = function() {
  return this.isActive && this.status === VEHICLE_STATUS.AVAILABLE;
};

// ===== MÉTHODES STATIQUES SIMPLIFIÉES =====

// Trouver les véhicules disponibles dans une agence
vehicleSchema.statics.findAvailable = function(agencyId) {
  return this.find({
    agency: agencyId,
    status: VEHICLE_STATUS.AVAILABLE,
    isActive: true
  }).sort({ licensePlate: 1 });
};

// Trouver les véhicules en préparation
vehicleSchema.statics.findInPreparation = function(agencyId = null) {
  const query = {
    status: VEHICLE_STATUS.IN_PREPARATION,
    isActive: true
  };
  
  if (agencyId) {
    query.agency = agencyId;
  }
  
  return this.find(query)
    .populate('currentPreparation', 'startTime user steps')
    .populate('agency', 'name code')
    .sort({ updatedAt: -1 });
};

// ===== VIRTUAL FIELDS SIMPLIFIÉS =====

// Nom complet virtuel
vehicleSchema.virtual('fullName').get(function() {
  return this.getFullName();
});

// Assurer que les champs virtuels sont inclus dans JSON
vehicleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);