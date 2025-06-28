// ===== backend/src/routes/admin/schedules/calendar.js - VERSION CORRIGÉE =====
const express = require('express');
const Joi = require('joi'); // ✅ Import explicite de Joi
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const Timesheet = require('../../../models/Timesheet');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery, validateBody, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION LOCAUX =====
const calendarQuerySchema = Joi.object({
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(), // Format: 2024-01
  view: Joi.string().valid('month', 'week', 'day').default('month'),
  agencies: Joi.array().items(objectId).optional(),
  users: Joi.array().items(objectId).optional(),
  includeMetadata: Joi.boolean().default(true),
  includeConflicts: Joi.boolean().default(true)
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
          year,
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
  
  return Math.max(0, workingMinutes / 60); // Convertir en heures
}

/**
 * Convertir un horaire en minutes depuis minuit
 */
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
}

/**
 * Détecter les conflits pour une journée
 */
async function findDayConflicts(daySchedules) {
  const conflicts = [];
  
  for (let i = 0; i < daySchedules.length; i++) {
    for (let j = i + 1; j < daySchedules.length; j++) {
      const schedule1 = daySchedules[i];
      const schedule2 = daySchedules[j];
      
      // Conflit utilisateur (même personne, même jour)
      if (schedule1.user._id.toString() === schedule2.user._id.toString()) {
        conflicts.push({
          type: 'user_conflict',
          severity: 'critical',
          message: `${schedule1.user.firstName} ${schedule1.user.lastName} a plusieurs plannings le même jour`,
          schedules: [schedule1._id, schedule2._id],
          user: schedule1.user,
          times: {
            schedule1: `${schedule1.startTime}-${schedule1.endTime}`,
            schedule2: `${schedule2.startTime}-${schedule2.endTime}`
          }
        });
      }
      
      // Conflit horaire (chevauchement)
      const overlap = checkTimeOverlap(
        schedule1.startTime, schedule1.endTime,
        schedule2.startTime, schedule2.endTime
      );
      
      if (overlap && schedule1.agency._id.toString() === schedule2.agency._id.toString()) {
        conflicts.push({
          type: 'time_overlap',
          severity: 'warning',
          message: `Chevauchement horaire dans l'agence ${schedule1.agency.name}`,
          schedules: [schedule1._id, schedule2._id],
          agency: schedule1.agency,
          overlap: overlap
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Vérifier si deux créneaux horaires se chevauchent
 */
function checkTimeOverlap(start1, end1, start2, end2) {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);
  
  const overlapStart = Math.max(start1Minutes, start2Minutes);
  const overlapEnd = Math.min(end1Minutes, end2Minutes);
  
  if (overlapStart < overlapEnd) {
    return {
      start: minutesToTime(overlapStart),
      end: minutesToTime(overlapEnd),
      duration: overlapEnd - overlapStart
    };
  }
  
  return null;
}

/**
 * Convertir des minutes en format HH:mm
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculer les métadonnées du calendrier
 */
async function calculateCalendarMetadata(schedules, startDate, endDate) {
  const totalSchedules = schedules.length;
  const totalHours = schedules.reduce((sum, s) => 
    sum + calculateWorkingHours(s.startTime, s.endTime, s.breakStart, s.breakEnd), 0
  );
  
  // Statistiques par agence
  const agencyStats = schedules.reduce((acc, schedule) => {
    const agencyId = schedule.agency._id.toString();
    if (!acc[agencyId]) {
      acc[agencyId] = {
        agency: {
          id: schedule.agency._id,
          name: schedule.agency.name,
          code: schedule.agency.code
        },
        schedules: 0,
        hours: 0,
        users: new Set()
      };
    }
    
    acc[agencyId].schedules++;
    acc[agencyId].hours += calculateWorkingHours(
      schedule.startTime, schedule.endTime, 
      schedule.breakStart, schedule.breakEnd
    );
    acc[agencyId].users.add(schedule.user._id.toString());
    
    return acc;
  }, {});
  
  // Convertir les Sets en nombres
  Object.values(agencyStats).forEach(stat => {
    stat.users = stat.users.size;
  });
  
  // Statistiques par utilisateur
  const userStats = schedules.reduce((acc, schedule) => {
    const userId = schedule.user._id.toString();
    if (!acc[userId]) {
      acc[userId] = {
        user: {
          id: schedule.user._id,
          name: `${schedule.user.firstName} ${schedule.user.lastName}`,
          email: schedule.user.email
        },
        schedules: 0,
        hours: 0,
        agencies: new Set()
      };
    }
    
    acc[userId].schedules++;
    acc[userId].hours += calculateWorkingHours(
      schedule.startTime, schedule.endTime,
      schedule.breakStart, schedule.breakEnd
    );
    acc[userId].agencies.add(schedule.agency._id.toString());
    
    return acc;
  }, {});
  
  // Convertir les Sets en nombres
  Object.values(userStats).forEach(stat => {
    stat.agencies = stat.agencies.size;
  });
  
  return {
    summary: {
      totalSchedules,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHoursPerSchedule: totalSchedules > 0 ? Math.round((totalHours / totalSchedules) * 10) / 10 : 0,
      uniqueUsers: Object.keys(userStats).length,
      uniqueAgencies: Object.keys(agencyStats).length
    },
    agencyStats: Object.values(agencyStats),
    userStats: Object.values(userStats),
    coverage: {
      daysWithSchedules: schedules.reduce((acc, schedule) => {
        const dateKey = schedule.date.toISOString().split('T')[0];
        acc.add(dateKey);
        return acc;
      }, new Set()).size,
      totalDaysInPeriod: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    }
  };
}

module.exports = router;