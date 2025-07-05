// backend/src/models/Schedule.js
// ✅ Modèle Schedule pour les plannings

const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  // Utilisateur assigné
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Agence de travail
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: true
  },

  // Date du planning
  date: {
    type: Date,
    required: true
  },

  // Horaires
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },

  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },

  // Durée de pause en minutes
  breakDuration: {
    type: Number,
    default: 30,
    min: 0,
    max: 180
  },

  // Notes du planning
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },

  // Métadonnées
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Statut
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== INDEX =====

// Index composé pour éviter les doublons
scheduleSchema.index({ user: 1, date: 1 }, { unique: true });

// Index pour les requêtes fréquentes
scheduleSchema.index({ agency: 1, date: 1 });
scheduleSchema.index({ date: 1 });
scheduleSchema.index({ user: 1, date: -1 });

// ===== VIRTUALS =====

// Durée totale de travail (en minutes)
scheduleSchema.virtual('workDuration').get(function() {
  if (!this.startTime || !this.endTime) return 0;

  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  let duration = endMinutes - startMinutes;
  
  // Gestion du passage de minuit
  if (duration < 0) {
    duration += 24 * 60;
  }

  return Math.max(0, duration - (this.breakDuration || 0));
});

// Durée totale programmée (avec pause)
scheduleSchema.virtual('totalDuration').get(function() {
  if (!this.startTime || !this.endTime) return 0;

  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  let duration = endMinutes - startMinutes;
  
  // Gestion du passage de minuit
  if (duration < 0) {
    duration += 24 * 60;
  }

  return Math.max(0, duration);
});

// Formatage des horaires
scheduleSchema.virtual('timeRange').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// ===== MÉTHODES STATIQUES =====

// Trouver le planning d'un utilisateur pour une date
scheduleSchema.statics.findUserSchedule = function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.findOne({
    user: userId,
    date: { $gte: startOfDay, $lte: endOfDay },
    isActive: true
  }).populate('agency', 'name code client');
};

// Trouver les plannings d'une semaine pour un utilisateur
scheduleSchema.statics.findUserWeekSchedule = function(userId, weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return this.find({
    user: userId,
    date: { $gte: weekStart, $lte: weekEnd },
    isActive: true
  })
  .populate('agency', 'name code client')
  .sort({ date: 1 });
};

// Trouver les plannings d'une agence pour une période
scheduleSchema.statics.findAgencySchedules = function(agencyId, startDate, endDate) {
  return this.find({
    agency: agencyId,
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  })
  .populate('user', 'firstName lastName email')
  .sort({ date: 1, startTime: 1 });
};

// Vérifier les conflits de planning
scheduleSchema.statics.checkConflicts = function(userId, date, excludeId = null) {
  const query = {
    user: userId,
    date: date,
    isActive: true
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.findOne(query);
};

// ===== MÉTHODES D'INSTANCE =====

// Vérifier si le planning est aujourd'hui
scheduleSchema.methods.isToday = function() {
  const today = new Date();
  return this.date.toDateString() === today.toDateString();
};

// Vérifier si le planning est dans le futur
scheduleSchema.methods.isFuture = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.date >= today;
};

// Vérifier si le planning est passé
scheduleSchema.methods.isPast = function() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return this.date <= today;
};

// Calculer le temps avant le début
scheduleSchema.methods.getTimeUntilStart = function() {
  if (!this.isToday()) return null;

  const now = new Date();
  const [hour, minute] = this.startTime.split(':').map(Number);
  
  const startDateTime = new Date();
  startDateTime.setHours(hour, minute, 0, 0);

  return startDateTime.getTime() - now.getTime();
};

// ===== HOOKS =====

// Validation avant sauvegarde
scheduleSchema.pre('save', function(next) {
  // Vérifier que l'heure de fin est après l'heure de début
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Autoriser le passage de minuit
  if (endMinutes <= startMinutes && endMinutes !== startMinutes) {
    // Vérifier que ce n'est pas un service de nuit logique
    if (endMinutes + (24 * 60) - startMinutes < 4 * 60) { // Moins de 4h
      return next(new Error('Durée de service trop courte'));
    }
  }

  next();
});

// Log après sauvegarde
scheduleSchema.post('save', function(doc) {
  console.log(`✅ Planning créé/modifié: ${doc.user} - ${doc.date.toDateString()} (${doc.timeRange})`);
});

module.exports = mongoose.model('Schedule', scheduleSchema);