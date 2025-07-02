// backend/src/models/Schedule.js - AUCUNE RESTRICTION DE DATE (30j passé autorisé)
const mongoose = require('mongoose');
const { DATE_FORMATS } = require('../utils/constants');

// ✅ SOLUTION DÉFINITIVE: Éviter complètement la redéfinition du modèle
try {
  module.exports = mongoose.model('Schedule');
} catch (error) {
  // Le modèle n'existe pas encore, on le crée

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
        // ✅ NOUVELLE RÈGLE: Permettre 30 jours dans le passé minimum
        if (this.isNew) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Calculer la date limite (30 jours dans le passé)
          const minDate = new Date(today);
          minDate.setDate(today.getDate() - 30);
          
          const planningDate = new Date(value);
          planningDate.setHours(0, 0, 0, 0);
          
          // ✅ AUTORISER: Aujourd'hui + futur + 30 jours passé
          return planningDate >= minDate;
        }
        return true;
      },
      message: 'La date ne peut pas être antérieure à 30 jours dans le passé'
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

// Validation des horaires avant sauvegarde
scheduleSchema.pre('save', function(next) {
  try {
    // Validation: heure de fin après heure de début
    const start = this.startTime.split(':').map(Number);
    const end = this.endTime.split(':').map(Number);
    
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    if (endMinutes <= startMinutes) {
      return next(new Error('L\'heure de fin doit être après l\'heure de début'));
    }

    // Validation des pauses si définies
    if (this.breakStart && this.breakEnd) {
      const breakStartParts = this.breakStart.split(':').map(Number);
      const breakEndParts = this.breakEnd.split(':').map(Number);
      
      const breakStartMinutes = breakStartParts[0] * 60 + breakStartParts[1];
      const breakEndMinutes = breakEndParts[0] * 60 + breakEndParts[1];
      
      if (breakEndMinutes <= breakStartMinutes) {
        return next(new Error('L\'heure de fin de pause doit être après l\'heure de début'));
      }
      
      if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
        return next(new Error('Les horaires de pause doivent être dans les horaires de travail'));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Mise à jour automatique du champ updatedAt
scheduleSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Calculer la durée totale de travail en minutes
scheduleSchema.methods.getTotalWorkingMinutes = function() {
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  
  let totalMinutes = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
  
  // Soustraire la pause si définie
  if (this.breakStart && this.breakEnd) {
    const breakStart = this.breakStart.split(':').map(Number);
    const breakEnd = this.breakEnd.split(':').map(Number);
    const breakMinutes = (breakEnd[0] * 60 + breakEnd[1]) - (breakStart[0] * 60 + breakStart[1]);
    totalMinutes -= breakMinutes;
  }
  
  return Math.max(0, totalMinutes);
};

// Formatter les données pour l'affichage
scheduleSchema.methods.getFormattedData = function() {
  const totalMinutes = this.getTotalWorkingMinutes();
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    date: this.date.toLocaleDateString('fr-FR'),
    timeRange: `${this.startTime} - ${this.endTime}`,
    workingDuration: `${hours}h${minutes.toString().padStart(2, '0')}`,
    hasBreak: !!(this.breakStart && this.breakEnd),
    breakRange: (this.breakStart && this.breakEnd) ? `${this.breakStart} - ${this.breakEnd}` : null,
    status: this.status
  };
};

// ✅ MÉTHODE ASSOUPLIE: Vérifier si le planning est dans la limite autorisée
scheduleSchema.methods.isWithinAllowedDateRange = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 30 jours dans le passé
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 30);
  
  const planningDate = new Date(this.date);
  planningDate.setHours(0, 0, 0, 0);
  
  return planningDate >= minDate;
};

// ✅ MÉTHODE ASSOUPLIE: Permettre modification jusqu'à 30j passé
scheduleSchema.methods.canBeModified = function() {
  // Vérifier d'abord la date limite
  if (!this.isWithinAllowedDateRange()) {
    return false;
  }
  
  // Si c'est dans le futur ou aujourd'hui, toujours modifiable
  const now = new Date();
  const planningDate = new Date(this.date);
  planningDate.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (planningDate >= today) {
    return this.status === 'active';
  }
  
  // Si c'est dans le passé mais dans la limite de 30j, autoriser la modification
  return this.status === 'active';
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

// ✅ MÉTHODE ASSOUPLIE: Créer un planning dans la limite autorisée
scheduleSchema.statics.createWithinDateRange = function(scheduleData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 30);
  
  const planningDate = new Date(scheduleData.date);
  planningDate.setHours(0, 0, 0, 0);
  
  if (planningDate < minDate) {
    throw new Error('Impossible de créer un planning antérieur à 30 jours dans le passé');
  }
  
  return this.create(scheduleData);
};

// Trouver les plannings d'une semaine pour un utilisateur
scheduleSchema.statics.findUserWeekSchedule = function(userId, weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  return this.find({
    user: userId,
    date: { $gte: weekStart, $lt: weekEnd },
    status: 'active'
  }).populate('agency', 'name code client').sort({ date: 1 });
};

// ✅ NOUVELLE MÉTHODE: Nettoyer les vieux plannings (> 30j)
scheduleSchema.statics.cleanOldSchedules = function() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  cutoffDate.setHours(0, 0, 0, 0);
  
  return this.deleteMany({
    date: { $lt: cutoffDate },
    status: { $in: ['cancelled', 'completed'] }
  });
};

module.exports = mongoose.model('Schedule', scheduleSchema);

}