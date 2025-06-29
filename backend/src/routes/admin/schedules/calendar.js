// ===== backend/src/routes/admin/schedules/calendar.js - VERSION CORRIGÉE =====
const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION CORRIGÉS =====
const calendarQuerySchema = Joi.object({
  // Support des deux formats: year=2025&month=6 OU month=2025-06
  year: Joi.number().integer().min(2020).max(2030).optional(),
  month: Joi.alternatives().try(
    Joi.number().integer().min(1).max(12),  // Format numérique 1-12
    Joi.string().pattern(/^\d{4}-\d{2}$/)   // Format string 2025-06
  ).optional(),
  view: Joi.string().valid('month', 'week', 'day').default('month'),
  agencies: Joi.alternatives().try(
    Joi.array().items(objectId),
    Joi.string().allow('')
  ).optional(),
  users: Joi.alternatives().try(
    Joi.array().items(objectId),
    Joi.string().allow('')
  ).optional(),
  includeMetadata: Joi.boolean().default(true),
  includeConflicts: Joi.boolean().default(false)
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/schedules/calendar
 * @desc    Vue calendaire des plannings avec métadonnées
 * @access  Admin
 */
router.get('/', validateQuery(calendarQuerySchema), async (req, res) => {
  try {
    let { year, month, view = 'month', agencies = [], users = [], includeMetadata = true, includeConflicts = false } = req.query;
    
    // ✅ CORRECTION: Gérer les différents formats de date
    let yearNum, monthNum;
    
    if (typeof month === 'string' && month.includes('-')) {
      // Format "2025-06"
      [yearNum, monthNum] = month.split('-').map(Number);
    } else {
      // Format séparé year=2025&month=6
      yearNum = year || new Date().getFullYear();
      monthNum = month || new Date().getMonth() + 1;
    }

    // Validation des dates
    if (!yearNum || !monthNum || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Année et mois requis (format: year=2025&month=6 ou month=2025-06)'
      });
    }

    // ✅ CORRECTION: Gérer les tableaux dans les query params
    if (typeof agencies === 'string') {
      agencies = agencies ? agencies.split(',') : [];
    }
    if (typeof users === 'string') {
      users = users ? users.split(',') : [];
    }

    // Calculer les dates du mois
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0);
    endDate.setHours(23, 59, 59, 999);

    // Étendre aux jours de la première/dernière semaine pour vue complète
    const calendarStart = new Date(startDate);
    calendarStart.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7)); // Lundi précédent
    
    const calendarEnd = new Date(endDate);
    const daysToAdd = (7 - endDate.getDay()) % 7;
    calendarEnd.setDate(endDate.getDate() + daysToAdd); // Dimanche suivant

    // Construire les filtres pour MongoDB
    const mongoFilters = {
      date: { $gte: calendarStart, $lte: calendarEnd },
      status: 'active'
    };
    
    if (agencies.length > 0) {
      mongoFilters.agency = { $in: agencies };
    }
    if (users.length > 0) {
      mongoFilters.user = { $in: users };
    }

    // Récupérer tous les plannings de la période
    const schedules = await Schedule.find(mongoFilters)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: 1, startTime: 1 });

    // Organiser par semaines et jours
    const calendar = await buildCalendarStructure(calendarStart, calendarEnd, schedules, {
      month: monthNum,
      year: yearNum,
      includeConflicts
    });

    // Calculer métadonnées si demandées
    let metadata = null;
    if (includeMetadata) {
      metadata = await calculateCalendarMetadata(schedules, startDate, endDate);
    }

    res.json({
      success: true,
      data: {
        calendar,
        metadata,
        period: {
          month: monthNum,
          year: yearNum,
          startDate: calendarStart,
          endDate: calendarEnd,
          view
        },
        filters: {
          agencies,
          users,
          includeMetadata,
          includeConflicts
        }
      }
    });

  } catch (error) {
    console.error('Erreur vue calendaire:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * Construire la structure calendaire par semaines et jours
 */
async function buildCalendarStructure(startDate, endDate, schedules, options) {
  const weeks = [];
  const current = new Date(startDate);
  
  // Grouper les plannings par date
  const schedulesByDate = groupSchedulesByDate(schedules);
  
  while (current <= endDate) {
    const week = [];
    
    // Construire une semaine (7 jours)
    for (let i = 0; i < 7; i++) {
      const dayKey = current.toISOString().split('T')[0];
      const daySchedules = schedulesByDate[dayKey] || [];
      
      const day = {
        date: new Date(current),
        dateKey: dayKey,
        isCurrentMonth: current.getMonth() + 1 === options.month,
        isToday: isToday(current),
        schedules: daySchedules.map(schedule => ({
          id: schedule._id,
          user: {
            id: schedule.user._id,
            name: `${schedule.user.firstName} ${schedule.user.lastName}`,
            email: schedule.user.email
          },
          agency: {
            id: schedule.agency._id,
            name: schedule.agency.name,
            code: schedule.agency.code,
            client: schedule.agency.client
          },
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          workingHours: calculateWorkingHours(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd),
          status: schedule.status
        })),
        conflicts: options.includeConflicts ? await findDayConflicts(daySchedules) : [],
        stats: {
          totalSchedules: daySchedules.length,
          totalHours: daySchedules.reduce((sum, s) => sum + calculateWorkingHours(s.startTime, s.endTime, s.breakStart, s.breakEnd), 0),
          agencies: [...new Set(daySchedules.map(s => s.agency._id.toString()))].length
        }
      };
      
      week.push(day);
      current.setDate(current.getDate() + 1);
    }
    
    weeks.push({
      weekStart: new Date(week[0].date),
      weekEnd: new Date(week[6].date),
      days: week,
      stats: {
        totalSchedules: week.reduce((sum, day) => sum + day.schedules.length, 0),
        totalHours: week.reduce((sum, day) => sum + day.stats.totalHours, 0),
        workingDays: week.filter(day => day.schedules.length > 0).length
      }
    });
  }
  
  return weeks;
}

/**
 * Calculer les métadonnées du calendrier
 */
async function calculateCalendarMetadata(schedules, startDate, endDate) {
  return {
    totalSchedules: schedules.length,
    totalWorkingHours: schedules.reduce((sum, s) => sum + calculateWorkingHours(s.startTime, s.endTime, s.breakStart, s.breakEnd), 0),
    uniqueUsers: [...new Set(schedules.map(s => s.user._id.toString()))].length,
    uniqueAgencies: [...new Set(schedules.map(s => s.agency._id.toString()))].length,
    averagePerDay: Math.round((schedules.length / getDaysBetween(startDate, endDate)) * 100) / 100,
    busiestrDay: findBusiestDay(schedules),
    lightestDay: findLightestDay(schedules)
  };
}

/**
 * Grouper les plannings par date
 */
function groupSchedulesByDate(schedules) {
  return schedules.reduce((acc, schedule) => {
    const dateKey = schedule.date.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(schedule);
    return acc;
  }, {});
}

/**
 * Vérifier si une date est aujourd'hui
 */
function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Calculer les heures de travail effectives
 */
function calculateWorkingHours(startTime, endTime, breakStart, breakEnd) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  let workingMinutes = end - start;
  
  if (breakStart && breakEnd) {
    const breakStartMinutes = timeToMinutes(breakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);
    workingMinutes -= (breakEndMinutes - breakStartMinutes);
  }
  
  return Math.round((workingMinutes / 60) * 100) / 100; // Heures avec 2 décimales
}

/**
 * Convertir time string en minutes
 */
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculer jours entre deux dates
 */
function getDaysBetween(startDate, endDate) {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Trouver le jour le plus chargé
 */
function findBusiestDay(schedules) {
  const dayCount = {};
  schedules.forEach(s => {
    const day = s.date.toISOString().split('T')[0];
    dayCount[day] = (dayCount[day] || 0) + 1;
  });
  
  const busiest = Object.entries(dayCount).reduce((max, [day, count]) => 
    count > max.count ? { day, count } : max, { day: null, count: 0 });
  
  return busiest.day ? { date: busiest.day, count: busiest.count } : null;
}

/**
 * Trouver le jour le moins chargé
 */
function findLightestDay(schedules) {
  const dayCount = {};
  schedules.forEach(s => {
    const day = s.date.toISOString().split('T')[0];
    dayCount[day] = (dayCount[day] || 0) + 1;
  });
  
  const lightest = Object.entries(dayCount).reduce((min, [day, count]) => 
    count < min.count ? { day, count } : min, { day: null, count: Infinity });
  
  return lightest.day ? { date: lightest.day, count: lightest.count } : null;
}

/**
 * Détecter les conflits d'un jour (simplifié)
 */
async function findDayConflicts(daySchedules) {
  const conflicts = [];
  
  // Vérifier les chevauchements d'horaires pour un même utilisateur
  for (let i = 0; i < daySchedules.length; i++) {
    for (let j = i + 1; j < daySchedules.length; j++) {
      const s1 = daySchedules[i];
      const s2 = daySchedules[j];
      
      if (s1.user._id.toString() === s2.user._id.toString()) {
        const overlap = checkTimeOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime);
        if (overlap) {
          conflicts.push({
            type: 'user_double_booking',
            severity: 'critical',
            scheduleIds: [s1._id, s2._id],
            message: `Conflit d'horaire pour ${s1.user.firstName} ${s1.user.lastName}`
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Vérifier chevauchement entre deux créneaux horaires
 */
function checkTimeOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  
  return s1 < e2 && s2 < e1;
}

module.exports = router;