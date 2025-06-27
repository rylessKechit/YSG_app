// ===== backend/src/routes/admin/dashboard-kpis.js =====
const express = require('express');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const Timesheet = require('../../../models/Timesheet');
const Preparation = require('../../../models/Preparation');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { querySchemas } = require('../../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/kpis
 * @desc    KPIs temps réel avec métriques avancées
 * @access  Admin
 */
router.get('/', validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { period = 'today', agencies = [] } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default: // today
        startDate = today;
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
    }

    // Construire les filtres
    const agencyFilter = agencies.length > 0 ? { agency: { $in: agencies } } : {};

    // Récupérer toutes les métriques en parallèle
    const [
      preparateursStats,
      ponctualiteStats,
      preparationsStats,
      objectifsConfig
    ] = await Promise.all([
      // Stats préparateurs
      Promise.all([
        User.countDocuments({ role: 'preparateur', isActive: true }),
        User.countDocuments({ 
          role: 'preparateur', 
          isActive: true,
          lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        Timesheet.countDocuments({
          date: today,
          startTime: { $exists: true },
          ...agencyFilter
        }),
        Timesheet.countDocuments({
          date: today,
          'delays.startDelay': { $gt: TIME_LIMITS.LATE_THRESHOLD_MINUTES },
          ...agencyFilter
        })
      ]),

      // Stats ponctualité par agence
      Timesheet.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            startTime: { $exists: true },
            ...agencyFilter
          }
        },
        {
          $lookup: {
            from: 'agencies',
            localField: 'agency',
            foreignField: '_id',
            as: 'agencyInfo'
          }
        },
        { $unwind: '$agencyInfo' },
        {
          $group: {
            _id: '$agency',
            nom: { $first: '$agencyInfo.name' },
            totalPointages: { $sum: 1 },
            ponctuals: {
              $sum: {
                $cond: [
                  { $lte: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            agenceId: '$_id',
            nom: 1,
            taux: {
              $round: [
                { $multiply: [{ $divide: ['$ponctuals', '$totalPointages'] }, 100] },
                1
              ]
            },
            totalPointages: 1
          }
        },
        { $sort: { taux: -1 } }
      ]),

      // Stats préparations
      Promise.all([
        Preparation.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
          ...agencyFilter
        }),
        Preparation.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
              status: 'completed',
              ...agencyFilter
            }
          },
          {
            $group: {
              _id: null,
              tempsMoyen: { $avg: '$totalMinutes' },
              enRetard: {
                $sum: { $cond: [{ $eq: ['$isOnTime', false] }, 1, 0] }
              },
              terminees: { $sum: 1 }
            }
          }
        ])
      ]),

      // Configuration objectifs (simulé - à adapter selon vos besoins)
      Promise.resolve({
        ponctualiteTarget: 90,
        tempsTarget: 25,
        volumeTarget: period === 'today' ? 50 : period === 'week' ? 350 : 1500
      })
    ]);

    const [totalPreparateurs, activePreparateurs, presentPreparateurs, latePreparateurs] = preparateursStats;
    const [totalPreparations, preparationsCompleted] = preparationsStats;
    const prepStats = preparationsCompleted[0] || { tempsMoyen: 0, enRetard: 0, terminees: 0 };

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        preparateurs: {
          total: totalPreparateurs,
          active: activePreparateurs,
          present: presentPreparateurs,
          late: latePreparateurs
        },
        ponctualite: {
          global: presentPreparateurs > 0 ? 
            Math.round(((presentPreparateurs - latePreparateurs) / presentPreparateurs) * 100) : 0,
          parAgence: ponctualiteStats
        },
        preparations: {
          aujourdhui: totalPreparations,
          tempsMoyen: Math.round(prepStats.tempsMoyen || 0),
          enRetard: prepStats.enRetard || 0,
          terminees: prepStats.terminees || 0
        },
        objectifs: objectifsConfig,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur KPIs dashboard:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;