const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const Timesheet = require('../../../models/Timesheet');
const Preparation = require('../../../models/Preparation');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// Schémas de validation
const dashboardQuerySchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month', 'quarter', 'year').default('today'),
  agencies: Joi.array().items(Joi.string()).optional(),
  includeGraphics: Joi.boolean().default(true),
  includeComparison: Joi.boolean().default(true)
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Vue d'ensemble du tableau de bord - MONGODB CORRIGÉ
 * @access  Admin
 */
router.get('/', validateQuery(dashboardQuerySchema), async (req, res) => {
  try {
    const { period, agencies, includeGraphics, includeComparison } = req.query;
    
    console.log('📊 Dashboard - Période:', period, 'Agences:', agencies);

    // Calculer les dates selon la période
    const dateRange = calculateDateRange(period);
    
    // Filtres de base
    const baseFilter = {};
    if (agencies && agencies.length > 0) {
      baseFilter.agency = { $in: agencies };
    }

    // ===== STATISTIQUES PRINCIPALES (MÉTHODES SIMPLES) =====
    const [
      totalPreparateurs,
      activePreparateurs,
      totalAgencies,
      preparationsToday,
      preparationsThisWeek
    ] = await Promise.all([
      // Total préparateurs
      User.countDocuments({ role: 'preparateur' }),
      
      // Préparateurs actifs
      User.countDocuments({ role: 'preparateur', isActive: true }),
      
      // Total agences
      Agency.countDocuments({}),
      
      // Préparations aujourd'hui
      Preparation.countDocuments({
        ...baseFilter,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      
      // Préparations cette semaine
      Preparation.countDocuments({
        ...baseFilter,
        createdAt: {
          $gte: getStartOfWeek(new Date()),
          $lt: getEndOfWeek(new Date())
        }
      })
    ]);

    // Temps moyen - MÉTHODE SIMPLIFIÉE
    const averageTimeToday = await calculateAverageTimeSimple(baseFilter);
    
    // Taux de ponctualité - MÉTHODE SIMPLIFIÉE
    const punctualityRate = await calculatePunctualitySimple(dateRange, baseFilter);

    // ===== RÉPARTITION PAR AGENCE - AGGREGATION CORRIGÉE =====
    const agencyStats = await getAgencyStatsFixed(dateRange, baseFilter);

    // ===== DONNÉES GRAPHIQUES (SIMPLIFIÉES) =====
    let chartData = {};
    if (includeGraphics) {
      chartData = {
        preparationsOverTime: [],
        performanceByAgency: [],
        punctualityTrend: []
      };
    }

    // ===== COMPARAISON (SIMPLIFIÉE) =====
    let comparison = {};
    if (includeComparison) {
      comparison = {
        preparationsChange: 0,
        punctualityChange: 0,
        averageTimeChange: 0
      };
    }

    // ===== RESPONSE =====
    res.json({
      success: true,
      data: {
        timestamp: new Date(),
        period,
        kpis: {
          totalPreparateurs,
          activePreparateurs,
          totalAgencies,
          preparationsToday,
          preparationsThisWeek,
          averageTimeToday: Math.round(averageTimeToday || 0),
          punctualityRate: Math.round(punctualityRate || 0)
        },
        agencyStats,
        chartData,
        comparison,
        alerts: [] // Simplifié pour éviter les erreurs
      }
    });

  } catch (error) {
    console.error('💥 Erreur dashboard:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== FONCTIONS UTILITAIRES CORRIGÉES =====

/**
 * Calculer le temps moyen - MÉTHODE SIMPLE
 */
async function calculateAverageTimeSimple(baseFilter) {
  try {
    const preparations = await Preparation.find({
      ...baseFilter,
      status: 'completed',
      totalTime: { $exists: true, $ne: null },
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    }).select('totalTime');

    if (preparations.length === 0) return 0;
    
    const total = preparations.reduce((sum, prep) => sum + prep.totalTime, 0);
    return total / preparations.length;
  } catch (error) {
    console.error('Erreur calcul temps moyen:', error);
    return 0;
  }
}

/**
 * Calculer la ponctualité - MÉTHODE SIMPLE
 */
async function calculatePunctualitySimple(dateRange, baseFilter) {
  try {
    const timesheets = await Timesheet.find({
      ...baseFilter,
      clockInTime: {
        $gte: dateRange.start,
        $lt: dateRange.end
      }
    }).populate('schedule', 'startTime');

    if (timesheets.length === 0) return 0;

    let onTimeCount = 0;
    timesheets.forEach(timesheet => {
      if (timesheet.schedule && timesheet.clockInTime) {
        const clockInHour = timesheet.clockInTime.getHours();
        const clockInMinute = timesheet.clockInTime.getMinutes();
        const clockInTime = clockInHour * 60 + clockInMinute;
        
        const [scheduleHour, scheduleMinute] = timesheet.schedule.startTime.split(':').map(Number);
        const scheduleTime = scheduleHour * 60 + scheduleMinute;
        
        if (clockInTime <= scheduleTime + 5) { // 5 min de tolérance
          onTimeCount++;
        }
      }
    });

    return (onTimeCount / timesheets.length) * 100;
  } catch (error) {
    console.error('Erreur calcul ponctualité:', error);
    return 0;
  }
}

/**
 * Stats par agence - AGGREGATION CORRIGÉE
 */
async function getAgencyStatsFixed(dateRange, baseFilter) {
  try {
    const result = await Preparation.aggregate([
      {
        $match: {
          ...baseFilter,
          createdAt: {
            $gte: dateRange.start,
            $lt: dateRange.end
          }
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
      {
        $unwind: {
          path: '$agencyInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$agency',
          name: { $first: '$agencyInfo.name' },
          totalPreparations: { $sum: 1 },
          completedPreparations: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalTime: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ['$totalTime', null] }, 
                    { $eq: ['$status', 'completed'] }
                  ]
                },
                '$totalTime',
                0
              ]
            }
          },
          completedCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ['$totalTime', null] }, 
                    { $eq: ['$status', 'completed'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ['$name', 'Agence inconnue'] },
          totalPreparations: 1,
          completedPreparations: 1,
          averageTime: {
            $cond: [
              { $eq: ['$completedCount', 0] },
              0,
              { $round: [{ $divide: ['$totalTime', '$completedCount'] }, 1] }
            ]
          },
          completionRate: {
            $cond: [
              { $eq: ['$totalPreparations', 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ['$completedPreparations', '$totalPreparations'] }, 100] }, 1] }
            ]
          }
        }
      },
      {
        $sort: { totalPreparations: -1 }
      }
    ]);

    return result;
  } catch (error) {
    console.error('Erreur stats agences:', error);
    return [];
  }
}

/**
 * Calculer les dates selon la période
 */
function calculateDateRange(period) {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      };
      
    case 'week':
      return {
        start: getStartOfWeek(today),
        end: getEndOfWeek(today)
      };
      
    case 'month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: startOfMonth,
        end: endOfMonth
      };
      
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      return {
        start: startOfQuarter,
        end: endOfQuarter
      };
      
    case 'year':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      return {
        start: startOfYear,
        end: endOfYear
      };
      
    default:
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      };
  }
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début semaine
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date) {
  const startOfWeek = getStartOfWeek(date);
  return new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
}

module.exports = router;