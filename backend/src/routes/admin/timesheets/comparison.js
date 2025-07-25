// backend/src/routes/admin/timesheets/comparison.js - VERSION OPTIMISÉE
const express = require('express');
const Joi = require('joi');
const Timesheet = require('../../../models/Timesheet');
const Schedule = require('../../../models/Schedule');
const { validateQuery, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION =====
const comparisonFiltersSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  agencyId: objectId.optional(),
  userId: objectId.optional(),
  includeDetails: Joi.boolean().default(true),
  anomaliesOnly: Joi.boolean().default(false)
});

/**
 * @route   GET /api/admin/timesheets/compare
 * @desc    Comparaison planning vs pointages + pointages orphelins
 * @access  Admin
 */
router.get('/', validateQuery(comparisonFiltersSchema), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, userId, includeDetails, anomaliesOnly } = req.query;

    console.log('🔍 Comparaison timesheets optimisée:', { startDate, endDate, agencyId, userId });

    // Construction des filtres
    const dateFilter = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    const filters = { ...dateFilter };
    if (agencyId) filters.agency = agencyId;
    if (userId) filters.user = userId;

    // ===== RÉCUPÉRATION DES DONNÉES EN PARALLÈLE =====
    const [timesheets, schedules] = await Promise.all([
      // Récupérer TOUS les timesheets de la période
      Timesheet.find(filters)
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client')
        .sort({ date: 1 }),
      
      // Récupérer les schedules (si ils existent)
      Schedule.find({
        ...filters,
        $or: [
          { status: 'active' },
          { isActive: true },
          { isActive: { $ne: false } }
        ]
      })
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client')
        .sort({ date: 1, startTime: 1 })
    ]);

    console.log(`📊 Données récupérées: ${timesheets.length} timesheets, ${schedules.length} schedules`);

    // ===== INDEXATION DES SCHEDULES =====
    const scheduleMap = new Map();
    schedules.forEach(schedule => {
      if (schedule.user && schedule.agency && schedule.date) {
        const key = createKey(schedule.user, schedule.agency, schedule.date);
        // ✅ FIX: Vérifier que la clé est valide avant de l'ajouter
        if (key) {
          scheduleMap.set(key, schedule);
        } else {
          console.warn('⚠️ Impossible de créer une clé pour schedule:', schedule._id);
        }
      }
    });

    // ===== GÉNÉRATION DES COMPARAISONS =====
    const { comparisons, stats } = generateComparisons(timesheets, scheduleMap, anomaliesOnly);

    // ===== AJOUT DES PLANNINGS MANQUÉS =====
    const missingComparisons = findMissingSchedules(schedules, timesheets, anomaliesOnly);
    comparisons.push(...missingComparisons);
    
    // Mise à jour des stats
    stats.missingCount += missingComparisons.length;
    stats.total = comparisons.length;

    // ===== CALCUL DU RÉSUMÉ =====
    const summary = calculateSummary(stats, comparisons);

    console.log('✅ Comparaison générée:', { 
      total: comparisons.length, 
      onTime: stats.onTimeCount,
      late: stats.lateCount,
      missing: stats.missingCount,
      orphan: stats.orphanCount
    });

    res.json({
      success: true,
      data: {
        comparisons,
        summary,
        filters: { startDate, endDate, agencyId, userId, includeDetails, anomaliesOnly }
      }
    });

  } catch (error) {
    console.error('❌ Erreur comparaison timesheets:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de la comparaison'
    });
  }
});

/**
 * @route   GET /api/admin/timesheets/compare/missing
 * @desc    Pointages manquants uniquement
 * @access  Admin
 */
router.get('/missing', validateQuery(comparisonFiltersSchema), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, userId } = req.query;

    const dateFilter = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    const filters = { ...dateFilter };
    if (agencyId) filters.agency = agencyId;
    if (userId) filters.user = userId;

    const [schedules, timesheets] = await Promise.all([
      Schedule.find({
        ...filters,
        $or: [
          { status: 'active' },
          { isActive: true },
          { isActive: { $ne: false } }
        ]
      })
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client'),
      
      Timesheet.find(filters).select('user agency date')
    ]);

    const timesheetKeys = new Set(
      timesheets.map(t => createKey(t.user, t.agency, t.date))
    );

    const missingTimesheets = schedules
      .filter(schedule => {
        const key = createKey(schedule.user, schedule.agency, schedule.date);
        return !timesheetKeys.has(key);
      })
      .map(schedule => ({
        id: schedule._id.toString(),
        date: schedule.date.toISOString().split('T')[0],
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
        user: schedule.user,
        agency: schedule.agency,
        urgency: calculateUrgency(schedule.date)
      }));

    res.json({
      success: true,
      data: {
        missingTimesheets,
        count: missingTimesheets.length,
        filters: { startDate, endDate, agencyId, userId }
      }
    });

  } catch (error) {
    console.error('❌ Erreur pointages manquants:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Créer une clé unique pour user-agency-date
 */
function createKey(user, agency, date) {
  // ✅ FIX: Gérer les cas où user/agency peuvent être null ou string/ObjectId
  let userId, agencyId;
  
  if (!user || !agency || !date) {
    console.warn('⚠️ createKey: données manquantes', { user: !!user, agency: !!agency, date: !!date });
    return null;
  }
  
  // User peut être un ObjectId, un objet avec _id, ou un string
  if (typeof user === 'string') {
    userId = user;
  } else if (user._id) {
    userId = user._id.toString();
  } else if (user.id) {
    userId = user.id.toString();
  } else {
    console.warn('⚠️ createKey: user sans id valide', user);
    return null;
  }
  
  // Agency peut être un ObjectId, un objet avec _id, ou un string
  if (typeof agency === 'string') {
    agencyId = agency;
  } else if (agency._id) {
    agencyId = agency._id.toString();
  } else if (agency.id) {
    agencyId = agency.id.toString();
  } else {
    console.warn('⚠️ createKey: agency sans id valide', agency);
    return null;
  }
  
  const dateStr = date.toISOString().split('T')[0];
  return `${userId}-${agencyId}-${dateStr}`;
}

/**
 * Générer les comparaisons à partir des timesheets
 */
function generateComparisons(timesheets, scheduleMap, anomaliesOnly) {
  const comparisons = [];
  const stats = {
    total: 0,
    onTimeCount: 0,
    lateCount: 0,
    missingCount: 0,
    orphanCount: 0,
    disputedCount: 0,
    earlyLeaveCount: 0
  };

  timesheets.forEach(timesheet => {
    if (!timesheet.user || !timesheet.agency || !timesheet.date) {
      console.warn('⚠️ Timesheet avec données manquantes:', timesheet._id);
      return; // Skip invalid data
    }

    const key = createKey(timesheet.user, timesheet.agency, timesheet.date);
    
    // ✅ FIX: Vérifier que la clé est valide
    if (!key) {
      console.warn('⚠️ Impossible de créer une clé pour timesheet:', timesheet._id);
      return;
    }
    
    const schedule = scheduleMap.get(key);
    const analysis = analyzeTimesheetVsSchedule(schedule, timesheet);

    const comparison = {
      id: timesheet._id.toString(),
      date: timesheet.date.toISOString().split('T')[0],
      user: timesheet.user,
      agency: timesheet.agency,
      plannedSchedule: schedule ? {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        breakStart: schedule.breakStart,
        breakEnd: schedule.breakEnd,
        totalMinutes: calculateMinutes(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd)
      } : null,
      actualTimesheet: {
        id: timesheet._id.toString(),
        startTime: timesheet.startTime,
        endTime: timesheet.endTime,
        breakStart: timesheet.breakStart,
        breakEnd: timesheet.breakEnd,
        totalWorkedMinutes: timesheet.totalWorkedMinutes || 0,
        status: timesheet.status
      },
      analysis
    };

    // Comptabiliser les statuts
    updateStats(stats, analysis.status);

    // Filtrer si anomalies seulement
    if (!anomaliesOnly || analysis.status !== 'on_time') {
      comparisons.push(comparison);
    }
  });

  return { comparisons, stats };
}

/**
 * Trouver les plannings sans timesheet correspondant
 */
function findMissingSchedules(schedules, timesheets, anomaliesOnly) {
  // Si on veut seulement les anomalies, inclure les plannings manqués
  if (anomaliesOnly) {
    const timesheetKeys = new Set(
      timesheets.map(t => createKey(t.user, t.agency, t.date))
    );

    return schedules
      .filter(schedule => {
        const key = createKey(schedule.user, schedule.agency, schedule.date);
        return !timesheetKeys.has(key);
      })
      .map(schedule => ({
        id: schedule._id.toString(),
        date: schedule.date.toISOString().split('T')[0],
        user: schedule.user,
        agency: schedule.agency,
        plannedSchedule: {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          totalMinutes: calculateMinutes(schedule.startTime, schedule.endTime, schedule.breakStart, schedule.breakEnd)
        },
        actualTimesheet: null,
        analysis: {
          status: 'missing',
          severity: 'high',
          startVariance: null,
          endVariance: null,
          message: 'Planning prévu mais aucun pointage',
          details: {
            scheduledStart: schedule.startTime,
            actualStart: null,
            scheduledEnd: schedule.endTime,
            actualEnd: null
          }
        }
      }));
  }

  return [];
}

/**
 * Mettre à jour les statistiques
 */
function updateStats(stats, status) {
  switch (status) {
    case 'on_time':
      stats.onTimeCount++;
      break;
    case 'late':
    case 'slight_delay':
      stats.lateCount++;
      break;
    case 'no_schedule':
      stats.orphanCount++;
      break;
    case 'disputed':
      stats.disputedCount++;
      break;
    case 'early_leave':
      stats.earlyLeaveCount++;
      break;
  }
}

/**
 * Analyser timesheet vs schedule
 */
function analyzeTimesheetVsSchedule(schedule, timesheet) {
  // Cas 1: Timesheet sans planning
  if (!schedule) {
    return {
      status: 'no_schedule',
      severity: 'medium',
      startVariance: null,
      endVariance: null,
      message: 'Pointage sans planning prévu',
      details: {
        scheduledStart: null,
        actualStart: timesheet.startTime ? formatTimeFromDate(timesheet.startTime) : null,
        scheduledEnd: null,
        actualEnd: timesheet.endTime ? formatTimeFromDate(timesheet.endTime) : null
      }
    };
  }

  // Cas 2: Analyser la ponctualité
  if (schedule.startTime && timesheet.startTime) {
    const scheduledMinutes = parseTimeToMinutes(schedule.startTime);
    const actualMinutes = getMinutesFromDate(timesheet.startTime);
    const variance = actualMinutes - scheduledMinutes;

    let status, severity, message;

    if (Math.abs(variance) <= 5) {
      status = 'on_time';
      severity = 'low';
      message = variance === 0 ? 'Parfaitement à l\'heure' : 
                `${Math.abs(variance)} min ${variance < 0 ? 'en avance' : 'de retard'}`;
    } else if (variance <= 15) {
      status = 'slight_delay';
      severity = 'medium';
      message = `Léger retard de ${variance} minutes`;
    } else if (variance > 15) {
      status = 'late';
      severity = 'high';
      message = `Retard important de ${variance} minutes`;
    } else {
      status = 'early_leave';
      severity = 'medium';
      message = `Arrivé ${Math.abs(variance)} minutes en avance`;
    }

    return {
      status,
      severity,
      startVariance: variance,
      endVariance: null,
      message,
      details: {
        scheduledStart: schedule.startTime,
        actualStart: formatTimeFromDate(timesheet.startTime),
        scheduledEnd: schedule.endTime,
        actualEnd: timesheet.endTime ? formatTimeFromDate(timesheet.endTime) : null
      }
    };
  }

  // Cas 3: Fallback
  return {
    status: 'on_time',
    severity: 'low',
    startVariance: 0,
    endVariance: 0,
    message: 'Pointage présent',
    details: {
      scheduledStart: schedule.startTime,
      actualStart: timesheet.startTime ? formatTimeFromDate(timesheet.startTime) : null,
      scheduledEnd: schedule.endTime,
      actualEnd: timesheet.endTime ? formatTimeFromDate(timesheet.endTime) : null
    }
  };
}

/**
 * Calculer les minutes à partir d'une string "HH:MM"
 */
function parseTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Extraire les minutes d'une date
 */
function getMinutesFromDate(date) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Formater une date en HH:MM
 */
function formatTimeFromDate(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

/**
 * Calculer la durée en minutes
 */
function calculateMinutes(startTime, endTime, breakStart, breakEnd) {
  if (!startTime || !endTime) return 0;
  
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  let duration = endMinutes - startMinutes;
  if (duration < 0) duration += 24 * 60; // Gestion passage minuit
  
  // Soustraire la pause
  if (breakStart && breakEnd) {
    const breakStartMinutes = parseTimeToMinutes(breakStart);
    const breakEndMinutes = parseTimeToMinutes(breakEnd);
    let breakDuration = breakEndMinutes - breakStartMinutes;
    if (breakDuration < 0) breakDuration += 24 * 60;
    duration -= breakDuration;
  }
  
  return Math.max(0, duration);
}

/**
 * Calculer l'urgence d'un planning manqué
 */
function calculateUrgency(scheduleDate) {
  const now = new Date();
  const daysDiff = Math.floor((now - scheduleDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 7) return 'high';
  if (daysDiff > 3) return 'medium';
  return 'low';
}

/**
 * Calculer le résumé final
 */
function calculateSummary(stats, comparisons) {
  const total = stats.total;
  const punctualityRate = total > 0 ? ((stats.onTimeCount / total) * 100) : 0;
  
  // Calculer le retard moyen
  const delayedComparisons = comparisons.filter(c => 
    ['late', 'slight_delay'].includes(c.analysis.status) && 
    c.analysis.startVariance > 0
  );
  
  const averageDelay = delayedComparisons.length > 0
    ? Math.round(delayedComparisons.reduce((sum, c) => sum + c.analysis.startVariance, 0) / delayedComparisons.length)
    : 0;

  return {
    total,
    onTimeCount: stats.onTimeCount,
    lateCount: stats.lateCount,
    missingCount: stats.missingCount,
    orphanCount: stats.orphanCount,
    disputedCount: stats.disputedCount,
    earlyLeaveCount: stats.earlyLeaveCount,
    punctualityRate: Math.round(punctualityRate * 100) / 100,
    averageDelay,
    breakdown: {
      on_time: { 
        count: stats.onTimeCount, 
        percentage: total > 0 ? Math.round((stats.onTimeCount / total) * 100) : 0 
      },
      late: { 
        count: stats.lateCount, 
        percentage: total > 0 ? Math.round((stats.lateCount / total) * 100) : 0 
      },
      missing: { 
        count: stats.missingCount, 
        percentage: total > 0 ? Math.round((stats.missingCount / total) * 100) : 0 
      },
      orphan: { 
        count: stats.orphanCount, 
        percentage: total > 0 ? Math.round((stats.orphanCount / total) * 100) : 0 
      },
      disputed: { 
        count: stats.disputedCount, 
        percentage: total > 0 ? Math.round((stats.disputedCount / total) * 100) : 0 
      },
      early_leave: { 
        count: stats.earlyLeaveCount, 
        percentage: total > 0 ? Math.round((stats.earlyLeaveCount / total) * 100) : 0 
      }
    }
  };
}

module.exports = router;