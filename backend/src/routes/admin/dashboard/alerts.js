// ===== backend/src/routes/admin/dashboard-alerts.js =====
const express = require('express');
const Joi = require('joi');
const User = require('../../../models/User');
const Timesheet = require('../../../models/Timesheet');
const Preparation = require('../../../models/Preparation');
const Schedule = require('../../../models/Schedule');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/alerts
 * @desc    Alertes et notifications temps réel
 * @access  Admin
 */
router.get('/', validateQuery(Joi.object({
  priority: Joi.string().valid('all', 'critical', 'warning', 'info').default('all'),
  limit: Joi.number().min(1).max(100).default(20),
  includeResolved: Joi.boolean().default(false)
})), async (req, res) => {
  try {
    const { priority, limit, includeResolved } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const [
      retardsEnCours,
      preparationsDepassees,
      absencesNonPrevues,
      preparationsStagnantes,
      vehiculesProblematiques
    ] = await Promise.all([
      // 🚨 CRITIQUE: Retards de pointage en cours
      Timesheet.aggregate([
        {
          $match: {
            date: today,
            startTime: null // Pas encore pointé
          }
        },
        {
          $lookup: {
            from: 'schedules',
            let: { userId: '$user', date: '$date' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$user', '$$userId'] },
                      { $eq: ['$date', '$$date'] },
                      { $eq: ['$status', 'active'] }
                    ]
                  }
                }
              }
            ],
            as: 'schedule'
          }
        },
        { $unwind: { path: '$schedule', preserveNullAndEmptyArrays: true } },
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
          $project: {
            user: {
              _id: '$userInfo._id',
              firstName: '$userInfo.firstName',
              lastName: '$userInfo.lastName',
              email: '$userInfo.email'
            },
            agency: {
              _id: '$agencyInfo._id',
              name: '$agencyInfo.name',
              code: '$agencyInfo.code'
            },
            scheduledTime: '$schedule.startTime',
            retardMinutes: {
              $cond: [
                { $ifNull: ['$schedule.startTime', false] },
                {
                  $floor: {
                    $divide: [
                      {
                        $subtract: [
                          new Date(),
                          {
                            $dateFromString: {
                              dateString: {
                                $concat: [
                                  { $dateToString: { format: '%Y-%m-%d', date: today } },
                                  'T',
                                  '$schedule.startTime',
                                  ':00Z'
                                ]
                              }
                            }
                          }
                        ]
                      },
                      60000 // millisecondes vers minutes
                    ]
                  }
                },
                0
              ]
            }
          }
        },
        {
          $match: {
            retardMinutes: { $gt: TIME_LIMITS.LATE_THRESHOLD_MINUTES }
          }
        },
        { $sort: { retardMinutes: -1 } },
        { $limit: parseInt(limit) }
      ]),

      // ⚠️ WARNING: Préparations qui dépassent 30min
      Preparation.find({
        status: 'in_progress',
        startTime: { 
          $lt: new Date(Date.now() - TIME_LIMITS.PREPARATION_MAX_MINUTES * 60 * 1000)
        }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code')
      .sort({ startTime: 1 })
      .limit(parseInt(limit)),

      // 📅 INFO: Absences non prévues (planning mais pas de pointage après 1h)
      Schedule.aggregate([
        {
          $match: {
            date: today,
            status: 'active'
          }
        },
        {
          $lookup: {
            from: 'timesheets',
            let: { userId: '$user', date: '$date' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$user', '$$userId'] },
                      { $eq: ['$date', '$$date'] }
                    ]
                  }
                }
              }
            ],
            as: 'timesheet'
          }
        },
        {
          $match: {
            timesheet: { $size: 0 } // Pas de pointage
          }
        },
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
          $project: {
            user: {
              _id: '$userInfo._id',
              firstName: '$userInfo.firstName',
              lastName: '$userInfo.lastName',
              email: '$userInfo.email'
            },
            agency: {
              _id: '$agencyInfo._id',
              name: '$agencyInfo.name',
              code: '$agencyInfo.code'
            },
            scheduledTime: '$startTime',
            retardEstime: {
              $floor: {
                $divide: [
                  {
                    $subtract: [
                      new Date(),
                      {
                        $dateFromString: {
                          dateString: {
                            $concat: [
                              { $dateToString: { format: '%Y-%m-%d', date: today } },
                              'T',
                              '$startTime',
                              ':00Z'
                            ]
                          }
                        }
                      }
                    ]
                  },
                  60000
                ]
              }
            }
          }
        },
        {
          $match: {
            retardEstime: { $gt: 60 } // Plus d'1h de retard
          }
        },
        { $sort: { retardEstime: -1 } },
        { $limit: parseInt(limit) }
      ]),

      // ⚠️ WARNING: Préparations qui stagnent (en cours depuis >15min sans activité)
      Preparation.find({
        status: 'in_progress',
        startTime: { 
          $lt: new Date(Date.now() - 15 * 60 * 1000), // >15min
          $gt: new Date(Date.now() - 2 * 60 * 60 * 1000) // <2h (pour éviter les très anciennes)
        },
        updatedAt: { 
          $lt: new Date(Date.now() - 10 * 60 * 1000) // Pas de mise à jour depuis 10min
        }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code')
      .sort({ updatedAt: 1 })
      .limit(10),

      // 🔧 INFO: Véhicules avec beaucoup d'incidents récents
      Preparation.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 derniers jours
            'issues.0': { $exists: true } // A des problèmes
          }
        },
        {
          $group: {
            _id: '$vehicle.licensePlate',
            vehicleInfo: { $first: '$vehicle' },
            totalIssues: { $sum: { $size: '$issues' } },
            totalPreparations: { $sum: 1 },
            lastIssue: { $max: '$createdAt' },
            agencies: { $addToSet: '$agency' }
          }
        },
        {
          $match: {
            totalIssues: { $gte: 3 } // Au moins 3 problèmes en 7 jours
          }
        },
        {
          $lookup: {
            from: 'agencies',
            localField: 'agencies',
            foreignField: '_id',
            as: 'agencyDetails'
          }
        },
        {
          $project: {
            vehicule: {
              licensePlate: '$_id',
              brand: '$vehicleInfo.brand',
              model: '$vehicleInfo.model'
            },
            totalIssues: 1,
            totalPreparations: 1,
            issueRate: {
              $round: [
                { $multiply: [{ $divide: ['$totalIssues', '$totalPreparations'] }, 100] },
                1
              ]
            },
            lastIssue: 1,
            agencies: { $slice: ['$agencyDetails.name', 3] }
          }
        },
        { $sort: { totalIssues: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Formater les alertes avec priorités et actions
    const alertes = [];

    // 🚨 Retards critiques
    retardsEnCours.forEach(retard => {
      if (priority === 'all' || priority === 'critical') {
        alertes.push({
          id: `retard_${retard.user._id}_${today.getTime()}`,
          type: 'retard_pointage',
          priority: retard.retardMinutes > 30 ? 'critical' : 'warning',
          severity: retard.retardMinutes > 30 ? 'error' : 'warning',
          title: `Retard de pointage - ${retard.user.firstName} ${retard.user.lastName}`,
          message: `${retard.retardMinutes} minutes de retard (prévu à ${retard.scheduledTime})`,
          data: {
            user: retard.user,
            agency: retard.agency,
            retardMinutes: retard.retardMinutes,
            scheduledTime: retard.scheduledTime
          },
          timestamp: new Date(),
          actionRequired: true,
          actions: [
            { type: 'call', label: 'Appeler', phone: retard.user.phone },
            { type: 'notify', label: 'Notifier équipe' },
            { type: 'reassign', label: 'Réassigner tâches' }
          ]
        });
      }
    });

    // ⚠️ Préparations dépassées
    preparationsDepassees.forEach(prep => {
      const dureeMinutes = Math.floor((new Date() - prep.startTime) / (1000 * 60));
      if (priority === 'all' || priority === 'warning') {
        alertes.push({
          id: `preparation_${prep._id}`,
          type: 'preparation_depassee',
          priority: dureeMinutes > 45 ? 'critical' : 'warning',
          severity: 'warning',
          title: `Préparation longue - ${prep.vehicle?.licensePlate || 'Véhicule'}`,
          message: `${dureeMinutes} minutes (limite: ${TIME_LIMITS.PREPARATION_MAX_MINUTES}min)`,
          data: {
            preparation: {
              id: prep._id,
              vehicule: prep.vehicle?.licensePlate || 'N/A',
              vehicleBrand: prep.vehicle?.brand,
              vehicleModel: prep.vehicle?.model
            },
            user: {
              _id: prep.user._id,
              firstName: prep.user.firstName,
              lastName: prep.user.lastName
            },
            agency: prep.agency,
            dureeMinutes,
            startTime: prep.startTime
          },
          timestamp: prep.startTime,
          actionRequired: true,
          actions: [
            { type: 'check', label: 'Vérifier progression' },
            { type: 'assist', label: 'Envoyer aide' },
            { type: 'report', label: 'Signaler problème' }
          ]
        });
      }
    });

    // 📅 Absences non prévues
    absencesNonPrevues.forEach(absence => {
      if (priority === 'all' || priority === 'info') {
        alertes.push({
          id: `absence_${absence.user._id}_${today.getTime()}`,
          type: 'absence_non_prevue',
          priority: 'info',
          severity: 'info',
          title: `Absence non justifiée - ${absence.user.firstName} ${absence.user.lastName}`,
          message: `Prévu à ${absence.scheduledTime}, absent depuis ${absence.retardEstime} minutes`,
          data: {
            user: absence.user,
            agency: absence.agency,
            scheduledTime: absence.scheduledTime,
            retardEstime: absence.retardEstime
          },
          timestamp: new Date(),
          actionRequired: false,
          actions: [
            { type: 'contact', label: 'Contacter' },
            { type: 'mark_absent', label: 'Marquer absent' },
            { type: 'reschedule', label: 'Replanifier' }
          ]
        });
      }
    });

    // ⚠️ Préparations stagnantes
    preparationsStagnantes.forEach(prep => {
      const dureeStagnation = Math.floor((new Date() - prep.updatedAt) / (1000 * 60));
      if (priority === 'all' || priority === 'warning') {
        alertes.push({
          id: `stagnation_${prep._id}`,
          type: 'preparation_stagnante',
          priority: 'warning',
          severity: 'warning',
          title: `Préparation inactive - ${prep.vehicle?.licensePlate || 'Véhicule'}`,
          message: `Aucune activité depuis ${dureeStagnation} minutes`,
          data: {
            preparation: {
              id: prep._id,
              vehicule: prep.vehicle?.licensePlate || 'N/A'
            },
            user: {
              _id: prep.user._id,
              firstName: prep.user.firstName,
              lastName: prep.user.lastName
            },
            agency: prep.agency,
            dureeStagnation,
            lastActivity: prep.updatedAt
          },
          timestamp: prep.updatedAt,
          actionRequired: true,
          actions: [
            { type: 'ping', label: 'Relancer préparateur' },
            { type: 'check_status', label: 'Vérifier statut' }
          ]
        });
      }
    });

    // 🔧 Véhicules problématiques
    vehiculesProblematiques.forEach(vehicule => {
      if (priority === 'all' || priority === 'info') {
        alertes.push({
          id: `vehicule_${vehicule.vehicule.licensePlate}`,
          type: 'vehicule_problematique',
          priority: 'info',
          severity: 'info',
          title: `Véhicule à surveiller - ${vehicule.vehicule.licensePlate}`,
          message: `${vehicule.totalIssues} incidents en 7 jours (${vehicule.issueRate}% des préparations)`,
          data: {
            vehicule: vehicule.vehicule,
            totalIssues: vehicule.totalIssues,
            totalPreparations: vehicule.totalPreparations,
            issueRate: vehicule.issueRate,
            lastIssue: vehicule.lastIssue,
            agencies: vehicule.agencies
          },
          timestamp: vehicule.lastIssue,
          actionRequired: false,
          actions: [
            { type: 'inspect', label: 'Programmer inspection' },
            { type: 'maintenance', label: 'Maintenance préventive' },
            { type: 'history', label: 'Voir historique' }
          ]
        });
      }
    });

    // Trier par priorité et timestamp
    const priorityOrder = { critical: 0, warning: 1, info: 2 };
    alertes.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Statistiques des alertes
    const stats = {
      total: alertes.length,
      critical: alertes.filter(a => a.priority === 'critical').length,
      warning: alertes.filter(a => a.priority === 'warning').length,
      info: alertes.filter(a => a.priority === 'info').length,
      actionRequired: alertes.filter(a => a.actionRequired).length
    };

    // Alertes système (logique métier)
    const alertesSysteme = [];
    
    if (stats.critical > 3) {
      alertesSysteme.push({
        type: 'system_overload',
        message: `${stats.critical} alertes critiques simultanées`,
        severity: 'error',
        timestamp: new Date()
      });
    }

    if (stats.warning > 10) {
      alertesSysteme.push({
        type: 'high_warning_count',
        message: `Nombre élevé d'alertes (${stats.warning})`,
        severity: 'warning',
        timestamp: new Date()
      });
    }

    // Suggestions automatiques
    const suggestions = [];
    
    if (retardsEnCours.length > 2) {
      suggestions.push({
        type: 'staffing',
        title: 'Renforcer les équipes',
        description: 'Plusieurs retards détectés, envisager du personnel supplémentaire',
        priority: 'medium'
      });
    }

    if (preparationsDepassees.length > 3) {
      suggestions.push({
        type: 'process_review',
        title: 'Revoir les processus',
        description: 'Temps de préparation systématiquement dépassés',
        priority: 'high'
      });
    }

    res.json({
      success: true,
      data: {
        alertes: alertes.slice(0, parseInt(limit)),
        statistiques: stats,
        alertesSysteme,
        suggestions,
        metadata: {
          filtres: { priority, limit, includeResolved },
          derniereMiseAJour: new Date(),
          prochaineMiseAJour: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
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
 * @route   POST /api/admin/dashboard/alerts/:id/resolve
 * @desc    Marquer une alerte comme résolue
 * @access  Admin
 */
router.post('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;

    // TODO: En production, stocker les résolutions en base
    // const resolvedAlert = new ResolvedAlert({
    //   alertId: id,
    //   resolvedBy: req.user.userId,
    //   resolution,
    //   notes,
    //   resolvedAt: new Date()
    // });
    // await resolvedAlert.save();

    console.log(`✅ Alerte ${id} résolue par ${req.user.email}: ${resolution}`);

    res.json({
      success: true,
      message: 'Alerte marquée comme résolue',
      data: {
        alertId: id,
        resolution,
        resolvedBy: req.user.email,
        resolvedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur résolution alerte:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/dashboard/alerts/stats
 * @desc    Statistiques des alertes sur une période
 * @access  Admin
 */
router.get('/stats', validateQuery(Joi.object({
  period: Joi.string().valid('today', 'week', 'month').default('today'),
  groupBy: Joi.string().valid('hour', 'day', 'type').default('hour')
})), async (req, res) => {
  try {
    const { period, groupBy } = req.query;
    
    // Calculer période
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // today
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }

    // TODO: Récupérer depuis une collection AlertHistory
    // Pour l'exemple, on simule avec les données actuelles
    const mockStats = {
      period: { startDate, endDate },
      totalAlertes: 47,
      parType: {
        retard_pointage: 15,
        preparation_depassee: 12,
        absence_non_prevue: 8,
        preparation_stagnante: 7,
        vehicule_problematique: 5
      },
      evolution: {
        retard_pointage: +12, // % vs période précédente
        preparation_depassee: -5,
        absence_non_prevue: +23
      },
      resolution: {
        resolues: 35,
        enCours: 12,
        tauxResolution: 74.5 // %
      }
    };

    res.json({
      success: true,
      data: mockStats
    });

  } catch (error) {
    console.error('Erreur stats alertes:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;