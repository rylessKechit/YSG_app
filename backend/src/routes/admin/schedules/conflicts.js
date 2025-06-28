// ===== backend/src/routes/admin/schedules/conflicts.js =====
const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/schedules/conflicts
 * @desc    Détecter et analyser les conflits de planning
 * @access  Admin
 */
router.get('/', validateQuery(Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userId: objectId.optional(),
  agencyId: objectId.optional(),
  severity: Joi.string().valid('all', 'critical', 'warning', 'info').default('all'),
  includeResolutions: Joi.boolean().default(true),
  autoFix: Joi.boolean().default(false)
})), async (req, res) => {
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
    const resolutions = [];
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
    
    // 4. DÉTECTER CONFLITS DE TEMPS DE PAUSE
    const breakConflicts = await detectBreakConflicts(schedules);
    conflicts.push(...breakConflicts);
    
    // Filtrer par sévérité
    const filteredConflicts = severity === 'all' ? 
      conflicts : 
      conflicts.filter(c => c.severity === severity);
    
    // 5. GÉNÉRER RÉSOLUTIONS SI DEMANDÉ
    if (includeResolutions) {
      for (const conflict of filteredConflicts) {
        const resolution = await generateConflictResolution(conflict, schedules);
        if (resolution) resolutions.push(resolution);
      }
    }
    
    // 6. AUTO-FIX SI DEMANDÉ (seulement pour conflits mineurs)
    if (autoFix) {
      for (const conflict of filteredConflicts) {
        if (conflict.severity === 'info' && conflict.autoFixable) {
          const fixResult = await attemptAutoFix(conflict);
          if (fixResult.success) {
            autoFixResults.push(fixResult);
          }
        }
      }
    }
    
    // Statistiques
    const stats = calculateConflictStats(conflicts);
    
    // Priorités et recommandations
    const priorities = generatePriorities(filteredConflicts);

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
          totalDays: Math.ceil((defaultEndDate - defaultStartDate) / (1000 * 60 * 60 * 24))
        },
        conflicts: filteredConflicts.sort((a, b) => {
          // Trier par sévérité puis par date
          const severityOrder = { critical: 0, warning: 1, info: 2 };
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[a.severity] - severityOrder[b.severity];
          }
          return new Date(a.date || a.week || a.timestamp) - new Date(b.date || b.week || b.timestamp);
        }),
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
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/schedules/conflicts/resolve
 * @desc    Résoudre automatiquement certains conflits
 * @access  Admin
 */
router.post('/resolve', validateBody(Joi.object({
  conflictIds: Joi.array().items(Joi.string()).min(1).required(),
  resolutionType: Joi.string().valid('auto', 'manual', 'postpone').required(),
  parameters: Joi.object().optional()
})), async (req, res) => {
  try {
    const { conflictIds, resolutionType, parameters = {} } = req.body;
    
    const results = {
      resolved: 0,
      failed: 0,
      details: []
    };
    
    // Re-détecter les conflits pour les IDs spécifiés
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
      message: `${results.resolved} conflit(s) résolu(s), ${results.failed} échec(s)`,
      data: results
    });

  } catch (error) {
    console.error('Erreur résolution conflits:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ===== FONCTIONS UTILITAIRES =====

/**
 * Détecter conflits utilisateur (double booking et chevauchements)
 */
async function detectUserConflicts(schedules) {
  const conflicts = [];
  
  // Grouper par utilisateur et date
  const userSchedules = {};
  schedules.forEach(schedule => {
    const userId = schedule.user._id.toString();
    const dateKey = schedule.date.toISOString().split('T')[0];
    
    if (!userSchedules[userId]) userSchedules[userId] = {};
    if (!userSchedules[userId][dateKey]) userSchedules[userId][dateKey] = [];
    
    userSchedules[userId][dateKey].push(schedule);
  });
  
  // Analyser les conflits par utilisateur
  Object.keys(userSchedules).forEach(userId => {
    Object.keys(userSchedules[userId]).forEach(date => {
      const daySchedules = userSchedules[userId][date];
      
      if (daySchedules.length > 1) {
        // Multiple plannings même jour
        conflicts.push({
          id: `user_multiple_${userId}_${date}`,
          type: 'user_multiple_schedules',
          severity: 'warning',
          userId: userId,
          userName: `${daySchedules[0].user.firstName} ${daySchedules[0].user.lastName}`,
          date: date,
          description: `${daySchedules[0].user.firstName} ${daySchedules[0].user.lastName} planifié ${daySchedules.length} fois le ${new Date(date).toLocaleDateString('fr-FR')}`,
          schedules: daySchedules.map(s => ({
            id: s._id,
            agency: s.agency.name,
            startTime: s.startTime,
            endTime: s.endTime
          })),
          autoFixable: false
        });
        
        // Vérifier chevauchements horaires
        for (let i = 0; i < daySchedules.length - 1; i++) {
          for (let j = i + 1; j < daySchedules.length; j++) {
            const schedule1 = daySchedules[i];
            const schedule2 = daySchedules[j];
            
            if (timesOverlap(schedule1, schedule2)) {
              conflicts.push({
                id: `time_overlap_${schedule1._id}_${schedule2._id}`,
                type: 'time_overlap',
                severity: 'critical',
                userId: userId,
                userName: `${schedule1.user.firstName} ${schedule1.user.lastName}`,
                date: date,
                description: `Chevauchement horaire entre ${schedule1.agency.name} (${schedule1.startTime}-${schedule1.endTime}) et ${schedule2.agency.name} (${schedule2.startTime}-${schedule2.endTime})`,
                details: {
                  schedule1: {
                    id: schedule1._id,
                    agency: schedule1.agency.name,
                    time: `${schedule1.startTime}-${schedule1.endTime}`
                  },
                  schedule2: {
                    id: schedule2._id,
                    agency: schedule2.agency.name,
                    time: `${schedule2.startTime}-${schedule2.endTime}`
                  },
                  overlapMinutes: calculateOverlapMinutes(schedule1, schedule2)
                },
                autoFixable: false
              });
            }
          }
        }
      }
    });
  });
  
  return conflicts;
}

/**
 * Détecter surcharge hebdomadaire
 */
async function detectOverworkConflicts(schedules) {
  const conflicts = [];
  
  // Grouper par utilisateur et semaine
  const weeklyHours = {};
  schedules.forEach(schedule => {
    const userId = schedule.user._id.toString();
    const weekStart = new Date(schedule.date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Lundi
    const weekKey = `${userId}_${weekStart.toISOString().split('T')[0]}`;
    
    if (!weeklyHours[weekKey]) {
      weeklyHours[weekKey] = {
        userId,
        userName: `${schedule.user.firstName} ${schedule.user.lastName}`,
        weekStart,
        totalMinutes: 0,
        schedules: []
      };
    }
    
    weeklyHours[weekKey].totalMinutes += schedule.workingDuration || 0;
    weeklyHours[weekKey].schedules.push(schedule);
  });
  
  Object.values(weeklyHours).forEach(week => {
    const totalHours = week.totalMinutes / 60;
    
    if (totalHours > 35) {
      conflicts.push({
        id: `overwork_${week.userId}_${week.weekStart.toISOString().split('T')[0]}`,
        type: 'weekly_overwork',
        severity: totalHours > 42 ? 'critical' : 'warning',
        userId: week.userId,
        userName: week.userName,
        week: week.weekStart.toISOString().split('T')[0],
        description: `${week.userName} programmé ${totalHours.toFixed(1)}h la semaine du ${week.weekStart.toLocaleDateString('fr-FR')} (limite: 35h)`,
        details: {
          totalHours: totalHours.toFixed(1),
          excessHours: (totalHours - 35).toFixed(1),
          schedulesCount: week.schedules.length,
          schedules: week.schedules.map(s => ({
            id: s._id,
            date: s.date,
            agency: s.agency.name,
            duration: s.workingDuration
          }))
        },
        autoFixable: totalHours <= 40 // Auto-fixable si pas trop de dépassement
      });
    }
  });
  
  return conflicts;
}

/**
 * Détecter conflits d'agence (sous-couverture)
 */
async function detectAgencyConflicts(schedules, startDate, endDate) {
  const conflicts = [];
  
  // Analyser la couverture par agence et par jour
  const agencyCoverage = {};
  const agencies = [...new Set(schedules.map(s => s.agency._id.toString()))];
  
  // Pour chaque agence, vérifier la couverture quotidienne
  for (const agencyId of agencies) {
    const agencySchedules = schedules.filter(s => s.agency._id.toString() === agencyId);
    const agencyName = agencySchedules[0].agency.name;
    
    // Analyser jour par jour
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const daySchedules = agencySchedules.filter(s => 
        s.date.toISOString().split('T')[0] === dateKey
      );
      
      // Calculer les heures de couverture
      const coverage = calculateDayCoverage(daySchedules);
      
      if (coverage.percentage < 50 && !isWeekend(currentDate)) { // Seuil: 50% de couverture minimum
        conflicts.push({
          id: `agency_undercoverage_${agencyId}_${dateKey}`,
          type: 'agency_undercoverage',
          severity: coverage.percentage < 25 ? 'critical' : 'warning',
          agencyId: agencyId,
          agencyName: agencyName,
          date: dateKey,
          description: `${agencyName} sous-couverte le ${currentDate.toLocaleDateString('fr-FR')} (${coverage.percentage}% de couverture)`,
          details: {
            coveragePercentage: coverage.percentage,
            scheduledHours: coverage.totalHours,
            expectedHours: 8, // Heure d'ouverture standard
            gap: 8 - coverage.totalHours
          },
          autoFixable: true // Peut être résolu en réassignant
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return conflicts;
}

/**
 * Détecter conflits de temps de pause
 */
async function detectBreakConflicts(schedules) {
  const conflicts = [];
  
  schedules.forEach(schedule => {
    if (schedule.breakStart && schedule.breakEnd) {
      const workingMinutes = schedule.workingDuration || 0;
      const breakStart = timeToMinutes(schedule.breakStart);
      const breakEnd = timeToMinutes(schedule.breakEnd);
      const startTime = timeToMinutes(schedule.startTime);
      const endTime = timeToMinutes(schedule.endTime);
      
      // Pause trop courte (< 30min pour journée > 6h)
      if (workingMinutes > 6 * 60 && (breakEnd - breakStart) < 30) {
        conflicts.push({
          id: `short_break_${schedule._id}`,
          type: 'insufficient_break',
          severity: 'info',
          userId: schedule.user._id.toString(),
          userName: `${schedule.user.firstName} ${schedule.user.lastName}`,
          date: schedule.date.toISOString().split('T')[0],
          description: `Pause trop courte pour ${schedule.user.firstName} ${schedule.user.lastName} (${breakEnd - breakStart}min)`,
          details: {
            scheduleId: schedule._id,
            breakDuration: breakEnd - breakStart,
            workingHours: Math.round(workingMinutes / 60),
            recommendedBreak: 30
          },
          autoFixable: true
        });
      }
      
      // Pause en dehors des heures de travail
      if (breakStart < startTime || breakEnd > endTime) {
        conflicts.push({
          id: `break_outside_work_${schedule._id}`,
          type: 'break_outside_work_hours',
          severity: 'warning',
          userId: schedule.user._id.toString(),
          userName: `${schedule.user.firstName} ${schedule.user.lastName}`,
          date: schedule.date.toISOString().split('T')[0],
          description: `Pause en dehors des heures de travail pour ${schedule.user.firstName} ${schedule.user.lastName}`,
          details: {
            scheduleId: schedule._id,
            workTime: `${schedule.startTime}-${schedule.endTime}`,
            breakTime: `${schedule.breakStart}-${schedule.breakEnd}`
          },
          autoFixable: true
        });
      }
    }
  });
  
  return conflicts;
}

/**
 * Calculer les statistiques des conflits
 */
function calculateConflictStats(conflicts) {
  return {
    total: conflicts.length,
    byType: conflicts.reduce((acc, conflict) => {
      acc[conflict.type] = (acc[conflict.type] || 0) + 1;
      return acc;
    }, {}),
    bySeverity: {
      critical: conflicts.filter(c => c.severity === 'critical').length,
      warning: conflicts.filter(c => c.severity === 'warning').length,
      info: conflicts.filter(c => c.severity === 'info').length
    },
    autoFixable: conflicts.filter(c => c.autoFixable).length,
    affectedUsers: [...new Set(conflicts.map(c => c.userId).filter(Boolean))].length,
    affectedAgencies: [...new Set(conflicts.map(c => c.agencyId).filter(Boolean))].length
  };
}

/**
 * Générer des priorités d'action
 */
function generatePriorities(conflicts) {
  const critical = conflicts.filter(c => c.severity === 'critical');
  const warning = conflicts.filter(c => c.severity === 'warning');
  
  return {
    immediate: critical.length > 0 ? [
      `${critical.length} conflit(s) critique(s) nécessitent une action immédiate`,
      ...critical.slice(0, 3).map(c => c.description)
    ] : [],
    shortTerm: warning.length > 0 ? [
      `${warning.length} conflit(s) d'avertissement à traiter sous 24h`
    ] : [],
    preventive: [
      'Vérifier la planification pour la semaine suivante',
      'Optimiser la répartition des charges de travail'
    ]
  };
}

/**
 * Générer des recommandations
 */
function generateRecommendations(stats, conflicts) {
  const recommendations = [];
  
  if (stats.bySeverity.critical > 0) {
    recommendations.push({
      type: 'urgent',
      message: 'Résoudre immédiatement les conflits critiques',
      action: 'resolve_critical'
    });
  }
  
  if (stats.autoFixable > 0) {
    recommendations.push({
      type: 'automation',
      message: `${stats.autoFixable} conflit(s) peuvent être résolus automatiquement`,
      action: 'auto_fix'
    });
  }
  
  if (stats.affectedUsers > 5) {
    recommendations.push({
      type: 'process',
      message: 'Revoir le processus de planification (trop d\'utilisateurs affectés)',
      action: 'review_process'
    });
  }
  
  return recommendations;
}

/**
 * Vérifier si deux créneaux horaires se chevauchent
 */
function timesOverlap(schedule1, schedule2) {
  const start1 = timeToMinutes(schedule1.startTime);
  const end1 = timeToMinutes(schedule1.endTime);
  const start2 = timeToMinutes(schedule2.startTime);
  const end2 = timeToMinutes(schedule2.endTime);
  
  return start1 < end2 && end1 > start2;
}

/**
 * Calculer le chevauchement en minutes
 */
function calculateOverlapMinutes(schedule1, schedule2) {
  const start1 = timeToMinutes(schedule1.startTime);
  const end1 = timeToMinutes(schedule1.endTime);
  const start2 = timeToMinutes(schedule2.startTime);
  const end2 = timeToMinutes(schedule2.endTime);
  
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  
  return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Calculer la couverture d'une journée
 */
function calculateDayCoverage(daySchedules) {
  if (daySchedules.length === 0) {
    return { percentage: 0, totalHours: 0 };
  }
  
  const totalMinutes = daySchedules.reduce((sum, s) => sum + (s.workingDuration || 0), 0);
  const totalHours = totalMinutes / 60;
  const expectedHours = 8; // Journée type 8h
  
  return {
    percentage: Math.round((totalHours / expectedHours) * 100),
    totalHours: totalHours
  };
}

/**
 * Convertir heure en minutes
 */
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Vérifier si c'est un weekend
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// TODO: Implémenter les autres fonctions de résolution
async function generateConflictResolution(conflict, schedules) {
  // À implémenter selon le type de conflit
  return null;
}

async function attemptAutoFix(conflict) {
  // À implémenter pour les auto-fix
  return { success: false };
}

async function resolveConflictById(conflictId, resolutionType, parameters, userId) {
  // À implémenter pour résolution manuelle
  return { success: false };
}

module.exports = router;