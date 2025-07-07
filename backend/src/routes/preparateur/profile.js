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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('🔍 Recherche planning pour:', {
      userId,
      date: today.toISOString().split('T')[0]
    });

    // ✅ FIX: Supprimer le filtre status strict et ajouter des logs
    const todaySchedule = await Schedule.findOne({
      user: userId,
      date: {
        $gte: today,
        $lt: tomorrow
      }
      // ✅ SUPPRIMÉ: status: 'active' - peut ne pas exister ou être différent
    })
    .populate('agency', 'name code client')
    .sort({ createdAt: -1 }); // Prendre le plus récent en cas de multiples

    // ✅ LOG: Debug pour voir ce qui est trouvé
    if (todaySchedule) {
      console.log('✅ Planning trouvé:', {
        id: todaySchedule._id,
        agency: todaySchedule.agency?.name,
        horaires: `${todaySchedule.startTime} - ${todaySchedule.endTime}`,
        status: todaySchedule.status || 'undefined',
        date: todaySchedule.date
      });
    } else {
      console.log('❌ Aucun planning trouvé pour aujourd\'hui');
      
      // ✅ DEBUG: Chercher tous les plannings de l'utilisateur pour debug
      const allUserSchedules = await Schedule.find({ user: userId })
        .sort({ date: -1 })
        .limit(5)
        .populate('agency', 'name');
        
      console.log('📋 Derniers plannings utilisateur:', allUserSchedules.map(s => ({
        date: s.date.toISOString().split('T')[0],
        agency: s.agency?.name,
        status: s.status || 'undefined',
        horaires: `${s.startTime} - ${s.endTime}`
      })));
    }

    // Récupérer les autres données en parallèle
    const [
      user,
      todayTimesheet,
      currentPreparation,
      weekStats,
      recentPreparations
    ] = await Promise.all([
      // Utilisateur avec ses agences
      User.findById(userId).populate('agencies', 'name code client'),

      // Pointage d'aujourd'hui
      Timesheet.findOne({
        user: userId,
        date: {
          $gte: today,
          $lt: tomorrow
        }
      }).populate('agency', 'name code client'),

      // Préparation en cours
      Preparation.findOne({
        user: userId,
        status: 'in_progress'
      })
      .populate('vehicle', 'licensePlate brand model')
      .populate('agency', 'name code'),

      // Statistiques de la semaine
      Promise.all([
        Preparation.countDocuments({
          user: userId,
          status: 'completed',
          createdAt: { $gte: getWeekStart(today), $lte: getWeekEnd(today) }
        }),
        Preparation.countDocuments({
          user: userId,
          status: 'completed',
          isOnTime: true,
          createdAt: { $gte: getWeekStart(today), $lte: getWeekEnd(today) }
        }),
        // Compter les jours ponctuel cette semaine
        Timesheet.countDocuments({
          user: userId,
          date: { $gte: getWeekStart(today), $lte: getWeekEnd(today) },
          isLate: false,
          clockInTime: { $exists: true }
        })
      ]),

      // Préparations récentes
      Preparation.find({
        user: userId,
        status: { $in: ['completed', 'cancelled'] }
      })
      .populate('vehicle', 'licensePlate brand model')
      .populate('agency', 'name code')
      .sort({ createdAt: -1 })
      .limit(5)
    ]);

    const [weekPreparations, weekOnTime, weekPunctual] = weekStats;

    // Calculer le statut actuel
    const currentStatus = {
      isClockedIn: !!todayTimesheet?.clockInTime && !todayTimesheet?.clockOutTime,
      isClockedOut: !!todayTimesheet?.clockOutTime,
      isOnBreak: !!todayTimesheet?.breaks?.some(b => b.startTime && !b.endTime),
      hasActivePreparation: !!currentPreparation
    };

    // ✅ FIX: Construction de la réponse avec planning corrigé
    const response = {
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          agencies: user.agencies.map(agency => ({
            id: agency._id,
            name: agency.name,
            code: agency.code,
            client: agency.client,
            isDefault: agency.isDefault || false
          }))
        },
        today: {
          date: today,
          // ✅ FIX: Retourner le planning même sans status 'active'
          schedule: todaySchedule ? {
            id: todaySchedule._id,
            agency: {
              id: todaySchedule.agency._id,
              name: todaySchedule.agency.name,
              code: todaySchedule.agency.code,
              client: todaySchedule.agency.client
            },
            startTime: todaySchedule.startTime,
            endTime: todaySchedule.endTime,
            breakStart: todaySchedule.breakStart,
            breakEnd: todaySchedule.breakEnd,
            workingDuration: todaySchedule.workingDuration,
            timeRange: `${todaySchedule.startTime} - ${todaySchedule.endTime}`,
            // ✅ Inclure le status même s'il est undefined
            status: todaySchedule.status || 'active'
          } : null,
          timesheet: todayTimesheet ? {
            id: todayTimesheet._id,
            agency: todayTimesheet.agency,
            clockInTime: todayTimesheet.clockInTime,
            clockOutTime: todayTimesheet.clockOutTime,
            breaks: todayTimesheet.breaks,
            totalWorkTime: todayTimesheet.totalWorkTime,
            isLate: todayTimesheet.isLate,
            lateMinutes: todayTimesheet.lateMinutes,
            status: todayTimesheet.status
          } : null,
          currentPreparation: currentPreparation ? {
            id: currentPreparation._id,
            vehicle: currentPreparation.vehicle,
            agency: currentPreparation.agency,
            startTime: currentPreparation.startTime,
            currentDuration: Math.floor((new Date() - currentPreparation.startTime) / (1000 * 60)),
            progress: Math.round((currentPreparation.steps.filter(s => s.completed).length / currentPreparation.steps.length) * 100)
          } : null,
          currentStatus
        },
        weekStats: {
          period: { 
            start: getWeekStart(today), 
            end: getWeekEnd(today) 
          },
          preparations: weekPreparations,
          onTimePreparations: weekOnTime,
          punctualDays: weekPunctual,
          onTimeRate: weekPreparations > 0 ? Math.round((weekOnTime / weekPreparations) * 100) : 0,
          punctualityRate: 7 > 0 ? Math.round((weekPunctual / 7) * 100) : 0
        },
        recentActivity: recentPreparations.map(prep => ({
          id: prep._id,
          vehicle: prep.vehicle,
          agency: prep.agency,
          date: prep.createdAt,
          duration: prep.totalTime,
          isOnTime: prep.isOnTime,
          status: prep.status,
          completedSteps: prep.steps?.filter(s => s.completed).length || 0,
          totalSteps: prep.steps?.length || 6
        }))
      }
    };

    console.log('📊 Réponse dashboard:', {
      hasSchedule: !!response.data.today.schedule,
      hasTimesheet: !!response.data.today.timesheet,
      hasPreparation: !!response.data.today.currentPreparation
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Erreur dashboard préparateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/profile/schedule/week
 * @desc    Planning de la semaine
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

    const schedules = await Schedule.findUserWeekSchedule(userId, weekStart);

    // Organiser les plannings par jour de la semaine
    const weekSchedule = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      
      const daySchedule = schedules.find(schedule => 
        schedule.date.toDateString() === date.toDateString()
      );

      return {
        date: date,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dayShort: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        isToday: date.toDateString() === new Date().toDateString(),
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
        } : null
      };
    });

    // Calculer les totaux de la semaine
    const weekTotals = schedules.reduce((totals, schedule) => {
      const duration = schedule.getTotalWorkingMinutes();
      return {
        totalDays: totals.totalDays + 1,
        totalMinutes: totals.totalMinutes + duration,
        totalHours: Math.round((totals.totalMinutes + duration) / 60 * 10) / 10
      };
    }, { totalDays: 0, totalMinutes: 0, totalHours: 0 });

    res.json({
      success: true,
      data: {
        weekStart,
        weekSchedule,
        weekTotals
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