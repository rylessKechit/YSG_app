const express = require('express');
const User = require('../../models/User');
const Agency = require('../../models/Agency');
const Preparation = require('../../models/Preparation');
const Timesheet = require('../../models/Timesheet');
const Vehicle = require('../../models/Vehicle');
const { auth } = require('../../middleware/auth');
const { anyUserAuth, adminAuth } = require('../../middleware/adminAuth');
const { validateQuery } = require('../../middleware/validation');
const { querySchemas } = require('../../middleware/validation');
const { ERROR_MESSAGES } = require('../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(auth, anyUserAuth);

/**
 * @route   GET /api/stats/global
 * @desc    Statistiques globales (admin seulement)
 * @access  Admin
 */
router.get('/global', adminAuth, validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Statistiques globales en parallèle
    const [
      userStats,
      agencyStats,
      vehicleStats,
      preparationStats,
      timesheetStats
    ] = await Promise.all([
      // Statistiques utilisateurs
      User.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            averagePreparations: { $avg: '$stats.totalPreparations' },
            averageOnTimeRate: { $avg: '$stats.onTimeRate' }
          }
        }
      ]),

      // Statistiques agences
      Agency.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalAgencies: { $sum: 1 },
            clientCount: { $addToSet: '$client' }
          }
        },
        {
          $project: {
            totalAgencies: 1,
            uniqueClients: { $size: '$clientCount' }
          }
        }
      ]),

      // Statistiques véhicules
      Vehicle.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Statistiques préparations
      Preparation.getStats({
        startDate: defaultStartDate,
        endDate: defaultEndDate
      }),

      // Statistiques pointages
      Timesheet.getPunctualityStats({
        startDate: defaultStartDate,
        endDate: defaultEndDate
      })
    ]);

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        users: userStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            averagePreparations: Math.round(stat.averagePreparations || 0),
            averageOnTimeRate: Math.round(stat.averageOnTimeRate || 0)
          };
          return acc;
        }, {}),
        agencies: agencyStats[0] || { totalAgencies: 0, uniqueClients: 0 },
        vehicles: vehicleStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        preparations: preparationStats[0] || {
          totalPreparations: 0,
          averageTime: 0,
          onTimeRate: 0,
          minTime: 0,
          maxTime: 0,
          totalIssues: 0,
          issueRate: 0
        },
        punctuality: timesheetStats[0] || {
          totalTimesheets: 0,
          onTimeCount: 0,
          punctualityRate: 0,
          averageDelay: 0,
          maxDelay: 0,
          averageWorkedHours: 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur statistiques globales:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/stats/performance
 * @desc    Statistiques de performance (personnalisées selon le rôle)
 * @access  Private
 */
router.get('/performance', validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { startDate, endDate, agencyId } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filters = {
      startDate: defaultStartDate,
      endDate: defaultEndDate
    };

    // Filtres selon le rôle
    if (userRole === 'preparateur') {
      // Les préparateurs voient seulement leurs propres stats
      filters.userId = userId;
      
      // Vérifier l'accès à l'agence si spécifiée
      if (agencyId) {
        const hasAccess = req.user.agencies.some(
          agency => agency._id.toString() === agencyId.toString()
        );
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: ERROR_MESSAGES.ACCESS_DENIED
          });
        }
        filters.agencyId = agencyId;
      }
    } else {
      // Les admins peuvent filtrer par utilisateur et agence
      if (agencyId) filters.agencyId = agencyId;
    }

    // Récupérer les statistiques
    const [preparationStats, punctualityStats] = await Promise.all([
      Preparation.getStats(filters),
      Timesheet.getPunctualityStats(filters)
    ]);

    let responseData = {
      period: {
        startDate: defaultStartDate,
        endDate: defaultEndDate
      },
      preparations: preparationStats[0] || {
        totalPreparations: 0,
        averageTime: 0,
        onTimeRate: 0,
        minTime: 0,
        maxTime: 0,
        totalIssues: 0,
        issueRate: 0
      },
      punctuality: punctualityStats[0] || {
        totalTimesheets: 0,
        onTimeCount: 0,
        punctualityRate: 0,
        averageDelay: 0,
        maxDelay: 0,
        averageWorkedHours: 0
      }
    };

    // Pour les admins, ajouter des comparaisons
    if (userRole === 'admin') {
      // Comparaison avec la période précédente
      const previousPeriod = {
        startDate: new Date(defaultStartDate.getTime() - (defaultEndDate - defaultStartDate)),
        endDate: defaultStartDate,
        ...(agencyId && { agencyId })
      };

      const [prevPrepStats, prevPunctStats] = await Promise.all([
        Preparation.getStats(previousPeriod),
        Timesheet.getPunctualityStats(previousPeriod)
      ]);

      responseData.comparison = {
        previousPeriod,
        preparations: prevPrepStats[0] || {},
        punctuality: prevPunctStats[0] || {}
      };

      // Tendances
      responseData.trends = {
        preparationsChange: prevPrepStats[0] ? 
          ((responseData.preparations.totalPreparations - prevPrepStats[0].totalPreparations) / prevPrepStats[0].totalPreparations * 100).toFixed(1) : 0,
        onTimeRateChange: prevPrepStats[0] ? 
          (responseData.preparations.onTimeRate - prevPrepStats[0].onTimeRate).toFixed(1) : 0,
        punctualityChange: prevPunctStats[0] ? 
          (responseData.punctuality.punctualityRate - prevPunctStats[0].punctualityRate).toFixed(1) : 0
      };
    }

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Erreur statistiques performance:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/stats/leaderboard
 * @desc    Classement des préparateurs (admin seulement)
 * @access  Admin
 */
router.get('/leaderboard', adminAuth, validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, metric = 'onTimeRate' } = req.query;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Construire la requête d'agrégation
    const matchStage = {
      status: 'completed',
      createdAt: { $gte: defaultStartDate, $lte: defaultEndDate }
    };

    if (agencyId) {
      matchStage.agency = require('mongoose').Types.ObjectId(agencyId);
    }

    // Leaderboard par préparateur
    const leaderboard = await Preparation.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$user._id',
          firstName: { $first: '$user.firstName' },
          lastName: { $first: '$user.lastName' },
          totalPreparations: { $sum: 1 },
          averageTime: { $avg: '$totalMinutes' },
          onTimeCount: {
            $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] }
          },
          totalIssues: { $sum: { $size: '$issues' } }
        }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          fullName: { $concat: ['$firstName', ' ', '$lastName'] },
          totalPreparations: 1,
          averageTime: { $round: ['$averageTime', 1] },
          onTimeRate: {
            $round: [
              { $multiply: [{ $divide: ['$onTimeCount', '$totalPreparations'] }, 100] },
              2
            ]
          },
          issueRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalIssues', '$totalPreparations'] }, 100] },
              2
            ]
          },
          totalIssues: 1
        }
      },
      { $match: { totalPreparations: { $gte: 5 } } }, // Minimum 5 préparations
      { $sort: { [metric]: metric === 'averageTime' ? 1 : -1 } }, // Tri selon la métrique
      { $limit: 20 }
    ]);

    // Ajouter le rang
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      ...user,
      badge: index < 3 ? ['🥇', '🥈', '🥉'][index] : null
    }));

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        metric,
        leaderboard: rankedLeaderboard,
        summary: {
          totalParticipants: leaderboard.length,
          averagePreparations: leaderboard.length > 0 ? 
            Math.round(leaderboard.reduce((sum, user) => sum + user.totalPreparations, 0) / leaderboard.length) : 0,
          averageOnTimeRate: leaderboard.length > 0 ? 
            Math.round(leaderboard.reduce((sum, user) => sum + user.onTimeRate, 0) / leaderboard.length) : 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur leaderboard:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/stats/trends
 * @desc    Tendances temporelles (admin seulement)
 * @access  Admin
 */
router.get('/trends', adminAuth, validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, granularity = 'daily' } = req.query;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Déterminer le grouping selon la granularité
    let dateGrouping;
    switch (granularity) {
      case 'hourly':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'weekly':
        dateGrouping = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'monthly':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
      default: // daily
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
    }

    const matchStage = {
      status: 'completed',
      createdAt: { $gte: defaultStartDate, $lte: defaultEndDate }
    };

    if (agencyId) {
      matchStage.agency = require('mongoose').Types.ObjectId(agencyId);
    }

    // Tendances des préparations
    const preparationTrends = await Preparation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateGrouping,
          totalPreparations: { $sum: 1 },
          averageTime: { $avg: '$totalMinutes' },
          onTimeCount: {
            $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] }
          },
          totalIssues: { $sum: { $size: '$issues' } }
        }
      },
      {
        $project: {
          period: '$_id',
          totalPreparations: 1,
          averageTime: { $round: ['$averageTime', 1] },
          onTimeRate: {
            $round: [
              { $multiply: [{ $divide: ['$onTimeCount', '$totalPreparations'] }, 100] },
              2
            ]
          },
          issueRate: {
            $round: [
              { $multiply: [{ $divide: ['$totalIssues', '$totalPreparations'] }, 100] },
              2
            ]
          }
        }
      },
      { $sort: { 'period.year': 1, 'period.month': 1, 'period.day': 1, 'period.hour': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        granularity,
        trends: preparationTrends,
        summary: {
          dataPoints: preparationTrends.length,
          totalPreparations: preparationTrends.reduce((sum, point) => sum + point.totalPreparations, 0),
          averageOnTimeRate: preparationTrends.length > 0 ?
            Math.round(preparationTrends.reduce((sum, point) => sum + point.onTimeRate, 0) / preparationTrends.length) : 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur tendances:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;