// backend/src/routes/admin/schedules/index.js
// ✅ Fichier INDEX manquant pour les routes admin/schedules

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

// ===== ROUTES CRUD =====

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

    // Vérifier qu'il n'y a pas déjà un planning pour cette date/utilisateur
    const existingSchedule = await Schedule.findOne({
      user: userId,
      date: new Date(date)
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
      date: new Date(date),
      startTime,
      endTime,
      breakDuration,
      notes,
      createdBy: req.user.userId
    });

    await schedule.save();

    // Populer les données pour la réponse
    await schedule.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'agency', select: 'name code client' }
    ]);

    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.SCHEDULE_CREATED || 'Planning créé avec succès',
      data: { schedule }
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
 * @desc    Récupérer les plannings avec filtres et pagination
 * @access  Admin
 */
router.get('/', async (req, res) => {
  try {
    const { error, value } = scheduleSearchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { page, limit, userId, agencyId, startDate, endDate, sort, order } = value;

    // Construction des filtres
    const filters = {};
    
    if (userId) filters.user = userId;
    if (agencyId) filters.agency = agencyId;
    
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (page - 1) * limit;
    
    // Tri
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    // Requêtes parallèles
    const [schedules, total] = await Promise.all([
      Schedule.find(filters)
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Schedule.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: {
        schedules,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
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
 * @route   GET /api/admin/schedules/:id
 * @desc    Récupérer un planning spécifique
 * @access  Admin
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    res.json({
      success: true,
      data: { schedule }
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

    // Mise à jour des champs
    Object.assign(schedule, req.body);
    schedule.updatedBy = req.user.userId;
    schedule.updatedAt = new Date();

    await schedule.save();

    // Populer les données pour la réponse
    await schedule.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'agency', select: 'name code client' }
    ]);

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.SCHEDULE_UPDATED || 'Planning modifié avec succès',
      data: { schedule }
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
      message: SUCCESS_MESSAGES.SCHEDULE_DELETED || 'Planning supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

// ===== ROUTES UTILITAIRES =====

/**
 * @route   GET /api/admin/schedules/week/:userId
 * @desc    Récupérer le planning de la semaine pour un utilisateur
 * @access  Admin
 */
router.get('/week/:userId', validateObjectId('userId'), async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.params.userId;

    // Date de début de semaine (lundi)
    const weekStart = date ? new Date(date) : new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const schedules = await Schedule.find({
      user: userId,
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .populate('agency', 'name code client')
    .sort({ date: 1 });

    // Organiser par jour de la semaine
    const weekSchedule = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      
      const daySchedule = schedules.find(schedule => 
        schedule.date.toDateString() === date.toDateString()
      );

      return {
        date: date,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
        schedule: daySchedule || null
      };
    });

    res.json({
      success: true,
      data: {
        weekSchedule,
        period: { start: weekStart, end: weekEnd }
      }
    });

  } catch (error) {
    console.error('Erreur récupération planning semaine:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

module.exports = router;