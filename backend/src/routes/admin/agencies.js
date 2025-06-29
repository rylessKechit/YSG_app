// ===== backend/src/routes/admin/agencies.js - VERSION CORRIGÉE COMPLÈTE =====
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

// ===== SCHÉMAS DE VALIDATION COMPLETS =====

// ✅ SCHÉMA MANQUANT AJOUTÉ - C'ÉTAIT LE PROBLÈME !
const agencySearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().min(1).max(100).optional().allow(''), // ✅ Permet chaînes vides
  client: Joi.string().optional().allow(''),
  status: Joi.string().valid('all', 'active', 'inactive').default('all'),
  sort: Joi.string().default('name'),
  order: Joi.string().valid('asc', 'desc').default('asc')
});

const agencyCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  address: Joi.string().min(5).max(200).required(),
  code: Joi.string().min(2).max(10).uppercase().pattern(/^[A-Z0-9]+$/).required(),
  client: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  email: Joi.string().email().optional(),
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
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
  email: Joi.string().email().optional().allow(''),
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

const agencyCodeCheckSchema = Joi.object({
  code: Joi.string().min(2).max(10).required(),
  excludeAgencyId: objectId.optional()
});

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/agencies
 * @desc    Liste des agences avec filtres et pagination
 * @access  Admin
 */
router.get('/', validateQuery(agencySearchSchema), async (req, res) => {
  try {
    console.log('🔍 [GET /api/admin/agencies] Params reçus:', req.query);
    
    const { 
      page, 
      limit, 
      search, 
      client, 
      status, 
      sort, 
      order 
    } = req.query;

    // Construire les filtres MongoDB
    const filters = {};
    
    // ✅ Vérifier que search n'est pas vide avant de l'utiliser
    if (search && search.trim().length > 0) {
      filters.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
        { client: { $regex: search.trim(), $options: 'i' } },
        { address: { $regex: search.trim(), $options: 'i' } }
      ];
      console.log('🔍 Filtre recherche appliqué:', search.trim());
    }

    // Filtre client
    if (client && client.trim().length > 0) {
      filters.client = { $regex: client.trim(), $options: 'i' };
      console.log('🏢 Filtre client appliqué:', client.trim());
    }

    // Filtre statut
    if (status && status !== 'all') {
      filters.isActive = status === 'active';
      console.log('📊 Filtre statut appliqué:', status);
    }

    console.log('🎯 Filtres MongoDB finaux:', filters);

    // Compter le total
    const total = await Agency.countDocuments(filters);
    console.log('📈 Total agences trouvées:', total);

    // Récupérer les agences avec pagination
    const agencies = await Agency.find(filters)
      .select('name code client address phone email isActive createdAt')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Optimisation performance

    console.log('✅ Agences récupérées:', agencies.length);

    // Calcul pagination
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Statistiques globales
    const stats = {
      totalAgencies: total,
      activeAgencies: await Agency.countDocuments({ ...filters, isActive: true }),
      inactiveAgencies: await Agency.countDocuments({ ...filters, isActive: false })
    };

    // Transformation des données pour le frontend
    const formattedAgencies = agencies.map(agency => ({
      id: agency._id.toString(),
      name: agency.name,
      code: agency.code,
      client: agency.client || '',
      address: agency.address || '',
      phone: agency.phone || '',
      email: agency.email || '',
      isActive: agency.isActive,
      createdAt: agency.createdAt
    }));

    console.log('📦 Réponse preparée:', {
      total: formattedAgencies.length,
      page,
      totalPages
    });

    // Réponse structurée
    res.json({
      success: true,
      data: {
        agencies: formattedAgencies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages,        // Backend utilise 'pages'
          totalPages,              // Alias pour le frontend
          hasNext,
          hasPrev
        },
        filters: {
          search: search || '',
          client: client || '',
          status: status || 'all'
        },
        stats
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération agences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agences',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/admin/agencies
 * @desc    Créer une nouvelle agence
 * @access  Admin
 */
router.post('/', validateBody(agencyCreateSchema), async (req, res) => {
  try {
    console.log('➕ [POST /api/admin/agencies] Données reçues:', req.body);
    
    const { name, address, code, client, phone, email, workingHours, contact } = req.body;

    // Vérifier que le code n'existe pas déjà
    const existingAgency = await Agency.findOne({ code: code.toUpperCase() });
    if (existingAgency) {
      return res.status(409).json({
        success: false,
        message: 'Une agence avec ce code existe déjà'
      });
    }

    // Créer l'agence
    const agency = new Agency({
      name: name.trim(),
      address: address.trim(),
      code: code.toUpperCase(),
      client: client.trim(),
      phone: phone || '',
      email: email || '',
      workingHours: workingHours || {
        start: '08:00',
        end: '18:00'
      },
      contact: contact || {},
      isActive: true
    });

    await agency.save();
    console.log('✅ Agence créée:', agency._id);

    res.status(201).json({
      success: true,
      message: 'Agence créée avec succès',
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          code: agency.code,
          client: agency.client,
          address: agency.address,
          phone: agency.phone,
          email: agency.email,
          workingHours: agency.workingHours,
          contact: agency.contact,
          isActive: agency.isActive,
          createdAt: agency.createdAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur création agence:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'agence',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    console.log('🔍 [GET /api/admin/agencies/:id] ID:', req.params.id);
    
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
          phone: agency.phone,
          email: agency.email,
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
    console.error('❌ Erreur récupération agence:', error);
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
    console.log('✏️ [PUT /api/admin/agencies/:id] ID:', req.params.id, 'Data:', req.body);
    
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    // Mettre à jour les champs
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        agency[key] = req.body[key];
      }
    });

    await agency.save();
    console.log('✅ Agence modifiée:', agency._id);

    res.json({
      success: true,
      message: 'Agence modifiée avec succès',
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          code: agency.code,
          client: agency.client,
          address: agency.address,
          phone: agency.phone,
          email: agency.email,
          workingHours: agency.workingHours,
          contact: agency.contact,
          isActive: agency.isActive,
          updatedAt: agency.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur modification agence:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/admin/agencies/:id
 * @desc    Désactiver une agence
 * @access  Admin
 */
router.delete('/:id', validateObjectId('id'), async (req, res) => {
  try {
    console.log('🗑️ [DELETE /api/admin/agencies/:id] ID:', req.params.id);
    
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    // Désactiver plutôt que supprimer
    agency.isActive = false;
    await agency.save();

    console.log('✅ Agence désactivée:', agency._id);

    res.json({
      success: true,
      message: 'Agence désactivée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur désactivation agence:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la désactivation',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PATCH /api/admin/agencies/:id/reactivate
 * @desc    Réactiver une agence
 * @access  Admin
 */
router.patch('/:id/reactivate', validateObjectId('id'), async (req, res) => {
  try {
    console.log('🔄 [PATCH /api/admin/agencies/:id/reactivate] ID:', req.params.id);
    
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    agency.isActive = true;
    await agency.save();

    console.log('✅ Agence réactivée:', agency._id);

    res.json({
      success: true,
      message: 'Agence réactivée avec succès',
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          code: agency.code,
          client: agency.client,
          isActive: agency.isActive
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur réactivation agence:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réactivation',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/admin/agencies/check-code
 * @desc    Vérifier la disponibilité d'un code agence
 * @access  Admin
 */
router.post('/check-code', validateBody(agencyCodeCheckSchema), async (req, res) => {
  try {
    console.log('🔍 [POST /api/admin/agencies/check-code] Code:', req.body.code);
    
    const { code, excludeAgencyId } = req.body;

    const query = { code: code.toUpperCase() };
    if (excludeAgencyId) {
      query._id = { $ne: excludeAgencyId };
    }

    const existingAgency = await Agency.findOne(query);

    res.json({
      success: true,
      data: {
        available: !existingAgency,
        message: existingAgency ? 'Ce code est déjà utilisé' : 'Code disponible'
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification code:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;