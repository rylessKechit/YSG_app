// backend/src/routes/admin/agencies.js
// ✅ VERSION ENTIÈREMENT CORRIGÉE

const express = require('express');
const Joi = require('joi');
const Agency = require('../../models/Agency');
const User = require('../../models/User');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateBody, validateObjectId, commonSchemas } = require('../../middleware/validation');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION CORRIGÉS =====

// Schéma ObjectId local
const objectId = Joi.string().hex().length(24).message('Format ObjectId invalide');

// Schéma pour le temps
const timeFormat = Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).message('Format HH:MM requis');

// Schéma de recherche des agences
const agencySearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().min(1).max(100).optional().allow(''),
  client: Joi.string().optional().allow(''),
  status: Joi.string().valid('all', 'active', 'inactive').default('all'),
  sort: Joi.string().default('name'),
  order: Joi.string().valid('asc', 'desc').default('asc')
});

// Schéma de création d'agence
const agencyCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  address: Joi.string().min(5).max(200).required(),
  code: Joi.string().min(2).max(10).uppercase().pattern(/^[A-Z0-9]+$/).required(),
  client: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  workingHours: Joi.object({
    start: timeFormat.required(),
    end: timeFormat.required()
  }).optional(),
  contact: Joi.object({
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    email: Joi.string().email().optional().allow('')
  }).optional()
});

// Schéma de mise à jour d'agence
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

// Schéma de vérification de code
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
router.get('/', async (req, res) => {
  try {
    // Validation manuelle pour éviter l'erreur
    const { error, value } = agencySearchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides',
        errors: error.details.map(d => d.message)
      });
    }

    const { page, limit, search, client, status, sort, order } = value;

    // Construire les filtres
    const filters = {};
    
    if (search && search.trim().length > 0) {
      filters.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { code: { $regex: search.trim(), $options: 'i' } },
        { client: { $regex: search.trim(), $options: 'i' } },
        { address: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (client && client.trim().length > 0) {
      filters.client = { $regex: client.trim(), $options: 'i' };
    }

    if (status && status !== 'all') {
      filters.isActive = status === 'active';
    }

    // Pagination
    const skip = (page - 1) * limit;
    const sortOptions = { [sort]: order === 'desc' ? -1 : 1 };

    // Requêtes parallèles
    const [agencies, total] = await Promise.all([
      Agency.find(filters)
        .select('name code client address phone email isActive createdAt')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit),
      Agency.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: {
        agencies: agencies.map(agency => ({
          id: agency._id,
          name: agency.name,
          code: agency.code,
          client: agency.client,
          address: agency.address,
          phone: agency.phone,
          email: agency.email,
          isActive: agency.isActive,
          createdAt: agency.createdAt
        })),
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
    console.error('❌ Erreur récupération agences:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

/**
 * @route   POST /api/admin/agencies
 * @desc    Créer une nouvelle agence
 * @access  Admin
 */
router.post('/', async (req, res) => {
  try {
    // Validation manuelle
    const { error, value } = agencyCreateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.details.map(d => d.message)
      });
    }

    const { name, address, code, client, phone, email, workingHours, contact } = value;

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
      name,
      address,
      code: code.toUpperCase(),
      client,
      phone,
      email,
      workingHours,
      contact,
      createdBy: req.user.userId
    });

    await agency.save();

    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.AGENCY_CREATED || 'Agence créée avec succès',
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
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

/**
 * @route   GET /api/admin/agencies/:id
 * @desc    Obtenir une agence spécifique
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

    // Compter les utilisateurs assignés
    const userCount = await User.countDocuments({ 
      agencies: req.params.id,
      isActive: true 
    });

    res.json({
      success: true,
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
          userCount,
          createdAt: agency.createdAt,
          updatedAt: agency.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

/**
 * @route   PUT /api/admin/agencies/:id
 * @desc    Modifier une agence
 * @access  Admin
 */
router.put('/:id', validateObjectId('id'), async (req, res) => {
  try {
    // Validation manuelle
    const { error, value } = agencyUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: error.details.map(d => d.message)
      });
    }

    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    // Mise à jour des champs
    Object.assign(agency, value);
    agency.updatedBy = req.user.userId;
    agency.updatedAt = new Date();

    await agency.save();

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.AGENCY_UPDATED || 'Agence modifiée avec succès',
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
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
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

    // Vérifier s'il y a des utilisateurs actifs
    const activeUsers = await User.countDocuments({ 
      agencies: req.params.id,
      isActive: true 
    });

    if (activeUsers > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer l'agence. ${activeUsers} utilisateur(s) actif(s) assigné(s).`
      });
    }

    // Soft delete
    agency.isActive = false;
    agency.updatedBy = req.user.userId;
    await agency.save();

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.AGENCY_DELETED || 'Agence désactivée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

/**
 * @route   POST /api/admin/agencies/check-code
 * @desc    Vérifier la disponibilité d'un code agence
 * @access  Admin
 */
router.post('/check-code', async (req, res) => {
  try {
    // Validation manuelle
    const { error, value } = agencyCodeCheckSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Code requis'
      });
    }

    const { code, excludeAgencyId } = value;

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
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
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
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    agency.isActive = true;
    agency.updatedBy = req.user.userId;
    await agency.save();

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
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

module.exports = router;