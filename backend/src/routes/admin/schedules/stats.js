// ===== backend/src/routes/admin/schedules/stats.js - RÉÉCRITURE COMPLÈTE =====
const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION =====
const statsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  agency: objectId.optional(),
  user: objectId.optional(),
  period: Joi.string().valid('week', 'month', 'quarter', 'year').optional()
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/schedules/stats
 * @desc    Statistiques des plannings (sans agrégations MongoDB complexes)
 * @access  Admin
 */
router.get('/', validateQuery(statsQuerySchema), async (req, res) => {
  try {
    const { startDate, endDate, agency, user, period } = req.query;
    
    console.log('📊 Requête stats reçue:', { startDate, endDate, agency, user, period });
    
    // Calculer les dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    let defaultStartDate;
    
    if (startDate) {
      defaultStartDate = new Date(startDate);
    } else {
      // Calculer selon la période
      switch (period) {
        case 'week':
          defaultStartDate = new Date(defaultEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          defaultStartDate = new Date(defaultEndDate.getFullYear(), defaultEndDate.getMonth() - 1, defaultEndDate.getDate());
          break;
        case 'quarter':
          defaultStartDate = new Date(defaultEndDate.getFullYear(), defaultEndDate.getMonth() - 3, defaultEndDate.getDate());
          break;
        case 'year':
          defaultStartDate = new Date(defaultEndDate.getFullYear() - 1, defaultEndDate.getMonth(), defaultEndDate.getDate());
          break;
        default:
          defaultStartDate = new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    console.log('📅 Période calculée:', { defaultStartDate, defaultEndDate });

    // Construire les filtres pour MongoDB
    const matchFilter = {
      date: { $gte: defaultStartDate, $lte: defaultEndDate },
      status: 'active'
    };
    
    if (agency) {
      matchFilter.agency = agency;
    }
    if (user) {
      matchFilter.user = user;
    }

    console.log('🔍 Filtres MongoDB:', matchFilter);

    // Récupérer TOUS les plannings avec les relations
    const schedules = await Schedule.find(matchFilter)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .sort({ date: 1 })
      .lean(); // .lean() pour de meilleures performances

    console.log(`📋 ${schedules.length} plannings trouvés`);

    // Si aucun planning, retourner des stats vides
    if (schedules.length === 0) {
      return res.json({
        success: true,
        data: {
          totalSchedules: 0,
          totalWorkingHours: 0,
          averagePerUser: 0,
          averagePerDay: 0,
          busiestrDays: [],
          userStats: [],
          agencyStats: [],
          period: {
            startDate: defaultStartDate,
            endDate: defaultEndDate
          },
          filters: {
            agency,
            user,
            period
          }
        }
      });
    }

    // Calculer les statistiques en JavaScript pur (plus fiable)
    const stats = calculateStatisticsFromSchedules(schedules);

    console.log('✅ Stats calculées:', {
      totalSchedules: stats.totalSchedules,
      totalWorkingHours: stats.totalWorkingHours,
      usersCount: stats.userStats.length,
      agenciesCount: stats.agencyStats.length
    });

    // Réponse finale
    res.json({
      success: true,
      data: {
        ...stats,
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        filters: {
          agency,
          user,
          period
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur statistiques plannings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * Calculer toutes les statistiques en JavaScript pur
 * (évite les problèmes d'agrégation MongoDB)
 */
function calculateStatisticsFromSchedules(schedules) {
  console.log('🔢 Début calcul statistiques pour', schedules.length, 'plannings');

  // Variables d'accumulation
  let totalWorkingHours = 0;
  const userStatsMap = new Map();
  const agencyStatsMap = new Map();
  const dayStatsMap = new Map();
  const uniqueUsers = new Set();
  const uniqueAgencies = new Set();

  // Traiter chaque planning
  schedules.forEach((schedule, index) => {
    try {
      // Calculer les heures de travail
      const workingHours = calculateWorkingHoursFromSchedule(schedule);
      totalWorkingHours += workingHours;

      // Date formatée
      const dateKey = schedule.date.toISOString().split('T')[0];

      // Informations utilisateur
      const userId = schedule.user._id.toString();
      const userName = `${schedule.user.firstName} ${schedule.user.lastName}`;
      uniqueUsers.add(userId);

      // Informations agence
      const agencyId = schedule.agency._id.toString();
      const agencyName = schedule.agency.name;
      uniqueAgencies.add(agencyId);

      // === STATS PAR UTILISATEUR ===
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          userId,
          userName,
          totalHours: 0,
          totalDays: new Set(),
          scheduleCount: 0
        });
      }
      const userStats = userStatsMap.get(userId);
      userStats.totalHours += workingHours;
      userStats.totalDays.add(dateKey);
      userStats.scheduleCount++;

      // === STATS PAR AGENCE ===
      if (!agencyStatsMap.has(agencyId)) {
        agencyStatsMap.set(agencyId, {
          agencyId,
          agencyName,
          totalSchedules: 0,
          totalHours: 0,
          activeUsers: new Set()
        });
      }
      const agencyStats = agencyStatsMap.get(agencyId);
      agencyStats.totalSchedules++;
      agencyStats.totalHours += workingHours;
      agencyStats.activeUsers.add(userId);

      // === STATS PAR JOUR ===
      if (!dayStatsMap.has(dateKey)) {
        dayStatsMap.set(dateKey, {
          date: dateKey,
          count: 0,
          hours: 0
        });
      }
      const dayStats = dayStatsMap.get(dateKey);
      dayStats.count++;
      dayStats.hours += workingHours;

    } catch (error) {
      console.warn(`⚠️ Erreur calcul planning ${index}:`, error.message);
    }
  });

  // === CALCULS FINAUX ===
  const totalSchedules = schedules.length;
  const uniqueUserCount = uniqueUsers.size;
  const uniqueDayCount = dayStatsMap.size;

  const averagePerUser = uniqueUserCount > 0 ? totalSchedules / uniqueUserCount : 0;
  const averagePerDay = uniqueDayCount > 0 ? totalSchedules / uniqueDayCount : 0;

  // Préparer les jours les plus chargés (top 10)
  const busiestrDays = Array.from(dayStatsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(day => ({
      date: day.date,
      count: day.count,
      hours: Math.round(day.hours * 100) / 100
    }));

  // Préparer les stats utilisateurs
  const userStats = Array.from(userStatsMap.values()).map(user => ({
    userId: user.userId,
    userName: user.userName,
    totalHours: Math.round(user.totalHours * 100) / 100,
    totalDays: user.totalDays.size,
    averagePerDay: user.totalDays.size > 0 ? 
      Math.round((user.totalHours / user.totalDays.size) * 100) / 100 : 0
  }));

  // Préparer les stats agences
  const agencyStats = Array.from(agencyStatsMap.values()).map(agency => ({
    agencyId: agency.agencyId,
    agencyName: agency.agencyName,
    totalSchedules: agency.totalSchedules,
    totalHours: Math.round(agency.totalHours * 100) / 100,
    activeUsers: agency.activeUsers.size
  }));

  console.log('✅ Stats calculées:', {
    totalSchedules,
    totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
    averagePerUser: Math.round(averagePerUser * 100) / 100,
    averagePerDay: Math.round(averagePerDay * 100) / 100,
    busiestrDaysCount: busiestrDays.length,
    userStatsCount: userStats.length,
    agencyStatsCount: agencyStats.length
  });

  return {
    totalSchedules,
    totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
    averagePerUser: Math.round(averagePerUser * 100) / 100,
    averagePerDay: Math.round(averagePerDay * 100) / 100,
    busiestrDays,
    userStats,
    agencyStats
  };
}

/**
 * Calculer les heures de travail d'un planning
 */
function calculateWorkingHoursFromSchedule(schedule) {
  if (!schedule.startTime || !schedule.endTime) {
    return 0;
  }

  try {
    // Convertir les heures en minutes
    const startMinutes = timeStringToMinutes(schedule.startTime);
    const endMinutes = timeStringToMinutes(schedule.endTime);
    
    // Calculer la durée totale
    let workingMinutes = endMinutes - startMinutes;
    
    // Soustraire la pause si elle existe
    if (schedule.breakStart && schedule.breakEnd) {
      const breakStartMinutes = timeStringToMinutes(schedule.breakStart);
      const breakEndMinutes = timeStringToMinutes(schedule.breakEnd);
      const breakDuration = breakEndMinutes - breakStartMinutes;
      
      if (breakDuration > 0) {
        workingMinutes -= breakDuration;
      }
    }
    
    // Retourner en heures (minimum 0)
    return Math.max(0, workingMinutes / 60);
    
  } catch (error) {
    console.warn('⚠️ Erreur calcul heures:', error.message, 'pour', schedule.startTime, '-', schedule.endTime);
    return 0;
  }
}

/**
 * Convertir une chaîne d'heure (HH:MM) en minutes
 */
function timeStringToMinutes(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return 0;
  }
  
  const parts = timeString.split(':');
  if (parts.length !== 2) {
    throw new Error(`Format d'heure invalide: ${timeString}`);
  }
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Heure invalide: ${timeString}`);
  }
  
  return hours * 60 + minutes;
}

module.exports = router;