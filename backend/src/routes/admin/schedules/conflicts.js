// ===== backend/src/routes/admin/schedules/conflicts.js - VERSION CORRIGÉE =====
const express = require('express');
const Joi = require('joi'); // ✅ Import explicite de Joi
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery, validateBody, objectId } = require('../../../middleware/validation'); // ✅ Import validateBody
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

// ===== SCHÉMAS DE VALIDATION LOCAUX =====
const conflictQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userId: objectId.optional(),
  agencyId: objectId.optional(),
  severity: Joi.string().valid('all', 'critical', 'warning', 'info').default('all'),
  includeResolutions: Joi.boolean().default(true),
  autoFix: Joi.boolean().default(false)
});

const resolveConflictSchema = Joi.object({
  conflictIds: Joi.array().items(Joi.string()).min(1).required(),
  resolutionType: Joi.string().valid('auto', 'manual', 'postpone').required(),
  parameters: Joi.object().optional()
});

/**
 * @route   GET /api/admin/schedules/conflicts
 * @desc    Détecter et analyser les conflits de planning
 * @access  Admin
 */
router.get('/', validateQuery(conflictQuerySchema), async (req, res) => {
  try {
    const { startDate, endDate, userId, agencyId, severity, includeResolutions, autoFix } = req.query;
    
    // Dates par défaut (semaine courante + suivante)
    const defaultStartDate = startDate ? new Date(startDate) : (() => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    })();
    
    const defaultEndDate = endDate ? new Date(endDate) : (() => {
      const date = new Date(defaultStartDate);
      date.setDate(date.getDate() + 14); // 2 semaines
      date.setHours(23, 59, 59, 999);
      return date;
    })();
    
    // Construire les filtres
    const filters = {
      date: { $gte: defaultStartDate, $lte: defaultEndDate },
      status: 'active'
    };
    
    if (userId) filters.user = userId;
    if (agencyId) filters.agency = agencyId;
    
    // Récupérer tous les plannings de la période
    const schedules = await Schedule.find(filters)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client')
      .sort({ date: 1, startTime: 1 });
    
    const conflicts = [];
    const autoFixResults = [];
    
    // 1. DÉTECTER CONFLITS UTILISATEUR (double booking et chevauchements)
    const userConflicts = await detectUserConflicts(schedules);
    conflicts.push(...userConflicts);
    
    // 2. DÉTECTER SURCHARGE HEBDOMADAIRE
    const overworkConflicts = await detectOverworkConflicts(schedules);
    conflicts.push(...overworkConflicts);
    
    // 3. DÉTECTER CONFLITS D'AGENCE (sous-couverture)
    const agencyConflicts = await detectAgencyConflicts(schedules, defaultStartDate, defaultEndDate);
    conflicts.push(...agencyConflicts);
    
    // 4. DÉTECTER CONFLITS DE PAUSE
    const breakConflicts = await detectBreakConflicts(schedules);
    conflicts.push(...breakConflicts);
    
    // Filtrer par sévérité si demandé
    const filteredConflicts = severity === 'all' ? 
      conflicts : 
      conflicts.filter(c => c.severity === severity);
    
    // Calculer les statistiques
    const stats = calculateConflictStats(conflicts);
    
    // Générer les résolutions possibles
    const resolutions = includeResolutions ? 
      await generateResolutions(filteredConflicts) : 
      [];
    
    // Auto-fix si demandé
    if (autoFix) {
      for (const conflict of filteredConflicts.filter(c => c.autoFixable)) {
        try {
          const fixResult = await autoFixConflict(conflict, req.user.userId);
          autoFixResults.push(fixResult);
        } catch (error) {
          console.error('Erreur auto-fix:', error);
        }
      }
    }
    
    // Générer les priorités d'action
    const priorities = generatePriorities(filteredConflicts);
    
    res.json({
      success: true,
      data: {
        conflicts: filteredConflicts.map(conflict => ({
          id: conflict.id,
          type: conflict.type,
          severity: conflict.severity,
          message: conflict.message,
          affectedSchedules: conflict.schedules,
          users: conflict.users,
          agencies: conflict.agencies,
          details: conflict.details,
          autoFixable: conflict.autoFixable,
          createdAt: conflict.createdAt || new Date()
        })),
        resolutions: includeResolutions ? resolutions : undefined,
        autoFixResults: autoFix ? autoFixResults : undefined,
        statistics: stats,
        priorities,
        recommendations: generateRecommendations(stats, filteredConflicts),
        metadata: {
          totalSchedulesAnalyzed: schedules.length,
          conflictRate: schedules.length > 0 ? Math.round((conflicts.length / schedules.length) * 100) : 0,
          severityDistribution: stats.bySeverity,
          generatedAt: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Erreur détection conflits:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   POST /api/admin/schedules/conflicts/resolve
 * @desc    Résoudre automatiquement certains conflits
 * @access  Admin
 */
router.post('/resolve', validateBody(resolveConflictSchema), async (req, res) => {
  try {
    const { conflictIds, resolutionType, parameters = {} } = req.body;
    
    const results = {
      resolved: 0,
      failed: 0,
      details: []
    };
    
    // Simuler la résolution de conflits
    for (const conflictId of conflictIds) {
      try {
        const resolutionResult = await resolveConflictById(conflictId, resolutionType, parameters, req.user.userId);
        
        if (resolutionResult.success) {
          results.resolved++;
          results.details.push({
            conflictId,
            status: 'resolved',
            action: resolutionResult.action,
            message: resolutionResult.message
          });
        } else {
          results.failed++;
          results.details.push({
            conflictId,
            status: 'failed',
            error: resolutionResult.error
          });
        }
        
      } catch (error) {
        results.failed++;
        results.details.push({
          conflictId,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Résolution terminée: ${results.resolved} résolus, ${results.failed} échecs`,
      data: results
    });

  } catch (error) {
    console.error('Erreur résolution conflits:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Détecter les conflits d'utilisateur (double booking)
 */
async function detectUserConflicts(schedules) {
  const conflicts = [];
  const userSchedulesByDate = {};
  
  // Grouper par utilisateur et date
  schedules.forEach(schedule => {
    const userId = schedule.user._id.toString();
    const dateKey = schedule.date.toISOString().split('T')[0];
    const key = `${userId}_${dateKey}`;
    
    if (!userSchedulesByDate[key]) {
      userSchedulesByDate[key] = [];
    }
    userSchedulesByDate[key].push(schedule);
  });
  
  // Détecter les conflits
  Object.entries(userSchedulesByDate).forEach(([key, userSchedules]) => {
    if (userSchedules.length > 1) {
      const [userId, date] = key.split('_');
      
      for (let i = 0; i < userSchedules.length; i++) {
        for (let j = i + 1; j < userSchedules.length; j++) {
          const schedule1 = userSchedules[i];
          const schedule2 = userSchedules[j];
          
          // Vérifier chevauchement horaire
          const overlap = checkTimeOverlap(
            schedule1.startTime, schedule1.endTime,
            schedule2.startTime, schedule2.endTime
          );
          
          if (overlap) {
            conflicts.push({
              id: `user_conflict_${schedule1._id}_${schedule2._id}`,
              type: 'user_double_booking',
              severity: 'critical',
              message: `${schedule1.user.firstName} ${schedule1.user.lastName} a des plannings qui se chevauchent`,
              schedules: [schedule1._id, schedule2._id],
              users: [schedule1.user],
              agencies: [schedule1.agency, schedule2.agency],
              details: {
                date,
                overlap,
                schedule1: {
                  agency: schedule1.agency.name,
                  time: `${schedule1.startTime}-${schedule1.endTime}`
                },
                schedule2: {
                  agency: schedule2.agency.name,
                  time: `${schedule2.startTime}-${schedule2.endTime}`
                }
              },
              autoFixable: false
            });
          }
        }
      }
    }
  });
  
  return conflicts;
}

/**
 * Détecter les surcharges hebdomadaires
 */
async function detectOverworkConflicts(schedules) {
  const conflicts = [];
  const userWeeklyHours = {};
  
  schedules.forEach(schedule => {
    const userId = schedule.user._id.toString();
    const weekStart = getWeekStart(schedule.date);
    const weekKey = `${userId}_${weekStart.toISOString().split('T')[0]}`;
    
    if (!userWeeklyHours[weekKey]) {
      userWeeklyHours[weekKey] = {
        user: schedule.user,
        weekStart,
        schedules: [],
        totalHours: 0
      };
    }
    
    const workingHours = calculateWorkingHours(
      schedule.startTime, 
      schedule.endTime, 
      schedule.breakStart, 
      schedule.breakEnd
    );
    
    userWeeklyHours[weekKey].schedules.push(schedule);
    userWeeklyHours[weekKey].totalHours += workingHours;
  });
  
  // Détecter les surcharges (>35h par semaine)
  Object.entries(userWeeklyHours).forEach(([key, data]) => {
    if (data.totalHours > 35) {
      conflicts.push({
        id: `overwork_${key}`,
        type: 'weekly_overwork',
        severity: data.totalHours > 48 ? 'critical' : 'warning',
        message: `${data.user.firstName} ${data.user.lastName} dépasse les heures autorisées (${Math.round(data.totalHours)}h/semaine)`,
        schedules: data.schedules.map(s => s._id),
        users: [data.user],
        agencies: [...new Set(data.schedules.map(s => s.agency))],
        details: {
          weekStart: data.weekStart,
          totalHours: Math.round(data.totalHours * 10) / 10,
          maxAllowed: 35,
          excess: Math.round((data.totalHours - 35) * 10) / 10
        },
        autoFixable: true
      });
    }
  });
  
  return conflicts;
}

/**
 * Détecter les conflits d'agence (sous-couverture)
 */
async function detectAgencyConflicts(schedules, startDate, endDate) {
  const conflicts = [];
  const agencyCoverage = {};
  
  // Analyser la couverture par agence
  schedules.forEach(schedule => {
    const agencyId = schedule.agency._id.toString();
    const dateKey = schedule.date.toISOString().split('T')[0];
    
    if (!agencyCoverage[agencyId]) {
      agencyCoverage[agencyId] = {
        agency: schedule.agency,
        dates: {},
        totalDays: 0
      };
    }
    
    if (!agencyCoverage[agencyId].dates[dateKey]) {
      agencyCoverage[agencyId].dates[dateKey] = [];
      agencyCoverage[agencyId].totalDays++;
    }
    
    agencyCoverage[agencyId].dates[dateKey].push(schedule);
  });
  
  // Calculer le nombre total de jours dans la période
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Détecter la sous-couverture
  Object.entries(agencyCoverage).forEach(([agencyId, data]) => {
    const coverageRate = (data.totalDays / totalDays) * 100;
    
    if (coverageRate < 70) { // Moins de 70% de couverture
      conflicts.push({
        id: `agency_coverage_${agencyId}`,
        type: 'agency_undercoverage',
        severity: coverageRate < 50 ? 'critical' : 'warning',
        message: `Agence ${data.agency.name} sous-couverte (${Math.round(coverageRate)}% des jours)`,
        schedules: [],
        users: [],
        agencies: [data.agency],
        details: {
          coverageRate: Math.round(coverageRate),
          daysWithCoverage: data.totalDays,
          totalDays,
          missingDays: totalDays - data.totalDays
        },
        autoFixable: false
      });
    }
  });
  
  return conflicts;
}

/**
 * Détecter les conflits de pause
 */
async function detectBreakConflicts(schedules) {
  const conflicts = [];
  
  schedules.forEach(schedule => {
    if (schedule.breakStart && schedule.breakEnd) {
      const workingHours = calculateWorkingHours(
        schedule.startTime, 
        schedule.endTime, 
        schedule.breakStart, 
        schedule.breakEnd
      );
      
      // Pause trop courte pour une journée longue
      const breakDuration = timeToMinutes(schedule.breakEnd) - timeToMinutes(schedule.breakStart);
      
      if (workingHours > 6 && breakDuration < 30) {
        conflicts.push({
          id: `break_short_${schedule._id}`,
          type: 'break_too_short',
          severity: 'warning',
          message: `Pause trop courte pour ${schedule.user.firstName} ${schedule.user.lastName} (${breakDuration}min)`,
          schedules: [schedule._id],
          users: [schedule.user],
          agencies: [schedule.agency],
          details: {
            breakDuration,
            recommendedMinimum: 30,
            workingHours: Math.round(workingHours)
          },
          autoFixable: true
        });
      }
    }
  });
  
  return conflicts;
}

/**
 * Vérifier si deux créneaux horaires se chevauchent
 */
function checkTimeOverlap(start1, end1, start2, end2) {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);
  
  const overlapStart = Math.max(start1Minutes, start2Minutes);
  const overlapEnd = Math.min(end1Minutes, end2Minutes);
  
  if (overlapStart < overlapEnd) {
    return {
      start: minutesToTime(overlapStart),
      end: minutesToTime(overlapEnd),
      duration: overlapEnd - overlapStart
    };
  }
  
  return null;
}

/**
 * Convertir un horaire en minutes depuis minuit
 */
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
}

/**
 * Convertir des minutes en format HH:mm
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculer les heures de travail effectives
 */
function calculateWorkingHours(startTime, endTime, breakStart, breakEnd) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  let workingMinutes = end - start;
  
  if (breakStart && breakEnd) {
    const breakStartMinutes = timeToMinutes(breakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);
    workingMinutes -= (breakEndMinutes - breakStartMinutes);
  }
  
  return Math.max(0, workingMinutes / 60);
}

/**
 * Obtenir le début de semaine (lundi)
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi
  return new Date(d.setDate(diff));
}

/**
 * Calculer les statistiques des conflits
 */
function calculateConflictStats(conflicts) {
  const stats = {
    total: conflicts.length,
    bySeverity: {
      critical: conflicts.filter(c => c.severity === 'critical').length,
      warning: conflicts.filter(c => c.severity === 'warning').length,
      info: conflicts.filter(c => c.severity === 'info').length
    },
    byType: {},
    autoFixable: conflicts.filter(c => c.autoFixable).length
  };
  
  // Compter par type
  conflicts.forEach(conflict => {
    stats.byType[conflict.type] = (stats.byType[conflict.type] || 0) + 1;
  });
  
  return stats;
}

/**
 * Générer les résolutions possibles
 */
async function generateResolutions(conflicts) {
  const resolutions = [];
  
  conflicts.forEach(conflict => {
    switch (conflict.type) {
      case 'user_double_booking':
        resolutions.push({
          conflictId: conflict.id,
          type: 'reschedule',
          description: 'Reprogrammer l\'un des plannings',
          autoApplicable: false
        });
        break;
        
      case 'weekly_overwork':
        resolutions.push({
          conflictId: conflict.id,
          type: 'reduce_hours',
          description: 'Réduire les heures ou redistribuer',
          autoApplicable: true
        });
        break;
        
      case 'break_too_short':
        resolutions.push({
          conflictId: conflict.id,
          type: 'extend_break',
          description: 'Prolonger la pause à 30 minutes minimum',
          autoApplicable: true
        });
        break;
    }
  });
  
  return resolutions;
}

/**
 * Générer les priorités d'action
 */
function generatePriorities(conflicts) {
  const critical = conflicts.filter(c => c.severity === 'critical');
  const warning = conflicts.filter(c => c.severity === 'warning');
  
  return {
    immediate: critical.slice(0, 3),
    thisWeek: warning.slice(0, 5),
    planned: conflicts.filter(c => c.autoFixable).slice(0, 10)
  };
}

/**
 * Générer les recommandations
 */
function generateRecommendations(stats, conflicts) {
  const recommendations = [];
  
  if (stats.bySeverity.critical > 0) {
    recommendations.push({
      type: 'urgent',
      message: `${stats.bySeverity.critical} conflit(s) critique(s) nécessitent une attention immédiate`,
      action: 'Résoudre en priorité les doubles plannings'
    });
  }
  
  if (stats.autoFixable > 0) {
    recommendations.push({
      type: 'automation',
      message: `${stats.autoFixable} conflit(s) peuvent être résolus automatiquement`,
      action: 'Utiliser la résolution automatique'
    });
  }
  
  return recommendations;
}

/**
 * Résoudre un conflit par ID (simulation)
 */
async function resolveConflictById(conflictId, resolutionType, parameters, userId) {
  // Simulation de résolution
  return {
    success: true,
    action: resolutionType,
    message: `Conflit ${conflictId} résolu par ${resolutionType}`
  };
}

/**
 * Auto-fix d'un conflit (simulation)
 */
async function autoFixConflict(conflict, userId) {
  // Simulation d'auto-fix
  return {
    conflictId: conflict.id,
    success: true,
    action: 'auto_resolved',
    message: `Conflit ${conflict.type} résolu automatiquement`
  };
}

module.exports = router;