// ===== backend/src/routes/admin/schedules/schedules.js - VERSION CORRIGÉE =====
const express = require('express');
const Joi = require('joi'); // ✅ Ajout explicite de Joi
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery, objectId, timeFormat } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS LOCAUX =====
const scheduleCreateSchema = Joi.object({
  userId: objectId.required(),
  agencyId: objectId.required(),
  date: Joi.date().min('now').required(),
  startTime: timeFormat.required(),
  endTime: timeFormat.required(),
  breakStart: timeFormat.optional(),
  breakEnd: timeFormat.optional(),
  notes: Joi.string().max(500).optional()
});

const scheduleUpdateSchema = Joi.object({
  startTime: timeFormat.optional(),
  endTime: timeFormat.optional(),
  breakStart: timeFormat.optional().allow(''),
  breakEnd: timeFormat.optional().allow(''),
  notes: Joi.string().max(500).optional(),
  status: Joi.string().valid('active', 'cancelled', 'completed').optional()
});

const bulkCreateSchema = Joi.object({
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
});

// Toutes les routes nécessitent une authentification admin
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/schedules
 * @desc    Créer ou modifier un planning
 * @access  Admin
 */
router.post('/', validateBody(scheduleCreateSchema), async (req, res) => {
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

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    // Vérifier les conflits de planning
    const conflicts = await Schedule.findOne({
      user: userId,
      date: scheduleDate,
      status: 'active'
    });

    if (conflicts) {
      return res.status(400).json({
        success: false,
        message: 'Un planning existe déjà pour cet utilisateur à cette date'
      });
    }

    // Créer ou modifier le planning
    const schedule = new Schedule({
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

    await schedule.save();

    // Charger les relations pour la réponse
    await schedule.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'agency', select: 'name code client' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Planning créé avec succès',
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
          createdAt: schedule.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur création planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/admin/schedules
 * @desc    Obtenir les plannings avec filtres
 * @access  Admin
 */
router.get('/', validateQuery(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  agencyId: objectId.optional(),
  userId: objectId.optional(),
  sort: Joi.string().default('date'),
  order: Joi.string().valid('asc', 'desc').default('asc')
})), async (req, res) => {
  try {
    const { page, limit, startDate, endDate, agencyId, userId, sort, order } = req.query;

    // Construire les filtres
    const filters = { status: 'active' };
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

    filters.date = { $gte: defaultStartDate, $lte: defaultEndDate };

    // Compter le total
    const total = await Schedule.countDocuments(filters);

    // Récupérer les plannings avec pagination
    const schedules = await Schedule.find(filters)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate('createdBy', 'firstName lastName')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

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
          createdBy: schedule.createdBy,
          createdAt: schedule.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération plannings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
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
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   PUT /api/admin/schedules/:id
 * @desc    Modifier un planning
 * @access  Admin
 */
router.put('/:id', validateObjectId('id'), validateBody(scheduleUpdateSchema), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    // Mettre à jour les champs
    Object.keys(req.body).forEach(key => {
      schedule[key] = req.body[key];
    });

    schedule.updatedAt = new Date();
    await schedule.save();

    // Charger les relations
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
          updatedAt: schedule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur modification planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
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

    // Soft delete en changeant le statut
    schedule.status = 'cancelled';
    schedule.updatedAt = new Date();
    await schedule.save();

    res.json({
      success: true,
      message: 'Planning supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   POST /api/admin/schedules/bulk-create
 * @desc    Création en masse de plannings
 * @access  Admin
 */
router.post('/bulk-create', validateBody(bulkCreateSchema), async (req, res) => {
  try {
    const { template, assignments, options } = req.body;
    
    const results = [];
    let created = 0;
    let failed = 0;

    for (const assignment of assignments) {
      const { userId, agencyId, dates } = assignment;

      // Vérifier que l'utilisateur et l'agence existent
      const [user, agency] = await Promise.all([
        User.findById(userId),
        Agency.findById(agencyId)
      ]);

      if (!user || !agency) {
        failed += dates.length;
        results.push({
          userId,
          agencyId,
          dates,
          error: 'Utilisateur ou agence non trouvé'
        });
        continue;
      }

      for (const date of dates) {
        try {
          const scheduleDate = new Date(date);
          scheduleDate.setHours(0, 0, 0, 0);

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
        results
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

module.exports = router;