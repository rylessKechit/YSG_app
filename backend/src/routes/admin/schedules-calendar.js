// ===== backend/src/routes/admin/schedules-calendar.js =====
const express = require('express');
const Joi = require('joi');
const Schedule = require('../../models/Schedule');
const User = require('../../models/User');
const Agency = require('../../models/Agency');
const Timesheet = require('../../models/Timesheet');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateQuery, validateBody } = require('../../middleware/validation');
const { objectId } = require('../../middleware/validation');
const { ERROR_MESSAGES } = require('../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/schedules/calendar
 * @desc    Vue calendaire des plannings avec métadonnées
 * @access  Admin
 */
router.get('/', validateQuery(Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(), // Format: 2024-01
  view: Joi.string().valid('month', 'week', 'day').default('month'),
  agencies: Joi.array().items(objectId).optional(),
  users: Joi.array().items(objectId).optional(),
  includeMetadata: Joi.boolean().default(true),
  includeConflicts: Joi.boolean().default(true)
})), async (req, res) => {
  try {
    const { month, view, agencies = [], users = [], includeMetadata, includeConflicts } = req.query;
    
    // Calculer les dates du mois
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);
    endDate.setHours(23, 59, 59, 999);

    // Étendre aux jours de la première/dernière semaine pour vue complète
    const calendarStart = new Date(startDate);
    calendarStart.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7)); // Lundi précédent
    
    const calendarEnd = new Date(endDate);
    const daysToAdd = (7 - endDate.getDay()) % 7;
    calendarEnd.setDate(endDate.getDate() + daysToAdd); // Dimanche suivant

    // Construire les filtres
    const filters = {
      date: { $gte: calendarStart, $lte: calendarEnd },
      status: 'active'
    };
    
    if (agencies.length > 0) filters.agency = { $in: agencies };
    if (users.length > 0) filters.user = { $in: users };

    // Récupérer tous les plannings de la période
    const schedules = await Schedule.find(filters)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: 1, startTime: 1 });

    // Organiser par semaines et jours
    const calendar = await buildCalendarStructure(calendarStart, calendarEnd, schedules, {
      month: monthNum,
      year,
      includeConflicts
    });

    // Calculer métadonnées si demandé
    let metadata = null;
    if (includeMetadata) {
      metadata = await calculateCalendarMetadata(schedules, filters, startDate, endDate);
    }

    res.json({
      success: true,
      data: {
        calendar,
        metadata,
        period: {
          month,
          year,
          monthName: new Date(year, monthNum - 1).toLocaleDateString('fr-FR', { month: 'long' }),
          startDate: calendarStart,
          endDate: calendarEnd,
          actualMonthStart: startDate,
          actualMonthEnd: endDate
        },
        filters: { agencies, users, view },
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur vue calendaire:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/schedules/calendar/conflicts
 * @desc    Détecter et analyser les conflits de planning
 * @access  Admin
 */
router.get('/conflicts', validateQuery(Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userId: objectId.optional(),
  agencyId: objectId.optional(),
  severity: Joi.string().valid('all', 'critical', 'warning').default('all')
})), async (req, res) => {
  try {
    const { startDate, endDate, userId, agencyId, severity } = req.query;
    
    // Dates par défaut (semaine courante + suivante)
    const defaultStart = startDate ? new Date(startDate) : new Date();
    const defaultEnd = endDate ? new Date(endDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Construire les filtres
    const filters = {
      date: { $gte: defaultStart, $lte: defaultEnd },
      status: 'active'
    };
    
    if (userId) filters.user = userId;
    if (agencyId) filters.agency = agencyId;

    const conflicts = await detectScheduleConflicts(filters, severity);
    const suggestions = await generateConflictSuggestions(conflicts);

    res.json({
      success: true,
      data: {
        conflicts,
        suggestions,
        summary: {
          total: conflicts.length,
          critical: conflicts.filter(c => c.severity === 'critical').length,
          warning: conflicts.filter(c => c.severity === 'warning').length,
          affectedUsers: [...new Set(conflicts.map(c => c.userId))].length
        },
        period: { startDate: defaultStart, endDate: defaultEnd },
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur détection conflits:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/schedules/calendar/optimize
 * @desc    Suggestions d'optimisation planning
 * @access  Admin
 */
router.post('/optimize', validateBody(Joi.object({
  period: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().required()
  }).required(),
  constraints: Joi.object({
    minCoveragePerAgency: Joi.number().min(0).max(100).default(80),
    maxHoursPerUser: Joi.number().min(20).max(60).default(35),
    preferredShifts: Joi.array().items(Joi.string().valid('morning', 'afternoon', 'evening')).default(['morning', 'afternoon']),
    avoidWeekends: Joi.boolean().default(false)
  }).optional(),
  agencies: Joi.array().items(objectId).optional(),
  users: Joi.array().items(objectId).optional()
})), async (req, res) => {
  try {
    const { period, constraints = {}, agencies = [], users = [] } = req.body;
    
    // Analyser la situation actuelle
    const currentSchedules = await Schedule.find({
      date: { $gte: period.start, $lte: period.end },
      status: 'active',
      ...(agencies.length > 0 && { agency: { $in: agencies } }),
      ...(users.length > 0 && { user: { $in: users } })
    })
    .populate('user', 'firstName lastName')
    .populate('agency', 'name code');

    // Calculer métriques actuelles
    const currentMetrics = await calculateOptimizationMetrics(currentSchedules, period, constraints);
    
    // Générer suggestions d'optimisation
    const optimizations = await generateOptimizationSuggestions(currentSchedules, currentMetrics, constraints);
    
    // Simuler l'impact des changements
    const projectedMetrics = await projectOptimizationImpact(optimizations, currentMetrics);

    res.json({
      success: true,
      data: {
        current: {
          metrics: currentMetrics,
          schedules: currentSchedules.length
        },
        optimizations,
        projected: {
          metrics: projectedMetrics,
          improvements: calculateImprovements(currentMetrics, projectedMetrics)
        },
        implementation: {
          estimatedTime: Math.ceil(optimizations.length * 0.5), // minutes
          affectedUsers: [...new Set(optimizations.map(opt => opt.userId))].length,
          requiresNotification: optimizations.some(opt => opt.requiresNotification)
        },
        period,
        constraints
      }
    });

  } catch (error) {
    console.error('Erreur optimisation planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Construire la structure calendaire
 */
async function buildCalendarStructure(startDate, endDate, schedules, options) {
  const { month, year, includeConflicts } = options;
  const calendar = {
    month,
    year,
    weeks: []
  };

  // Grouper les plannings par date
  const schedulesByDate = {};
  schedules.forEach(schedule => {
    const dateKey = schedule.date.toISOString().split('T')[0];
    if (!schedulesByDate[dateKey]) schedulesByDate[dateKey] = [];
    schedulesByDate[dateKey].push(schedule);
  });

  // Construire les semaines
  const currentWeek = new Date(startDate);
  let weekNumber = 1;

  while (currentWeek <= endDate) {
    const week = {
      weekNumber,
      startDate: new Date(currentWeek),
      days: []
    };

    // Générer les 7 jours de la semaine
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(currentWeek);
      currentDay.setDate(currentWeek.getDate() + i);
      
      const dateKey = currentDay.toISOString().split('T')[0];
      const daySchedules = schedulesByDate[dateKey] || [];

      // Détecter conflits pour ce jour si demandé
      let conflicts = [];
      if (includeConflicts && daySchedules.length > 0) {
        conflicts = await detectDayConflicts(daySchedules);
      }

      const day = {
        date: new Date(currentDay),
        dateString: dateKey,
        dayName: currentDay.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dayShort: currentDay.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dayNumber: currentDay.getDate(),
        isCurrentMonth: currentDay.getMonth() === month - 1,
        isToday: currentDay.toDateString() === new Date().toDateString(),
        isWeekend: currentDay.getDay() === 0 || currentDay.getDay() === 6,
        schedulesCount: daySchedules.length,
        hasConflicts: conflicts.length > 0,
        schedules: daySchedules.map(schedule => formatScheduleForCalendar(schedule)),
        conflicts,
        coverage: calculateDayCoverage(daySchedules),
        workload: calculateDayWorkload(daySchedules)
      };

      week.days.push(day);
    }

    calendar.weeks.push(week);
    currentWeek.setDate(currentWeek.getDate() + 7);
    weekNumber++;

    // Arrêter si on a dépassé la période
    if (currentWeek > endDate) break;
  }

  return calendar;
}

/**
 * Calculer métadonnées du calendrier
 */
async function calculateCalendarMetadata(schedules, filters, startDate, endDate) {
  const totalSchedules = schedules.length;
  const uniqueUsers = [...new Set(schedules.map(s => s.user._id.toString()))];
  const uniqueAgencies = [...new Set(schedules.map(s => s.agency._id.toString()))];

  // Calculer heures totales
  const totalHours = schedules.reduce((sum, schedule) => {
    return sum + (schedule.workingDuration || 0);
  }, 0);

  // Analyser la répartition par agence
  const agencyDistribution = {};
  schedules.forEach(schedule => {
    const agencyName = schedule.agency.name;
    if (!agencyDistribution[agencyName]) {
      agencyDistribution[agencyName] = { count: 0, hours: 0 };
    }
    agencyDistribution[agencyName].count++;
    agencyDistribution[agencyName].hours += schedule.workingDuration || 0;
  });

  // Calculer couverture par jour
  const daysCovered = [...new Set(schedules.map(s => s.date.toISOString().split('T')[0]))].length;
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  return {
    summary: {
      totalSchedules,
      uniqueUsers: uniqueUsers.length,
      uniqueAgencies: uniqueAgencies.length,
      totalHours: Math.round(totalHours / 60),
      averageHoursPerDay: totalDays > 0 ? Math.round(totalHours / 60 / totalDays) : 0
    },
    coverage: {
      daysCovered,
      totalDays,
      coverageRate: Math.round((daysCovered / totalDays) * 100)
    },
    distribution: {
      byAgency: Object.entries(agencyDistribution).map(([name, data]) => ({
        agency: name,
        schedules: data.count,
        hours: Math.round(data.hours / 60),
        percentage: Math.round((data.count / totalSchedules) * 100)
      })),
      byDayOfWeek: calculateDayOfWeekDistribution(schedules)
    }
  };
}

/**
 * Détecter conflits dans les plannings
 */
async function detectScheduleConflicts(filters, severity) {
  const conflicts = [];
  
  // Conflits d'utilisateur (même personne, même jour, heures qui se chevauchent)
  const userConflicts = await Schedule.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          user: '$user',
          date: '$date'
        },
        schedules: { $push: '$$ROOT' },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  for (const userConflict of userConflicts) {
    const schedules = userConflict.schedules;
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        if (timesOverlap(schedules[i], schedules[j])) {
          conflicts.push({
            type: 'user_overlap',
            severity: 'critical',
            userId: schedules[i].user,
            date: schedules[i].date,
            message: 'Utilisateur programmé sur plusieurs créneaux simultanés',
            schedules: [schedules[i]._id, schedules[j]._id],
            details: {
              schedule1: `${schedules[i].startTime}-${schedules[i].endTime}`,
              schedule2: `${schedules[j].startTime}-${schedules[j].endTime}`
            }
          });
        }
      }
    }
  }

  // Conflits de surcharge (trop d'heures par semaine)
  const weeklyHours = await Schedule.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          user: '$user',
          week: { $week: '$date' },
          year: { $year: '$date' }
        },
        totalMinutes: { $sum: '$workingDuration' },
        user: { $first: '$user' },
        schedules: { $push: '$_id' }
      }
    },
    { $match: { totalMinutes: { $gt: 35 * 60 } } } // Plus de 35h
  ]);

  weeklyHours.forEach(weekData => {
    conflicts.push({
      type: 'overwork',
      severity: 'warning',
      userId: weekData.user,
      week: weekData._id.week,
      year: weekData._id.year,
      message: `Dépassement horaire: ${Math.round(weekData.totalMinutes / 60)}h par semaine`,
      schedules: weekData.schedules,
      details: {
        totalHours: Math.round(weekData.totalMinutes / 60),
        limit: 35
      }
    });
  });

  // Filtrer par sévérité si demandé
  return severity === 'all' ? conflicts : conflicts.filter(c => c.severity === severity);
}

/**
 * Formater planning pour calendrier
 */
function formatScheduleForCalendar(schedule) {
  return {
    id: schedule._id,
    userId: schedule.user._id,
    userName: `${schedule.user.firstName} ${schedule.user.lastName}`,
    userEmail: schedule.user.email,
    agencyId: schedule.agency._id,
    agencyName: schedule.agency.name,
    agencyCode: schedule.agency.code,
    agencyClient: schedule.agency.client,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    breakStart: schedule.breakStart,
    breakEnd: schedule.breakEnd,
    workingDuration: schedule.workingDuration,
    workingHours: Math.round((schedule.workingDuration || 0) / 60 * 10) / 10,
    notes: schedule.notes,
    status: schedule.status,
    createdBy: schedule.createdBy,
    createdAt: schedule.createdAt,
    canEdit: true, // TODO: Basé sur permissions
    tags: generateScheduleTags(schedule)
  };
}

/**
 * Générer tags pour un planning
 */
function generateScheduleTags(schedule) {
  const tags = [];
  
  // Tag durée
  const hours = Math.round((schedule.workingDuration || 0) / 60);
  if (hours >= 8) tags.push({ type: 'duration', label: 'Temps plein', color: 'green' });
  else if (hours >= 4) tags.push({ type: 'duration', label: 'Mi-temps', color: 'blue' });
  else tags.push({ type: 'duration', label: 'Court', color: 'orange' });
  
  // Tag horaires
  const startHour = parseInt(schedule.startTime.split(':')[0]);
  if (startHour < 8) tags.push({ type: 'time', label: 'Tôt', color: 'purple' });
  else if (startHour >= 18) tags.push({ type: 'time', label: 'Tard', color: 'red' });
  
  // Tag pause
  if (schedule.breakStart && schedule.breakEnd) {
    tags.push({ type: 'break', label: 'Avec pause', color: 'gray' });
  }
  
  return tags;
}

/**
 * Calculer couverture d'un jour
 */
function calculateDayCoverage(schedules) {
  if (schedules.length === 0) return { rate: 0, hours: 0, gaps: [] };
  
  const totalHours = schedules.reduce((sum, s) => sum + (s.workingDuration || 0), 0) / 60;
  const agencies = [...new Set(schedules.map(s => s.agency._id.toString()))];
  
  return {
    rate: Math.min(100, Math.round((totalHours / (8 * agencies.length)) * 100)),
    hours: Math.round(totalHours),
    agencies: agencies.length,
    gaps: [] // TODO: Détecter les créneaux non couverts
  };
}

/**
 * Calculer charge de travail d'un jour
 */
function calculateDayWorkload(schedules) {
  const userHours = {};
  
  schedules.forEach(schedule => {
    const userId = schedule.user._id.toString();
    if (!userHours[userId]) userHours[userId] = 0;
    userHours[userId] += (schedule.workingDuration || 0) / 60;
  });
  
  const totalUsers = Object.keys(userHours).length;
  const averageHours = totalUsers > 0 ? 
    Object.values(userHours).reduce((sum, hours) => sum + hours, 0) / totalUsers : 0;
  
  return {
    totalUsers,
    averageHours: Math.round(averageHours * 10) / 10,
    maxHours: totalUsers > 0 ? Math.max(...Object.values(userHours)) : 0,
    overworked: Object.values(userHours).filter(hours => hours > 8).length
  };
}

/**
 * Détecter conflits d'un jour
 */
async function detectDayConflicts(schedules) {
  const conflicts = [];
  
  // Grouper par utilisateur
  const userSchedules = {};
  schedules.forEach(schedule => {
    const userId = schedule.user._id.toString();
    if (!userSchedules[userId]) userSchedules[userId] = [];
    userSchedules[userId].push(schedule);
  });
  
  // Détecter chevauchements par utilisateur
  Object.entries(userSchedules).forEach(([userId, userSched]) => {
    if (userSched.length > 1) {
      for (let i = 0; i < userSched.length; i++) {
        for (let j = i + 1; j < userSched.length; j++) {
          if (timesOverlap(userSched[i], userSched[j])) {
            conflicts.push({
              type: 'time_overlap',
              severity: 'critical',
              userId,
              userName: `${userSched[i].user.firstName} ${userSched[i].user.lastName}`,
              schedules: [userSched[i]._id, userSched[j]._id],
              message: 'Créneaux horaires en conflit'
            });
          }
        }
      }
    }
  });
  
  return conflicts;
}

/**
 * Vérifier si deux plannings se chevauchent
 */
function timesOverlap(schedule1, schedule2) {
  const start1 = timeToMinutes(schedule1.startTime);
  const end1 = timeToMinutes(schedule1.endTime);
  const start2 = timeToMinutes(schedule2.startTime);
  const end2 = timeToMinutes(schedule2.endTime);
  
  return start1 < end2 && start2 < end1;
}

/**
 * Convertir heure en minutes
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculer distribution par jour de semaine
 */
function calculateDayOfWeekDistribution(schedules) {
  const distribution = {
    1: { name: 'Lundi', count: 0 },
    2: { name: 'Mardi', count: 0 },
    3: { name: 'Mercredi', count: 0 },
    4: { name: 'Jeudi', count: 0 },
    5: { name: 'Vendredi', count: 0 },
    6: { name: 'Samedi', count: 0 },
    0: { name: 'Dimanche', count: 0 }
  };
  
  schedules.forEach(schedule => {
    const dayOfWeek = schedule.date.getDay();
    distribution[dayOfWeek].count++;
  });
  
  return Object.values(distribution);
}

/**
 * Générer suggestions pour résoudre conflits
 */
async function generateConflictSuggestions(conflicts) {
  const suggestions = [];
  
  for (const conflict of conflicts) {
    switch (conflict.type) {
      case 'user_overlap':
        suggestions.push({
          conflictId: `${conflict.userId}_${conflict.date}`,
          type: 'reschedule',
          priority: 'high',
          title: 'Décaler un créneau',
          description: 'Modifier l\'horaire d\'un des plannings en conflit',
          actions: [
            { type: 'move_earlier', label: 'Avancer premier créneau' },
            { type: 'move_later', label: 'Retarder second créneau' },
            { type: 'different_day', label: 'Déplacer sur autre jour' }
          ]
        });
        break;
        
      case 'overwork':
        suggestions.push({
          conflictId: `overwork_${conflict.userId}_${conflict.week}`,
          type: 'redistribute',
          priority: 'medium',
          title: 'Redistribuer la charge',
          description: `Réduire les heures de ${conflict.details.totalHours}h à 35h max`,
          actions: [
            { type: 'reduce_hours', label: 'Réduire durée des créneaux' },
            { type: 'remove_schedule', label: 'Supprimer un planning' },
            { type: 'assign_other', label: 'Réassigner à quelqu\'un d\'autre' }
          ]
        });
        break;
    }
  }
  
  return suggestions;
}

/**
 * Calculer métriques d'optimisation
 */
async function calculateOptimizationMetrics(schedules, period, constraints) {
  // Calculer couverture par agence
  const agencyCoverage = {};
  const userHours = {};
  
  schedules.forEach(schedule => {
    const agencyId = schedule.agency._id.toString();
    const userId = schedule.user._id.toString();
    
    if (!agencyCoverage[agencyId]) {
      agencyCoverage[agencyId] = { 
        name: schedule.agency.name, 
        hours: 0, 
        schedules: 0 
      };
    }
    if (!userHours[userId]) {
      userHours[userId] = { 
        name: `${schedule.user.firstName} ${schedule.user.lastName}`, 
        hours: 0 
      };
    }
    
    const hours = (schedule.workingDuration || 0) / 60;
    agencyCoverage[agencyId].hours += hours;
    agencyCoverage[agencyId].schedules++;
    userHours[userId].hours += hours;
  });
  
  // Calculer scores
  const totalDays = Math.ceil((period.end - period.start) / (1000 * 60 * 60 * 24));
  const targetHoursPerAgency = totalDays * 8; // 8h par jour par agence
  
  return {
    agencyCoverage: Object.entries(agencyCoverage).map(([id, data]) => ({
      agencyId: id,
      name: data.name,
      hours: Math.round(data.hours),
      schedules: data.schedules,
      coverage: Math.round((data.hours / targetHoursPerAgency) * 100),
      target: constraints.minCoveragePerAgency || 80
    })),
    userWorkload: Object.entries(userHours).map(([id, data]) => ({
      userId: id,
      name: data.name,
      hours: Math.round(data.hours),
      weeklyAverage: Math.round((data.hours / Math.ceil(totalDays / 7)) * 10) / 10,
      overLimit: data.hours > (constraints.maxHoursPerUser || 35)
    })),
    overall: {
      totalSchedules: schedules.length,
      totalHours: Math.round(schedules.reduce((sum, s) => sum + (s.workingDuration || 0), 0) / 60),
      averageCoverage: Object.values(agencyCoverage).length > 0 ?
        Math.round(Object.values(agencyCoverage).reduce((sum, a) => sum + (a.hours / targetHoursPerAgency), 0) / Object.values(agencyCoverage).length * 100) : 0,
      overworkedUsers: Object.values(userHours).filter(u => u.hours > (constraints.maxHoursPerUser || 35)).length
    }
  };
}

/**
 * Générer suggestions d'optimisation
 */
async function generateOptimizationSuggestions(schedules, metrics, constraints) {
  const suggestions = [];
  
  // Suggestions pour agences sous-couvertes
  metrics.agencyCoverage.forEach(agency => {
    if (agency.coverage < agency.target) {
      suggestions.push({
        type: 'increase_coverage',
        priority: 'high',
        agencyId: agency.agencyId,
        description: `Augmenter couverture ${agency.name} de ${agency.coverage}% à ${agency.target}%`,
        action: 'add_schedules',
        estimatedHours: Math.ceil((agency.target - agency.coverage) / 100 * 40), // Estimation
        requiresNotification: true
      });
    }
  });
  
  // Suggestions pour utilisateurs surchargés
  metrics.userWorkload.forEach(user => {
    if (user.overLimit) {
      suggestions.push({
        type: 'reduce_workload',
        priority: 'medium',
        userId: user.userId,
        description: `Réduire charge ${user.name} de ${user.hours}h à ${constraints.maxHoursPerUser}h`,
        action: 'redistribute_hours',
        excessHours: user.hours - (constraints.maxHoursPerUser || 35),
        requiresNotification: true
      });
    }
  });
  
  return suggestions;
}

/**
 * Projeter impact des optimisations
 */
async function projectOptimizationImpact(optimizations, currentMetrics) {
  // Simulation simple - en production, calcul plus complexe
  const projected = JSON.parse(JSON.stringify(currentMetrics));
  
  optimizations.forEach(opt => {
    switch (opt.type) {
      case 'increase_coverage':
        const agency = projected.agencyCoverage.find(a => a.agencyId === opt.agencyId);
        if (agency) {
          agency.coverage = Math.min(100, agency.coverage + 10);
          agency.hours += opt.estimatedHours || 10;
        }
        break;
        
      case 'reduce_workload':
        const user = projected.userWorkload.find(u => u.userId === opt.userId);
        if (user) {
          user.hours -= opt.excessHours || 5;
          user.overLimit = false;
        }
        projected.overall.overworkedUsers = Math.max(0, projected.overall.overworkedUsers - 1);
        break;
    }
  });
  
  return projected;
}

/**
 * Calculer améliorations
 */
function calculateImprovements(current, projected) {
  return {
    coverageImprovement: projected.overall.averageCoverage - current.overall.averageCoverage,
    overworkReduction: current.overall.overworkedUsers - projected.overall.overworkedUsers,
    totalHoursChange: projected.overall.totalHours - current.overall.totalHours
  };
}

module.exports = router;