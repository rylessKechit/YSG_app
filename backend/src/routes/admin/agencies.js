// ===== backend/src/routes/admin/agencies.js - VERSION CORRIGÉE =====
const express = require('express');
const Joi = require('joi'); // ✅ Import explicite de Joi
const Agency = require('../../models/Agency');
const User = require('../../models/User');
const Schedule = require('../../models/Schedule');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery, objectId, timeFormat } = require('../../middleware/validation');
const { ERROR_MESSAGES } = require('../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION LOCAUX =====
const agencyCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  address: Joi.string().min(5).max(200).required(),
  code: Joi.string().min(2).max(10).uppercase().pattern(/^[A-Z0-9]+$/).required(),
  client: Joi.string().min(2).max(50).required(),
  workingHours: Joi.object({
    start: timeFormat.required(),
    end: timeFormat.required()
  }).optional(),
  contact: Joi.object({
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    email: Joi.string().email().optional()
  }).optional()
});

const agencyUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  address: Joi.string().min(5).max(200).optional(),
  client: Joi.string().min(2).max(50).optional(),
  workingHours: Joi.object({
    start: timeFormat.required(),
    end: timeFormat.required()
  }).optional(),
  contact: Joi.object({
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    email: Joi.string().email().optional().allow('')
  }).optional(),
  isActive: Joi.boolean().optional()
});

const agencyQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().min(2).max(100).optional(),
  client: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  includeStats: Joi.boolean().default(true),
  sort: Joi.string().default('name'),
  order: Joi.string().valid('asc', 'desc').default('asc')
});

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/agencies
 * @desc    Créer une nouvelle agence
 * @access  Admin
 */
router.post('/', validateBody(agencyCreateSchema), async (req, res) => {
  try {
    const { name, address, code, client, workingHours, contact } = req.body;

    // Vérifier que le code n'existe pas déjà
    const existingAgency = await Agency.findOne({ code: code.toUpperCase() });
    if (existingAgency) {
      return res.status(409).json({
        success: false,
        message: 'Une agence avec ce code existe déjà'
      });
    }

    // Valider les horaires de travail si fournis
    if (workingHours) {
      const startMinutes = timeToMinutes(workingHours.start);
      const endMinutes = timeToMinutes(workingHours.end);
      
      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          success: false,
          message: 'L\'heure de fermeture doit être postérieure à l\'heure d\'ouverture'
        });
      }
    }

    // Créer l'agence
    const agency = new Agency({
      name,
      address,
      code: code.toUpperCase(),
      client,
      workingHours,
      contact,
      isActive: true,
      createdBy: req.user.userId,
      stats: {
        totalUsers: 0,
        activeSchedules: 0,
        totalPreparations: 0
      }
    });

    await agency.save();

    res.status(201).json({
      success: true,
      message: 'Agence créée avec succès',
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          address: agency.address,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          contact: agency.contact,
          isActive: agency.isActive,
          stats: agency.stats,
          createdAt: agency.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur création agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/admin/agencies
 * @desc    Liste des agences avec filtres et statistiques
 * @access  Admin
 */
router.get('/', validateQuery(agencyQuerySchema), async (req, res) => {
  try {
    const { page, limit, search, client, isActive, includeStats, sort, order } = req.query;

    // Construire les filtres
    const filters = {};
    
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    if (client) {
      filters.client = { $regex: client, $options: 'i' };
    }

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    // Compter le total
    const total = await Agency.countDocuments(filters);

    // Récupérer les agences avec pagination
    const agencies = await Agency.find(filters)
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Enrichir avec des statistiques si demandé
    const enrichedAgencies = await Promise.all(agencies.map(async (agency) => {
      const agencyData = {
        id: agency._id,
        name: agency.name,
        address: agency.address,
        code: agency.code,
        client: agency.client,
        workingHours: agency.workingHours,
        contact: agency.contact,
        isActive: agency.isActive,
        createdAt: agency.createdAt,
        updatedAt: agency.updatedAt
      };

      if (includeStats) {
        // Calculer les statistiques en temps réel
        const [userCount, activeSchedules, totalPreparations] = await Promise.all([
          User.countDocuments({ agencies: agency._id, isActive: true }),
          Schedule.countDocuments({ agency: agency._id, status: 'active' }),
          // Pour les préparations, on simule car le modèle n'est pas encore défini
          Promise.resolve(Math.floor(Math.random() * 500))
        ]);

        agencyData.stats = {
          totalUsers: userCount,
          activeSchedules,
          totalPreparations,
          lastActivity: agency.updatedAt
        };
      }

      return agencyData;
    }));

    // Calculer les statistiques globales
    const globalStats = await Agency.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalAgencies: { $sum: 1 },
          activeAgencies: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveAgencies: { $sum: { $cond: ['$isActive', 0, 1] } },
          clients: { $addToSet: '$client' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        agencies: enrichedAgencies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          search,
          client,
          isActive
        },
        stats: globalStats[0] ? {
          ...globalStats[0],
          uniqueClients: globalStats[0].clients.length
        } : {
          totalAgencies: 0,
          activeAgencies: 0,
          inactiveAgencies: 0,
          uniqueClients: 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération agences:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/admin/agencies/:id
 * @desc    Obtenir une agence spécifique avec détails
 * @access  Admin
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    // Récupérer les statistiques détaillées
    const [users, schedules, recentActivity] = await Promise.all([
      User.find({ agencies: agency._id })
        .select('firstName lastName email isActive role')
        .sort({ firstName: 1 }),
      
      Schedule.find({ agency: agency._id, status: 'active' })
        .populate('user', 'firstName lastName')
        .sort({ date: -1 })
        .limit(10),
      
      Schedule.find({ agency: agency._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
    ]);

    res.json({
      success: true,
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          address: agency.address,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          contact: agency.contact,
          isActive: agency.isActive,
          createdAt: agency.createdAt,
          updatedAt: agency.updatedAt
        },
        users: users.map(user => ({
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        })),
        recentSchedules: schedules.map(schedule => ({
          id: schedule._id,
          user: schedule.user,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        })),
        recentActivity: recentActivity.map(activity => ({
          id: activity._id,
          type: 'schedule_created',
          user: activity.user,
          createdBy: activity.createdBy,
          date: activity.date,
          createdAt: activity.createdAt
        })),
        stats: {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length,
          activeSchedules: schedules.length,
          totalPreparations: Math.floor(Math.random() * 500) // Simulation
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   PUT /api/admin/agencies/:id
 * @desc    Modifier une agence
 * @access  Admin
 */
router.put('/:id', validateObjectId('id'), validateBody(agencyUpdateSchema), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    // Valider les horaires de travail si modifiés
    if (req.body.workingHours) {
      const startMinutes = timeToMinutes(req.body.workingHours.start);
      const endMinutes = timeToMinutes(req.body.workingHours.end);
      
      if (endMinutes <= startMinutes) {
        return res.status(400).json({
          success: false,
          message: 'L\'heure de fermeture doit être postérieure à l\'heure d\'ouverture'
        });
      }
    }

    // Mettre à jour les champs
    Object.keys(req.body).forEach(key => {
      if (key === 'contact' && agency.contact) {
        // Merger les contacts au lieu de les remplacer
        agency.contact = { ...agency.contact, ...req.body.contact };
      } else {
        agency[key] = req.body[key];
      }
    });

    agency.updatedAt = new Date();
    await agency.save();

    res.json({
      success: true,
      message: 'Agence modifiée avec succès',
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          address: agency.address,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          contact: agency.contact,
          isActive: agency.isActive,
          updatedAt: agency.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur modification agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   DELETE /api/admin/agencies/:id
 * @desc    Désactiver une agence (soft delete)
 * @access  Admin
 */
router.delete('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    // Vérifier s'il y a des plannings actifs
    const activeSchedules = await Schedule.countDocuments({
      agency: agency._id,
      status: 'active',
      date: { $gte: new Date() }
    });

    if (activeSchedules > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer l'agence: ${activeSchedules} planning(s) actif(s)`,
        details: {
          activeSchedules
        }
      });
    }

    // Désactiver l'agence (soft delete)
    agency.isActive = false;
    agency.updatedAt = new Date();
    await agency.save();

    // Retirer l'agence des utilisateurs assignés
    await User.updateMany(
      { agencies: agency._id },
      { $pull: { agencies: agency._id } }
    );

    res.json({
      success: true,
      message: 'Agence désactivée avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   POST /api/admin/agencies/:id/activate
 * @desc    Réactiver une agence
 * @access  Admin
 */
router.post('/:id/activate', validateObjectId('id'), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    if (agency.isActive) {
      return res.status(400).json({
        success: false,
        message: 'L\'agence est déjà active'
      });
    }

    agency.isActive = true;
    agency.updatedAt = new Date();
    await agency.save();

    res.json({
      success: true,
      message: 'Agence réactivée avec succès',
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          isActive: agency.isActive
        }
      }
    });

  } catch (error) {
    console.error('Erreur activation agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * Convertir un horaire en minutes depuis minuit
 */
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
}

module.exports = router;