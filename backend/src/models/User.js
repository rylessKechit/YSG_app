const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Format d\'email invalide'
    ]
  },

  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Par défaut, le mot de passe n'est pas inclus dans les requêtes
  },

  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },

  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },

  role: {
    type: String,
    enum: {
      values: Object.values(USER_ROLES),
      message: 'Rôle invalide'
    },
    default: USER_ROLES.PREPARATEUR
  },

  agencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency'
  }],

  phone: {
    type: String,
    trim: true,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Format de téléphone invalide'
    ]
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // Statistiques du préparateur
  stats: {
    totalPreparations: {
      type: Number,
      default: 0,
      min: 0
    },
    averageTime: {
      type: Number,
      default: 0,
      min: 0 // en minutes
    },
    onTimeRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100 // pourcentage
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    }
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

  lastLogin: {
    type: Date
  },

  // Réinitialisation de mot de passe
  resetPasswordToken: String,
  resetPasswordExpires: Date

}, {
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// ===== INDEX =====

// Index composé pour les recherches fréquentes
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ agencies: 1, role: 1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  // Si le mot de passe n'a pas été modifié, continuer
  if (!this.isModified('password')) return next();

  try {
    // Hasher le mot de passe avec un salt de 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Mettre à jour le timestamp updatedAt
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Comparer le mot de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Erreur lors de la vérification du mot de passe');
  }
};

// Obtenir le nom complet
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Vérifier si l'utilisateur peut accéder à une agence
userSchema.methods.canAccessAgency = function(agencyId) {
  if (this.role === USER_ROLES.ADMIN) return true;
  return this.agencies.some(agency => agency.toString() === agencyId.toString());
};

// Mettre à jour les statistiques
userSchema.methods.updateStats = async function(preparationData) {
  try {
    const Preparation = mongoose.model('Preparation');
    
    // Recalculer les stats basées sur toutes les préparations
    const stats = await Preparation.aggregate([
      { $match: { user: this._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalPreparations: { $sum: 1 },
          averageTime: { $avg: '$totalMinutes' },
          onTimeCount: {
            $sum: { $cond: [{ $lte: ['$totalMinutes', 30] }, 1, 0] }
          }
        }
      }
    ]);

    if (stats.length > 0) {
      const result = stats[0];
      this.stats.totalPreparations = result.totalPreparations;
      this.stats.averageTime = Math.round(result.averageTime || 0);
      this.stats.onTimeRate = Math.round(
        (result.onTimeCount / result.totalPreparations) * 100
      );
      this.stats.lastCalculated = new Date();
      
      await this.save();
    }
  } catch (error) {
    console.error('Erreur mise à jour stats utilisateur:', error);
  }
};

// ===== MÉTHODES STATIQUES =====

// Trouver par email (inclut le mot de passe pour l'authentification)
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email, isActive: true }).select('+password');
};

// Recherche d'utilisateurs avec filtres
userSchema.statics.findWithFilters = function(filters = {}) {
  const query = { isActive: true };
  
  if (filters.role) query.role = filters.role;
  if (filters.agency) query.agencies = filters.agency;
  if (filters.search) {
    query.$or = [
      { firstName: { $regex: filters.search, $options: 'i' } },
      { lastName: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  return this.find(query)
    .populate('agencies', 'name code client')
    .sort({ createdAt: -1 });
};

// ===== VIRTUAL FIELDS =====

// Nom complet virtuel
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Assurer que les champs virtuels sont inclus dans JSON
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);