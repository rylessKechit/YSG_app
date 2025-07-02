// backend/src/routes/admin/schedules/schedules.js - VERSION COMPLÈTE ET CORRIGÉE
const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery, objectId, timeFormat } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION CORRIGÉS =====

// Import des schémas depuis validation.js pour éviter les doublons
const { scheduleSchemas, querySchemas } = require('../../../middleware/validation');

// Schéma pour créer un planning (utilise le schéma centralisé)
const scheduleCreateSchema = scheduleSchemas.create;

// Schéma pour modifier un planning
const scheduleUpdateSchema = scheduleSchemas.update;

// Schéma pour création en masse
const bulkCreateSchema = Joi.object({
  template: Joi.object({
    startTime: timeFormat.required(),
    endTime: timeFormat.required(),
    breakStart: timeFormat.allow(null, '').optional(),
    breakEnd: timeFormat.allow(null, '').optional()
  }).required(),
  assignments: Joi.array().items(Joi.object({
    userId: objectId.required(),
    agencyId: objectId.required(),
    dates: Joi.array().items(Joi.date()).min(1).required()
  })).min(1).required(),
  options: Joi.object({
    overwrite: Joi.boolean().default(false),
    skipConflicts: Joi.boolean().default(true),
    validateUsers: Joi.boolean().default(true)
  }).default({})
});

// Schéma pour les requêtes avec filtres (TRÈS PERMISSIF)
const scheduleQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userId: objectId.optional(),
  agencyId: objectId.optional(),
  status: Joi.string().valid('active', 'cancelled', 'completed').optional().allow(''),
  search: Joi.string().optional().allow(''),
  sort: Joi.string().valid('date', 'user', 'agency', 'createdAt').default('date'),
  order: Joi.string().valid('asc', 'desc').default('asc')
}).unknown(true); // ✅ Autorise tous les paramètres supplémentaires

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/schedules
 * @desc    Récupérer les plannings avec filtres
 * @access  Admin
 */
router.get('/', validateQuery(scheduleQuerySchema), async (req, res) => {
  try {
    const { page, limit, startDate, endDate, userId, agencyId, status, search, sort, order } = req.query;
    
    // Construction des filtres
    const filters = {};
    
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }
    
    if (userId) filters.user = userId;
    if (agencyId) filters.agency = agencyId;
    if (status) filters.status = status;
    
    // Recherche textuelle
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filters.$or = [
        { notes: searchRegex }
      ];
    }
    
    // Pagination
    const skip = (page - 1) * limit;
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    
    // Exécution des requêtes
    const [schedules, total] = await Promise.all([
      Schedule.find(filters)
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client')
        .populate('createdBy', 'firstName lastName')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Schedule.countDocuments(filters)
    ]);
    
    // Formatage des données
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule._id,
      date: schedule.date,
      timeRange: `${schedule.startTime} - ${schedule.endTime}`,
      workingHours: schedule.getTotalWorkingMinutes() / 60,
      user: {
        id: schedule.user._id,
        name: `${schedule.user.firstName} ${schedule.user.lastName}`,
        email: schedule.user.email
      },
      agency: {
        id: schedule.agency._id,
        name: schedule.agency.name,
        code: schedule.agency.code
      },
      hasBreak: !!(schedule.breakStart && schedule.breakEnd),
      breakTime: schedule.breakStart && schedule.breakEnd ? 
        `${schedule.breakStart} - ${schedule.breakEnd}` : null,
      status: schedule.status,
      notes: schedule.notes,
      createdBy: schedule.createdBy ? 
        `${schedule.createdBy.firstName} ${schedule.createdBy.lastName}` : null,
      createdAt: schedule.createdAt,
      canBeModified: schedule.canBeModified()
    }));
    
    res.json({
      success: true,
      data: {
        schedules: formattedSchedules,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: {
          startDate,
          endDate,
          userId,
          agencyId,
          status,
          search
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
 * @route   POST /api/admin/schedules
 * @desc    Créer un nouveau planning (30j passé autorisé)
 * @access  Admin
 */
router.post('/', validateBody(scheduleCreateSchema), async (req, res) => {
  try {
    const { userId, agencyId, date, startTime, endTime, breakStart, breakEnd, notes } = req.body;
    
    // ✅ VALIDATION MANUELLE: 30 jours max dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pastLimit = new Date(today);
    pastLimit.setDate(today.getDate() - 30);
    
    const planningDate = new Date(date);
    planningDate.setHours(0, 0, 0, 0);
    
    if (planningDate < pastLimit) {
      return res.status(400).json({
        success: false,
        message: 'La date ne peut pas être antérieure à 30 jours dans le passé'
      });
    }
    
    // Vérifier que l'utilisateur et l'agence existent
    const [user, agency] = await Promise.all([
      User.findById(userId),
      Agency.findById(agencyId)
    ]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }
    
    // Vérifier que l'utilisateur a accès à cette agence
    if (!user.agencies.includes(agencyId)) {
      return res.status(403).json({
        success: false,
        message: 'L\'utilisateur n\'a pas accès à cette agence'
      });
    }
    
    // Vérifier les conflits
    const existingSchedule = await Schedule.findOne({
      user: userId,
      date: planningDate,
      status: 'active'
    });
    
    if (existingSchedule) {
      return res.status(409).json({
        success: false,
        message: 'Un planning existe déjà pour cet utilisateur à cette date'
      });
    }
    
    // Créer le planning
    const schedule = new Schedule({
      user: userId,
      agency: agencyId,
      date: planningDate,
      startTime,
      endTime,
      breakStart: breakStart || undefined,
      breakEnd: breakEnd || undefined,
      notes,
      createdBy: req.user.userId
    });
    
    await schedule.save();
    
    // Charger les relations pour la réponse
    await schedule.populate('user', 'firstName lastName email');
    await schedule.populate('agency', 'name code client');
    
    res.status(201).json({
      success: true,
      message: 'Planning créé avec succès',
      data: {
        schedule: {
          id: schedule._id,
          date: schedule.date,
          timeRange: `${schedule.startTime} - ${schedule.endTime}`,
          workingHours: schedule.getTotalWorkingMinutes() / 60,
          user: {
            id: schedule.user._id,
            name: `${schedule.user.firstName} ${schedule.user.lastName}`,
            email: schedule.user.email
          },
          agency: {
            id: schedule.agency._id,
            name: schedule.agency.name,
            code: schedule.agency.code
          },
          hasBreak: !!(schedule.breakStart && schedule.breakEnd),
          breakTime: schedule.breakStart && schedule.breakEnd ? 
            `${schedule.breakStart} - ${schedule.breakEnd}` : null,
          status: schedule.status,
          notes: schedule.notes,
          createdAt: schedule.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur création planning:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/schedules/:id
 * @desc    Récupérer un planning spécifique
 * @access  Admin
 */
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('user', 'firstName lastName email phone agencies')
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
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          workingMinutes: schedule.getTotalWorkingMinutes(),
          user: schedule.user,
          agency: schedule.agency,
          status: schedule.status,
          notes: schedule.notes,
          createdBy: schedule.createdBy,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
          canBeModified: schedule.canBeModified(),
          isWithinAllowedRange: schedule.isWithinAllowedDateRange()
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
 * @desc    Modifier un planning (validation assouplie)
 * @access  Admin
 */
router.put('/:id', validateObjectId, validateBody(scheduleUpdateSchema), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }
    
    // ✅ VÉRIFICATION ASSOUPLIE: Utiliser la nouvelle méthode
    if (!schedule.canBeModified()) {
      return res.status(403).json({
        success: false,
        message: 'Ce planning ne peut plus être modifié (antérieur à 30 jours)'
      });
    }
    
    // Appliquer les modifications
    Object.assign(schedule, req.body);
    
    await schedule.save();
    
    // Charger les relations pour la réponse
    await schedule.populate('user', 'firstName lastName email');
    await schedule.populate('agency', 'name code client');
    
    res.json({
      success: true,
      message: 'Planning modifié avec succès',
      data: {
        schedule: {
          id: schedule._id,
          date: schedule.date,
          timeRange: `${schedule.startTime} - ${schedule.endTime}`,
          workingHours: schedule.getTotalWorkingMinutes() / 60,
          user: {
            id: schedule.user._id,
            name: `${schedule.user.firstName} ${schedule.user.lastName}`
          },
          agency: {
            id: schedule.agency._id,
            name: schedule.agency.name,
            code: schedule.agency.code
          },
          hasBreak: !!(schedule.breakStart && schedule.breakEnd),
          status: schedule.status,
          notes: schedule.notes,
          updatedAt: schedule.updatedAt
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur modification planning:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   DELETE /api/admin/schedules/:id
 * @desc    Supprimer un planning
 * @access  Admin
 */
router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }
    
    // Au lieu de supprimer, marquer comme annulé
    schedule.status = 'cancelled';
    await schedule.save();
    
    res.json({
      success: true,
      message: 'Planning annulé avec succès'
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
 * @route   POST /api/admin/schedules/bulk
 * @desc    Création en masse de plannings (30j passé autorisé)
 * @access  Admin
 */
router.post('/bulk', validateBody(bulkCreateSchema), async (req, res) => {
  try {
    const { template, assignments, options = {} } = req.body;
    
    let created = 0;
    let failed = 0;
    const results = [];
    
    // ✅ CALCUL DE LA LIMITE: 30 jours dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastLimit = new Date(today);
    pastLimit.setDate(today.getDate() - 30);
    
    for (const assignment of assignments) {
      const { userId, agencyId, dates } = assignment;
      
      // Vérifier utilisateur et agence
      const [user, agency] = await Promise.all([
        User.findById(userId),
        Agency.findById(agencyId)
      ]);
      
      if (!user || !agency) {
        results.push({
          userId,
          agencyId,
          dates,
          error: 'Utilisateur ou agence non trouvé'
        });
        failed += dates.length;
        continue;
      }
      
      for (const date of dates) {
        try {
          const scheduleDate = new Date(date);
          scheduleDate.setHours(0, 0, 0, 0);
          
          // ✅ VÉRIFICATION: Date dans la limite autorisée
          if (scheduleDate < pastLimit) {
            results.push({
              userId,
              agencyId,
              date: scheduleDate,
              error: 'Date antérieure à 30 jours dans le passé'
            });
            failed++;
            continue;
          }
          
          // Vérifier les conflits si nécessaire
          if (!options.overwrite) {
            const existing = await Schedule.findOne({
              user: userId,
              date: scheduleDate,
              status: 'active'
            });
            
            if (existing && options.skipConflicts) {
              continue; // Ignorer ce conflit
            } else if (existing) {
              throw new Error('Conflit de planning');
            }
          }
          
          const schedule = new Schedule({
            user: userId,
            agency: agencyId,
            date: scheduleDate,
            startTime: template.startTime,
            endTime: template.endTime,
            breakStart: template.breakStart,
            breakEnd: template.breakEnd,
            createdBy: req.user.userId
          });
          
          await schedule.save();
          created++;
          
        } catch (error) {
          failed++;
          results.push({
            userId,
            agencyId,
            date: new Date(date),
            error: error.message
          });
          console.error(`Erreur création planning ${userId} - ${date}:`, error);
        }
      }
    }
    
    res.json({
      success: true,
      message: `Création en masse terminée: ${created} créés, ${failed} échecs`,
      data: {
        created,
        failed,
        total: created + failed,
        results,
        datePolicy: {
          pastLimit: pastLimit.toISOString().split('T')[0],
          message: 'Plannings autorisés jusqu\'à 30 jours dans le passé'
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur création en masse:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/admin/schedules/date-policy
 * @desc    Récupérer la politique de dates autorisées
 * @access  Admin
 */
router.get('/date-policy', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pastLimit = new Date(today);
    pastLimit.setDate(today.getDate() - 30);
    
    res.json({
      success: true,
      data: {
        policy: {
          pastDaysAllowed: 30,
          futureDaysAllowed: 'unlimited',
          pastLimit: pastLimit.toISOString().split('T')[0],
          today: today.toISOString().split('T')[0]
        },
        examples: {
          canCreate: [
            today.toISOString().split('T')[0], // Aujourd'hui
            new Date(today.getTime() + 7*24*60*60*1000).toISOString().split('T')[0], // +7j
            pastLimit.toISOString().split('T')[0] // Limite passé
          ],
          cannotCreate: [
            new Date(pastLimit.getTime() - 24*60*60*1000).toISOString().split('T')[0] // -31j
          ]
        }
      }
    });
    
  } catch (error) {
    console.error('Erreur politique dates:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;