const express = require('express');
const User = require('../../models/User');
const Schedule = require('../../models/Schedule');
const Timesheet = require('../../models/Timesheet');
const Preparation = require('../../models/Preparation');
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');
const { validateQuery } = require('../../middleware/validation');
const { querySchemas } = require('../../middleware/validation');
const { ERROR_MESSAGES } = require('../../utils/constants');
const mongoose = require('mongoose');

const router = express.Router();

// Toutes les routes nécessitent une authentification préparateur
router.use(auth, preparateurAuth);

/**
 * @route   GET /api/profile/dashboard
 * @desc    Dashboard personnel du préparateur
 * @access  Preparateur
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Vérifier que l'userId est valide
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    // Dates pour aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Récupération de toutes les données en parallèle
    const [user, todaySchedule, todayTimesheet, currentPreparation] = await Promise.all([
      // Utilisateur avec ses agences
      User.findById(userId).populate('agencies', 'name code client'),
      
      // Planning d'aujourd'hui
      Schedule.findOne({
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: today, $lt: tomorrow }
      }).populate('agency', 'name code client'),
      
      // Timesheet d'aujourd'hui
      Timesheet.findOne({
        user: new mongoose.Types.ObjectId(userId),
        $or: [
          { date: today },
          { date: { $gte: today, $lt: tomorrow } },
          { createdAt: { $gte: today, $lt: tomorrow } }
        ]
      }).populate('agency', 'name code client').sort({ createdAt: -1 }),
      
      // Préparation en cours
      Preparation.findOne({
        user: new mongoose.Types.ObjectId(userId),
        status: 'in_progress'
      }).populate('vehicle agency', 'licensePlate brand model name code')
    ]);

    // Vérifier que l'utilisateur existe
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Calcul des statistiques utilisateur
    const userStatsPromise = Preparation.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalPreparations: { $sum: 1 },
          completedPreparations: { 
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageTime: { 
            $avg: { 
              $cond: [
                { $and: [{ $ne: ['$totalTime', null] }, { $gt: ['$totalTime', 0] }] },
                '$totalTime',
                null
              ]
            }
          }
        }
      }
    ]);

    // Calcul du taux de ponctualité
    const punctualityStatsPromise = Timesheet.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalTimesheets: { $sum: 1 },
          onTimeCount: {
            $sum: {
              $cond: [
                { $lte: [{ $ifNull: ['$delays.startDelay', 0] }, 5] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const [userStatsResult, punctualityStatsResult] = await Promise.all([
      userStatsPromise,
      punctualityStatsPromise
    ]);

    // Extraction des statistiques
    const userStats = userStatsResult[0] || {
      totalPreparations: 0,
      completedPreparations: 0,
      averageTime: 0
    };

    const punctualityStats = punctualityStatsResult[0];
    const onTimeRate = punctualityStats && punctualityStats.totalTimesheets > 0 
      ? Math.round((punctualityStats.onTimeCount / punctualityStats.totalTimesheets) * 100)
      : 0;

    // Construction de la réponse
    const dashboardData = {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        agencies: user.agencies || [],
        stats: {
          totalPreparations: userStats.totalPreparations,
          averageTime: Math.round(userStats.averageTime || 0),
          onTimeRate: onTimeRate
        }
      },
      today: {
        schedule: todaySchedule ? {
          id: todaySchedule._id,
          startTime: todaySchedule.startTime,
          endTime: todaySchedule.endTime,
          breakStart: todaySchedule.breakStart,
          breakEnd: todaySchedule.breakEnd,
          agency: {
            id: todaySchedule.agency._id,
            name: todaySchedule.agency.name,
            code: todaySchedule.agency.code,
            client: todaySchedule.agency.client
          }
        } : null,
        
        timesheet: todayTimesheet ? {
          id: todayTimesheet._id,
          startTime: todayTimesheet.startTime,
          endTime: todayTimesheet.endTime,
          breakStart: todayTimesheet.breakStart,
          breakEnd: todayTimesheet.breakEnd,
          status: todayTimesheet.status,
          totalWorkedMinutes: todayTimesheet.totalWorkedMinutes || 0,
          agency: todayTimesheet.agency ? {
            id: todayTimesheet.agency._id,
            name: todayTimesheet.agency.name,
            code: todayTimesheet.agency.code
          } : null
        } : null,
        
        currentPreparation: currentPreparation ? {
          id: currentPreparation._id,
          status: currentPreparation.status,
          vehicle: {
            licensePlate: currentPreparation.vehicle.licensePlate,
            brand: currentPreparation.vehicle.brand,
            model: currentPreparation.vehicle.model
          },
          agency: {
            name: currentPreparation.agency.name,
            code: currentPreparation.agency.code
          }
        } : null
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement du dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/profile/schedule/week
 * @desc    Planning de la semaine AVEC pointages réels
 * @access  Preparateur
 */
router.get('/schedule/week', async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.user.userId;

    // Date de début de semaine (par défaut semaine courante)
    const weekStart = date ? new Date(date) : new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Lundi
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Dimanche
    weekEnd.setHours(23, 59, 59, 999);

    // ✅ RÉCUPÉRER EN PARALLÈLE : Planning + Pointages de la semaine
    const [schedules, timesheets] = await Promise.all([
      Schedule.findUserWeekSchedule(userId, weekStart),
      
      // ✅ NOUVEAU - Récupérer TOUS les pointages de la semaine
      Timesheet.find({
        user: userId,
        date: {
          $gte: weekStart,
          $lte: weekEnd
        }
      }).populate('agency', 'name code client').lean()
    ]);

    // Créer un map des pointages par date pour faciliter l'accès
    const timesheetsByDate = {};
    timesheets.forEach(timesheet => {
      const dateKey = timesheet.date.toISOString().split('T')[0];
      timesheetsByDate[dateKey] = timesheet;
    });

    // Organiser les plannings par jour de la semaine avec pointages
    const weekSchedule = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const dateKey = date.toISOString().split('T')[0];
      
      const daySchedule = schedules.find(schedule => 
        schedule.date.toDateString() === date.toDateString()
      );

      // ✅ RÉCUPÉRER LE POINTAGE DU JOUR
      const dayTimesheet = timesheetsByDate[dateKey];

      return {
        date: date,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dayShort: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        isToday: date.toDateString() === new Date().toDateString(),
        
        // Planning prévu
        schedule: daySchedule ? {
          id: daySchedule._id,
          agency: daySchedule.agency,
          startTime: daySchedule.startTime,
          endTime: daySchedule.endTime,
          breakStart: daySchedule.breakStart,
          breakEnd: daySchedule.breakEnd,
          notes: daySchedule.notes,
          workingDuration: daySchedule.workingDuration,
          formatted: daySchedule.formatted
        } : null,

        // ✅ POINTAGES RÉELS
        timesheet: dayTimesheet ? {
          id: dayTimesheet._id,
          agency: dayTimesheet.agency,
          startTime: dayTimesheet.startTime,
          endTime: dayTimesheet.endTime,
          breakStart: dayTimesheet.breakStart,
          breakEnd: dayTimesheet.breakEnd,
          totalWorkedMinutes: dayTimesheet.totalWorkedMinutes,
          status: dayTimesheet.status,
          delays: dayTimesheet.delays,
          // ✅ CALCULER LES ÉCARTS
          variance: daySchedule && dayTimesheet.startTime ? 
            calculateTimeVariance(daySchedule.startTime, dayTimesheet.startTime) : null
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        weekStart,
        weekSchedule
      }
    });

  } catch (error) {
    console.error('Erreur planning semaine:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ✅ FONCTION UTILITAIRE - Calculer écart entre prévu et réel
function calculateTimeVariance(scheduledTime, actualTime) {
  try {
    // Convertir l'heure planifiée (string) en minutes
    const [schedHours, schedMinutes] = scheduledTime.split(':').map(Number);
    const scheduledMinutes = schedHours * 60 + schedMinutes;
    
    // Convertir l'heure réelle (Date) en minutes
    const actualMinutes = actualTime.getHours() * 60 + actualTime.getMinutes();
    
    // Retourner la différence en minutes
    const variance = actualMinutes - scheduledMinutes;
    
    return {
      minutes: variance,
      status: variance <= 5 ? 'on_time' : variance <= 15 ? 'slight_delay' : 'late',
      label: variance === 0 ? 'À l\'heure' : 
             variance > 0 ? `+${variance}min` : `${variance}min`
    };
  } catch (error) {
    return null;
  }
}

/**
 * @route   GET /api/profile/performance
 * @desc    Statistiques de performance détaillées
 * @access  Preparateur
 */
router.get('/performance', validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.userId;

    // Dates par défaut (3 derniers mois)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Statistiques détaillées
    const [
      preparationStats,
      punctualityStats,
      monthlyBreakdown
    ] = await Promise.all([
      // Statistiques préparations
      Preparation.getStats({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        userId
      }),

      // Statistiques ponctualité
      Timesheet.getPunctualityStats({
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        userId
      }),

      // Breakdown mensuel
      Preparation.aggregate([
        {
          $match: {
            user: require('mongoose').Types.ObjectId(userId),
            status: 'completed',
            createdAt: { $gte: defaultStartDate, $lte: defaultEndDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalPreparations: { $sum: 1 },
            averageTime: { $avg: '$totalMinutes' },
            onTimeCount: {
              $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            year: '$_id.year',
            month: '$_id.month',
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
        { $sort: { year: 1, month: 1 } }
      ])
    ]);

    // Évolution des performances (derniers 30 jours par semaine)
    const last30Days = new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const weeklyEvolution = await Preparation.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          status: 'completed',
          createdAt: { $gte: last30Days, $lte: defaultEndDate }
        }
      },
      {
        $group: {
          _id: {
            week: { $week: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          totalPreparations: { $sum: 1 },
          averageTime: { $avg: '$totalMinutes' },
          onTimeCount: {
            $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          week: '$_id.week',
          year: '$_id.year',
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
      { $sort: { year: 1, week: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        overall: {
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
        },
        trends: {
          monthly: monthlyBreakdown,
          weekly: weeklyEvolution
        }
      }
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
 * @route   GET /api/profile/achievements
 * @desc    Badges et réalisations du préparateur
 * @access  Preparateur
 */
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    // Calculer les badges en fonction des performances
    const achievements = [];

    // Badge ponctualité
    if (user.stats.onTimeRate >= 95) {
      achievements.push({
        id: 'punctuality_master',
        title: 'Maître de la ponctualité',
        description: 'Plus de 95% de préparations dans les temps',
        icon: '⏰',
        level: 'gold',
        earnedAt: user.updatedAt
      });
    } else if (user.stats.onTimeRate >= 85) {
      achievements.push({
        id: 'punctuality_expert',
        title: 'Expert en ponctualité',
        description: 'Plus de 85% de préparations dans les temps',
        icon: '⏰',
        level: 'silver',
        earnedAt: user.updatedAt
      });
    }

    // Badge productivité
    if (user.stats.totalPreparations >= 1000) {
      achievements.push({
        id: 'productivity_legend',
        title: 'Légende de la productivité',
        description: 'Plus de 1000 préparations réalisées',
        icon: '🏆',
        level: 'platinum',
        earnedAt: user.updatedAt
      });
    } else if (user.stats.totalPreparations >= 500) {
      achievements.push({
        id: 'productivity_master',
        title: 'Maître de la productivité',
        description: 'Plus de 500 préparations réalisées',
        icon: '🥇',
        level: 'gold',
        earnedAt: user.updatedAt
      });
    } else if (user.stats.totalPreparations >= 100) {
      achievements.push({
        id: 'productivity_expert',
        title: 'Expert en productivité',
        description: 'Plus de 100 préparations réalisées',
        icon: '🥈',
        level: 'silver',
        earnedAt: user.updatedAt
      });
    }

    // Badge rapidité
    if (user.stats.averageTime <= 20) {
      achievements.push({
        id: 'speed_master',
        title: 'Maître de la rapidité',
        description: 'Temps moyen de préparation sous 20 minutes',
        icon: '⚡',
        level: 'gold',
        earnedAt: user.updatedAt
      });
    } else if (user.stats.averageTime <= 25) {
      achievements.push({
        id: 'speed_expert',
        title: 'Expert en rapidité',
        description: 'Temps moyen de préparation sous 25 minutes',
        icon: '⚡',
        level: 'silver',
        earnedAt: user.updatedAt
      });
    }

    // Prochains objectifs
    const nextGoals = [];

    if (user.stats.onTimeRate < 95) {
      nextGoals.push({
        id: 'improve_punctuality',
        title: 'Améliorer la ponctualité',
        description: `Passer de ${user.stats.onTimeRate}% à 95% de préparations dans les temps`,
        progress: user.stats.onTimeRate,
        target: 95
      });
    }

    if (user.stats.totalPreparations < 1000) {
      const nextMilestone = user.stats.totalPreparations < 100 ? 100 : 
                           user.stats.totalPreparations < 500 ? 500 : 1000;
      nextGoals.push({
        id: 'increase_volume',
        title: 'Augmenter le volume',
        description: `Atteindre ${nextMilestone} préparations`,
        progress: user.stats.totalPreparations,
        target: nextMilestone
      });
    }

    if (user.stats.averageTime > 20) {
      nextGoals.push({
        id: 'improve_speed',
        title: 'Améliorer la rapidité',
        description: 'Réduire le temps moyen à moins de 20 minutes',
        progress: Math.max(0, 30 - user.stats.averageTime),
        target: 30
      });
    }

    res.json({
      success: true,
      data: {
        achievements,
        nextGoals,
        summary: {
          totalBadges: achievements.length,
          levels: {
            platinum: achievements.filter(a => a.level === 'platinum').length,
            gold: achievements.filter(a => a.level === 'gold').length,
            silver: achievements.filter(a => a.level === 'silver').length,
            bronze: achievements.filter(a => a.level === 'bronze').length
          }
        }
      }
    });

  } catch (error) {
    console.error('Erreur réalisations:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

function getWeekStart(date) {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay() + 1); // Lundi
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getWeekEnd(date) {
  const weekEnd = new Date(date);
  weekEnd.setDate(date.getDate() - date.getDay() + 7); // Dimanche
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

module.exports = router;