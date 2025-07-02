// backend/src/routes/admin/timesheets/stats.js
const express = require('express');
const Joi = require('joi');
const Timesheet = require('../../../models/Timesheet');
const { validateQuery, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION =====
const statsFiltersSchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month', 'quarter', 'year', 'custom').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  agencyId: objectId.optional(),
  userId: objectId.optional(),
  groupBy: Joi.string().valid('day', 'week', 'month', 'agency', 'user').default('day')
});

/**
 * @route   GET /api/admin/timesheets/stats
 * @desc    Statistiques globales des timesheets
 * @access  Admin
 */
router.get('/', validateQuery(statsFiltersSchema), async (req, res) => {
  try {
    const { period, startDate, endDate, agencyId, userId, groupBy } = req.query;

    console.log('📊 Génération stats timesheets:', { period, groupBy });

    // Calculer les dates selon la période
    const { start, end } = calculatePeriodDates(period, startDate, endDate);

    // Construction des filtres
    const filters = {
      date: { $gte: start, $lte: end }
    };
    
    if (agencyId) filters.agency = agencyId;
    if (userId) filters.user = userId;

    // Récupérer les statistiques globales
    const globalStats = await calculateGlobalStats(filters);

    // Récupérer les tendances
    const trends = await calculateTrends(filters, groupBy, start, end);

    // Récupérer les stats par utilisateur
    const userStats = await calculateUserStats(filters);

    // Récupérer les stats par agence
    const agencyStats = await calculateAgencyStats(filters);

    // Détecter les anomalies
    const anomalies = await detectAnomalies(filters);

    console.log('✅ Stats générées:', { globalStats, trends: trends.length });

    res.json({
      success: true,
      data: {
        globalStats,
        trends,
        userStats: {
          topPerformers: userStats.slice(0, 5),
          needsImprovement: userStats.slice(-5).reverse()
        },
        agencyStats,
        anomalies,
        period: {
          type: period,
          start: start.toISOString(),
          end: end.toISOString(),
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur génération stats:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de la génération des statistiques'
    });
  }
});

/**
 * @route   GET /api/admin/timesheets/stats/punctuality
 * @desc    Rapport détaillé de ponctualité
 * @access  Admin
 */
router.get('/punctuality', validateQuery(statsFiltersSchema), async (req, res) => {
  try {
    const { period, startDate, endDate, agencyId, userId } = req.query;

    console.log('📊 Rapport ponctualité:', { period, agencyId, userId });

    // Calculer les dates selon la période
    const { start, end } = calculatePeriodDates(period, startDate, endDate);

    // Construction des filtres
    const filters = {
      date: { $gte: start, $lte: end }
    };
    
    if (agencyId) filters.agency = agencyId;
    if (userId) filters.user = userId;

    // Agrégation pour les catégories de ponctualité
    const punctualityCategories = await Timesheet.aggregate([
      { $match: filters },
      {
        $addFields: {
          punctualityCategory: {
            $switch: {
              branches: [
                { case: { $lte: ['$delays.startDelay', 0] }, then: 'ponctuel' },
                { case: { $lte: ['$delays.startDelay', 5] }, then: 'leger_retard' },
                { case: { $lte: ['$delays.startDelay', 15] }, then: 'retard_moyen' },
                { case: { $gt: ['$delays.startDelay', 15] }, then: 'retard_important' }
              ],
              default: 'inconnu'
            }
          }
        }
      },
      {
        $group: {
          _id: '$punctualityCategory',
          count: { $sum: 1 },
          averageDelay: { $avg: '$delays.startDelay' },
          maxDelay: { $max: '$delays.startDelay' },
          users: { $addToSet: '$user' },
          agencies: { $addToSet: '$agency' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          averageDelay: { $round: ['$averageDelay', 1] },
          maxDelay: 1,
          uniqueUsers: { $size: '$users' },
          uniqueAgencies: { $size: '$agencies' }
        }
      }
    ]);

    // Calculer le total pour les pourcentages
    const totalTimesheets = punctualityCategories.reduce((sum, cat) => sum + cat.count, 0);

    // Ajouter les pourcentages
    const categoriesWithPercentage = punctualityCategories.map(cat => ({
      ...cat,
      percentage: totalTimesheets > 0 ? Math.round((cat.count / totalTimesheets) * 100 * 100) / 100 : 0
    }));

    // Calculer les statistiques globales
    const overallStats = await Timesheet.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalTimesheets: { $sum: 1 },
          onTimeCount: {
            $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] }
          },
          averageDelay: { $avg: '$delays.startDelay' }
        }
      },
      {
        $project: {
          totalTimesheets: 1,
          punctualityRate: {
            $round: [
              { $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] },
              2
            ]
          },
          averageDelay: { $round: ['$averageDelay', 1] }
        }
      }
    ]);

    const summary = {
      totalTimesheets,
      categories: categoriesWithPercentage,
      overall: overallStats[0] || { punctualityRate: 0, averageDelay: 0 }
    };

    // Détails par période si demandé
    const details = await Timesheet.aggregate([
      { $match: filters },
      { $match: { 'delays.startDelay': { $gt: 5 } } }, // Seulement les retards
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date'
            }
          },
          count: { $sum: 1 },
          averageDelay: { $avg: '$delays.startDelay' },
          maxDelay: { $max: '$delays.startDelay' },
          users: { $addToSet: '$user' },
          agencies: { $addToSet: '$agency' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'users',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $lookup: {
          from: 'agencies',
          localField: 'agencies',
          foreignField: '_id',
          as: 'agencyDetails'
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 10 }
    ]);

    console.log('✅ Rapport ponctualité généré');

    res.json({
      success: true,
      data: {
        summary,
        details,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur rapport ponctualité:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de la génération du rapport'
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Calculer les dates de début et fin selon la période
 */
function calculatePeriodDates(period, customStart, customEnd) {
  const now = new Date();
  let start, end;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      break;
    
    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      end = new Date(now);
      break;
    
    case 'quarter':
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      end = new Date(now);
      break;
    
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now);
      break;
    
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = customEnd ? new Date(customEnd) : new Date(now);
      break;
    
    default: // month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now);
  }

  return { start, end };
}

/**
 * Calculer les statistiques globales
 */
async function calculateGlobalStats(filters) {
  const stats = await Timesheet.aggregate([
    { $match: filters },
    {
      $group: {
        _id: null,
        totalTimesheets: { $sum: 1 },
        completeTimesheets: {
          $sum: { $cond: [{ $eq: ['$status', 'complete'] }, 1, 0] }
        },
        incompleteTimesheets: {
          $sum: { $cond: [{ $eq: ['$status', 'incomplete'] }, 1, 0] }
        },
        disputedTimesheets: {
          $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] }
        },
        totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } },
        averageWorkedHours: { $avg: { $divide: ['$totalWorkedMinutes', 60] } },
        onTimeCount: {
          $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] }
        },
        averageDelay: { $avg: '$delays.startDelay' },
        maxDelay: { $max: '$delays.startDelay' }
      }
    },
    {
      $project: {
        totalTimesheets: 1,
        completeTimesheets: 1,
        incompleteTimesheets: 1,
        disputedTimesheets: 1,
        completionRate: {
          $round: [
            { $multiply: [{ $divide: ['$completeTimesheets', '$totalTimesheets'] }, 100] },
            2
          ]
        },
        totalWorkedHours: { $round: ['$totalWorkedHours', 1] },
        averageWorkedHours: { $round: ['$averageWorkedHours', 1] },
        punctualityRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] },
            2
          ]
        },
        averageDelay: { $round: ['$averageDelay', 1] },
        maxDelay: 1
      }
    }
  ]);

  return stats[0] || {
    totalTimesheets: 0,
    completeTimesheets: 0,
    incompleteTimesheets: 0,
    disputedTimesheets: 0,
    completionRate: 0,
    totalWorkedHours: 0,
    averageWorkedHours: 0,
    punctualityRate: 0,
    averageDelay: 0,
    maxDelay: 0
  };
}

/**
 * Calculer les tendances
 */
async function calculateTrends(filters, groupBy, startDate, endDate) {
  let groupFormat;
  
  switch (groupBy) {
    case 'day':
      groupFormat = '%Y-%m-%d';
      break;
    case 'week':
      groupFormat = '%Y-%U';
      break;
    case 'month':
      groupFormat = '%Y-%m';
      break;
    default:
      groupFormat = '%Y-%m-%d';
  }

  const trends = await Timesheet.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupFormat,
            date: '$date'
          }
        },
        totalTimesheets: { $sum: 1 },
        onTimeCount: {
          $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] }
        },
        averageDelay: { $avg: '$delays.startDelay' },
        totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } }
      }
    },
    {
      $project: {
        period: '$_id',
        totalTimesheets: 1,
        punctualityRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] },
            1
          ]
        },
        averageDelay: { $round: ['$averageDelay', 1] },
        totalWorkedHours: { $round: ['$totalWorkedHours', 1] }
      }
    },
    { $sort: { period: 1 } }
  ]);

  return trends;
}

/**
 * Calculer les stats par utilisateur
 */
async function calculateUserStats(filters) {
  const userStats = await Timesheet.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$user',
        totalTimesheets: { $sum: 1 },
        onTimeCount: {
          $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] }
        },
        averageDelay: { $avg: '$delays.startDelay' },
        totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        user: {
          id: '$user._id',
          firstName: '$user.firstName',
          lastName: '$user.lastName',
          email: '$user.email'
        },
        totalTimesheets: 1,
        punctualityRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] },
            1
          ]
        },
        averageDelay: { $round: ['$averageDelay', 1] },
        totalWorkedHours: { $round: ['$totalWorkedHours', 1] }
      }
    },
    { $sort: { punctualityRate: -1 } }
  ]);

  return userStats;
}

/**
 * Calculer les stats par agence
 */
async function calculateAgencyStats(filters) {
  const agencyStats = await Timesheet.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$agency',
        totalTimesheets: { $sum: 1 },
        onTimeCount: {
          $sum: { $cond: [{ $lte: ['$delays.startDelay', 5] }, 1, 0] }
        },
        averageDelay: { $avg: '$delays.startDelay' },
        totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } }
      }
    },
    {
      $lookup: {
        from: 'agencies',
        localField: '_id',
        foreignField: '_id',
        as: 'agency'
      }
    },
    { $unwind: '$agency' },
    {
      $project: {
        agency: {
          id: '$agency._id',
          name: '$agency.name',
          code: '$agency.code',
          client: '$agency.client'
        },
        totalTimesheets: 1,
        punctualityRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeCount', '$totalTimesheets'] }, 100] },
            1
          ]
        },
        averageDelay: { $round: ['$averageDelay', 1] },
        totalWorkedHours: { $round: ['$totalWorkedHours', 1] }
      }
    },
    { $sort: { punctualityRate: -1 } }
  ]);

  return agencyStats;
}

/**
 * Détecter les anomalies
 */
async function detectAnomalies(filters) {
  const anomalies = [];

  // Retards constants (même utilisateur en retard régulièrement)
  const consistentLateUsers = await Timesheet.aggregate([
    { $match: { ...filters, 'delays.startDelay': { $gt: 10 } } },
    {
      $group: {
        _id: '$user',
        lateCount: { $sum: 1 },
        averageDelay: { $avg: '$delays.startDelay' }
      }
    },
    { $match: { lateCount: { $gte: 3 } } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' }
  ]);

  consistentLateUsers.forEach(item => {
    anomalies.push({
      type: 'consistent_delay',
      severity: item.averageDelay > 30 ? 'critical' : item.averageDelay > 15 ? 'high' : 'medium',
      user: {
        id: item.user._id,
        firstName: item.user.firstName,
        lastName: item.user.lastName
      },
      description: `Retards récurrents (${item.lateCount} fois, moyenne: ${Math.round(item.averageDelay)}min)`,
      count: item.lateCount,
      details: { averageDelay: Math.round(item.averageDelay) }
    });
  });

  return anomalies;
}

module.exports = router;