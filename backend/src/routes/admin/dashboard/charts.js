const express = require('express');
const Joi = require('joi');
const Preparation = require('../../../models/Preparation');
const Timesheet = require('../../../models/Timesheet');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// Schéma de validation pour les graphiques
const chartsQuerySchema = Joi.object({
  type: Joi.string().valid('all', 'timeline', 'ponctualite', 'temps', 'agencies').default('all'),
  period: Joi.string().valid('today', 'week', 'month', 'quarter', 'year').default('week'),
  granularity: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
  agencies: Joi.array().items(Joi.string()).optional(),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/charts
 * @desc    Données pour les graphiques du dashboard
 * @access  Admin
 */
router.get('/', validateQuery(chartsQuerySchema), async (req, res) => {
  try {
    const { type, period, granularity, agencies, startDate, endDate } = req.query;
    
    console.log('📊 Charts - Type:', type, 'Période:', period, 'Granularité:', granularity);

    // Calculer les dates
    const dateRange = calculateDateRange(period, startDate, endDate);
    
    // Filtres de base
    const baseFilter = {};
    if (agencies && agencies.length > 0) {
      baseFilter.agency = { $in: agencies };
    }

    const chartData = {};

    // ===== 1. DONNÉES TEMPORELLES (TIMELINE) =====
    if (type === 'all' || type === 'timeline') {
      chartData.timeline = await getTimelineData(dateRange, granularity, baseFilter);
    }

    // ===== 2. PONCTUALITÉ PAR AGENCE =====
    if (type === 'all' || type === 'ponctualite') {
      chartData.punctualityByAgency = await getPunctualityByAgency(dateRange, baseFilter);
    }

    // ===== 3. DISTRIBUTION DES TEMPS =====
    if (type === 'all' || type === 'temps') {
      chartData.timeDistribution = await getTimeDistribution(dateRange, baseFilter);
    }

    // ===== 4. PERFORMANCE PAR AGENCE =====
    if (type === 'all' || type === 'agencies') {
      chartData.agencyPerformance = await getAgencyPerformance(dateRange, baseFilter);
    }

    console.log('✅ Charts générés:', Object.keys(chartData));

    res.json({
      success: true,
      data: chartData,
      meta: {
        period,
        granularity,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        },
        filters: { agencies }
      }
    });

  } catch (error) {
    console.error('💥 Erreur charts:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Données chronologiques - AGGREGATION CORRIGÉE
 */
async function getTimelineData(dateRange, granularity, baseFilter) {
  try {
    // Format de groupement selon la granularité
    let groupFormat;
    switch (granularity) {
      case 'hour':
        groupFormat = '%Y-%m-%d-%H';
        break;
      case 'day':
        groupFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupFormat = '%Y-%U'; // Année-Semaine
        break;
      case 'month':
        groupFormat = '%Y-%m';
        break;
      default:
        groupFormat = '%Y-%m-%d';
    }

    const result = await Preparation.aggregate([
      {
        $match: {
          ...baseFilter,
          createdAt: {
            $gte: dateRange.start,
            $lte: dateRange.end
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt'
            }
          },
          totalPreparations: { $sum: 1 },
          completedPreparations: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalTime: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$totalTime', null] }, { $eq: ['$status', 'completed'] }] },
                '$totalTime',
                0
              ]
            }
          },
          completedCount: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$totalTime', null] }, { $eq: ['$status', 'completed'] }] },
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
          date: '$_id',
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
        $sort: { date: 1 }
      }
    ]);

    return result.map(item => ({
      date: item.date,
      preparations: item.totalPreparations,
      completed: item.completedPreparations,
      averageTime: item.averageTime,
      completionRate: item.completionRate
    }));

  } catch (error) {
    console.error('Erreur timeline:', error);
    return [];
  }
}

/**
 * Ponctualité par agence - MÉTHODE SIMPLIFIÉE
 */
async function getPunctualityByAgency(dateRange, baseFilter) {
  try {
    // Méthode simple pour éviter les erreurs d'aggregation
    const agencies = await Agency.find({});
    const results = [];

    for (const agency of agencies) {
      const timesheets = await Timesheet.find({
        ...baseFilter,
        agency: agency._id,
        date: {
          $gte: dateRange.start,
          $lte: dateRange.end
        },
        clockInTime: { $exists: true }
      }).populate('schedule', 'startTime');

      let total = timesheets.length;
      let onTime = 0;

      timesheets.forEach(timesheet => {
        if (timesheet.schedule && timesheet.clockInTime) {
          const clockInHour = timesheet.clockInTime.getHours();
          const clockInMinute = timesheet.clockInTime.getMinutes();
          const clockInTime = clockInHour * 60 + clockInMinute;
          
          const [scheduleHour, scheduleMinute] = timesheet.schedule.startTime.split(':').map(Number);
          const scheduleTime = scheduleHour * 60 + scheduleMinute;
          
          if (clockInTime <= scheduleTime + 5) { // 5 min de tolérance
            onTime++;
          }
        }
      });

      if (total > 0) {
        results.push({
          agencyName: agency.name,
          agencyId: agency._id,
          total,
          onTime,
          punctualityRate: Math.round((onTime / total) * 100)
        });
      }
    }

    return results.sort((a, b) => b.punctualityRate - a.punctualityRate);

  } catch (error) {
    console.error('Erreur ponctualité agences:', error);
    return [];
  }
}

/**
 * Distribution des temps de préparation
 */
async function getTimeDistribution(dateRange, baseFilter) {
  try {
    const preparations = await Preparation.find({
      ...baseFilter,
      createdAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      },
      status: 'completed',
      totalTime: { $exists: true, $ne: null }
    }).select('totalTime');

    // Créer des tranches de temps
    const ranges = [
      { range: '0-15 min', min: 0, max: 15 },
      { range: '15-30 min', min: 15, max: 30 },
      { range: '30-45 min', min: 30, max: 45 },
      { range: '45-60 min', min: 45, max: 60 },
      { range: '60+ min', min: 60, max: Infinity }
    ];

    const distribution = ranges.map(range => {
      const count = preparations.filter(prep => 
        prep.totalTime >= range.min && prep.totalTime < range.max
      ).length;
      
      return {
        range: range.range,
        count,
        percentage: preparations.length > 0 ? Math.round((count / preparations.length) * 100) : 0
      };
    });

    return distribution;

  } catch (error) {
    console.error('Erreur distribution temps:', error);
    return [];
  }
}

/**
 * Performance par agence
 */
async function getAgencyPerformance(dateRange, baseFilter) {
  try {
    const agencies = await Agency.find({});
    const results = [];

    for (const agency of agencies) {
      const preparations = await Preparation.find({
        ...baseFilter,
        agency: agency._id,
        createdAt: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      });

      const completed = preparations.filter(p => p.status === 'completed');
      const totalTime = completed.reduce((sum, p) => sum + (p.totalTime || 0), 0);

      if (preparations.length > 0) {
        results.push({
          agencyName: agency.name,
          agencyId: agency._id,
          totalPreparations: preparations.length,
          completedPreparations: completed.length,
          averageTime: completed.length > 0 ? Math.round(totalTime / completed.length) : 0,
          completionRate: Math.round((completed.length / preparations.length) * 100)
        });
      }
    }

    return results.sort((a, b) => b.completionRate - a.completionRate);

  } catch (error) {
    console.error('Erreur performance agences:', error);
    return [];
  }
}

/**
 * Calculer les dates selon la période
 */
function calculateDateRange(period, startDate, endDate) {
  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate)
    };
  }

  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      };
      
    case 'week':
      const startOfWeek = getStartOfWeek(today);
      const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      return {
        start: startOfWeek,
        end: endOfWeek
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
        start: startOfWeek,
        end: endOfWeek
      };
  }
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début semaine
  return new Date(d.setDate(diff));
}

module.exports = router;