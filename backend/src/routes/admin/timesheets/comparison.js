// backend/src/routes/admin/timesheets/comparison.js - VERSION CORRIGÉE
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
 * @desc    Comparaison planning vs pointages réels
 * @access  Admin
 */
router.get('/', validateQuery(comparisonFiltersSchema), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, userId, includeDetails, anomaliesOnly } = req.query;

    console.log('🔍 Comparaison timesheets:', { startDate, endDate, agencyId, userId });

    // Construction des filtres pour les deux collections
    const dateFilter = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    const filters = { ...dateFilter };
    if (agencyId) filters.agency = agencyId;
    if (userId) filters.user = userId;

    // Récupérer tous les plannings de la période
    const schedules = await Schedule.find({
      ...filters,
      status: 'active'
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code client')
    .sort({ date: 1, startTime: 1 });

    // Récupérer tous les timesheets de la période
    const timesheets = await Timesheet.find(filters)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .sort({ date: 1 });

    // ✅ CORRECTION : Créer un index des timesheets par clé unique avec vérifications null
    const timesheetMap = new Map();
    timesheets.forEach(timesheet => {
      // ✅ Vérifier que timesheet.user et timesheet.agency existent
      if (timesheet.user && timesheet.agency && timesheet.date) {
        const userId = timesheet.user._id || timesheet.user;
        const agencyId = timesheet.agency._id || timesheet.agency;
        const key = `${userId}-${agencyId}-${timesheet.date.toISOString().split('T')[0]}`;
        timesheetMap.set(key, timesheet);
      } else {
        console.warn('⚠️ Timesheet avec données manquantes:', {
          id: timesheet._id,
          hasUser: !!timesheet.user,
          hasAgency: !!timesheet.agency,
          hasDate: !!timesheet.date
        });
      }
    });

    // ✅ CORRECTION : Générer les comparaisons avec vérifications null
    const comparisons = [];
    let onTimeCount = 0;
    let lateCount = 0;
    let missingCount = 0;
    let disputedCount = 0;
    let earlyLeaveCount = 0;

    for (const schedule of schedules) {
      // ✅ Vérifier que schedule.user et schedule.agency existent
      if (!schedule.user || !schedule.agency || !schedule.date) {
        console.warn('⚠️ Schedule avec données manquantes:', {
          id: schedule._id,
          hasUser: !!schedule.user,
          hasAgency: !!schedule.agency,
          hasDate: !!schedule.date
        });
        continue; // Ignorer ce schedule
      }

      const userId = schedule.user._id || schedule.user;
      const agencyId = schedule.agency._id || schedule.agency;
      const key = `${userId}-${agencyId}-${schedule.date.toISOString().split('T')[0]}`;
      const timesheet = timesheetMap.get(key);

      const comparison = {
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
        actualTimesheet: timesheet ? {
          id: timesheet._id.toString(),
          startTime: timesheet.startTime,
          endTime: timesheet.endTime,
          breakStart: timesheet.breakStart,
          breakEnd: timesheet.breakEnd,
          totalWorkedMinutes: timesheet.totalWorkedMinutes || 0,
          status: timesheet.status
        } : null,
        analysis: analyzeComparison(schedule, timesheet)
      };

      // Comptabiliser les statuts
      switch (comparison.analysis.status) {
        case 'on_time':
          onTimeCount++;
          break;
        case 'late':
        case 'slight_delay':
          lateCount++;
          break;
        case 'missing':
          missingCount++;
          break;
        case 'disputed':
          disputedCount++;
          break;
        case 'early_leave':
          earlyLeaveCount++;
          break;
      }

      // Filtrer les anomalies si demandé
      if (!anomaliesOnly || comparison.analysis.status !== 'on_time') {
        comparisons.push(comparison);
      }
    }

    // Calculer le résumé
    const total = schedules.length;
    const punctualityRate = total > 0 ? ((onTimeCount / total) * 100) : 0;
    const averageDelay = calculateAverageDelay(comparisons);

    const summary = {
      total,
      onTimeCount,
      lateCount,
      missingCount,
      disputedCount,
      earlyLeaveCount,
      punctualityRate: Math.round(punctualityRate * 100) / 100,
      averageDelay,
      breakdown: {
        on_time: { count: onTimeCount, percentage: Math.round((onTimeCount / total) * 100) },
        late: { count: lateCount, percentage: Math.round((lateCount / total) * 100) },
        missing: { count: missingCount, percentage: Math.round((missingCount / total) * 100) },
        disputed: { count: disputedCount, percentage: Math.round((disputedCount / total) * 100) },
        early_leave: { count: earlyLeaveCount, percentage: Math.round((earlyLeaveCount / total) * 100) }
      }
    };

    console.log('✅ Comparaison générée:', { total, comparisons: comparisons.length });

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
 * @desc    Pointages manquants (plannings sans timesheet)
 * @access  Admin
 */
router.get('/missing', validateQuery(comparisonFiltersSchema), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, userId } = req.query;

    console.log('🔍 Recherche pointages manquants:', { startDate, endDate });

    const filters = {
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'active'
    };
    
    if (agencyId) filters.agency = agencyId;
    if (userId) filters.user = userId;

    // Récupérer tous les plannings
    const schedules = await Schedule.find(filters)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .sort({ date: 1, startTime: 1 });

    // Récupérer tous les timesheets correspondants
    const timesheetFilters = { ...filters };
    delete timesheetFilters.status;
    
    const timesheets = await Timesheet.find(timesheetFilters);
    
    // ✅ CORRECTION : Créer un Set des clés de timesheets existants avec vérifications null
    const timesheetKeys = new Set();
    timesheets.forEach(timesheet => {
      // ✅ Vérifier que les propriétés existent
      if (timesheet.user && timesheet.agency && timesheet.date) {
        const userId = timesheet.user._id || timesheet.user;
        const agencyId = timesheet.agency._id || timesheet.agency;
        const key = `${userId}-${agencyId}-${timesheet.date.toISOString().split('T')[0]}`;
        timesheetKeys.add(key);
      }
    });

    // ✅ CORRECTION : Identifier les plannings sans timesheet avec vérifications null
    const missingTimesheets = [];
    
    schedules.forEach(schedule => {
      // ✅ Vérifier que schedule.user et schedule.agency existent
      if (!schedule.user || !schedule.agency || !schedule.date) {
        console.warn('⚠️ Schedule avec données manquantes dans missing:', {
          id: schedule._id,
          hasUser: !!schedule.user,
          hasAgency: !!schedule.agency,
          hasDate: !!schedule.date
        });
        return; // Ignorer ce schedule
      }

      const userId = schedule.user._id || schedule.user;
      const agencyId = schedule.agency._id || schedule.agency;
      const key = `${userId}-${agencyId}-${schedule.date.toISOString().split('T')[0]}`;
      
      if (!timesheetKeys.has(key)) {
        const now = new Date();
        const scheduleDateTime = new Date(schedule.date);
        const daysDiff = Math.floor((now - scheduleDateTime) / (1000 * 60 * 60 * 24));
        
        missingTimesheets.push({
          id: schedule._id.toString(),
          date: schedule.date.toISOString().split('T')[0],
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          user: schedule.user,
          agency: schedule.agency,
          urgency: daysDiff > 7 ? 'high' : daysDiff > 3 ? 'medium' : 'low'
        });
      }
    });

    console.log('✅ Pointages manquants trouvés:', missingTimesheets.length);

    res.json({
      success: true,
      data: {
        missingTimesheets,
        count: missingTimesheets.length,
        filters: { startDate, endDate, agencyId, userId }
      }
    });

  } catch (error) {
    console.error('❌ Erreur recherche pointages manquants:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de la recherche'
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Calculer la durée en minutes entre deux heures, en soustrayant les pauses
 */
function calculateMinutes(startTime, endTime, breakStart, breakEnd) {
  if (!startTime || !endTime) return 0;
  
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    let totalMinutes = Math.floor((end - start) / (1000 * 60));
    
    // Soustraire les pauses
    if (breakStart && breakEnd) {
      const breakStartTime = new Date(breakStart);
      const breakEndTime = new Date(breakEnd);
      
      if (!isNaN(breakStartTime.getTime()) && !isNaN(breakEndTime.getTime())) {
        const breakMinutes = Math.floor((breakEndTime - breakStartTime) / (1000 * 60));
        totalMinutes -= breakMinutes;
      }
    }
    
    return Math.max(0, totalMinutes);
  } catch (error) {
    console.error('Erreur calcul minutes:', error);
    return 0;
  }
}

/**
 * Analyser la comparaison entre planning et pointage
 */
function analyzeComparison(schedule, timesheet) {
  // Si pas de timesheet
  if (!timesheet) {
    return {
      status: 'missing',
      severity: 'high',
      startVariance: null,
      endVariance: null,
      message: 'Aucun pointage trouvé pour ce planning',
      details: {
        scheduledStart: schedule.startTime,
        actualStart: null,
        scheduledEnd: schedule.endTime,
        actualEnd: null
      }
    };
  }

  // Si timesheet en litige
  if (timesheet.status === 'disputed') {
    return {
      status: 'disputed',
      severity: 'high',
      startVariance: null,
      endVariance: null,
      message: 'Pointage en litige',
      details: {
        scheduledStart: schedule.startTime,
        actualStart: timesheet.startTime ? new Date(timesheet.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null,
        scheduledEnd: schedule.endTime,
        actualEnd: timesheet.endTime ? new Date(timesheet.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null
      }
    };
  }

  // Calculer les écarts de temps
  let startVariance = null;
  let endVariance = null;
  let status = 'on_time';
  let severity = 'low';
  let message = 'Pointage conforme au planning';

  // Calculer l'écart au début
  if (schedule.startTime && timesheet.startTime) {
    try {
      const scheduledStart = new Date(`1970-01-01T${schedule.startTime}:00`);
      const actualStart = new Date(timesheet.startTime);
      
      if (!isNaN(scheduledStart.getTime()) && !isNaN(actualStart.getTime())) {
        startVariance = Math.floor((actualStart - scheduledStart) / (1000 * 60));
        
        if (startVariance > 15) {
          status = 'late';
          severity = 'high';
          message = `Retard important de ${startVariance} minutes`;
        } else if (startVariance > 5) {
          status = 'slight_delay';
          severity = 'medium';
          message = `Léger retard de ${startVariance} minutes`;
        } else if (startVariance < -15) {
          status = 'early_leave';
          severity = 'medium';
          message = `Arrivée très en avance (${Math.abs(startVariance)} minutes)`;
        }
      }
    } catch (error) {
      console.error('Erreur calcul variance début:', error);
    }
  }

  // Calculer l'écart à la fin
  if (schedule.endTime && timesheet.endTime) {
    try {
      const scheduledEnd = new Date(`1970-01-01T${schedule.endTime}:00`);
      const actualEnd = new Date(timesheet.endTime);
      
      if (!isNaN(scheduledEnd.getTime()) && !isNaN(actualEnd.getTime())) {
        endVariance = Math.floor((actualEnd - scheduledEnd) / (1000 * 60));
        
        if (endVariance < -15) {
          status = 'early_leave';
          severity = 'medium';
          message = `Départ anticipé de ${Math.abs(endVariance)} minutes`;
        }
      }
    } catch (error) {
      console.error('Erreur calcul variance fin:', error);
    }
  }

  return {
    status,
    severity,
    startVariance,
    endVariance,
    message,
    details: {
      scheduledStart: schedule.startTime,
      actualStart: timesheet.startTime ? new Date(timesheet.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null,
      scheduledEnd: schedule.endTime,
      actualEnd: timesheet.endTime ? new Date(timesheet.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null
    }
  };
}

/**
 * Calculer le retard moyen
 */
function calculateAverageDelay(comparisons) {
  const delayedComparisons = comparisons.filter(c => 
    ['late', 'slight_delay'].includes(c.analysis.status) && 
    c.analysis.startVariance !== null && 
    c.analysis.startVariance > 0
  );
  
  if (delayedComparisons.length === 0) return 0;
  
  const totalDelay = delayedComparisons.reduce((sum, c) => sum + c.analysis.startVariance, 0);
  return Math.round(totalDelay / delayedComparisons.length);
}

module.exports = router;