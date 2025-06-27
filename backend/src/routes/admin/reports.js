// ===== backend/src/routes/admin/reports.js =====
const express = require('express');
const Joi = require('joi');
const Timesheet = require('../../models/Timesheet');
const Preparation = require('../../models/Preparation');
const User = require('../../models/User');
const Agency = require('../../models/Agency');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateQuery } = require('../../middleware/validation');
const { objectId } = require('../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/reports/ponctualite
 * @desc    Rapport détaillé de ponctualité
 * @access  Admin
 */
router.get('/ponctualite', validateQuery(Joi.object({
  period: Joi.string().valid('week', 'month', 'quarter', 'custom').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  agencies: Joi.array().items(objectId).optional(),
  format: Joi.string().valid('json', 'csv', 'excel').default('json'),
  includeDetails: Joi.boolean().default(true)
})), async (req, res) => {
  try {
    const { period, startDate, endDate, agencies = [], format, includeDetails } = req.query;
    
    // Calculer les dates selon la période
    let dateStart, dateEnd;
    const now = new Date();
    
    if (period === 'custom' && startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
    } else {
      switch (period) {
        case 'week':
          dateStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          dateStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          dateStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      dateEnd = now;
    }

    dateStart.setHours(0, 0, 0, 0);
    dateEnd.setHours(23, 59, 59, 999);

    // Construire les filtres
    const matchFilter = {
      date: { $gte: dateStart, $lte: dateEnd },
      startTime: { $exists: true }
    };
    
    if (agencies.length > 0) {
      matchFilter.agency = { $in: agencies };
    }

    // Récupérer les données en parallèle
    const [
      globalStats,
      agencyStats,
      userStats,
      trends
    ] = await Promise.all([
      // Statistiques globales
      Timesheet.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalPointages: { $sum: 1 },
            pointagesEnRetard: {
              $sum: {
                $cond: [
                  { $gt: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] },
                  1,
                  0
                ]
              }
            },
            retardMoyenTotal: { $avg: '$delays.startDelay' },
            retardMaximal: { $max: '$delays.startDelay' }
          }
        },
        {
          $project: {
            totalPointages: 1,
            pointagesEnRetard: 1,
            tauxPonctualite: {
              $round: [
                { 
                  $multiply: [
                    { $divide: [{ $subtract: ['$totalPointages', '$pointagesEnRetard'] }, '$totalPointages'] },
                    100
                  ]
                },
                2
              ]
            },
            retardMoyen: { $round: ['$retardMoyenTotal', 1] },
            retardMaximal: 1
          }
        }
      ]),

      // Statistiques par agence
      Timesheet.aggregate([
        { $match: matchFilter },
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
            agenceId: '$_id',
            nom: 1,
            code: 1,
            totalPointages: 1,
            retards: 1,
            taux: {
              $round: [
                { 
                  $multiply: [
                    { $divide: [{ $subtract: ['$totalPointages', '$retards'] }, '$totalPointages'] },
                    100
                  ]
                },
                2
              ]
            },
            retardMoyen: { $round: ['$retardMoyen', 1] },
            evolution: 0 // TODO: calculer vs période précédente
          }
        },
        { $sort: { taux: -1 } }
      ]),

      // Top/Flop préparateurs (si détails demandés)
      includeDetails ? Timesheet.aggregate([
        { $match: matchFilter },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: '$userInfo' },
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
            _id: '$user',
            nom: { $first: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] } },
            email: { $first: '$userInfo.email' },
            agence: { $first: '$agencyInfo.name' },
            totalJours: { $sum: 1 },
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
            userId: '$_id',
            nom: 1,
            email: 1,
            agence: 1,
            totalJours: 1,
            retards: 1,
            taux: {
              $round: [
                { 
                  $multiply: [
                    { $divide: [{ $subtract: ['$totalJours', '$retards'] }, '$totalJours'] },
                    100
                  ]
                },
                2
              ]
            },
            retardMoyen: { $round: ['$retardMoyen', 1] },
            performance: {
              $switch: {
                branches: [
                  { 
                    case: { $gte: [{ $divide: [{ $subtract: ['$totalJours', '$retards'] }, '$totalJours'] }, 0.95] },
                    then: 'excellent'
                  },
                  { 
                    case: { $gte: [{ $divide: [{ $subtract: ['$totalJours', '$retards'] }, '$totalJours'] }, 0.85] },
                    then: 'bon'
                  },
                  { 
                    case: { $gte: [{ $divide: [{ $subtract: ['$totalJours', '$retards'] }, '$totalJours'] }, 0.70] },
                    then: 'moyen'
                  }
                ],
                default: 'faible'
              }
            }
          }
        },
        { $match: { totalJours: { $gte: 5 } } }, // Au moins 5 jours
        { $sort: { taux: -1 } }
      ]) : Promise.resolve([]),

      // Tendances par jour de la semaine
      Timesheet.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dayOfWeek: '$date' },
            totalPointages: { $sum: 1 },
            retards: {
              $sum: {
                $cond: [
                  { $gt: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            jour: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 1] }, then: 'Dimanche' },
                  { case: { $eq: ['$_id', 2] }, then: 'Lundi' },
                  { case: { $eq: ['$_id', 3] }, then: 'Mardi' },
                  { case: { $eq: ['$_id', 4] }, then: 'Mercredi' },
                  { case: { $eq: ['$_id', 5] }, then: 'Jeudi' },
                  { case: { $eq: ['$_id', 6] }, then: 'Vendredi' },
                  { case: { $eq: ['$_id', 7] }, then: 'Samedi' }
                ]
              }
            },
            totalPointages: 1,
            retards: 1,
            taux: {
              $round: [
                { 
                  $multiply: [
                    { $divide: [{ $subtract: ['$totalPointages', '$retards'] }, '$totalPointages'] },
                    100
                  ]
                },
                2
              ]
            }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    // Calculer évolution vs période précédente
    const previousPeriodEnd = new Date(dateStart);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - (dateEnd - dateStart));
    
    const previousStats = await Timesheet.aggregate([
      { 
        $match: { 
          date: { $gte: previousPeriodStart, $lte: previousPeriodEnd },
          startTime: { $exists: true },
          ...(agencies.length > 0 && { agency: { $in: agencies } })
        }
      },
      {
        $group: {
          _id: null,
          totalPointages: { $sum: 1 },
          retards: {
            $sum: {
              $cond: [
                { $gt: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          tauxPonctualite: {
            $multiply: [
              { $divide: [{ $subtract: ['$totalPointages', '$retards'] }, '$totalPointages'] },
              100
            ]
          }
        }
      }
    ]);

    const currentGlobal = globalStats[0] || { totalPointages: 0, pointagesEnRetard: 0, tauxPonctualite: 0 };
    const previousGlobal = previousStats[0] || { tauxPonctualite: 0 };
    const evolution = (currentGlobal.tauxPonctualite - previousGlobal.tauxPonctualite).toFixed(1);

    // Préparer les données selon le format
    const reportData = {
      periode: {
        debut: dateStart.toISOString().split('T')[0],
        fin: dateEnd.toISOString().split('T')[0],
        type: period,
        jours: Math.ceil((dateEnd - dateStart) / (1000 * 60 * 60 * 24))
      },
      global: {
        ...currentGlobal,
        evolution: parseFloat(evolution),
        objectif: 90 // Configurable
      },
      parAgence: agencyStats,
      tendances: {
        parJourSemaine: trends
      },
      metadata: {
        genereA: new Date().toISOString(),
        filtres: { agencies, format },
        includeDetails
      }
    };

    // Ajouter détails si demandé
    if (includeDetails && userStats.length > 0) {
      reportData.topFlop = {
        meilleursPerformers: userStats.filter(u => u.performance === 'excellent').slice(0, 10),
        bonnesPerformances: userStats.filter(u => u.performance === 'bon').slice(0, 10),
        aAmeliorer: userStats.filter(u => ['moyen', 'faible'].includes(u.performance)).slice(-10)
      };
    }

    // Export CSV/Excel ou JSON
    if (format === 'csv' || format === 'excel') {
      // Préparer données pour export
      const exportData = agencyStats.map(agency => ({
        'Agence': agency.nom,
        'Code': agency.code,
        'Total pointages': agency.totalPointages,
        'Retards': agency.retards,
        'Taux ponctualité': `${agency.taux}%`,
        'Retard moyen': `${agency.retardMoyen} min`
      }));

      return res.json({
        success: true,
        data: {
          export: true,
          format,
          filename: `rapport_ponctualite_${dateStart.toISOString().split('T')[0]}_${dateEnd.toISOString().split('T')[0]}.${format}`,
          data: exportData,
          summary: reportData.global
        }
      });
    }

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Erreur rapport ponctualité:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;