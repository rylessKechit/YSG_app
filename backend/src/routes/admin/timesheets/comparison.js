// backend/src/routes/admin/timesheets/comparison.js - COMPARAISON PLANNING VS POINTAGE
const express = require('express');
const Joi = require('joi');
const Timesheet = require('../../../models/Timesheet');
const Schedule = require('../../../models/Schedule');
const { validateQuery, objectId } = require('../../../middleware/validation');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION =====
const comparisonQuerySchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  agencyId: objectId.optional(),
  userId: objectId.optional(),
  includeDetails: Joi.boolean().default(true),
  anomaliesOnly: Joi.boolean().default(false)
});

/**
 * @route   GET /api/admin/timesheets/compare
 * @desc    Vue comparative détaillée planning vs pointages
 * @access  Admin
 */
router.get('/', validateQuery(comparisonQuerySchema), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, userId, includeDetails, anomaliesOnly } = req.query;

    console.log('🔍 Comparaison planning vs pointages:', { 
      startDate: startDate.toISOString().split('T')[0], 
      endDate: endDate.toISOString().split('T')[0],
      agencyId, 
      userId 
    });

    // Construction de l'aggregation complexe
    const matchFilters = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (agencyId) matchFilters.agency = agencyId;
    if (userId) matchFilters.user = userId;

    // Récupérer tous les plannings de la période
    const schedules = await Schedule.find({
      ...matchFilters,
      status: 'active'
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code client')
    .lean();

    console.log(`📅 ${schedules.length} plannings trouvés`);

    // Pour chaque planning, chercher le timesheet correspondant
    const comparisons = [];
    
    for (const schedule of schedules) {
      // Chercher le timesheet correspondant
      const timesheet = await Timesheet.findOne({
        user: schedule.user._id,
        agency: schedule.agency._id,
        date: schedule.date
      }).lean();

      // Calculer la comparaison
      const comparison = {
        id: schedule._id.toString(),
        date: schedule.date,
        user: schedule.user,
        agency: schedule.agency,
        
        // Planning prévu
        plannedSchedule: {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          totalMinutes: calculateScheduleMinutes(schedule)
        },
        
        // Pointage réel
        actualTimesheet: timesheet ? {
          id: timesheet._id,
          startTime: timesheet.startTime,
          endTime: timesheet.endTime,
          breakStart: timesheet.breakStart,
          breakEnd: timesheet.breakEnd,
          totalWorkedMinutes: timesheet.totalWorkedMinutes,
          status: timesheet.status
        } : null,
        
        // Analyse comparative
        analysis: calculateComparison(schedule, timesheet)
      };

      // Filtrer si on veut seulement les anomalies
      if (anomaliesOnly && comparison.analysis.status === 'on_time') {
        continue;
      }

      comparisons.push(comparison);
    }

    // Chercher aussi les timesheets orphelins (sans planning)
    const orphanTimesheets = await Timesheet.find({
      ...matchFilters,
      schedule: { $exists: false }
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code client')
    .lean();

    // Ajouter les timesheets orphelins
    for (const timesheet of orphanTimesheets) {
      comparisons.push({
        id: `orphan_${timesheet._id}`,
        date: timesheet.date,
        user: timesheet.user,
        agency: timesheet.agency,
        plannedSchedule: null,
        actualTimesheet: {
          id: timesheet._id,
          startTime: timesheet.startTime,
          endTime: timesheet.endTime,
          breakStart: timesheet.breakStart,
          breakEnd: timesheet.breakEnd,
          totalWorkedMinutes: timesheet.totalWorkedMinutes,
          status: timesheet.status
        },
        analysis: {
          status: 'no_schedule',
          severity: 'warning',
          startVariance: null,
          endVariance: null,
          message: 'Pointage sans planning associé'
        }
      });
    }

    // Trier par priorité (problèmes en premier)
    comparisons.sort((a, b) => {
      const priorityOrder = { 'missing': 0, 'late': 1, 'disputed': 2, 'no_schedule': 3, 'early_leave': 4, 'on_time': 5 };
      return priorityOrder[a.analysis.status] - priorityOrder[b.analysis.status];
    });

    // Calculer statistiques globales
    const summary = calculateSummaryStats(comparisons);

    console.log('✅ Comparaison terminée:', { 
      totalComparisons: comparisons.length,
      onTime: summary.onTimeCount,
      late: summary.lateCount,
      missing: summary.missingCount
    });

    res.json({
      success: true,
      data: {
        comparisons: includeDetails ? comparisons : comparisons.map(c => ({
          id: c.id,
          date: c.date,
          user: c.user,
          agency: c.agency,
          analysis: c.analysis
        })),
        summary,
        filters: {
          startDate,
          endDate,
          agencyId: agencyId || null,
          userId: userId || null,
          anomaliesOnly
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur comparaison timesheets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la comparaison des pointages'
    });
  }
});

/**
 * @route   GET /api/admin/timesheets/compare/missing
 * @desc    Pointages manquants (plannings sans timesheet)
 * @access  Admin
 */
router.get('/missing', validateQuery(comparisonQuerySchema), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, userId } = req.query;

    const matchFilters = {
      date: { $gte: startDate, $lte: endDate },
      status: 'active'
    };
    
    if (agencyId) matchFilters.agency = agencyId;
    if (userId) matchFilters.user = userId;

    // Trouver les plannings sans timesheet correspondant
    const missingTimesheets = await Schedule.aggregate([
      { $match: matchFilters },
      
      // Left join avec Timesheet
      { $lookup: {
          from: 'timesheets',
          let: { 
            scheduleUser: '$user', 
            scheduleDate: '$date', 
            scheduleAgency: '$agency' 
          },
          pipeline: [
            { $match: {
              $expr: {
                $and: [
                  { $eq: ['$user', '$$scheduleUser'] },
                  { $eq: ['$date', '$$scheduleDate'] },
                  { $eq: ['$agency', '$$scheduleAgency'] }
                ]
              }
            }}
          ],
          as: 'timesheet'
      }},
      
      // Filtrer ceux sans timesheet
      { $match: { timesheet: { $eq: [] } } },
      
      // Enrichir avec détails utilisateur et agence
      { $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
      }},
      { $lookup: {
          from: 'agencies',
          localField: 'agency',
          foreignField: '_id',
          as: 'agencyDetails'
      }},
      
      // Reformater la sortie
      { $project: {
          date: 1,
          startTime: 1,
          endTime: 1,
          breakStart: 1,
          breakEnd: 1,
          user: { $arrayElemAt: ['$userDetails', 0] },
          agency: { $arrayElemAt: ['$agencyDetails', 0] },
          urgency: {
            $cond: [
              { $gte: ['$date', new Date()] },
              'high',
              'medium'
            ]
          }
      }}
    ]);

    console.log(`❌ ${missingTimesheets.length} pointages manquants trouvés`);

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
      message: 'Erreur lors de la recherche des pointages manquants'
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function calculateComparison(schedule, timesheet) {
  if (!timesheet || !timesheet.startTime) {
    return {
      status: 'missing',
      severity: 'critical',
      startVariance: null,
      endVariance: null,
      message: 'Pointage manquant'
    };
  }

  if (timesheet.status === 'disputed') {
    return {
      status: 'disputed',
      severity: 'high',
      startVariance: null,
      endVariance: null,
      message: 'Pointage en litige'
    };
  }

  // Calculer les écarts en minutes
  const scheduleDate = new Date(schedule.date);
  const [scheduleStartHours, scheduleStartMinutes] = schedule.startTime.split(':').map(Number);
  const scheduledStart = new Date(scheduleDate);
  scheduledStart.setHours(scheduleStartHours, scheduleStartMinutes, 0, 0);

  const startVariance = Math.floor((timesheet.startTime - scheduledStart) / (1000 * 60));

  let endVariance = null;
  if (timesheet.endTime && schedule.endTime) {
    const [scheduleEndHours, scheduleEndMinutes] = schedule.endTime.split(':').map(Number);
    const scheduledEnd = new Date(scheduleDate);
    scheduledEnd.setHours(scheduleEndHours, scheduleEndMinutes, 0, 0);
    endVariance = Math.floor((timesheet.endTime - scheduledEnd) / (1000 * 60));
  }

  // Déterminer le statut
  let status, severity, message;

  if (startVariance > 15) {
    status = 'late';
    severity = 'high';
    message = `Retard de ${startVariance} minutes`;
  } else if (startVariance > 5) {
    status = 'slight_delay';
    severity = 'medium';
    message = `Léger retard de ${startVariance} minutes`;
  } else if (endVariance !== null && endVariance < -30) {
    status = 'early_leave';
    severity = 'medium';
    message = `Parti ${Math.abs(endVariance)} minutes plus tôt`;
  } else {
    status = 'on_time';
    severity = 'low';
    message = startVariance > 0 ? 
      `Retard mineur de ${startVariance} minutes` : 
      startVariance < 0 ? 
        `En avance de ${Math.abs(startVariance)} minutes` : 
        'Ponctuel';
  }

  return {
    status,
    severity,
    startVariance,
    endVariance,
    message,
    details: {
      scheduledStart: schedule.startTime,
      actualStart: timesheet.startTime ? 
        timesheet.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 
        null,
      scheduledEnd: schedule.endTime,
      actualEnd: timesheet.endTime ? 
        timesheet.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 
        null
    }
  };
}

function calculateSummaryStats(comparisons) {
  const total = comparisons.length;
  const onTimeCount = comparisons.filter(c => c.analysis.status === 'on_time').length;
  const lateCount = comparisons.filter(c => ['late', 'slight_delay'].includes(c.analysis.status)).length;
  const missingCount = comparisons.filter(c => c.analysis.status === 'missing').length;
  const disputedCount = comparisons.filter(c => c.analysis.status === 'disputed').length;
  const earlyLeaveCount = comparisons.filter(c => c.analysis.status === 'early_leave').length;

  // Calculer retard moyen pour ceux en retard
  const lateComparisons = comparisons.filter(c => 
    ['late', 'slight_delay'].includes(c.analysis.status) && 
    c.analysis.startVariance !== null
  );
  const averageDelay = lateComparisons.length > 0 ? 
    Math.round(lateComparisons.reduce((sum, c) => sum + c.analysis.startVariance, 0) / lateComparisons.length) : 
    0;

  return {
    total,
    onTimeCount,
    lateCount,
    missingCount,
    disputedCount,
    earlyLeaveCount,
    punctualityRate: total > 0 ? Math.round((onTimeCount / total) * 100) : 0,
    averageDelay,
    breakdown: {
      on_time: { count: onTimeCount, percentage: Math.round((onTimeCount / total) * 100) },
      late: { count: lateCount, percentage: Math.round((lateCount / total) * 100) },
      missing: { count: missingCount, percentage: Math.round((missingCount / total) * 100) },
      disputed: { count: disputedCount, percentage: Math.round((disputedCount / total) * 100) },
      early_leave: { count: earlyLeaveCount, percentage: Math.round((earlyLeaveCount / total) * 100) }
    }
  };
}

function calculateScheduleMinutes(schedule) {
  if (!schedule.startTime || !schedule.endTime) return 0;
  
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  let totalMinutes = endMinutes - startMinutes;
  
  // Soustraire la pause si définie
  if (schedule.breakStart && schedule.breakEnd) {
    const breakStartMinutes = timeToMinutes(schedule.breakStart);
    const breakEndMinutes = timeToMinutes(schedule.breakEnd);
    totalMinutes -= (breakEndMinutes - breakStartMinutes);
  }
  
  return Math.max(0, totalMinutes);
}

module.exports = router;