const mongoose = require('mongoose');
const { DATE_FORMATS } = require('../utils/constants');

const scheduleSchema = new mongoose.Schema({
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

  date: {
    type: Date,
    required: [true, 'La date est requise'],
    validate: {
      validator: function(value) {
        // La date ne peut pas être dans le passé (sauf pour modification)
        if (this.isNew) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return value >= today;
        }
        return true;
      },
      message: 'La date ne peut pas être dans le passé'
    }
  },

  startTime: {
    type: String,
    required: [true, 'L\'heure de début est requise'],
    match: [
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Format d\'heure invalide (HH:mm)'
    ]
  },

  endTime: {
    type: String,
    required: [true, 'L\'heure de fin est requise'],
    match: [
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Format d\'heure invalide (HH:mm)'
    ]
  },

  // Pauses optionnelles
  breakStart: {
    type: String,
    match: [
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Format d\'heure invalide (HH:mm)'
    ]
  },

  breakEnd: {
    type: String,
    match: [
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Format d\'heure invalide (HH:mm)'
    ]
  },

  // Notes du planning
  notes: {
    type: String,
    maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères']
  },

  // Statut du planning
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  },

  // Qui a créé ce planning
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le créateur est requis']
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

// Index composé pour éviter les doublons et optimiser les requêtes
scheduleSchema.index({ user: 1, agency: 1, date: 1 }, { unique: true });
scheduleSchema.index({ date: 1, agency: 1 });
scheduleSchema.index({ user: 1, date: 1 });
scheduleSchema.index({ agency: 1, status: 1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Validation des heures
scheduleSchema.pre('save', function(next) {
  // Vérifier que l'heure de fin est après l'heure de début
  const startMinutes = this.timeToMinutes(this.startTime);
  const endMinutes = this.timeToMinutes(this.endTime);
  
  if (startMinutes >= endMinutes) {
    return next(new Error('L\'heure de fin doit être après l\'heure de début'));
  }

  // Vérifier les pauses si définies
  if (this.breakStart && this.breakEnd) {
    const breakStartMinutes = this.timeToMinutes(this.breakStart);
    const breakEndMinutes = this.timeToMinutes(this.breakEnd);
    
    if (breakStartMinutes >= breakEndMinutes) {
      return next(new Error('L\'heure de fin de pause doit être après l\'heure de début'));
    }
    
    // Vérifier que les pauses sont dans les heures de travail
    if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
      return next(new Error('Les pauses doivent être comprises dans les heures de travail'));
    }
  }

  next();
});

// Mettre à jour le timestamp
scheduleSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Convertir une heure en minutes
scheduleSchema.methods.timeToMinutes = function(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convertir des minutes en heure
scheduleSchema.methods.minutesToTime = function(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Calculer la durée totale de travail
scheduleSchema.methods.getTotalWorkingMinutes = function() {
  const startMinutes = this.timeToMinutes(this.startTime);
  const endMinutes = this.timeToMinutes(this.endTime);
  let totalMinutes = endMinutes - startMinutes;
  
  // Soustraire les pauses
  if (this.breakStart && this.breakEnd) {
    const breakStartMinutes = this.timeToMinutes(this.breakStart);
    const breakEndMinutes = this.timeToMinutes(this.breakEnd);
    totalMinutes -= (breakEndMinutes - breakStartMinutes);
  }
  
  return totalMinutes;
};

// Vérifier si une heure est dans les heures de travail
scheduleSchema.methods.isWorkingTime = function(timeStr) {
  const checkMinutes = this.timeToMinutes(timeStr);
  const startMinutes = this.timeToMinutes(this.startTime);
  const endMinutes = this.timeToMinutes(this.endTime);
  
  // Si c'est pendant la pause, ce n'est pas du temps de travail
  if (this.breakStart && this.breakEnd) {
    const breakStartMinutes = this.timeToMinutes(this.breakStart);
    const breakEndMinutes = this.timeToMinutes(this.breakEnd);
    
    if (checkMinutes >= breakStartMinutes && checkMinutes <= breakEndMinutes) {
      return false;
    }
  }
  
  return checkMinutes >= startMinutes && checkMinutes <= endMinutes;
};

// Obtenir le planning formaté
scheduleSchema.methods.getFormattedSchedule = function() {
  const workingMinutes = this.getTotalWorkingMinutes();
  const workingHours = Math.floor(workingMinutes / 60);
  const remainingMinutes = workingMinutes % 60;
  
  return {
    date: this.date.toLocaleDateString('fr-FR'),
    startTime: this.startTime,
    endTime: this.endTime,
    breakStart: this.breakStart,
    breakEnd: this.breakEnd,
    totalWorkingTime: `${workingHours}h${remainingMinutes.toString().padStart(2, '0')}`,
    totalMinutes: workingMinutes
  };
};

// ===== MÉTHODES STATIQUES =====

// Trouver les plannings d'une période
scheduleSchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    date: {
      $gte: startDate,
      $lte: endDate
    },
    status: 'active',
    ...filters
  };
  
  return this.find(query)
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code client')
    .populate('createdBy', 'firstName lastName')
    .sort({ date: 1, startTime: 1 });
};

// Trouver les plannings d'un utilisateur pour une semaine
scheduleSchema.statics.findUserWeekSchedule = function(userId, weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  return this.find({
    user: userId,
    date: {
      $gte: weekStart,
      $lte: weekEnd
    },
    status: 'active'
  })
  .populate('agency', 'name code client')
  .sort({ date: 1 });
};

// Trouver les conflits de planning pour un utilisateur
scheduleSchema.statics.findConflicts = function(userId, date, startTime, endTime, excludeId = null) {
  const query = {
    user: userId,
    date: date,
    status: 'active',
    $or: [
      // Nouveau planning commence pendant un planning existant
      {
        $and: [
          { startTime: { $lte: startTime } },
          { endTime: { $gt: startTime } }
        ]
      },
      // Nouveau planning finit pendant un planning existant
      {
        $and: [
          { startTime: { $lt: endTime } },
          { endTime: { $gte: endTime } }
        ]
      },
      // Nouveau planning englobe un planning existant
      {
        $and: [
          { startTime: { $gte: startTime } },
          { endTime: { $lte: endTime } }
        ]
      }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

// Obtenir les statistiques de planning
scheduleSchema.statics.getStats = function(filters = {}) {
  const matchQuery = { status: 'active', ...filters };
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSchedules: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        uniqueAgencies: { $addToSet: '$agency' }
      }
    },
    {
      $project: {
        totalSchedules: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueAgencies: { $size: '$uniqueAgencies' }
      }
    }
  ]);
};

// ===== VIRTUAL FIELDS =====

// Durée de travail virtuelle
scheduleSchema.virtual('workingDuration').get(function() {
  return this.getTotalWorkingMinutes();
});

// Planning formaté virtuel
scheduleSchema.virtual('formatted').get(function() {
  return this.getFormattedSchedule();
});

// Assurer que les champs virtuels sont inclus dans JSON
scheduleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Schedule', scheduleSchema);