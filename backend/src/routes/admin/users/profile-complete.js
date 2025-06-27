// ===== backend/src/routes/admin/users-profiles.js =====
const express = require('express');
const Joi = require('joi');
const User = require('../../../models/User');
const Timesheet = require('../../../models/Timesheet');
const Preparation = require('../../../models/Preparation');
const Schedule = require('../../../models/Schedule');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateObjectId, validateQuery } = require('../../../middleware/validation');
const { objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/users/profiles/:id
 * @desc    Profil utilisateur complet avec statistiques détaillées
 * @access  Admin
 */
router.get('/:id', validateObjectId('id'), validateQuery(Joi.object({
  period: Joi.string().valid('week', 'month', 'quarter', 'year').default('month'),
  includeHistory: Joi.boolean().default(true),
  includeFuture: Joi.boolean().default(true)
})), async (req, res) => {
  try {
    const userId = req.params.id;
    const { period, includeHistory, includeFuture } = req.query;
    
    // Récupérer l'utilisateur
    const user = await User.findById(userId)
      .populate('agencies', 'name code client address')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

    // Calculer les dates selon la période
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Récupérer toutes les données en parallèle
    const [
      periodStats,
      comparisonStats,
      activityTimeline,
      performanceEvolution,
      futureSchedules
    ] = await Promise.all([
      // Statistiques de la période
      getPeriodStats(userId, startDate, endDate),
      
      // Comparaison avec période précédente
      getComparisonStats(userId, startDate, endDate),
      
      // Timeline d'activité
      includeHistory ? getActivityTimeline(userId, startDate, endDate) : Promise.resolve([]),
      
      // Évolution des performances
      getPerformanceEvolution(userId, startDate, endDate),
      
      // Plannings futurs
      includeFuture ? getFutureSchedules(userId) : Promise.resolve([])
    ]);

    // Calculer les badges/réalisations
    const achievements = calculateAchievements(user, periodStats);
    
    // Identifier les points d'amélioration
    const improvements = identifyImprovements(periodStats, user.stats);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          role: user.role,
          phone: user.phone,
          agencies: user.agencies,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          globalStats: user.stats
        },
        period: {
          startDate,
          endDate,
          type: period,
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        statistics: {
          current: periodStats,
          comparison: comparisonStats,
          evolution: performanceEvolution
        },
        activity: {
          timeline: activityTimeline,
          summary: summarizeActivity(activityTimeline)
        },
        planning: {
          future: futureSchedules,
          coverage: calculatePlanningCoverage(futureSchedules)
        },
        insights: {
          achievements,
          improvements,
          recommendations: generateRecommendations(periodStats, user.stats)
        },
        metadata: {
          generatedAt: new Date(),
          period: { startDate, endDate, type: period }
        }
      }
    });

  } catch (error) {
    console.error('Erreur profil complet:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Récupérer les statistiques d'une période
 */
async function getPeriodStats(userId, startDate, endDate) {
  const [prepStats, timesheetStats, scheduleStats] = await Promise.all([
    // Statistiques préparations
    Preparation.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalPreparations: { $sum: 1 },
          tempsMoyen: { $avg: '$totalMinutes' },
          tempsTotal: { $sum: '$totalMinutes' },
          onTimeCount: { $sum: { $cond: [{ $eq: ['$isOnTime', true] }, 1, 0] } },
          totalIssues: { $sum: { $size: '$issues' } },
          minTime: { $min: '$totalMinutes' },
          maxTime: { $max: '$totalMinutes' }
        }
      }
    ]),

    // Statistiques pointages
    Timesheet.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
          startTime: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalJours: { $sum: 1 },
          retardsTotaux: { $sum: '$delays.startDelay' },
          ponctualCount: {
            $sum: {
              $cond: [
                { $lte: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] },
                1,
                0
              ]
            }
          },
          heuresTravaillees: { $sum: '$totalWorkedMinutes' },
          pausesTotales: { $sum: '$totalBreakMinutes' }
        }
      }
    ]),

    // Statistiques plannings
    Schedule.countDocuments({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
      status: 'active'
    })
  ]);

  const prep = prepStats[0] || {};
  const timesheet = timesheetStats[0] || {};

  return {
    preparations: {
      total: prep.totalPreparations || 0,
      tempsMoyen: Math.round(prep.tempsMoyen || 0),
      tempsTotal: prep.tempsTotal || 0,
      onTimeRate: prep.totalPreparations > 0 ? 
        Math.round((prep.onTimeCount / prep.totalPreparations) * 100) : 0,
      issueRate: prep.totalPreparations > 0 ? 
        Math.round((prep.totalIssues / prep.totalPreparations) * 100) : 0,
      minTime: prep.minTime || 0,
      maxTime: prep.maxTime || 0,
      totalIssues: prep.totalIssues || 0
    },
    ponctualite: {
      totalJours: timesheet.totalJours || 0,
      ponctualite: timesheet.totalJours > 0 ? 
        Math.round((timesheet.ponctualCount / timesheet.totalJours) * 100) : 0,
      retardMoyen: timesheet.totalJours > 0 ? 
        Math.round(timesheet.retardsTotaux / timesheet.totalJours) : 0,
      heuresTravaillees: Math.round((timesheet.heuresTravaillees || 0) / 60),
      joursPlannifies: scheduleStats || 0,
      tauxPresence: scheduleStats > 0 ? 
        Math.round((timesheet.totalJours / scheduleStats) * 100) : 0
    },
    productivite: {
      vehiculesParJour: timesheet.totalJours > 0 ? 
        Math.round((prep.totalPreparations || 0) / timesheet.totalJours * 10) / 10 : 0,
      tempsParVehicule: prep.totalPreparations > 0 ? 
        Math.round(prep.tempsTotal / prep.totalPreparations) : 0,
      efficacite: 95 // TODO: Calculer selon critères métier
    }
  };
}

/**
 * Comparaison avec période précédente
 */
async function getComparisonStats(userId, startDate, endDate) {
  const periodLength = endDate - startDate;
  const previousEnd = new Date(startDate - 1);
  const previousStart = new Date(previousEnd.getTime() - periodLength);

  const previousStats = await getPeriodStats(userId, previousStart, previousEnd);
  
  return {
    previousPeriod: { start: previousStart, end: previousEnd },
    previous: previousStats
  };
}

/**
 * Timeline d'activité détaillée
 */
async function getActivityTimeline(userId, startDate, endDate) {
  const [timesheets, preparations] = await Promise.all([
    Timesheet.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('agency', 'name code')
    .sort({ date: -1 }),

    Preparation.find({
      user: userId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['completed', 'cancelled'] }
    })
    .populate('agency', 'name code')
    .sort({ createdAt: -1 })
  ]);

  // Fusionner et organiser par date
  const timeline = {};

  timesheets.forEach(timesheet => {
    const dateKey = timesheet.date.toISOString().split('T')[0];
    if (!timeline[dateKey]) {
      timeline[dateKey] = {
        date: timesheet.date,
        dateFormatted: timesheet.date.toLocaleDateString('fr-FR'),
        timesheet: null,
        preparations: [],
        summary: {}
      };
    }
    timeline[dateKey].timesheet = {
      agency: timesheet.agency,
      startTime: timesheet.startTime,
      endTime: timesheet.endTime,
      totalWorked: timesheet.totalWorkedMinutes,
      delays: timesheet.delays,
      status: timesheet.status
    };
  });

  preparations.forEach(prep => {
    const dateKey = prep.createdAt.toISOString().split('T')[0];
    if (!timeline[dateKey]) {
      timeline[dateKey] = {
        date: new Date(dateKey),
        dateFormatted: new Date(dateKey).toLocaleDateString('fr-FR'),
        timesheet: null,
        preparations: [],
        summary: {}
      };
    }
    timeline[dateKey].preparations.push({
      id: prep._id,
      vehicle: prep.vehicle?.licensePlate || 'N/A',
      vehicleBrand: prep.vehicle?.brand,
      vehicleModel: prep.vehicle?.model,
      agency: prep.agency,
      duration: prep.totalMinutes,
      isOnTime: prep.isOnTime,
      issues: prep.issues?.length || 0,
      status: prep.status
    });
  });

  // Calculer résumés quotidiens
  Object.values(timeline).forEach(day => {
    const preps = day.preparations;
    day.summary = {
      totalPreparations: preps.length,
      averageTime: preps.length > 0 ? 
        Math.round(preps.reduce((sum, p) => sum + p.duration, 0) / preps.length) : 0,
      onTimeCount: preps.filter(p => p.isOnTime).length,
      issuesCount: preps.reduce((sum, p) => sum + p.issues, 0),
      worked: day.timesheet?.totalWorked || 0,
      punctual: day.timesheet?.delays?.startDelay <= TIME_LIMITS.LATE_THRESHOLD_MINUTES
    };
  });

  return Object.values(timeline).sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Évolution des performances sur la période
 */
async function getPerformanceEvolution(userId, startDate, endDate) {
  // Diviser la période en segments pour voir l'évolution
  const segments = 7; // 7 points de données
  const segmentDuration = (endDate - startDate) / segments;
  
  const evolution = [];
  
  for (let i = 0; i < segments; i++) {
    const segmentStart = new Date(startDate.getTime() + i * segmentDuration);
    const segmentEnd = new Date(startDate.getTime() + (i + 1) * segmentDuration);
    
    const segmentStats = await getPeriodStats(userId, segmentStart, segmentEnd);
    
    evolution.push({
      period: i + 1,
      startDate: segmentStart,
      endDate: segmentEnd,
      label: segmentStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      onTimeRate: segmentStats.preparations.onTimeRate,
      avgTime: segmentStats.preparations.tempsMoyen,
      punctuality: segmentStats.ponctualite.ponctualite,
      productivity: segmentStats.productivite.vehiculesParJour
    });
  }
  
  return evolution;
}

/**
 * Plannings futurs
 */
async function getFutureSchedules(userId) {
  const today = new Date();
  const futureLimit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours
  
  return await Schedule.find({
    user: userId,
    date: { $gte: today, $lte: futureLimit },
    status: 'active'
  })
  .populate('agency', 'name code client')
  .sort({ date: 1 });
}

/**
 * Calculer les réalisations/badges
 */
function calculateAchievements(user, periodStats) {
  const achievements = [];
  
  // Badge ponctualité
  if (periodStats.ponctualite.ponctualite >= 95) {
    achievements.push({
      id: 'punctuality_master',
      title: 'Maître de la ponctualité',
      description: `${periodStats.ponctualite.ponctualite}% de ponctualité`,
      icon: '⏰',
      level: 'gold',
      earnedAt: new Date()
    });
  }
  
  // Badge rapidité
  if (periodStats.preparations.tempsMoyen > 0 && periodStats.preparations.tempsMoyen <= 20) {
    achievements.push({
      id: 'speed_demon',
      title: 'Expert vitesse',
      description: `Temps moyen: ${periodStats.preparations.tempsMoyen}min`,
      icon: '⚡',
      level: 'silver',
      earnedAt: new Date()
    });
  }
  
  // Badge qualité
  if (periodStats.preparations.issueRate <= 5) {
    achievements.push({
      id: 'quality_expert',
      title: 'Expert qualité',
      description: `Seulement ${periodStats.preparations.issueRate}% d'incidents`,
      icon: '🏆',
      level: 'gold',
      earnedAt: new Date()
    });
  }
  
  return achievements;
}

/**
 * Identifier points d'amélioration
 */
function identifyImprovements(periodStats) {
  const improvements = [];
  
  if (periodStats.ponctualite.ponctualite < 85) {
    improvements.push({
      type: 'punctuality',
      priority: 'high',
      title: 'Améliorer la ponctualité',
      description: `Actuellement ${periodStats.ponctualite.ponctualite}%, objectif 90%+`,
      suggestions: [
        'Partir plus tôt de chez soi',
        'Vérifier les trajets la veille',
        'Prévoir du temps supplémentaire'
      ]
    });
  }
  
  if (periodStats.preparations.tempsMoyen > 30) {
    improvements.push({
      type: 'speed',
      priority: 'medium',
      title: 'Optimiser les temps de préparation',
      description: `Temps moyen ${periodStats.preparations.tempsMoyen}min, objectif <25min`,
      suggestions: [
        'Optimiser l\'ordre des étapes',
        'Préparer le matériel à l\'avance',
        'Demander formation sur techniques rapides'
      ]
    });
  }
  
  return improvements;
}

/**
 * Générer recommandations personnalisées
 */
function generateRecommendations(periodStats, globalStats) {
  const recommendations = [];
  
  // Recommandation basée sur l'évolution
  if (periodStats.preparations.onTimeRate < globalStats.onTimeRate) {
    recommendations.push({
      type: 'performance_decline',
      priority: 'medium',
      title: 'Performance en baisse',
      description: `Taux de ponctualité actuel (${periodStats.preparations.onTimeRate}%) inférieur à votre moyenne (${globalStats.onTimeRate}%)`,
      action: 'Identifier les causes récentes de cette baisse'
    });
  }
  
  // Recommandation formation
  if (periodStats.preparations.issueRate > 10) {
    recommendations.push({
      type: 'training',
      priority: 'high',
      title: 'Formation recommandée',
      description: 'Taux d\'incidents élevé, formation sur les bonnes pratiques conseillée',
      action: 'Programmer une session de formation'
    });
  }
  
  // Recommandation planification
  if (periodStats.ponctualite.tauxPresence < 95) {
    recommendations.push({
      type: 'attendance',
      priority: 'low',
      title: 'Optimiser la présence',
      description: `Taux de présence: ${periodStats.ponctualite.tauxPresence}%`,
      action: 'Revoir la planification des congés/absences'
    });
  }
  
  return recommendations;
}

/**
 * Résumer l'activité
 */
function summarizeActivity(timeline) {
  const totalDays = timeline.length;
  const workedDays = timeline.filter(day => day.timesheet).length;
  const totalPreps = timeline.reduce((sum, day) => sum + day.summary.totalPreparations, 0);
  const punctualDays = timeline.filter(day => day.summary.punctual).length;
  
  return {
    totalDays,
    workedDays,
    totalPreparations: totalPreps,
    punctualDays,
    averagePrepsPerDay: workedDays > 0 ? Math.round((totalPreps / workedDays) * 10) / 10 : 0,
    punctualityRate: workedDays > 0 ? Math.round((punctualDays / workedDays) * 100) : 0
  };
}

/**
 * Calculer couverture planning
 */
function calculatePlanningCoverage(schedules) {
  const nextDays = 7; // Prochains 7 jours
  const today = new Date();
  
  let coverage = 0;
  for (let i = 0; i < nextDays; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    
    const hasSchedule = schedules.some(schedule => 
      schedule.date.toDateString() === checkDate.toDateString()
    );
    
    if (hasSchedule) coverage++;
  }
  
  return {
    next7Days: Math.round((coverage / nextDays) * 100),
    totalFutureSchedules: schedules.length,
    nextSchedule: schedules.length > 0 ? schedules[0] : null
  };
}

/**
 * @route   GET /api/admin/users/profiles/:id/performance-chart
 * @desc    Données graphique performance utilisateur
 * @access  Admin
 */
router.get('/:id/performance-chart', validateObjectId('id'), validateQuery(Joi.object({
  period: Joi.string().valid('month', 'quarter', 'year').default('month'),
  metric: Joi.string().valid('punctuality', 'speed', 'quality', 'productivity').default('punctuality')
})), async (req, res) => {
  try {
    const userId = req.params.id;
    const { period, metric } = req.query;
    
    // Calculer nombre de segments pour le graphique
    let segments, segmentType;
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case 'year':
        segments = 12;
        segmentType = 'month';
        startDate = new Date(endDate.getFullYear(), 0, 1); // Début d'année
        break;
      case 'quarter':
        segments = 12;
        segmentType = 'week';
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        segments = 30;
        segmentType = 'day';
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const chartData = [];
    const segmentDuration = (endDate - startDate) / segments;
    
    for (let i = 0; i < segments; i++) {
      const segmentStart = new Date(startDate.getTime() + i * segmentDuration);
      const segmentEnd = new Date(startDate.getTime() + (i + 1) * segmentDuration);
      
      let value = 0;
      let label = '';
      
      // Calculer la valeur selon la métrique
      switch (metric) {
        case 'punctuality':
          const punctStats = await Timesheet.aggregate([
            {
              $match: {
                user: require('mongoose').Types.ObjectId(userId),
                date: { $gte: segmentStart, $lte: segmentEnd },
                startTime: { $exists: true }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                punctual: {
                  $sum: {
                    $cond: [
                      { $lte: ['$delays.startDelay', TIME_LIMITS.LATE_THRESHOLD_MINUTES] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]);
          value = punctStats[0] ? Math.round((punctStats[0].punctual / punctStats[0].total) * 100) : 0;
          break;
          
        case 'speed':
          const speedStats = await Preparation.aggregate([
            {
              $match: {
                user: require('mongoose').Types.ObjectId(userId),
                createdAt: { $gte: segmentStart, $lte: segmentEnd },
                status: 'completed'
              }
            },
            {
              $group: {
                _id: null,
                avgTime: { $avg: '$totalMinutes' }
              }
            }
          ]);
          value = speedStats[0] ? Math.round(speedStats[0].avgTime) : 0;
          break;
          
        case 'quality':
          const qualityStats = await Preparation.aggregate([
            {
              $match: {
                user: require('mongoose').Types.ObjectId(userId),
                createdAt: { $gte: segmentStart, $lte: segmentEnd },
                status: 'completed'
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                withoutIssues: {
                  $sum: {
                    $cond: [
                      { $eq: [{ $size: '$issues' }, 0] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]);
          value = qualityStats[0] ? Math.round((qualityStats[0].withoutIssues / qualityStats[0].total) * 100) : 0;
          break;
          
        case 'productivity':
          const [prodPreps, prodDays] = await Promise.all([
            Preparation.countDocuments({
              user: userId,
              createdAt: { $gte: segmentStart, $lte: segmentEnd },
              status: 'completed'
            }),
            Timesheet.countDocuments({
              user: userId,
              date: { $gte: segmentStart, $lte: segmentEnd },
              startTime: { $exists: true }
            })
          ]);
          value = prodDays > 0 ? Math.round((prodPreps / prodDays) * 10) / 10 : 0;
          break;
      }
      
      // Formater le label selon le type de segment
      if (segmentType === 'month') {
        label = segmentStart.toLocaleDateString('fr-FR', { month: 'short' });
      } else if (segmentType === 'week') {
        label = `S${Math.ceil(i / 7) + 1}`;
      } else {
        label = segmentStart.getDate().toString();
      }
      
      chartData.push({
        period: i + 1,
        date: segmentStart,
        label,
        value,
        metric
      });
    }
    
    // Calculer tendance
    const values = chartData.map(point => point.value).filter(v => v > 0);
    let trend = 'stable';
    if (values.length >= 2) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const change = ((secondAvg - firstAvg) / firstAvg) * 100;
      
      if (change > 5) trend = 'improving';
      else if (change < -5) trend = 'declining';
    }
    
    res.json({
      success: true,
      data: {
        chartData,
        metadata: {
          period: { start: startDate, end: endDate, type: period },
          metric,
          segments,
          segmentType,
          trend,
          average: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
          best: values.length > 0 ? Math.max(...values) : 0,
          worst: values.length > 0 ? Math.min(...values) : 0
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur graphique performance:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/users/profiles/:id/note
 * @desc    Ajouter une note admin sur un utilisateur
 * @access  Admin
 */
router.post('/:id/note', validateObjectId('id'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { note, category, private: isPrivate } = req.body;
    
    // TODO: En production, créer une collection UserNotes
    // const userNote = new UserNote({
    //   userId,
    //   note,
    //   category,
    //   isPrivate,
    //   createdBy: req.user.userId,
    //   createdAt: new Date()
    // });
    // await userNote.save();
    
    console.log(`📝 Note ajoutée pour utilisateur ${userId} par ${req.user.email}: ${note}`);
    
    res.json({
      success: true,
      message: 'Note ajoutée avec succès',
      data: {
        noteId: 'temp_' + Date.now(),
        userId,
        note,
        category,
        isPrivate,
        createdBy: req.user.email,
        createdAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Erreur ajout note:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;