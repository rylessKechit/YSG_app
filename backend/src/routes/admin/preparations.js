// backend/src/routes/admin/preparations.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Models
const Preparation = require('../../models/Preparation');
const User = require('../../models/User');
const Agency = require('../../models/Agency');
const Vehicle = require('../../models/Vehicle');

// Middleware
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateQuery, validateBody, validateObjectId } = require('../../middleware/validation');

// Constants
const { 
  PREPARATION_STATUS, 
  PREPARATION_STEPS,
  STEP_LABELS,
  STEP_ICONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES 
} = require('../../utils/constants');

// ===== SCHÉMAS DE VALIDATION =====

const preparationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
  user: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  agency: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  status: Joi.string().valid(...Object.values(PREPARATION_STATUS), 'all').default('all'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  sort: Joi.string().valid('createdAt', 'startTime', 'endTime', 'totalTime', 'user', 'agency', 'vehicle').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
}).unknown(true);

const updateAgencySchema = Joi.object({
  agencyId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  reason: Joi.string().max(500).optional()
});

const editStepsSchema = Joi.object({
  steps: Joi.array().items(
    Joi.object({
      step: Joi.string().valid(...Object.values(PREPARATION_STEPS)).required(),
      completed: Joi.boolean().default(false),
      notes: Joi.string().allow('').optional()
    })
  ).min(1).required(),
  adminNotes: Joi.string().max(500).optional()
});

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/preparations/stats
 * @desc    Statistiques globales des préparations
 * @access  Admin
 */
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate, agency } = req.query;

    const filters = {};
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }
    if (agency) filters.agency = agency;

    const [globalStats, statusStats] = await Promise.all([
      Preparation.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            totalPreparations: { $sum: 1 },
            averageTime: { $avg: '$totalTime' },
            onTimeCount: { $sum: { $cond: [{ $lte: ['$totalTime', 30] }, 1, 0] } },
            completedCount: { $sum: { $cond: [{ $eq: ['$status', PREPARATION_STATUS.COMPLETED] }, 1, 0] } }
          }
        }
      ]),
      Preparation.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const global = globalStats[0] || { totalPreparations: 0, averageTime: 0, onTimeCount: 0, completedCount: 0 };
    const stats = {
      global: {
        totalPreparations: global.totalPreparations,
        averageTime: Math.round(global.averageTime || 0),
        onTimeRate: global.totalPreparations > 0 ? Math.round((global.onTimeCount / global.totalPreparations) * 100) : 0,
        completionRate: global.totalPreparations > 0 ? Math.round((global.completedCount / global.totalPreparations) * 100) : 0
      },
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: { stats, period: { startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null } }
    });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

/**
 * @route   GET /api/admin/preparations
 * @desc    Récupérer les préparations avec filtres
 * @access  Admin
 */
router.get('/', validateQuery(preparationQuerySchema), async (req, res) => {
  try {
    const { page, limit, search, user, agency, status, startDate, endDate, sort, order } = req.query;

    const filters = {};
    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filters.$or = [
        { 'vehicle.licensePlate': searchRegex },
        { 'vehicle.model': searchRegex },
        { notes: searchRegex }
      ];
    }
    if (user) filters.user = user;
    if (agency) filters.agency = agency;
    if (status && status !== 'all') filters.status = status;
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    const [preparations, total] = await Promise.all([
      Preparation.find(filters)
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client')
        .populate('vehicle', 'licensePlate model brand')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      Preparation.countDocuments(filters)
    ]);

    const formattedPreparations = preparations.map(prep => ({
      id: prep._id,
      vehicle: {
        id: prep.vehicle?._id,
        licensePlate: prep.vehicle?.licensePlate || 'N/A',
        model: prep.vehicle?.model || 'N/A',
        brand: prep.vehicle?.brand || 'N/A'
      },
      user: {
        id: prep.user._id,
        name: `${prep.user.firstName} ${prep.user.lastName}`,
        email: prep.user.email
      },
      agency: {
        id: prep.agency._id,
        name: prep.agency.name,
        code: prep.agency.code,
        client: prep.agency.client
      },
      status: prep.status,
      progress: prep.progress,
      duration: prep.currentDuration,
      totalTime: prep.totalTime,
      isOnTime: prep.isOnTime,
      startTime: prep.startTime,
      endTime: prep.endTime,
      steps: prep.steps.map(step => ({
        step: step.step,
        completed: step.completed,
        completedAt: step.completedAt,
        notes: step.notes,
        photosCount: step.photos ? step.photos.length : 0
      })),
      issues: prep.issues || [],
      notes: prep.notes,
      createdAt: prep.createdAt,
      updatedAt: prep.updatedAt
    }));

    const stats = {
      total,
      pending: await Preparation.countDocuments({ ...filters, status: PREPARATION_STATUS.PENDING }),
      inProgress: await Preparation.countDocuments({ ...filters, status: PREPARATION_STATUS.IN_PROGRESS }),
      completed: await Preparation.countDocuments({ ...filters, status: PREPARATION_STATUS.COMPLETED }),
      cancelled: await Preparation.countDocuments({ ...filters, status: PREPARATION_STATUS.CANCELLED })
    };

    res.json({
      success: true,
      data: {
        preparations: formattedPreparations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: { search: search || '', user, agency, status, startDate, endDate, sort, order },
        stats
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération préparations:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

/**
 * @route   GET /api/admin/preparations/:id
 * @desc    Récupérer le détail d'une préparation
 * @access  Admin
 */
router.get('/:id', validateObjectId(), async (req, res) => {
  try {
    const preparation = await Preparation.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address')
      .populate('vehicle', 'licensePlate model brand year color condition');

    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Préparation non trouvée' });
    }

    const formattedPreparation = {
      id: preparation._id,
      vehicle: {
        id: preparation.vehicle?._id,
        licensePlate: preparation.vehicle?.licensePlate || 'N/A',
        model: preparation.vehicle?.model || 'N/A',
        brand: preparation.vehicle?.brand || 'N/A',
        year: preparation.vehicle?.year,
        color: preparation.vehicle?.color,
        condition: preparation.vehicle?.condition
      },
      user: {
        id: preparation.user._id,
        name: `${preparation.user.firstName} ${preparation.user.lastName}`,
        email: preparation.user.email,
        phone: preparation.user.phone
      },
      agency: {
        id: preparation.agency._id,
        name: preparation.agency.name,
        code: preparation.agency.code,
        client: preparation.agency.client,
        address: preparation.agency.address
      },
      status: preparation.status,
      progress: preparation.progress,
      duration: preparation.currentDuration,
      totalTime: preparation.totalTime,
      isOnTime: preparation.isOnTime,
      startTime: preparation.startTime,
      endTime: preparation.endTime,
      steps: preparation.steps.map(step => ({
        step: step.step,
        completed: step.completed,
        completedAt: step.completedAt,
        notes: step.notes,
        photos: step.photos || []
      })),
      issues: preparation.issues || [],
      notes: preparation.notes,
      agencyHistory: preparation.agencyHistory || [],
      createdAt: preparation.createdAt,
      updatedAt: preparation.updatedAt
    };

    res.json({ success: true, data: { preparation: formattedPreparation } });

  } catch (error) {
    console.error('❌ Erreur récupération détail:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

// backend/src/routes/admin/preparations.js
/**
 * @route   GET /api/admin/preparations/:id/photos
 * @desc    Récupérer les photos d'une préparation
 * @access  Admin
 */
router.get('/:id/photos', validateObjectId(), async (req, res) => {
  try {
    const preparation = await Preparation.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('vehicle', 'licensePlate model brand');

    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Préparation non trouvée' });
    }

    const photos = [];
    preparation.steps.forEach(step => {
      if (step.photos && step.photos.length > 0) {
        step.photos.forEach((photo, index) => {
          // ✅ CORRECTION : Gérer les deux formats possibles
          let photoUrl;
          let description = '';
          let uploadedAt = step.completedAt;

          // Si c'est un objet avec url, description, etc.
          if (typeof photo === 'object' && photo !== null) {
            photoUrl = photo.url || photo.secure_url;
            description = photo.description || '';
            uploadedAt = photo.uploadedAt || step.completedAt;
          } 
          // Si c'est juste une string (ancien format)
          else if (typeof photo === 'string') {
            photoUrl = photo;
            description = `Photo étape ${step.step}`;
          }

          // Vérifier que nous avons une URL valide
          if (photoUrl && photoUrl.trim()) {
            photos.push({
              stepType: step.step,
              stepLabel: STEP_LABELS[step.step],
              stepIcon: STEP_ICONS[step.step],
              photoUrl: photoUrl.trim(), // ✅ S'assurer qu'il n'y a pas d'espaces
              photoIndex: index,
              completedAt: uploadedAt || step.completedAt,
              notes: step.notes || '',
              description: description
            });
          } else {
            console.warn(`⚠️ Photo invalide trouvée pour l'étape ${step.step}:`, photo);
          }
        });
      }
    });

    // ✅ AJOUT : Statistiques pour debug
    const totalSteps = preparation.steps.length;
    const completedSteps = preparation.steps.filter(step => step.completed).length;
    const stepsWithPhotos = preparation.steps.filter(step => step.photos && step.photos.length > 0).length;

    console.log(`✅ Photos récupérées pour préparation ${req.params.id}:`, {
      totalPhotos: photos.length,
      totalSteps,
      completedSteps,
      stepsWithPhotos
    });

    res.json({
      success: true,
      data: {
        photos,
        totalPhotos: photos.length,
        totalSteps,
        completedSteps,
        stepsWithPhotos,
        progress: Math.round((completedSteps / totalSteps) * 100)
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération photos:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

/**
 * @route   PUT /api/admin/preparations/:id/agency
 * @desc    Modifier l'agence d'une préparation
 * @access  Admin
 */
router.put('/:id/agency', validateObjectId(), validateBody(updateAgencySchema), async (req, res) => {
  try {
    const { agencyId, reason } = req.body;

    const preparation = await Preparation.findById(req.params.id);
    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Préparation non trouvée' });
    }

    const newAgency = await Agency.findById(agencyId);
    if (!newAgency) {
      return res.status(404).json({ success: false, message: 'Agence non trouvée' });
    }

    if (preparation.agency.toString() === agencyId) {
      return res.status(400).json({ success: false, message: 'La préparation est déjà assignée à cette agence' });
    }

    const oldAgency = await Agency.findById(preparation.agency);
    const agencyChange = {
      fromAgency: { id: oldAgency._id, name: oldAgency.name, code: oldAgency.code },
      toAgency: { id: newAgency._id, name: newAgency.name, code: newAgency.code },
      changedBy: {
        id: req.user.userId,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      reason: reason || 'Modification par admin',
      changedAt: new Date()
    };

    if (!preparation.agencyHistory) preparation.agencyHistory = [];
    preparation.agency = agencyId;
    preparation.agencyHistory.push(agencyChange);
    preparation.updatedAt = new Date();

    await preparation.save();

    const updatedPreparation = await Preparation.findById(req.params.id)
      .populate('agency', 'name code client');

    res.json({
      success: true,
      message: `Préparation transférée vers l'agence ${newAgency.name}`,
      data: {
        preparation: {
          id: updatedPreparation._id,
          agency: {
            id: updatedPreparation.agency._id,
            name: updatedPreparation.agency.name,
            code: updatedPreparation.agency.code,
            client: updatedPreparation.agency.client
          },
          agencyHistory: updatedPreparation.agencyHistory
        },
        change: agencyChange
      }
    });

  } catch (error) {
    console.error('❌ Erreur modification agence:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

/**
 * @route   PUT /api/admin/preparations/:id/steps
 * @desc    Modifier les étapes d'une préparation
 * @access  Admin
 */
router.put('/:id/steps', validateObjectId(), validateBody(editStepsSchema), async (req, res) => {
  try {
    const { steps, adminNotes } = req.body;

    const preparation = await Preparation.findById(req.params.id);
    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Préparation non trouvée' });
    }

    const previousSteps = preparation.steps.map(step => ({
      step: step.step,
      completed: step.completed,
      completedAt: step.completedAt,
      notes: step.notes,
      photos: step.photos || []
    }));

    const newSteps = steps.map(stepData => {
      const existingStep = preparation.steps.find(s => s.step === stepData.step);
      if (existingStep) {
        return {
          step: stepData.step,
          completed: stepData.completed,
          completedAt: existingStep.completedAt || (stepData.completed ? new Date() : null),
          notes: stepData.notes || existingStep.notes || '',
          photos: existingStep.photos || []
        };
      } else {
        return {
          step: stepData.step,
          completed: stepData.completed,
          completedAt: stepData.completed ? new Date() : null,
          notes: stepData.notes || '',
          photos: []
        };
      }
    });

    preparation.steps = newSteps;
    preparation.updatedAt = new Date();

    if (!preparation.adminModifications) preparation.adminModifications = [];
    preparation.adminModifications.push({
      modifiedBy: {
        id: req.user.userId,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      modifiedAt: new Date(),
      type: 'steps_modification',
      previousSteps,
      newSteps: newSteps.map(step => ({
        step: step.step,
        completed: step.completed,
        notes: step.notes
      })),
      adminNotes: adminNotes || 'Modification des étapes par admin'
    });

    await preparation.save();

    res.json({
      success: true,
      message: 'Étapes modifiées avec succès',
      data: {
        preparation: {
          id: preparation._id,
          steps: preparation.steps,
          progress: preparation.progress,
          adminModifications: preparation.adminModifications
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur modification étapes:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

module.exports = router;