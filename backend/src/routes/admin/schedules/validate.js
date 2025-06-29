// ===== backend/src/routes/admin/schedules/validate.js - FICHIER COMPLET =====
const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMA DE VALIDATION =====
const validateScheduleSchema = Joi.object({
  userId: objectId.required(),
  agencyId: objectId.required(),
  date: Joi.date().iso().required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  breakStart: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(''),
  breakEnd: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(''),
  notes: Joi.string().optional().allow(''),
  excludeScheduleId: objectId.optional() // Pour exclure un planning lors de la modification
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/schedules/validate
 * @desc    Valider un planning et détecter les conflits
 * @access  Admin
 */
router.post('/', validateBody(validateScheduleSchema), async (req, res) => {
  try {
    const { 
      userId, 
      agencyId, 
      date, 
      startTime, 
      endTime, 
      breakStart, 
      breakEnd, 
      notes,
      excludeScheduleId 
    } = req.body;

    console.log('🔍 Validation planning:', { userId, agencyId, date, startTime, endTime });

    // Vérifier que l'utilisateur existe et appartient à l'agence
    const [user, agency] = await Promise.all([
      User.findById(userId),
      Agency.findById(agencyId)
    ]);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Utilisateur non trouvé',
        data: {
          isValid: false,
          conflicts: [{
            type: 'user_not_found',
            severity: 'critical',
            message: 'Utilisateur non trouvé'
          }],
          warnings: [],
          suggestions: []
        }
      });
    }

    if (!agency) {
      return res.status(400).json({
        success: false,
        message: 'Agence non trouvée',
        data: {
          isValid: false,
          conflicts: [{
            type: 'agency_not_found',
            severity: 'critical',
            message: 'Agence non trouvée'
          }],
          warnings: [],
          suggestions: []
        }
      });
    }

    // Vérifier que l'utilisateur appartient à cette agence
    const userBelongsToAgency = user.agencies.some(
      userAgency => userAgency.toString() === agencyId.toString()
    );

    if (!userBelongsToAgency) {
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur n\'appartient pas à cette agence',
        data: {
          isValid: false,
          conflicts: [{
            type: 'user_agency_mismatch',
            severity: 'critical',
            message: `${user.firstName} ${user.lastName} n'est pas assigné à l'agence ${agency.name}`
          }],
          warnings: [],
          suggestions: []
        }
      });
    }

    // Détecter les conflits de planning
    const conflicts = await detectScheduleConflicts({
      userId,
      agencyId,
      date: new Date(date),
      startTime,
      endTime,
      breakStart,
      breakEnd,
      excludeScheduleId
    });

    // Détecter les avertissements (non bloquants)
    const warnings = await detectScheduleWarnings({
      userId,
      agencyId,
      date: new Date(date),
      startTime,
      endTime,
      breakStart,
      breakEnd
    });

    // Générer des suggestions d'amélioration
    const suggestions = generateScheduleSuggestions({
      startTime,
      endTime,
      breakStart,
      breakEnd,
      conflicts,
      warnings
    });

    const isValid = conflicts.length === 0;

    res.json({
      success: true,
      data: {
        isValid,
        conflicts,
        warnings,
        suggestions,
        validation: {
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          },
          agency: {
            id: agency._id,
            name: agency.name,
            code: agency.code
          },
          schedule: {
            date,
            startTime,
            endTime,
            breakStart,
            breakEnd,
            workingHours: calculateWorkingHours(startTime, endTime, breakStart, breakEnd)
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur validation planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur',
      data: {
        isValid: false,
        conflicts: [],
        warnings: [],
        suggestions: []
      }
    });
  }
});

/**
 * Détecter les conflits de planning
 */
async function detectScheduleConflicts({ userId, agencyId, date, startTime, endTime, breakStart, breakEnd, excludeScheduleId }) {
  const conflicts = [];
  
  try {
    // Rechercher les plannings existants pour le même utilisateur le même jour
    const query = {
      user: userId,
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lte: new Date(date.setHours(23, 59, 59, 999))
      },
      status: 'active'
    };

    // Exclure le planning en cours de modification
    if (excludeScheduleId) {
      query._id = { $ne: excludeScheduleId };
    }

    const existingSchedules = await Schedule.find(query)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code');

    // Vérifier les chevauchements d'horaires
    for (const existingSchedule of existingSchedules) {
      const overlap = checkTimeOverlap(
        startTime, endTime,
        existingSchedule.startTime, existingSchedule.endTime
      );

      if (overlap) {
        conflicts.push({
          type: 'time_overlap',
          severity: 'critical',
          message: `Conflit d'horaire avec un planning existant (${existingSchedule.startTime} - ${existingSchedule.endTime})`,
          scheduleId: existingSchedule._id,
          conflictDetails: {
            existingSchedule: {
              id: existingSchedule._id,
              startTime: existingSchedule.startTime,
              endTime: existingSchedule.endTime,
              agency: existingSchedule.agency.name
            },
            overlap: overlap
          }
        });
      }
    }

    // Vérifier la cohérence des horaires
    if (!isValidTimeRange(startTime, endTime)) {
      conflicts.push({
        type: 'invalid_time_range',
        severity: 'critical',
        message: 'L\'heure de fin doit être après l\'heure de début'
      });
    }

    // Vérifier la cohérence des pauses
    if (breakStart && breakEnd) {
      if (!isValidTimeRange(breakStart, breakEnd)) {
        conflicts.push({
          type: 'invalid_break_time',
          severity: 'critical',
          message: 'L\'heure de fin de pause doit être après l\'heure de début'
        });
      }

      if (!isBreakWithinWorkingHours(startTime, endTime, breakStart, breakEnd)) {
        conflicts.push({
          type: 'break_outside_working_hours',
          severity: 'critical',
          message: 'La pause doit être comprise dans les heures de travail'
        });
      }
    }

  } catch (error) {
    console.error('Erreur détection conflits:', error);
    conflicts.push({
      type: 'detection_error',
      severity: 'warning',
      message: 'Erreur lors de la détection des conflits'
    });
  }

  return conflicts;
}

/**
 * Détecter les avertissements non bloquants
 */
async function detectScheduleWarnings({ userId, agencyId, date, startTime, endTime, breakStart, breakEnd }) {
  const warnings = [];

  try {
    // Vérifier les heures de travail excessives
    const workingHours = calculateWorkingHours(startTime, endTime, breakStart, breakEnd);
    if (workingHours > 10) {
      warnings.push({
        type: 'long_working_day',
        severity: 'warning',
        message: `Journée de travail longue (${workingHours}h). Vérifiez la législation du travail.`
      });
    }

    // Vérifier si c'est un weekend
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      warnings.push({
        type: 'weekend_work',
        severity: 'info',
        message: 'Planning prévu le weekend'
      });
    }

    // Vérifier les heures de pause
    if (workingHours >= 6 && (!breakStart || !breakEnd)) {
      warnings.push({
        type: 'no_break_long_day',
        severity: 'warning',
        message: 'Aucune pause prévue pour une journée de plus de 6h'
      });
    }

    // Vérifier les heures inhabituelles
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    if (startHour < 6 || endHour > 22) {
      warnings.push({
        type: 'unusual_hours',
        severity: 'info',
        message: 'Horaires en dehors des heures habituelles (6h-22h)'
      });
    }

  } catch (error) {
    console.error('Erreur détection avertissements:', error);
  }

  return warnings;
}

/**
 * Générer des suggestions d'amélioration
 */
function generateScheduleSuggestions({ startTime, endTime, breakStart, breakEnd, conflicts, warnings }) {
  const suggestions = [];

  // Suggestions basées sur les conflits
  if (conflicts.some(c => c.type === 'time_overlap')) {
    suggestions.push({
      type: 'resolve_conflict',
      message: 'Modifiez les horaires pour éviter le chevauchement',
      action: 'adjust_time'
    });
  }

  // Suggestions basées sur les avertissements
  if (warnings.some(w => w.type === 'long_working_day')) {
    suggestions.push({
      type: 'reduce_hours',
      message: 'Considérez réduire la durée ou ajouter une pause supplémentaire',
      action: 'add_break'
    });
  }

  if (warnings.some(w => w.type === 'no_break_long_day')) {
    suggestions.push({
      type: 'add_break',
      message: 'Ajoutez une pause déjeuner (ex: 12:00-13:00)',
      action: 'suggest_break_time'
    });
  }

  return suggestions;
}

/**
 * Fonctions utilitaires
 */
function checkTimeOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  
  if (s1 < e2 && s2 < e1) {
    return {
      overlapStart: Math.max(s1, s2),
      overlapEnd: Math.min(e1, e2),
      duration: Math.min(e1, e2) - Math.max(s1, s2)
    };
  }
  return null;
}

function isValidTimeRange(startTime, endTime) {
  return timeToMinutes(endTime) > timeToMinutes(startTime);
}

function isBreakWithinWorkingHours(workStart, workEnd, breakStart, breakEnd) {
  const ws = timeToMinutes(workStart);
  const we = timeToMinutes(workEnd);
  const bs = timeToMinutes(breakStart);
  const be = timeToMinutes(breakEnd);
  
  return bs >= ws && be <= we;
}

function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function calculateWorkingHours(startTime, endTime, breakStart, breakEnd) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  let duration = end - start;
  
  if (breakStart && breakEnd) {
    const breakDuration = timeToMinutes(breakEnd) - timeToMinutes(breakStart);
    duration -= breakDuration;
  }
  
  return Math.round((duration / 60) * 100) / 100; // Arrondi à 2 décimales
}

module.exports = router;