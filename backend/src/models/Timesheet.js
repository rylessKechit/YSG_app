const mongoose = require('mongoose');
const { TIME_LIMITS } = require('../utils/constants');

const timesheetSchema = new mongoose.Schema({
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
        // Vérifier que c'est une date valide et pas trop dans le futur
        const maxFutureDate = new Date();
        maxFutureDate.setDate(maxFutureDate.getDate() + 7); // Maximum 7 jours dans le futur
        return value <= maxFutureDate;
      },
      message: 'Date invalide ou trop éloignée dans le futur'
    }
  },

  // Pointages réels
  startTime: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true; // Optionnel
        // Vérifier que le pointage est le même jour que la date
        return value.toDateString() === this.date.toDateString();
      },
      message: 'L\'heure de début doit être le même jour que la date du timesheet'
    }
  },

  endTime: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value || !this.startTime) return true;
        // Vérifier que la fin est après le début
        return value > this.startTime;
      },
      message: 'L\'heure de fin doit être après l\'heure de début'
    }
  },

  breakStart: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value || !this.startTime) return true;
        // La pause doit commencer après le début du service
        return value >= this.startTime;
      },
      message: 'La pause doit commencer après le début du service'
    }
  },

  breakEnd: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value || !this.breakStart) return true;
        // La pause doit finir après avoir commencé
        return value > this.breakStart;
      },
      message: 'La fin de pause doit être après le début de pause'
    }
  },

  // Référence au planning prévu
  schedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule'
  },

  // Calcul des écarts par rapport au planning
  delays: {
    startDelay: {
      type: Number,
      default: 0,
      min: 0 // en minutes de retard
    },
    endDelay: {
      type: Number,
      default: 0 // Peut être négatif si parti plus tôt
    },
    breakStartDelay: {
      type: Number,
      default: 0
    },
    breakEndDelay: {
      type: Number,
      default: 0
    }
  },

  // Alertes envoyées pour ce timesheet
  alertsSent: {
    lateStart: {
      type: Boolean,
      default: false
    },
    lateEnd: {
      type: Boolean,
      default: false
    },
    longBreak: {
      type: Boolean,
      default: false
    },
    missingClockOut: {
      type: Boolean,
      default: false
    }
  },

  // Temps total travaillé (calculé automatiquement)
  totalWorkedMinutes: {
    type: Number,
    min: 0
  },

  // Temps de pause total
  totalBreakMinutes: {
    type: Number,
    default: 0,
    min: 0
  },

  // Notes ou commentaires
  notes: {
    type: String,
    maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères']
  },

  // Statut du timesheet
  status: {
    type: String,
    enum: ['incomplete', 'complete', 'validated', 'disputed'],
    default: 'incomplete'
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

  // Validation par un admin
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  validatedAt: Date

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
timesheetSchema.index({ user: 1, agency: 1, date: 1 }, { unique: true });
timesheetSchema.index({ date: 1, agency: 1 });
timesheetSchema.index({ user: 1, date: 1 });
timesheetSchema.index({ status: 1, date: 1 });
timesheetSchema.index({ 'delays.startDelay': 1, date: 1 });

// ===== MIDDLEWARE PRE-SAVE =====

// Calculer automatiquement les temps et retards
timesheetSchema.pre('save', async function(next) {
  try {
    // Calculer le temps total travaillé
    if (this.startTime && this.endTime) {
      let totalMinutes = Math.floor((this.endTime - this.startTime) / (1000 * 60));
      
      // Soustraire les pauses
      if (this.breakStart && this.breakEnd) {
        const breakMinutes = Math.floor((this.breakEnd - this.breakStart) / (1000 * 60));
        this.totalBreakMinutes = breakMinutes;
        totalMinutes -= breakMinutes;
      }
      
      this.totalWorkedMinutes = Math.max(0, totalMinutes);
      
      // Déterminer le statut
      if (this.startTime && this.endTime) {
        this.status = 'complete';
      }
    }

    // Calculer les retards si on a une référence au planning
    if (this.schedule) {
      await this.calculateDelays();
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Mettre à jour le timestamp
timesheetSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// ===== MÉTHODES D'INSTANCE =====

// Calculer les retards par rapport au planning
timesheetSchema.methods.calculateDelays = async function() {
  if (!this.schedule) return;

  try {
    const Schedule = mongoose.model('Schedule');
    const schedule = await Schedule.findById(this.schedule);
    
    if (!schedule) return;

    const scheduleDate = new Date(this.date);
    
    // Calculer retard début
    if (this.startTime) {
      const [scheduleHours, scheduleMinutes] = schedule.startTime.split(':').map(Number);
      const scheduledStart = new Date(scheduleDate);
      scheduledStart.setHours(scheduleHours, scheduleMinutes, 0, 0);
      
      const delay = Math.max(0, Math.floor((this.startTime - scheduledStart) / (1000 * 60)));
      this.delays.startDelay = delay;
    }

    // Calculer retard fin
    if (this.endTime) {
      const [scheduleHours, scheduleMinutes] = schedule.endTime.split(':').map(Number);
      const scheduledEnd = new Date(scheduleDate);
      scheduledEnd.setHours(scheduleHours, scheduleMinutes, 0, 0);
      
      const delay = Math.floor((this.endTime - scheduledEnd) / (1000 * 60));
      this.delays.endDelay = delay; // Peut être négatif
    }

    // Calculer retards pauses si définies dans le planning
    if (schedule.breakStart && this.breakStart) {
      const [scheduleHours, scheduleMinutes] = schedule.breakStart.split(':').map(Number);
      const scheduledBreakStart = new Date(scheduleDate);
      scheduledBreakStart.setHours(scheduleHours, scheduleMinutes, 0, 0);
      
      const delay = Math.floor((this.breakStart - scheduledBreakStart) / (1000 * 60));
      this.delays.breakStartDelay = delay;
    }

  } catch (error) {
    console.error('Erreur calcul retards:', error);
  }
};

// Vérifier si le timesheet a des problèmes
timesheetSchema.methods.hasIssues = function() {
  const issues = [];
  
  if (this.delays.startDelay > TIME_LIMITS.LATE_THRESHOLD_MINUTES) {
    issues.push('Retard important au début');
  }
  
  if (this.totalBreakMinutes > TIME_LIMITS.BREAK_MAX_MINUTES) {
    issues.push('Pause trop longue');
  }
  
  if (this.startTime && !this.endTime) {
    const now = new Date();
    const hoursSinceStart = (now - this.startTime) / (1000 * 60 * 60);
    if (hoursSinceStart > 12) {
      issues.push('Pointage de fin manquant');
    }
  }
  
  return issues;
};

// Obtenir un résumé formaté
timesheetSchema.methods.getSummary = function() {
  const formatTime = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0h00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  return {
    date: this.date.toLocaleDateString('fr-FR'),
    startTime: formatTime(this.startTime),
    endTime: formatTime(this.endTime),
    breakStart: formatTime(this.breakStart),
    breakEnd: formatTime(this.breakEnd),
    totalWorked: formatDuration(this.totalWorkedMinutes),
    totalBreak: formatDuration(this.totalBreakMinutes),
    startDelay: this.delays.startDelay > 0 ? `${this.delays.startDelay} min` : null,
    status: this.status,
    issues: this.hasIssues()
  };
};

// ===== MÉTHODES STATIQUES =====

// Trouver les timesheets en retard
timesheetSchema.statics.findLateTimesheets = function(date = new Date()) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  return this.find({
    date: dayStart,
    'delays.startDelay': { $gt: TIME_LIMITS.LATE_THRESHOLD_MINUTES },
    'alertsSent.lateStart': false
  })
  .populate('user', 'firstName lastName email')
  .populate('agency', 'name code')
  .populate('schedule');
};

// Obtenir les statistiques de ponctualité
timesheetSchema.statics.getPunctualityStats = function(filters = {}) {
  const matchQuery = {};
  
  if (filters.startDate && filters.endDate) {
    matchQuery.date = { $gte: filters.startDate, $lte: filters.endDate };
  }
  if (filters.userId) matchQuery.user = filters.userId;
  if (filters.agencyId) matchQuery.agency = filters.agencyId;
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalTimesheets: { $sum: 1 },
        onTimeCount: {
          $sum: {
            $cond: [
              { $lte: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] },
              1,
              0
            ]
          }
        },
        averageDelay: { $avg: '$delays.startDelay' },
        maxDelay: { $max: '$delays.startDelay' },
        averageWorkedHours: { $avg: '$totalWorkedMinutes' }
      }
    },
    {
      $project: {
        totalTimesheets: 1,
        onTimeCount: 1,
        punctualityRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] },
            2
          ]
        },
        averageDelay: { $round: ['$averageDelay', 1] },
        maxDelay: 1,
        averageWorkedHours: { $round: [{ $divide: ['$averageWorkedHours', 60] }, 2] }
      }
    }
  ]);
};

// ===== VIRTUAL FIELDS =====

// Résumé virtuel
timesheetSchema.virtual('summary').get(function() {
  return this.getSummary();
});

// Problèmes virtuels
timesheetSchema.virtual('issues').get(function() {
  return this.hasIssues();
});

// Assurer que les champs virtuels sont inclus dans JSON
timesheetSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Timesheet', timesheetSchema);