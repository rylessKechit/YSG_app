// backend/src/routes/admin/schedules/index.js - CORRECTION COMPLÈTE

const express = require('express');
const router = express.Router();
const Joi = require('joi');

// ✅ Import des middlewares et modèles
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId } = require('../../../middleware/validation');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../../utils/constants');

// ✅ Application des middlewares pour toutes les routes
router.use(auth, adminAuth);

// ===== MONTAGE DES SOUS-ROUTES EN PREMIER =====

try {
  // Stats - DOIT être avant les routes :id
  router.use('/stats', require('./stats'));
  console.log('✅ Routes schedules/stats chargées');
} catch (error) {
  console.error('❌ Erreur chargement routes schedules/stats:', error.message);
  // Route de fallback pour éviter le crash
  router.use('/stats', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service statistiques temporairement indisponible',
      error: 'Module stats.js non trouvé'
    });
  });
}

try {
  // Calendar - DOIT être avant les routes :id
  router.use('/calendar', require('./calendar'));
  console.log('✅ Routes schedules/calendar chargées');
} catch (error) {
  console.error('❌ Erreur chargement routes schedules/calendar:', error.message);
  // Route de fallback pour éviter le crash
  router.use('/calendar', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service calendrier temporairement indisponible',
      error: 'Module calendar.js non trouvé'
    });
  });
}

try {
  // Conflicts - DOIT être avant les routes :id
  router.use('/conflicts', require('./conflicts'));
  console.log('✅ Routes schedules/conflicts chargées');
} catch (error) {
  console.warn('⚠️ Routes schedules/conflicts non trouvées (optionnel)');
  // Route de fallback basique
  router.get('/conflicts', (req, res) => {
    res.json({
      success: true,
      data: {
        conflicts: [],
        message: 'Service de détection de conflits non encore implémenté'
      }
    });
  });
}

// ===== SCHÉMAS DE VALIDATION =====
const scheduleCreateSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(),
  agencyId: Joi.string().hex().length(24).required(),
  date: Joi.date().iso().required(),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  breakDuration: Joi.number().integer().min(0).max(180).default(30),
  notes: Joi.string().max(500).optional().allow('')
});

const scheduleUpdateSchema = Joi.object({
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  breakDuration: Joi.number().integer().min(0).max(180).optional(),
  notes: Joi.string().max(500).optional().allow('')
});

const scheduleSearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  userId: Joi.string().hex().length(24).optional(),
  agencyId: Joi.string().hex().length(24).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  sort: Joi.string().default('date'),
  order: Joi.string().valid('asc', 'desc').default('asc')
});

// ===== ROUTES CRUD PRINCIPALES =====

/**
 * @route   GET /api/admin/schedules
 * @desc    Récupérer la liste des plannings avec filtres
 * @access  Admin
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, agencyId, startDate, endDate, sort = 'date', order = 'asc' } = req.query;

    // Construction de la requête
    const query = {};
    if (userId) query.user = userId;
    if (agencyId) query.agency = agencyId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Exécution de la requête
    const [schedules, total] = await Promise.all([
      Schedule.find(query)
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client')
        .sort({ [sort]: order === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Schedule.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        schedules: schedules.map(schedule => ({
          id: schedule._id,
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
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakDuration: schedule.breakDuration,
          notes: schedule.notes,
          createdAt: schedule.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
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
 * @route   POST /api/admin/schedules
 * @desc    Créer un nouveau planning
 * @access  Admin
 */
router.post('/', validateBody(scheduleCreateSchema), async (req, res) => {
  try {
    const { userId, agencyId, date, startTime, endTime, breakDuration, notes } = req.body;

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

    // Créer le planning
    const schedule = new Schedule({
      user: userId,
      agency: agencyId,
      date: new Date(date),
      startTime,
      endTime,
      breakDuration: breakDuration || 30,
      notes: notes || '',
      createdBy: req.user.userId
    });

    await schedule.save();

    // Retourner le planning créé avec populate
    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client');

    res.status(201).json({
      success: true,
      message: 'Planning créé avec succès',
      data: {
        schedule: {
          id: populatedSchedule._id,
          user: {
            id: populatedSchedule.user._id,
            name: `${populatedSchedule.user.firstName} ${populatedSchedule.user.lastName}`,
            email: populatedSchedule.user.email
          },
          agency: {
            id: populatedSchedule.agency._id,
            name: populatedSchedule.agency.name,
            code: populatedSchedule.agency.code
          },
          date: populatedSchedule.date,
          startTime: populatedSchedule.startTime,
          endTime: populatedSchedule.endTime,
          breakDuration: populatedSchedule.breakDuration,
          notes: populatedSchedule.notes,
          createdAt: populatedSchedule.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur création planning:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Un planning existe déjà pour cet utilisateur à cette date'
      });
    }
    
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/admin/schedules/:id
 * @desc    Récupérer un planning spécifique
 * @access  Admin
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client');

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
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakDuration: schedule.breakDuration,
          notes: schedule.notes,
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
      if (req.body[key] !== undefined) {
        schedule[key] = req.body[key];
      }
    });

    schedule.updatedBy = req.user.userId;
    await schedule.save();

    // Retourner le planning mis à jour
    const updatedSchedule = await Schedule.findById(schedule._id)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client');

    res.json({
      success: true,
      message: 'Planning mis à jour avec succès',
      data: {
        schedule: {
          id: updatedSchedule._id,
          user: {
            id: updatedSchedule.user._id,
            name: `${updatedSchedule.user.firstName} ${updatedSchedule.user.lastName}`
          },
          agency: {
            id: updatedSchedule.agency._id,
            name: updatedSchedule.agency.name
          },
          date: updatedSchedule.date,
          startTime: updatedSchedule.startTime,
          endTime: updatedSchedule.endTime,
          breakDuration: updatedSchedule.breakDuration,
          notes: updatedSchedule.notes,
          updatedAt: updatedSchedule.updatedAt
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

    await Schedule.findByIdAndDelete(req.params.id);

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

module.exports = router;