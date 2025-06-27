const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'agence est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },

  address: {
    type: String,
    required: [true, 'L\'adresse est requise'],
    trim: true,
    maxlength: [200, 'L\'adresse ne peut pas dépasser 200 caractères']
  },

  code: {
    type: String,
    required: [true, 'Le code de l\'agence est requis'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Le code ne peut pas dépasser 10 caractères'],
    match: [
      /^[A-Z0-9]+$/,
      'Le code ne peut contenir que des lettres majuscules et des chiffres'
    ]
  },

  client: {
    type: String,
    required: [true, 'Le nom du client est requis'],
    trim: true,
    maxlength: [50, 'Le nom du client ne peut pas dépasser 50 caractères']
  },

  workingHours: {
    start: {
      type: String,
      required: [true, 'L\'heure de début est requise'],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        'Format d\'heure invalide (HH:mm)'
      ],
      default: '08:00'
    },
    end: {
      type: String,
      required: [true, 'L\'heure de fin est requise'],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        'Format d\'heure invalide (HH:mm)'
      ],
      default: '18:00'
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // Configuration spécifique à l'agence
  settings: {
    // Temps maximum autorisé pour une préparation (en minutes)
    maxPreparationTime: {
      type: Number,
      default: 30,
      min: [10, 'Le temps minimum doit être de 10 minutes'],
      max: [120, 'Le temps maximum ne peut pas dépasser 120 minutes']
    },

    // Seuil de retard pour les alertes (en minutes)
    lateThreshold: {
      type: Number,
      default: 15,
      min: [5, 'Le seuil minimum doit être de 5 minutes'],
      max: [60, 'Le seuil maximum ne peut pas dépasser 60 minutes']
    },

    // Pause maximum autorisée (en minutes)
    maxBreakTime: {
      type: Number,
      default: 60,
      min: [15, 'La pause minimum doit être de 15 minutes'],
      max: [180, 'La pause maximum ne peut pas dépasser 180 minutes']
    },

    // Notifications activées
    enableNotifications: {
      type: Boolean,
      default: true
    }
  },

  // Informations de contact
  contact: {
    phone: {
      type: String,
      trim: true,
      match: [
        /^[\+]?[1-9][\d]{0,15}$/,
        'Format de téléphone invalide'
      ]
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Format d\'email invalide'
      ]
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
agencySchema.index({ code: 1, isActive: 1 });
agencySchema.index({ client: 1, isActive: 1 });
agencySchema.index({ name: 1, isActive: 1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Mettre en majuscule le code avant sauvegarde
agencySchema.pre('save', function(next) {
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Valider les heures de travail
agencySchema.pre('save', function(next) {
  if (this.isModified('workingHours')) {
    const start = this.workingHours.start;
    const end = this.workingHours.end;
    
    // Convertir les heures en minutes pour comparaison
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    
    if (startMinutes >= endMinutes) {
      return next(new Error('L\'heure de fin doit être après l\'heure de début'));
    }
  }
  next();
});

// Mettre à jour le timestamp updatedAt
agencySchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Vérifier si l'agence est ouverte à une heure donnée
agencySchema.methods.isOpenAt = function(time) {
  const timeStr = typeof time === 'string' ? time : 
    `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
  
  const checkMinutes = parseInt(timeStr.split(':')[0]) * 60 + parseInt(timeStr.split(':')[1]);
  const startMinutes = parseInt(this.workingHours.start.split(':')[0]) * 60 + parseInt(this.workingHours.start.split(':')[1]);
  const endMinutes = parseInt(this.workingHours.end.split(':')[0]) * 60 + parseInt(this.workingHours.end.split(':')[1]);
  
  return checkMinutes >= startMinutes && checkMinutes <= endMinutes;
};

// Obtenir la durée de travail en minutes
agencySchema.methods.getWorkingDuration = function() {
  if (!this.workingHours?.start || !this.workingHours?.end) {
    return 480; // 8 heures par défaut
  }
  
  const startMinutes = parseInt(this.workingHours.start.split(':')[0]) * 60 + parseInt(this.workingHours.start.split(':')[1]);
  const endMinutes = parseInt(this.workingHours.end.split(':')[0]) * 60 + parseInt(this.workingHours.end.split(':')[1]);
  
  return endMinutes - startMinutes;
};

// Obtenir les statistiques de l'agence
agencySchema.methods.getStats = async function(startDate, endDate) {
  try {
    const Preparation = mongoose.model('Preparation');
    const Timesheet = mongoose.model('Timesheet');
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { $gte: startDate, $lte: endDate };
    }
    
    // Statistiques des préparations
    const preparationStats = await Preparation.aggregate([
      { 
        $match: { 
          agency: this._id,
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalPreparations: { $sum: 1 },
          averageTime: { $avg: '$totalMinutes' },
          onTimeCount: {
            $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Statistiques de ponctualité
    const punctualityStats = await Timesheet.aggregate([
      {
        $match: {
          agency: this._id,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalTimesheets: { $sum: 1 },
          lateCount: {
            $sum: { 
              $cond: [
                { $gt: ['$delays.startDelay', this.settings.lateThreshold] }, 
                1, 
                0
              ] 
            }
          },
          averageDelay: { $avg: '$delays.startDelay' }
        }
      }
    ]);
    
    const prep = preparationStats[0] || {};
    const punct = punctualityStats[0] || {};
    
    return {
      preparations: {
        total: prep.totalPreparations || 0,
        averageTime: Math.round(prep.averageTime || 0),
        onTimeRate: prep.totalPreparations ? 
          Math.round((prep.onTimeCount / prep.totalPreparations) * 100) : 0
      },
      punctuality: {
        total: punct.totalTimesheets || 0,
        lateCount: punct.lateCount || 0,
        punctualityRate: punct.totalTimesheets ? 
          Math.round(((punct.totalTimesheets - punct.lateCount) / punct.totalTimesheets) * 100) : 0,
        averageDelay: Math.round(punct.averageDelay || 0)
      }
    };
  } catch (error) {
    console.error('Erreur calcul stats agence:', error);
    return null;
  }
};

// ===== MÉTHODES STATIQUES =====

// Trouver les agences actives
agencySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Recherche avec filtres
agencySchema.statics.findWithFilters = function(filters = {}) {
  const query = { isActive: true };
  
  if (filters.client) {
    query.client = { $regex: filters.client, $options: 'i' };
  }
  
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { code: { $regex: filters.search, $options: 'i' } },
      { client: { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  return this.find(query).sort({ name: 1 });
};

// Trouver par code
agencySchema.statics.findByCode = function(code) {
  return this.findOne({ 
    code: code.toUpperCase(), 
    isActive: true 
  });
};

// ===== VIRTUAL FIELDS =====

// Durée de travail virtuelle
agencySchema.virtual('workingDuration').get(function() {
  return this.getWorkingDuration();
});

// Assurer que les champs virtuels sont inclus dans JSON
agencySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Agency', agencySchema);