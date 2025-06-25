const express = require('express');
const User = require('../../models/User');
const Agency = require('../../models/Agency');
const Schedule = require('../../models/Schedule');
const Timesheet = require('../../models/Timesheet');
const Preparation = require('../../models/Preparation');
const Vehicle = require('../../models/Vehicle');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateQuery } = require('../../middleware/validation');
const { querySchemas } = require('../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification admin
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/overview
 * @desc    Vue d'ensemble du dashboard admin
 * @access  Admin
 */
router.get('/overview', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Statistiques globales en parallèle
    const [
      totalUsers,
      activeUsers,
      totalAgencies,
      totalVehicles,
      todaySchedules,
      todayPresent,
      todayLate,
      todayPreparations,
      ongoingPreparations,
      currentLateEmployees
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Agency.countDocuments({ isActive: true }),
      Vehicle.countDocuments({ isActive: true }),
      Schedule.countDocuments({ date: today, status: 'active' }),
      Timesheet.countDocuments({ date: today, startTime: { $exists: true } }),
      Timesheet.countDocuments({ 
        date: today, 
        'delays.startDelay': { $gt: TIME_LIMITS.LATE_THRESHOLD_MINUTES } 
      }),
      Preparation.countDocuments({ 
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      Preparation.countDocuments({ status: 'in_progress' }),
      Timesheet.find({
        date: today,
        startTime: null,
        'delays.startDelay': { $gt: TIME_LIMITS.LATE_THRESHOLD_MINUTES }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code')
      .populate('schedule')
      .limit(10)
    ]);

    // Calculs des taux
    const presentRate = todaySchedules > 0 ? Math.round((todayPresent / todaySchedules) * 100) : 0;
    const punctualityRate = todayPresent > 0 ? Math.round(((todayPresent - todayLate) / todayPresent) * 100) : 0;

    res.json({
      success: true,
      data: {
        overview: {
          users: {
            total: totalUsers,
            active: activeUsers,
            recentlyActive: activeUsers
          },
          agencies: {
            total: totalAgencies
          },
          vehicles: {
            total: totalVehicles
          },
          today: {
            scheduled: todaySchedules,
            present: todayPresent,
            late: todayLate,
            preparations: todayPreparations,
            presentRate,
            punctualityRate
          }
        },
        alerts: {
          currentLateEmployees: currentLateEmployees.map(timesheet => ({
            user: timesheet.user,
            agency: timesheet.agency,
            delay: timesheet.delays.startDelay,
            scheduledTime: timesheet.schedule?.startTime
          })),
          ongoingPreparations,
          lateCount: todayLate
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/dashboard/current-activity
 * @desc    Activité en temps réel
 * @access  Admin
 */
router.get('/current-activity', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Activités en cours
    const [
      ongoingPreparations,
      recentClockIns,
      overduePreparations
    ] = await Promise.all([
      // Préparations en cours
      Preparation.find({ status: 'in_progress' })
        .populate('user', 'firstName lastName')
        .populate('vehicle', 'licensePlate brand model')
        .populate('agency', 'name code')
        .sort({ startTime: 1 })
        .limit(20),

      // Pointages récents (dernières 2 heures)
      Timesheet.find({
        date: today,
        startTime: { 
          $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 heures
        }
      })
        .populate('user', 'firstName lastName')
        .populate('agency', 'name code')
        .sort({ startTime: -1 })
        .limit(10),

      // Préparations qui dépassent 30 minutes
      Preparation.findOvertime()
    ]);

    res.json({
      success: true,
      data: {
        ongoingPreparations: ongoingPreparations.map(prep => ({
          id: prep._id,
          user: prep.user,
          vehicle: prep.vehicle,
          agency: prep.agency,
          startTime: prep.startTime,
          currentDuration: prep.currentDuration,
          progress: prep.progress,
          isOvertime: prep.currentDuration > TIME_LIMITS.PREPARATION_MAX_MINUTES
        })),
        recentClockIns: recentClockIns.map(timesheet => ({
          user: timesheet.user,
          agency: timesheet.agency,
          clockInTime: timesheet.startTime,
          delay: timesheet.delays.startDelay
        })),
        overduePreparations: overduePreparations.map(prep => ({
          id: prep._id,
          user: prep.user,
          vehicle: prep.vehicle,
          agency: prep.agency,
          startTime: prep.startTime,
          duration: prep.currentDuration
        })),
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur activité courante:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/dashboard/punctuality-report
 * @desc    Rapport de ponctualité détaillé
 * @access  Admin
 */
router.get('/punctuality-report', validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, userId } = req.query;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filters = {};
    if (agencyId) filters.agencyId = agencyId;
    if (userId) filters.userId = userId;

    // Rapport de ponctualité
    const [punctualityStats, userStats] = await Promise.all([
      Timesheet.getPunctualityStats({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        ...filters
      }),
      Timesheet.aggregate([
        {
          $match: {
            date: { $gte: defaultStartDate, $lte: defaultEndDate },
            ...(agencyId && { agency: require('mongoose').Types.ObjectId(agencyId) }),
            ...(userId && { user: require('mongoose').Types.ObjectId(userId) })
          }
        },
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
            userName: { $first: { $concat: ['$user.firstName', ' ', '$user.lastName'] } },
            totalPreparations: { $sum: 1 },
            averageTime: { $avg: '$totalMinutes' },
            onTimeCount: {
              $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            userName: 1,
            totalPreparations: 1,
            averageTime: { $round: ['$averageTime', 1] },
            onTimeRate: {
              $round: [
                { $multiply: [{ $divide: ['$onTimeCount', '$totalPreparations'] }, 100] },
                2
              ]
            }
          }
        },
        { $sort: { onTimeRate: -1, totalPreparations: -1 } },
        { $limit: 10 }
      ]),

      // Statistiques par véhicule
      Vehicle.getStats(agencyId)
    ]);

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        overall: preparationStats[0] || {
          totalPreparations: 0,
          averageTime: 0,
          onTimeRate: 0,
          minTime: 0,
          maxTime: 0,
          totalIssues: 0,
          issueRate: 0
        },
        topPerformers,
        vehicleStats: vehicleStats[0] || {
          statusCounts: [],
          total: 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur statistiques préparations:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/dashboard/weekly-overview
 * @desc    Vue d'ensemble hebdomadaire
 * @access  Admin
 */
router.get('/weekly-overview', async (req, res) => {
  try {
    const { date } = req.query;

    // Début de la semaine (lundi)
    const weekStart = date ? new Date(date) : new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Dimanche
    weekEnd.setHours(23, 59, 59, 999);

    // Données par jour de la semaine
    const dailyStats = await Promise.all(
      Array.from({ length: 7 }, async (_, index) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + index);
        
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const [scheduled, present, preparations] = await Promise.all([
          Schedule.countDocuments({ 
            date: day, 
            status: 'active' 
          }),
          Timesheet.countDocuments({ 
            date: day, 
            startTime: { $exists: true } 
          }),
          Preparation.countDocuments({ 
            createdAt: { $gte: day, $lt: dayEnd },
            status: 'completed'
          })
        ]);

        return {
          date: day,
          dayName: day.toLocaleDateString('fr-FR', { weekday: 'long' }),
          scheduled,
          present,
          preparations,
          presentRate: scheduled > 0 ? Math.round((present / scheduled) * 100) : 0
        };
      })
    );

    // Totaux de la semaine
    const weekTotals = dailyStats.reduce((acc, day) => ({
      scheduled: acc.scheduled + day.scheduled,
      present: acc.present + day.present,
      preparations: acc.preparations + day.preparations
    }), { scheduled: 0, present: 0, preparations: 0 });

    res.json({
      success: true,
      data: {
        week: {
          start: weekStart,
          end: weekEnd
        },
        dailyStats,
        weekTotals: {
          ...weekTotals,
          presentRate: weekTotals.scheduled > 0 ? 
            Math.round((weekTotals.present / weekTotals.scheduled) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur vue hebdomadaire:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/dashboard/alerts
 * @desc    Obtenir toutes les alertes actuelles
 * @access  Admin
 */
router.get('/alerts', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      lateEmployees,
      overtimePreparations,
      vehiclesNeedingAttention,
      missingClockOuts
    ] = await Promise.all([
      // Employés en retard aujourd'hui
      Timesheet.findLateTimesheets(today),

      // Préparations qui dépassent le temps limite
      Preparation.findOvertime(),

      // Véhicules nécessitant une attention
      Vehicle.findNeedingAttention(),

      // Employés qui n'ont pas pointé leur fin de service
      Timesheet.find({
        date: { 
          $lt: today, 
          $gte: new Date(today.getTime() - 24 * 60 * 60 * 1000) 
        },
        startTime: { $exists: true },
        endTime: { $exists: false }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code')
    ]);

    const alertCounts = {
      late: lateEmployees.length,
      overtime: overtimePreparations.length,
      vehicles: vehiclesNeedingAttention.length,
      missingClockOuts: missingClockOuts.length
    };

    const totalAlerts = Object.values(alertCounts).reduce((sum, count) => sum + count, 0);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalAlerts,
          ...alertCounts
        },
        alerts: {
          lateEmployees: lateEmployees.map(timesheet => ({
            user: timesheet.user,
            agency: timesheet.agency,
            delay: timesheet.delays.startDelay,
            scheduledTime: timesheet.schedule?.startTime
          })),
          overtimePreparations: overtimePreparations.map(prep => ({
            id: prep._id,
            user: prep.user,
            vehicle: prep.vehicle,
            agency: prep.agency,
            duration: Math.round((new Date() - prep.startTime) / (1000 * 60))
          })),
          vehiclesNeedingAttention: vehiclesNeedingAttention.map(vehicle => ({
            id: vehicle._id,
            licensePlate: vehicle.licensePlate,
            agency: vehicle.agency,
            condition: vehicle.condition,
            requiresSpecialCare: vehicle.requiresSpecialCare,
            reason: vehicle.needsAttention ? 'Attention requise' : 'En préparation depuis longtemps'
          })),
          missingClockOuts: missingClockOuts.map(timesheet => ({
            user: timesheet.user,
            agency: timesheet.agency,
            clockInTime: timesheet.startTime,
            date: timesheet.date
          }))
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur récupération alertes:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/dashboard/preparation-stats
 * @desc    Statistiques des préparations
 * @access  Admin
 */
router.get('/preparation-stats', validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { startDate, endDate, agencyId } = req.query;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filters = {};
    if (agencyId) filters.agencyId = agencyId;

    // Statistiques des préparations
    const [preparationStats, topPerformers, vehicleStats] = await Promise.all([
      Preparation.getStats({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        ...filters
      }),
      
      // Top performers
      Preparation.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: defaultStartDate, $lte: defaultEndDate },
            ...(agencyId && { agency: require('mongoose').Types.ObjectId(agencyId) })
          }
        },
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
          $lookup: {
            from: 'agencies',
            localField: 'agency',
            foreignField: '_id',
            as: 'agency'
          }
        },
        { $unwind: '$agency' },
        {
          $group: {
            _id: {
              userId: '$user._id',
              agencyId: '$agency._id'
            },
            userName: { $first: { $concat: ['$user.firstName', ' ', '$user.lastName'] } },
            agencyName: { $first: '$agency.name' },
            totalDays: { $sum: 1 },
            lateDays: {
              $sum: {
                $cond: [{ $gt: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] }, 1, 0]
              }
            },
            averageDelay: { $avg: '$delays.startDelay' },
            totalWorkedHours: { $sum: { $divide: ['$totalWorkedMinutes', 60] } }
          }
        },
        {
          $project: {
            userName: 1,
            agencyName: 1,
            totalDays: 1,
            lateDays: 1,
            punctualityRate: {
              $round: [
                { $multiply: [
                  { $divide: [{ $subtract: ['$totalDays', '$lateDays'] }, '$totalDays'] },
                  100
                ]},
                2
              ]
            },
            averageDelay: { $round: ['$averageDelay', 2] },
            totalWorkedHours: { $round: ['$totalWorkedHours', 2] }
          }
        },
        { $sort: { punctualityRate: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        overall: punctualityStats[0] || {
          totalTimesheets: 0,
          onTimeCount: 0,
          punctualityRate: 0,
          averageDelay: 0,
          maxDelay: 0,
          averageWorkedHours: 0
        },
        byUserAndAgency: userStats
      }
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