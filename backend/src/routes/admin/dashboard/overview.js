const express = require('express');
const Joi = require('joi');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const Schedule = require('../../../models/Schedule');
const Timesheet = require('../../../models/Timesheet');
const Preparation = require('../../../models/Preparation');
const Vehicle = require('../../../models/Vehicle');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../../utils/constants');

const router = express.Router();

// Schéma de validation pour l'overview
const overviewQuerySchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeAlerts: Joi.boolean().default(true)
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/overview
 * @desc    Vue d'ensemble du dashboard admin
 * @access  Admin
 */
router.get('/', validateQuery(overviewQuerySchema), async (req, res) => {
  try {
    const { date, includeAlerts } = req.query;
    
    // Date par défaut = aujourd'hui
    const today = date ? new Date(date) : new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📊 Overview - Date:', today.toISOString().split('T')[0]);

    // ===== STATISTIQUES GLOBALES =====
    const [
      totalUsers,
      activeUsers,
      totalAgencies,
      totalVehicles,
      todaySchedules,
      todayPresent,
      todayPreparations,
      ongoingPreparations
    ] = await Promise.all([
      // Utilisateurs
      User.countDocuments({ role: 'preparateur' }),
      User.countDocuments({ role: 'preparateur', isActive: true }),
      
      // Agences
      Agency.countDocuments({}),
      
      // Véhicules (si le modèle existe)
      Vehicle?.countDocuments?.({}) || Promise.resolve(0),
      
      // Plannings du jour
      Schedule.countDocuments({
        date: {
          $gte: today,
          $lt: tomorrow
        }
      }),
      
      // Présents aujourd'hui
      Timesheet.countDocuments({
        date: {
          $gte: today,
          $lt: tomorrow
        },
        clockInTime: { $exists: true }
      }),
      
      // Préparations aujourd'hui
      Preparation.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      
      // Préparations en cours
      Preparation.countDocuments({ status: 'in_progress' })
    ]);

    // ===== CALCUL DES RETARDS (MÉTHODE SIMPLE) =====
    const todayLate = await calculateTodayLateCount(today, tomorrow);

    // ===== CALCUL DES TAUX =====
    const presentRate = todaySchedules > 0 ? Math.round((todayPresent / todaySchedules) * 100) : 0;
    const punctualityRate = todayPresent > 0 ? Math.round(((todayPresent - todayLate) / todayPresent) * 100) : 0;

    // ===== ALERTES RÉCENTES =====
    let alerts = [];
    if (includeAlerts) {
      alerts = await getRecentAlerts(today);
    }

    // ===== RESPONSE =====
    const overview = {
      stats: {
        totalUsers,
        activeUsers,
        totalAgencies,
        totalVehicles,
        todaySchedules,
        todayPresent,
        todayLate,
        todayPreparations,
        ongoingPreparations
      },
      rates: {
        presentRate,
        punctualityRate
      },
      alerts,
      date: today.toISOString().split('T')[0],
      timestamp: new Date()
    };

    console.log('✅ Overview calculé:', {
      totalUsers,
      todayPresent,
      todayLate,
      presentRate,
      punctualityRate
    });

    res.json({
      success: true,
      data: overview
    });

  } catch (error) {
    console.error('💥 Erreur overview:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Calculer le nombre de retards aujourd'hui - MÉTHODE SIMPLE
 */
async function calculateTodayLateCount(today, tomorrow) {
  try {
    const timesheets = await Timesheet.find({
      date: { $gte: today, $lt: tomorrow },
      clockInTime: { $exists: true }
    }).populate('schedule', 'startTime');

    let lateCount = 0;
    
    timesheets.forEach(timesheet => {
      if (timesheet.schedule && timesheet.clockInTime) {
        const clockInHour = timesheet.clockInTime.getHours();
        const clockInMinute = timesheet.clockInTime.getMinutes();
        const clockInTime = clockInHour * 60 + clockInMinute;
        
        const [scheduleHour, scheduleMinute] = timesheet.schedule.startTime.split(':').map(Number);
        const scheduleTime = scheduleHour * 60 + scheduleMinute;
        
        // Retard si arrivée > 5 minutes après l'heure prévue
        if (clockInTime > scheduleTime + 5) {
          lateCount++;
        }
      }
    });

    return lateCount;
  } catch (error) {
    console.error('Erreur calcul retards:', error);
    return 0;
  }
}

/**
 * Récupérer les alertes récentes
 */
async function getRecentAlerts(today) {
  try {
    const alerts = [];

    // 1. Retards actuels
    const currentLateEmployees = await Timesheet.find({
      date: { $gte: today },
      clockInTime: null,
      schedule: { $exists: true }
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name')
    .populate('schedule', 'startTime')
    .limit(5);

    currentLateEmployees.forEach(timesheet => {
      if (timesheet.user && timesheet.schedule) {
        const now = new Date();
        const [scheduleHour, scheduleMinute] = timesheet.schedule.startTime.split(':').map(Number);
        const scheduleTime = new Date(today);
        scheduleTime.setHours(scheduleHour, scheduleMinute, 0, 0);
        
        if (now > scheduleTime) {
          alerts.push({
            id: `late_${timesheet._id}`,
            type: 'late_start',
            priority: 'high',
            title: 'Retard de pointage',
            message: `${timesheet.user.firstName} ${timesheet.user.lastName} n'a pas encore pointé`,
            userId: timesheet.user._id,
            userName: `${timesheet.user.firstName} ${timesheet.user.lastName}`,
            agencyId: timesheet.agency?._id,
            agencyName: timesheet.agency?.name,
            timestamp: now.toISOString(),
            isRead: false,
            actionRequired: true,
            actionUrl: `/admin/users/${timesheet.user._id}`
          });
        }
      }
    });

    // 2. Préparations en retard
    const overtimePreparations = await Preparation.find({
      status: 'in_progress',
      startTime: {
        $lte: new Date(Date.now() - TIME_LIMITS.PREPARATION_MAX_MINUTES * 60 * 1000)
      }
    })
    .populate('preparateur', 'firstName lastName')
    .populate('vehicle', 'licensePlate')
    .populate('agency', 'name')
    .limit(5);

    overtimePreparations.forEach(prep => {
      if (prep.preparateur) {
        alerts.push({
          id: `overtime_${prep._id}`,
          type: 'long_preparation',
          priority: 'medium',
          title: 'Préparation en retard',
          message: `Préparation du véhicule ${prep.vehicle?.licensePlate || 'N/A'} dépasse ${TIME_LIMITS.PREPARATION_MAX_MINUTES} minutes`,
          userId: prep.preparateur._id,
          userName: `${prep.preparateur.firstName} ${prep.preparateur.lastName}`,
          agencyId: prep.agency?._id,
          agencyName: prep.agency?.name,
          timestamp: new Date().toISOString(),
          isRead: false,
          actionRequired: true,
          actionUrl: `/admin/preparations/${prep._id}`
        });
      }
    });

    // Trier par priorité et timestamp
    return alerts.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }).slice(0, 10);

  } catch (error) {
    console.error('Erreur récupération alertes:', error);
    return [];
  }
}

module.exports = router;