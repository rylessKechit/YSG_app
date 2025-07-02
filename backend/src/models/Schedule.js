// backend/src/models/Schedule.js - VERSION CORRIGÉE POUR PLANNINGS JOUR MÊME
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
        // ✅ CORRECTION: Permettre les plannings à partir d'aujourd'hui (pas seulement demain)
        if (this.isNew) {
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Début de la journée
          
          const planningDate = new Date(value);
          planningDate.setHours(0, 0, 0, 0);
          
          // ✅ Permettre aujourd'hui ET le futur (>= au lieu de >)
          return planningDate >= today;
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
      return next(new Error('Les pauses doivent être dans les heures de travail'));
    }
  }

  this.updatedAt = new Date();
  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Convertir une heure au format HH:mm en minutes depuis minuit
scheduleSchema.methods.timeToMinutes = function(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Calculer la durée totale en minutes
scheduleSchema.methods.getTotalMinutes = function() {
  const startMinutes = this.timeToMinutes(this.startTime);
  const endMinutes = this.timeToMinutes(this.endTime);
  let totalMinutes = endMinutes - startMinutes;

  // Soustraire les pauses
  if (this.breakStart && this.breakEnd) {
    const breakStartMinutes = this.timeToMinutes(this.breakStart);
    const breakEndMinutes = this.timeToMinutes(this.breakEnd);
    totalMinutes -= (breakEndMinutes - breakStartMinutes);
  }

  return Math.max(0, totalMinutes);
};

// Obtenir un résumé formaté
scheduleSchema.methods.getSummary = function() {
  return {
    id: this._id,
    date: this.date.toISOString().split('T')[0],
    timeRange: `${this.startTime} - ${this.endTime}`,
    duration: `${Math.floor(this.getTotalMinutes() / 60)}h${(this.getTotalMinutes() % 60).toString().padStart(2, '0')}`,
    hasBreak: !!(this.breakStart && this.breakEnd),
    breakRange: (this.breakStart && this.breakEnd) ? `${this.breakStart} - ${this.breakEnd}` : null,
    status: this.status
  };
};

// ✅ NOUVELLE MÉTHODE: Vérifier si le planning est créable aujourd'hui
scheduleSchema.methods.canBeCreatedToday = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const planningDate = new Date(this.date);
  planningDate.setHours(0, 0, 0, 0);
  
  return planningDate >= today;
};

// ✅ NOUVELLE MÉTHODE: Vérifier si le planning peut être modifié
scheduleSchema.methods.canBeModified = function() {
  const now = new Date();
  const planningDateTime = new Date(this.date);
  
  // Ajouter l'heure de début au planning
  const [hours, minutes] = this.startTime.split(':');
  planningDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Permettre modification jusqu'à 1h avant le début
  const cutoffTime = new Date(planningDateTime.getTime() - (60 * 60 * 1000));
  
  return now < cutoffTime && this.status === 'active';
};

// ===== MÉTHODES STATIQUES =====

// Trouver les plannings d'aujourd'hui
scheduleSchema.statics.findTodaySchedules = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    date: { $gte: today, $lt: tomorrow },
    status: 'active'
  }).populate('user', 'firstName lastName email').populate('agency', 'name code');
};

// Trouver les conflits pour un utilisateur à une date donnée
scheduleSchema.statics.findConflicts = function(userId, date, excludeId = null) {
  const query = {
    user: userId,
    date: new Date(date),
    status: 'active'
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

// ✅ NOUVELLE MÉTHODE STATIQUE: Créer un planning pour aujourd'hui
scheduleSchema.statics.createTodaySchedule = function(scheduleData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Vérifier que la date est aujourd'hui ou dans le futur
  const planningDate = new Date(scheduleData.date);
  planningDate.setHours(0, 0, 0, 0);
  
  if (planningDate < today) {
    throw new Error('Impossible de créer un planning dans le passé');
  }
  
  return this.create(scheduleData);
};

// Obtenir les statistiques d'un utilisateur
scheduleSchema.statics.getUserStats = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: startDate, $lte: endDate },
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalSchedules: { $sum: 1 },
        totalMinutes: { $sum: '$totalMinutes' },
        agencies: { $addToSet: '$agency' }
      }
    }
  ]);
};

// ===== VIRTUAL FIELDS =====

// Durée totale virtuelle
scheduleSchema.virtual('totalMinutes').get(function() {
  return this.getTotalMinutes();
});

// Résumé virtuel
scheduleSchema.virtual('summary').get(function() {
  return this.getSummary();
});

// Assurer que les champs virtuels sont inclus dans JSON
scheduleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Schedule', scheduleSchema);