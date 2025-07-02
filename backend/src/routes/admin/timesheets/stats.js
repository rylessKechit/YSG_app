// backend/src/routes/admin/timesheets/stats.js - STATISTIQUES ET ANALYTICS
const express = require('express');
const Joi = require('joi');
const Timesheet = require('../../../models/Timesheet');
const Schedule = require('../../../models/Schedule');
const { validateQuery, objectId } = require('../../../middleware/validation');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION =====
const statsQuerySchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month', 'quarter', 'year', 'custom').default('week'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  agencyId: objectId.optional(),
  userId: objectId.optional(),
  groupBy: Joi.string().valid('day', 'week', 'month', 'agency', 'user').default('day')
});

/**
 * @route   GET /api/admin/timesheets/stats
 * @desc    Statistiques de ponctualité et performance
 * @access  Admin
 */
router.get('/', validateQuery(statsQuerySchema), async (req, res) => {
  try {
    const { period, startDate, endDate, agencyId, userId, groupBy } = req.query;

    console.log('📊 Génération statistiques timesheets:', { period, groupBy });

    // Calculer les dates selon la période
    const dateRange = calculateDateRange(period, startDate, endDate);

    // Construction des filtres
    const matchFilters = {
      date: { $gte: dateRange.start, $lte: dateRange.end }
    };
    
    if (agencyId) matchFilters.agency = agencyId;
    if (userId) matchFilters.user = userId;

    // Statistiques globales
    const globalStats = await calculateGlobalStats(matchFilters);

    // Tendances temporelles
    const trends = await calculateTrends(matchFilters, groupBy, dateRange);

    // Top utilisateurs (meilleurs et moins bons)
    const userStats = await calculateUserStats(matchFilters);

    // Statistiques par agence
    const agencyStats = await calculateAgencyStats(matchFilters);

    // Anomalies détectées
    const anomalies = await detectAnomalies(matchFilters);

    console.log('✅ Statistiques calculées');

    res.json({
      success: true,
      data: {
        globalStats,
        trends,
        userStats,
        agencyStats,
        anomalies,
        period: {
          type: period,
          start: dateRange.start,
          end: dateRange.end,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur calcul statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques'
    });
  }
});

/**
 * @route   GET /api/admin/timesheets/stats/punctuality
 * @desc    Rapport détaillé de ponctualité
 * @access  Admin
 */
router.get('/punctuality', validateQuery(statsQuerySchema), async (req, res) => {
  try {
    const { period, startDate, endDate, agencyId, userId } = req.query;

    const dateRange = calculateDateRange(period, startDate, endDate);
    const matchFilters = {
      date: { $gte: dateRange.start, $lte: dateRange.end }
    };
    
    if (agencyId) matchFilters.agency = agencyId;
    if (userId) matchFilters.user = userId;

    // Rapport de ponctualité détaillé
    const punctualityReport = await Timesheet.aggregate([
      { $match: matchFilters },
      
      // Joindre avec les plannings pour comparaison
      { $lookup: {
          from: 'schedules',
          localField: 'schedule',
          foreignField: '_id',
          as: 'plannedSchedule'
      }},
      
      // Joindre utilisateur et agence
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
      
      // Calculer les métriques de ponctualité
      { $addFields: {
          user: { $arrayElemAt: ['$userDetails', 0] },
          agency: { $arrayElemAt: ['$agencyDetails', 0] },
          schedule: { $arrayElemAt: ['$plannedSchedule', 0] },
          
          // Classification ponctualité
          punctualityCategory: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'disputed'] }, then: 'disputed' },
                { case: { $not: '$startTime' }, then: 'missing' },
                { case: { $gt: ['$delays.startDelay', 15] }, then: 'late' },
                { case: { $gt: ['$delays.startDelay', 5] }, then: 'slight_delay' },
                { case: { $gte: ['$delays.startDelay', 0] }, then: 'on_time' }
              ],
              default: 'early'
            }
          }
      }},
      
      // Grouper par catégorie de ponctualité
      { $group: {
          _id: '$punctualityCategory',
          count: { $sum: 1 },
          averageDelay: { $avg: '$delays.startDelay' },
          maxDelay: { $max: '$delays.startDelay' },
          users: { $addToSet: '$user' },
          agencies: { $addToSet: '$agency' },
          details: { $push: {
              date: '$date',
              user: '$user',
              agency: '$agency',
              startDelay: '$delays.startDelay',
              endDelay: '$delays.endDelay'
          }}
      }},
      
      { $sort: { '_id': 1 } }
    ]);

    // Calculer les totaux
    const totalTimesheets = punctualityReport.reduce((sum, cat) => sum + cat.count, 0);
    
    const summary = {
      totalTimesheets,
      categories: punctualityReport.map(cat => ({
        category: cat._id,
        count: cat.count,
        percentage: Math.round((cat.count / totalTimesheets) * 100),
        averageDelay: Math.round(cat.averageDelay || 0),
        maxDelay: cat.maxDelay || 0,
        uniqueUsers: cat.users.length,
        uniqueAgencies: cat.agencies.length
      })),
      overall: {
        punctualityRate: Math.round(
          (punctualityReport.find(cat => cat._id === 'on_time')?.count || 0) / totalTimesheets * 100
        ),
        averageDelay: Math.round(
          punctualityReport
            .filter(cat => ['late', 'slight_delay'].includes(cat._id))
            .reduce((sum, cat) => sum + (cat.averageDelay * cat.count), 0) /
          punctualityReport
            .filter(cat => ['late', 'slight_delay'].includes(cat._id))
            .reduce((sum, cat) => sum + cat.count, 0) || 0
        )
      }
    };

    res.json({
      success: true,
      data: {
        summary,
        details: punctualityReport,
        period: { start: dateRange.start, end: dateRange.end }
      }
    });

  } catch (error) {
    console.error('❌ Erreur rapport ponctualité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport de ponctualité'
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

function calculateDateRange(period, startDate, endDate) {
  const now = new Date();
  let start, end;

  if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        end = now;
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        end = now;
        break;
      case 'year':
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        end = now;
        break;
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
    }
  }

  return { start, end };
}

async function calculateGlobalStats(matchFilters) {
  const [timesheetStats, punctualityStats] = await Promise.all([
    // Stats générales des timesheets
    Timesheet.aggregate([
      { $match: matchFilters },
      { $group: {
          _id: null,
          totalTimesheets: { $sum: 1 },
          completeTimesheets: { $sum: { $cond: [{ $eq: ['$status', 'complete'] }, 1, 0] } },
          incompleteTimesheets: { $sum: { $cond: [{ $eq: ['$status', 'incomplete'] }, 1, 0] } },
          disputedTimesheets: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } },
          averageWorkedHours: { $avg: { $divide: ['$totalWorkedMinutes', 60] } },
          totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } }
      }}
    ]),
    
    // Stats de ponctualité
    Timesheet.aggregate([
      { $match: matchFilters },
      { $group: {
          _id: null,
          onTimeCount: { $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $gt: ['$delays.startDelay', 5] }, 1, 0] } },
          averageDelay: { $avg: '$delays.startDelay' },
          maxDelay: { $max: '$delays.startDelay' }
      }}
    ])
  ]);

  const timesheet = timesheetStats[0] || {};
  const punctuality = punctualityStats[0] || {};

  return {
    totalTimesheets: timesheet.totalTimesheets || 0,
    completeTimesheets: timesheet.completeTimesheets || 0,
    incompleteTimesheets: timesheet.incompleteTimesheets || 0,
    disputedTimesheets: timesheet.disputedTimesheets || 0,
    completionRate: timesheet.totalTimesheets > 0 ? 
      Math.round((timesheet.completeTimesheets / timesheet.totalTimesheets) * 100) : 0,
    averageWorkedHours: Math.round((timesheet.averageWorkedHours || 0) * 100) / 100,
    totalWorkedHours: Math.round((timesheet.totalWorkedHours || 0) * 100) / 100,
    punctualityRate: (timesheet.totalTimesheets > 0 && punctuality.onTimeCount) ? 
      Math.round((punctuality.onTimeCount / timesheet.totalTimesheets) * 100) : 0,
    averageDelay: Math.round(punctuality.averageDelay || 0),
    maxDelay: punctuality.maxDelay || 0
  };
}

async function calculateTrends(matchFilters, groupBy, dateRange) {
  let groupFormat;
  
  switch (groupBy) {
    case 'day':
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
      break;
    case 'week':
      groupFormat = { $dateToString: { format: '%Y-W%U', date: '$date' } };
      break;
    case 'month':
      groupFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
      break;
    default:
      groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
  }

  const trends = await Timesheet.aggregate([
    { $match: matchFilters },
    { $group: {
        _id: groupFormat,
        totalTimesheets: { $sum: 1 },
        onTimeCount: { $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] } },
        lateCount: { $sum: { $cond: [{ $gt: ['$delays.startDelay', 5] }, 1, 0] } },
        averageDelay: { $avg: '$delays.startDelay' },
        totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } }
    }},
    { $addFields: {
        punctualityRate: { $round: [{ $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] }, 1] }
    }},
    { $sort: { '_id': 1 } }
  ]);

  return trends.map(trend => ({
    period: trend._id,
    totalTimesheets: trend.totalTimesheets,
    punctualityRate: trend.punctualityRate || 0,
    averageDelay: Math.round(trend.averageDelay || 0),
    totalWorkedHours: Math.round((trend.totalWorkedHours || 0) * 100) / 100
  }));
}

async function calculateUserStats(matchFilters) {
  const userStats = await Timesheet.aggregate([
    { $match: matchFilters },
    { $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails'
    }},
    { $group: {
        _id: '$user',
        user: { $first: { $arrayElemAt: ['$userDetails', 0] } },
        totalTimesheets: { $sum: 1 },
        onTimeCount: { $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] } },
        averageDelay: { $avg: '$delays.startDelay' },
        totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } }
    }},
    { $addFields: {
        punctualityRate: { $round: [{ $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] }, 1] }
    }},
    { $sort: { punctualityRate: -1, averageDelay: 1 } }
  ]);

  return {
    topPerformers: userStats.slice(0, 5),
    needsImprovement: userStats.slice(-5).reverse()
  };
}

async function calculateAgencyStats(matchFilters) {
  return await Timesheet.aggregate([
    { $match: matchFilters },
    { $lookup: {
        from: 'agencies',
        localField: 'agency',
        foreignField: '_id',
        as: 'agencyDetails'
    }},
    { $group: {
        _id: '$agency',
        agency: { $first: { $arrayElemAt: ['$agencyDetails', 0] } },
        totalTimesheets: { $sum: 1 },
        onTimeCount: { $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] } },
        averageDelay: { $avg: '$delays.startDelay' },
        totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } }
    }},
    { $addFields: {
        punctualityRate: { $round: [{ $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] }, 1] }
    }},
    { $sort: { punctualityRate: -1 } }
  ]);
}

async function detectAnomalies(matchFilters) {
  // Détecter les patterns suspects
  const anomalies = [];

  // Utilisateurs toujours en retard du même délai (suspect)
  const suspiciousPatterns = await Timesheet.aggregate([
    { $match: { ...matchFilters, 'delays.startDelay': { $gt: 0 } } },
    { $group: {
        _id: { user: '$user', delay: '$delays.startDelay' },
        count: { $sum: 1 },
        user: { $first: '$user' }
    }},
    { $match: { count: { $gte: 3 } } }, // Au moins 3 fois le même retard
    { $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userDetails'
    }},
    { $project: {
        user: { $arrayElemAt: ['$userDetails', 0] },
        delay: '$_id.delay',
        count: 1,
        suspicionLevel: { $cond: [{ $gte: ['$count', 5] }, 'high', 'medium'] }
    }}
  ]);

  anomalies.push(...suspiciousPatterns.map(pattern => ({
    type: 'consistent_delay',
    severity: pattern.suspicionLevel,
    user: pattern.user,
    description: `Toujours ${pattern.delay}min de retard (${pattern.count} fois)`,
    count: pattern.count
  })));

  // TODO: Ajouter d'autres détections d'anomalies
  
  return anomalies;
}

module.exports = router;