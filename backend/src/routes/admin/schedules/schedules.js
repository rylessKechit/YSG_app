const express = require('express');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery } = require('../../../middleware/validation');
const { scheduleSchemas, querySchemas } = require('../../../middleware/validation');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification admin
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/schedules
 * @desc    Créer ou modifier un planning
 * @access  Admin
 */
router.post('/', validateBody(scheduleSchemas.create), async (req, res) => {
  try {
    const { userId, agencyId, date, startTime, endTime, breakStart, breakEnd, notes } = req.body;

    // Vérifier que l'utilisateur existe et est actif
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé ou inactif'
      });
    }

    // Vérifier que l'agence existe et est active
    const agency = await Agency.findById(agencyId);
    if (!agency || !agency.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée ou inactive'
      });
    }

    // Vérifier que l'utilisateur peut travailler dans cette agence
    if (!user.canAccessAgency(agencyId)) {
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur n\'est pas assigné à cette agence'
      });
    }

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    // Vérifier les conflits de planning
    const conflicts = await Schedule.findConflicts(userId, scheduleDate, startTime, endTime);
    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Conflit de planning détecté pour cet utilisateur à cette date'
      });
    }

    // Vérifier si un planning existe déjà pour cette date/utilisateur/agence
    let schedule = await Schedule.findOne({
      user: userId,
      agency: agencyId,
      date: scheduleDate
    });

    if (schedule) {
      // Mettre à jour le planning existant
      schedule.startTime = startTime;
      schedule.endTime = endTime;
      schedule.breakStart = breakStart;
      schedule.breakEnd = breakEnd;
      schedule.notes = notes;
      schedule.updatedAt = new Date();
    } else {
      // Créer un nouveau planning
      schedule = new Schedule({
        user: userId,
        agency: agencyId,
        date: scheduleDate,
        startTime,
        endTime,
        breakStart,
        breakEnd,
        notes,
        createdBy: req.user.userId
      });
    }

    await schedule.save();

    // Charger les relations pour la réponse
    await schedule.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'agency', select: 'name code client' }
    ]);

    res.status(schedule.isNew ? 201 : 200).json({
      success: true,
      message: schedule.isNew ? 'Planning créé avec succès' : 'Planning modifié avec succès',
      data: {
        schedule: {
          id: schedule._id,
          user: schedule.user,
          agency: schedule.agency,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          status: schedule.status,
          workingDuration: schedule.workingDuration,
          formatted: schedule.formatted,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur création/modification planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/admin/schedules
 * @desc    Obtenir les plannings avec filtres
 * @access  Admin
 */
router.get('/', validateQuery(querySchemas.pagination.concat(querySchemas.dateRange)), async (req, res) => {
  try {
    const { page, limit, startDate, endDate, agencyId, userId, sort = 'date', order = 'asc' } = req.query;

    // Construire les filtres
    const filters = {};
    if (agencyId) filters.agency = agencyId;
    if (userId) filters.user = userId;

    // Dates par défaut (semaine courante)
    const defaultStartDate = startDate ? new Date(startDate) : (() => {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay()); // Début de semaine
      date.setHours(0, 0, 0, 0);
      return date;
    })();

    const defaultEndDate = endDate ? new Date(endDate) : (() => {
      const date = new Date(defaultStartDate);
      date.setDate(date.getDate() + 6); // Fin de semaine
      date.setHours(23, 59, 59, 999);
      return date;
    })();

    // Rechercher les plannings
    let query = Schedule.findByDateRange(defaultStartDate, defaultEndDate, filters);

    // Appliquer le tri
    const sortObject = {};
    sortObject[sort] = order === 'asc' ? 1 : -1;
    if (sort !== 'date') {
      sortObject.date = 1; // Tri secondaire par date
    }
    query = query.sort(sortObject);

    // Appliquer la pagination
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(parseInt(limit));

    // Exécuter la requête
    const [schedules, totalCount] = await Promise.all([
      query.exec(),
      Schedule.countDocuments({
        date: { $gte: defaultStartDate, $lte: defaultEndDate },
        status: 'active',
        ...filters
      })
    ]);

    // Calculs de pagination
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        schedules: schedules.map(schedule => ({
          id: schedule._id,
          user: schedule.user,
          agency: schedule.agency,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          status: schedule.status,
          workingDuration: schedule.workingDuration,
          formatted: schedule.formatted,
          createdAt: schedule.createdAt
        })),
        filters: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
          agencyId,
          userId
        },
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération plannings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/schedules/:id
 * @desc    Obtenir un planning spécifique
 * @access  Admin
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address')
      .populate('createdBy', 'firstName lastName');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        schedule: {
          id: schedule._id,
          user: schedule.user,
          agency: schedule.agency,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          status: schedule.status,
          workingDuration: schedule.workingDuration,
          formatted: schedule.formatted,
          createdBy: schedule.createdBy,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   PUT /api/admin/schedules/:id
 * @desc    Modifier un planning
 * @access  Admin
 */
router.put('/:id', validateObjectId('id'), validateBody(scheduleSchemas.update), async (req, res) => {
  try {
    const { startTime, endTime, breakStart, breakEnd, notes, status } = req.body;

    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    // Si on modifie les heures, vérifier les conflits
    if (startTime || endTime) {
      const newStartTime = startTime || schedule.startTime;
      const newEndTime = endTime || schedule.endTime;

      const conflicts = await Schedule.findConflicts(
        schedule.user, 
        schedule.date, 
        newStartTime, 
        newEndTime, 
        schedule._id
      );

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Conflit de planning détecté'
        });
      }
    }

    // Mettre à jour les champs modifiés
    if (startTime !== undefined) schedule.startTime = startTime;
    if (endTime !== undefined) schedule.endTime = endTime;
    if (breakStart !== undefined) schedule.breakStart = breakStart;
    if (breakEnd !== undefined) schedule.breakEnd = breakEnd;
    if (notes !== undefined) schedule.notes = notes;
    if (status !== undefined) schedule.status = status;

    await schedule.save();

    // Charger les relations pour la réponse
    await schedule.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'agency', select: 'name code client' }
    ]);

    res.json({
      success: true,
      message: 'Planning modifié avec succès',
      data: {
        schedule: {
          id: schedule._id,
          user: schedule.user,
          agency: schedule.agency,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          status: schedule.status,
          workingDuration: schedule.workingDuration,
          formatted: schedule.formatted,
          updatedAt: schedule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur modification planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/admin/schedules/:id
 * @desc    Supprimer un planning
 * @access  Admin
 */
router.delete('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    // Vérifier s'il y a des pointages associés
    const Timesheet = require('../../../models/Timesheet');
    const timesheet = await Timesheet.findOne({ schedule: schedule._id });

    if (timesheet) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un planning avec des pointages associés'
      });
    }

    await Schedule.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Planning supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/schedules/week/:userId
 * @desc    Obtenir le planning d'une semaine pour un utilisateur
 * @access  Admin
 */
router.get('/week/:userId', validateObjectId('userId'), async (req, res) => {
  try {
    const { date } = req.query;

    // Date de début de semaine (par défaut semaine courante)
    const weekStart = date ? new Date(date) : new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Lundi
    weekStart.setHours(0, 0, 0, 0);

    const schedules = await Schedule.findUserWeekSchedule(req.params.userId, weekStart);

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

    res.json({
      success: true,
      data: {
        userId: req.params.userId,
        weekStart,
        weekSchedule
      }
    });

  } catch (error) {
    console.error('Erreur récupération planning semaine:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/schedules/bulk-create
 * @desc    Création en masse de plannings
 * @access  Admin
 */
router.post('/bulk-create', validateBody(Joi.object({
  template: Joi.object({
    startTime: timeFormat.required(),
    endTime: timeFormat.required(),
    breakStart: timeFormat.allow(null, ''),
    breakEnd: timeFormat.allow(null, '')
  }).required(),
  assignments: Joi.array().items(Joi.object({
    userId: objectId.required(),
    agencyId: objectId.required(),
    dates: Joi.array().items(Joi.date()).min(1).required()
  })).min(1).required(),
  options: Joi.object({
    skipConflicts: Joi.boolean().default(true),
    notifyUsers: Joi.boolean().default(false),
    overwrite: Joi.boolean().default(false)
  }).default({})
})), async (req, res) => {
  try {
    const { template, assignments, options } = req.body;
    
    // Valider les horaires du template
    const startMinutes = timeToMinutes(template.startTime);
    const endMinutes = timeToMinutes(template.endTime);
    
    if (endMinutes <= startMinutes) {
      return res.status(400).json({
        success: false,
        message: 'L\'heure de fin doit être après l\'heure de début'
      });
    }
    
    // Valider la pause si elle existe
    if (template.breakStart && template.breakEnd) {
      const breakStartMinutes = timeToMinutes(template.breakStart);
      const breakEndMinutes = timeToMinutes(template.breakEnd);
      
      if (breakEndMinutes <= breakStartMinutes) {
        return res.status(400).json({
          success: false,
          message: 'L\'heure de fin de pause doit être après l\'heure de début'
        });
      }
      
      if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
        return res.status(400).json({
          success: false,
          message: 'La pause doit être comprise dans les horaires de travail'
        });
      }
    }
    
    // Récupérer tous les utilisateurs et agences concernés
    const userIds = [...new Set(assignments.map(a => a.userId))];
    const agencyIds = [...new Set(assignments.map(a => a.agencyId))];
    
    const [users, agencies] = await Promise.all([
      User.find({ 
        _id: { $in: userIds }, 
        role: 'preparateur', 
        isActive: true 
      }),
      Agency.find({ 
        _id: { $in: agencyIds }, 
        isActive: true 
      })
    ]);
    
    // Vérifier que tous les utilisateurs et agences existent
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Certains utilisateurs sont introuvables ou inactifs'
      });
    }
    
    if (agencies.length !== agencyIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Certaines agences sont introuvables ou inactives'
      });
    }
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      conflicts: []
    };
    
    // Traiter chaque assignation
    for (const assignment of assignments) {
      const { userId, agencyId, dates } = assignment;
      
      for (const date of dates) {
        try {
          const scheduleDate = new Date(date);
          
          // Vérifier s'il existe déjà un planning
          const existingSchedule = await Schedule.findOne({
            user: userId,
            agency: agencyId,
            date: scheduleDate
          });
          
          if (existingSchedule && !options.overwrite) {
            if (options.skipConflicts) {
              results.skipped++;
              continue;
            } else {
              const user = users.find(u => u._id.toString() === userId);
              results.conflicts.push({
                userId: userId,
                userName: `${user.firstName} ${user.lastName}`,
                date: scheduleDate.toISOString().split('T')[0],
                reason: 'Planning existant'
              });
              results.skipped++;
              continue;
            }
          }
          
          if (existingSchedule) {
            // Mettre à jour planning existant
            existingSchedule.startTime = template.startTime;
            existingSchedule.endTime = template.endTime;
            existingSchedule.breakStart = template.breakStart;
            existingSchedule.breakEnd = template.breakEnd;
            existingSchedule.updatedAt = new Date();
            
            await existingSchedule.save();
            results.updated++;
          } else {
            // Créer nouveau planning
            const newSchedule = new Schedule({
              user: userId,
              agency: agencyId,
              date: scheduleDate,
              startTime: template.startTime,
              endTime: template.endTime,
              breakStart: template.breakStart,
              breakEnd: template.breakEnd,
              notes: 'Créé via création en masse',
              createdBy: req.user.userId
            });
            
            await newSchedule.save();
            results.created++;
          }
          
        } catch (scheduleError) {
          console.error('Erreur création planning individuel:', scheduleError);
          const user = users.find(u => u._id.toString() === userId);
          results.conflicts.push({
            userId: userId,
            userName: `${user.firstName} ${user.lastName}`,
            date: new Date(date).toISOString().split('T')[0],
            reason: 'Erreur de création'
          });
          results.skipped++;
        }
      }
    }
    
    // TODO: Si options.notifyUsers = true, envoyer notifications
    
    res.status(201).json({
      success: true,
      message: `Création en masse terminée`,
      data: {
        results,
        summary: {
          totalProcessed: results.created + results.updated + results.skipped,
          usersAffected: userIds.length,
          agenciesInvolved: agencyIds.length
        }
      }
    });

  } catch (error) {
    console.error('Erreur création en masse plannings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/schedules/conflicts
 * @desc    Détecter les conflits de plannings
 * @access  Admin
 */
router.get('/conflicts', validateQuery(Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userId: objectId.optional(),
  agencyId: objectId.optional(),
  includeResolutions: Joi.boolean().default(true)
})), async (req, res) => {
  try {
    const { startDate, endDate, userId, agencyId, includeResolutions } = req.query;
    
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
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code')
      .sort({ date: 1, startTime: 1 });
    
    const conflicts = [];
    const resolutions = [];
    
    // Détecter conflits utilisateur (double planification)
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
          // Utilisateur planifié plusieurs fois le même jour
          conflicts.push({
            type: 'user_double_booking',
            severity: 'error',
            userId: userId,
            userName: `${daySchedules[0].user.firstName} ${daySchedules[0].user.lastName}`,
            date: date,
            description: `${daySchedules[0].user.firstName} ${daySchedules[0].user.lastName} planifié ${daySchedules.length} fois le ${new Date(date).toLocaleDateString('fr-FR')}`,
            schedules: daySchedules.map(s => ({
              id: s._id,
              agency: s.agency.name,
              startTime: s.startTime,
              endTime: s.endTime
            }))
          });
          
          if (includeResolutions) {
            resolutions.push({
              conflictType: 'user_double_booking',
              suggestions: [
                {
                  action: 'keep_first_schedule',
                  description: `Garder uniquement le planning à ${daySchedules[0].agency.name}`,
                  impact: 'Supprime les autres plannings'
                },
                {
                  action: 'redistribute',
                  description: 'Réassigner certains créneaux à d\'autres préparateurs',
                  impact: 'Nécessite de trouver des remplaçants'
                }
              ]
            });
          }
        }
        
        // Vérifier chevauchements horaires
        for (let i = 0; i < daySchedules.length - 1; i++) {
          for (let j = i + 1; j < daySchedules.length; j++) {
            const schedule1 = daySchedules[i];
            const schedule2 = daySchedules[j];
            
            const start1 = timeToMinutes(schedule1.startTime);
            const end1 = timeToMinutes(schedule1.endTime);
            const start2 = timeToMinutes(schedule2.startTime);
            const end2 = timeToMinutes(schedule2.endTime);
            
            // Vérifier si les créneaux se chevauchent
            if ((start1 < end2 && end1 > start2)) {
              conflicts.push({
                type: 'time_overlap',
                severity: 'error',
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
                  }
                }
              });
            }
          }
        }
      });
    });
    
    // Détecter surcharge hebdomadaire (>35h)
    const weeklyHours = {};
    schedules.forEach(schedule => {
      const userId = schedule.user._id.toString();
      const weekStart = new Date(schedule.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
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
          type: 'weekly_overwork',
          severity: 'warning',
          userId: week.userId,
          userName: week.userName,
          week: week.weekStart.toISOString().split('T')[0],
          description: `${week.userName} programmé ${totalHours.toFixed(1)}h la semaine du ${week.weekStart.toLocaleDateString('fr-FR')} (limite: 35h)`,
          details: {
            totalHours: totalHours.toFixed(1),
            excessHours: (totalHours - 35).toFixed(1),
            schedulesCount: week.schedules.length
          }
        });
      }
    });
    
    // Statistiques
    const stats = {
      total: conflicts.length,
      byType: {
        user_double_booking: conflicts.filter(c => c.type === 'user_double_booking').length,
        time_overlap: conflicts.filter(c => c.type === 'time_overlap').length,
        weekly_overwork: conflicts.filter(c => c.type === 'weekly_overwork').length
      },
      bySeverity: {
        error: conflicts.filter(c => c.severity === 'error').length,
        warning: conflicts.filter(c => c.severity === 'warning').length
      }
    };

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        conflicts: conflicts.sort((a, b) => {
          // Trier par sévérité puis par date
          if (a.severity !== b.severity) {
            return a.severity === 'error' ? -1 : 1;
          }
          return new Date(a.date || a.week) - new Date(b.date || b.week);
        }),
        resolutions: includeResolutions ? resolutions : undefined,
        statistics: stats,
        totalSchedulesAnalyzed: schedules.length
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

// Fonction utilitaire pour convertir heure en minutes
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

module.exports = router;