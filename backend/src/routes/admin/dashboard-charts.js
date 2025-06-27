// ===== backend/src/routes/admin/dashboard-charts.js =====
const express = require('express');
const Joi = require('joi');
const Preparation = require('../../models/Preparation');
const Timesheet = require('../../models/Timesheet');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateQuery } = require('../../middleware/validation');
const { objectId } = require('../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/charts
 * @desc    Données pour graphiques dashboard
 * @access  Admin
 */
router.get('/', validateQuery(Joi.object({
  type: Joi.string().valid('all', 'timeline', 'ponctualite', 'distribution', 'heatmap').default('all'),
  period: Joi.string().valid('today', '7d', '30d', '90d').default('7d'),
  agencies: Joi.array().items(objectId).optional(),
  granularity: Joi.string().valid('hour', 'day', 'week').default('day')
})), async (req, res) => {
  try {
    const { type, period, agencies = [], granularity } = req.query;

    // Calculer les dates selon la période
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 7d
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const agencyFilter = agencies.length > 0 ? { agency: { $in: agencies } } : {};
    const charts = {};

    // Timeline des préparations par heure/jour
    if (type === 'all' || type === 'timeline') {
      let timeGrouping;
      
      if (period === 'today' || granularity === 'hour') {
        // Grouper par heure
        timeGrouping = {
          year: { $year: '$startTime' },
          month: { $month: '$startTime' },
          day: { $dayOfMonth: '$startTime' },
          hour: { $hour: '$startTime' }
        };
      } else {
        // Grouper par jour
        timeGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
      }

      const timelineData = await Preparation.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed',
            ...agencyFilter
          }
        },
        {
          $group: {
            _id: timeGrouping,
            preparations: { $sum: 1 },
            tempsMoyen: { $avg: '$totalMinutes' },
            ponctuals: {
              $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            period: '$_id',
            preparations: 1,
            tempsMoyen: { $round: ['$tempsMoyen', 1] },
            ponctualite: {
              $round: [
                { $multiply: [{ $divide: ['$ponctuals', '$preparations'] }, 100] },
                1
              ]
            },
            // Formater la période pour l'affichage
            label: {
              $cond: [
                { $ifNull: ['$_id.hour', false] },
                // Format heure: "14:00"
                { $concat: [
                  { $toString: '$_id.hour' }, ':00'
                ]},
                // Format date: "15/01"
                { $concat: [
                  { $toString: '$_id.day' }, '/',
                  { $toString: '$_id.month' }
                ]}
              ]
            }
          }
        },
        { $sort: { 'period.year': 1, 'period.month': 1, 'period.day': 1, 'period.hour': 1 } }
      ]);

      charts.timeline = timelineData;
    }

    // Ponctualité par agence
    if (type === 'all' || type === 'ponctualite') {
      const ponctualiteData = await Timesheet.aggregate([
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
            agence: { $first: '$agencyInfo.name' },
            code: { $first: '$agencyInfo.code' },
            totalPointages: { $sum: 1 },
            retards: {
              $sum: {
                $cond: [
                  { $gt: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] },
                  1,
                  0
                ]
              }
            },
            retardMoyen: { $avg: '$delays.startDelay' }
          }
        },
        {
          $project: {
            agence: 1,
            code: 1,
            ponctualite: {
              $round: [
                { 
                  $multiply: [
                    { $divide: [{ $subtract: ['$totalPointages', '$retards'] }, '$totalPointages'] },
                    100
                  ]
                },
                1
              ]
            },
            retards: 1,
            totalPointages: 1,
            retardMoyen: { $round: ['$retardMoyen', 1] }
          }
        },
        { $sort: { ponctualite: -1 } }
      ]);

      charts.ponctualiteParAgence = ponctualiteData;
    }

    // Distribution des temps de préparation
    if (type === 'all' || type === 'distribution') {
      const distributionData = await Preparation.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed',
            ...agencyFilter
          }
        },
        {
          $bucket: {
            groupBy: '$totalMinutes',
            boundaries: [0, 15, 20, 25, 30, 40, 999],
            default: '>40min',
            output: {
              count: { $sum: 1 },
              avgTime: { $avg: '$totalMinutes' }
            }
          }
        },
        {
          $project: {
            tranche: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 0] }, then: '0-15min' },
                  { case: { $eq: ['$_id', 15] }, then: '15-20min' },
                  { case: { $eq: ['$_id', 20] }, then: '20-25min' },
                  { case: { $eq: ['$_id', 25] }, then: '25-30min' },
                  { case: { $eq: ['$_id', 30] }, then: '30-40min' },
                  { case: { $eq: ['$_id', 40] }, then: '>40min' }
                ],
                default: '>40min'
              }
            },
            count: 1,
            avgTime: { $round: ['$avgTime', 1] },
            percentage: 0 // Sera calculé côté client
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      // Calculer les pourcentages
      const total = distributionData.reduce((sum, item) => sum + item.count, 0);
      distributionData.forEach(item => {
        item.percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
      });

      charts.distributionTemps = distributionData;
    }

    // Heatmap des activités (jour de semaine vs heure)
    if (type === 'all' || type === 'heatmap') {
      const heatmapData = await Preparation.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'completed',
            ...agencyFilter
          }
        },
        {
          $group: {
            _id: {
              dayOfWeek: { $dayOfWeek: '$startTime' },
              hour: { $hour: '$startTime' }
            },
            count: { $sum: 1 },
            avgTime: { $avg: '$totalMinutes' }
          }
        },
        {
          $project: {
            dayOfWeek: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id.dayOfWeek', 1] }, then: 'Dimanche' },
                  { case: { $eq: ['$_id.dayOfWeek', 2] }, then: 'Lundi' },
                  { case: { $eq: ['$_id.dayOfWeek', 3] }, then: 'Mardi' },
                  { case: { $eq: ['$_id.dayOfWeek', 4] }, then: 'Mercredi' },
                  { case: { $eq: ['$_id.dayOfWeek', 5] }, then: 'Jeudi' },
                  { case: { $eq: ['$_id.dayOfWeek', 6] }, then: 'Vendredi' },
                  { case: { $eq: ['$_id.dayOfWeek', 7] }, then: 'Samedi' }
                ]
              }
            },
            hour: '$_id.hour',
            count: 1,
            avgTime: { $round: ['$avgTime', 1] },
            intensity: 0 // Sera calculé après
          }
        },
        { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } }
      ]);

      // Normaliser l'intensité (0-100)
      const maxCount = Math.max(...heatmapData.map(item => item.count));
      heatmapData.forEach(item => {
        item.intensity = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
      });

      charts.heatmapActivite = heatmapData;
    }

    // Évolution comparative (cette semaine vs semaine précédente)
    if (type === 'all' && period === '7d') {
      const previousWeekStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const previousWeekEnd = new Date(startDate.getTime() - 1);

      const [currentWeekStats, previousWeekStats] = await Promise.all([
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
              totalPreparations: { $sum: 1 },
              tempsMoyen: { $avg: '$totalMinutes' },
              onTimeCount: { $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] } }
            }
          }
        ]),
        Preparation.aggregate([
          {
            $match: {
              createdAt: { $gte: previousWeekStart, $lte: previousWeekEnd },
              status: 'completed',
              ...agencyFilter
            }
          },
          {
            $group: {
              _id: null,
              totalPreparations: { $sum: 1 },
              tempsMoyen: { $avg: '$totalMinutes' },
              onTimeCount: { $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] } }
            }
          }
        ])
      ]);

      const current = currentWeekStats[0] || { totalPreparations: 0, tempsMoyen: 0, onTimeCount: 0 };
      const previous = previousWeekStats[0] || { totalPreparations: 0, tempsMoyen: 0, onTimeCount: 0 };

      charts.evolutionComparative = {
        current: {
          ...current,
          onTimeRate: current.totalPreparations > 0 ? 
            Math.round((current.onTimeCount / current.totalPreparations) * 100) : 0
        },
        previous: {
          ...previous,
          onTimeRate: previous.totalPreparations > 0 ? 
            Math.round((previous.onTimeCount / previous.totalPreparations) * 100) : 0
        },
        evolution: {
          preparations: previous.totalPreparations > 0 ? 
            Math.round(((current.totalPreparations - previous.totalPreparations) / previous.totalPreparations) * 100) : 0,
          tempsMoyen: previous.tempsMoyen > 0 ? 
            Math.round(((current.tempsMoyen - previous.tempsMoyen) / previous.tempsMoyen) * 100) : 0,
          onTimeRate: (current.onTimeRate || 0) - (previous.onTimeRate || 0)
        }
      };
    }

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
          type,
          periodDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
          granularity
        },
        charts,
        metadata: {
          agenciesFilter: agencies,
          totalDataPoints: Object.values(charts).reduce((sum, chart) => 
            sum + (Array.isArray(chart) ? chart.length : 0), 0
          ),
          generatedAt: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Erreur graphiques dashboard:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/dashboard/charts/realtime
 * @desc    Données temps réel pour graphiques live
 * @access  Admin
 */
router.get('/realtime', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Données temps réel pour le dashboard
    const [
      currentHourActivity,
      todayByHour,
      livePreparations
    ] = await Promise.all([
      // Activité de l'heure courante
      Preparation.countDocuments({
        createdAt: { 
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1)
        },
        status: 'completed'
      }),

      // Activité par heure depuis ce matin
      Preparation.aggregate([
        {
          $match: {
            createdAt: { $gte: today },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
            avgTime: { $avg: '$totalMinutes' }
          }
        },
        {
          $project: {
            hour: '$_id',
            count: 1,
            avgTime: { $round: ['$avgTime', 1] }
          }
        },
        { $sort: { hour: 1 } }
      ]),

      // Préparations en cours
      Preparation.countDocuments({ status: 'in_progress' })
    ]);

    // Construire les données pour graphique temps réel
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const data = todayByHour.find(item => item.hour === hour);
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        count: data ? data.count : 0,
        avgTime: data ? data.avgTime : 0,
        isCurrentHour: hour === now.getHours()
      };
    });

    res.json({
      success: true,
      data: {
        currentHour: {
          hour: `${now.getHours()}:00`,
          activity: currentHourActivity,
          timestamp: now
        },
        todayHourly: hourlyData,
        live: {
          preparationsEnCours: livePreparations,
          lastUpdate: now
        }
      }
    });

  } catch (error) {
    console.error('Erreur graphiques temps réel:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;