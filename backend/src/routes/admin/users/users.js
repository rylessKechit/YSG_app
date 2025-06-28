// ===== backend/src/routes/admin/users/users.js - VERSION CORRIGÉE =====
const express = require('express');
const Joi = require('joi'); // ✅ Import explicite de Joi
const bcrypt = require('bcryptjs');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES, USER_ROLES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION LOCAUX =====
const userCreateSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Format d\'email invalide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Le mot de passe doit contenir au moins 6 caractères',
    'any.required': 'Le mot de passe est requis'
  }),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  agencies: Joi.array().items(objectId).optional(),
  role: Joi.string().valid(...Object.values(USER_ROLES)).optional()
});

const userUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
  agencies: Joi.array().items(objectId).optional(),
  isActive: Joi.boolean().optional(),
  role: Joi.string().valid(...Object.values(USER_ROLES)).optional()
});

const userSearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().min(2).max(100).optional(),
  agence: objectId.optional(),
  statut: Joi.string().valid('all', 'active', 'inactive').default('all'),
  role: Joi.string().valid(...Object.values(USER_ROLES)).optional(),
  sort: Joi.string().default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

const emailCheckSchema = Joi.object({
  email: Joi.string().email().required(),
  excludeUserId: objectId.optional()
});

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/users
 * @desc    Créer un nouvel utilisateur
 * @access  Admin
 */
router.post('/', validateBody(userCreateSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, agencies = [], role = USER_ROLES.PREPARATEUR } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Vérifier que les agences existent
    if (agencies.length > 0) {
      const validAgencies = await Agency.find({ _id: { $in: agencies }, isActive: true });
      if (validAgencies.length !== agencies.length) {
        return res.status(400).json({
          success: false,
          message: 'Une ou plusieurs agences sont invalides ou inactives'
        });
      }
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer l'utilisateur
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      agencies,
      role,
      isActive: true,
      createdBy: req.user.userId,
      stats: {
        totalPreparations: 0,
        averageTime: 0,
        onTimeRate: 0
      }
    });

    await user.save();

    // Charger les agences pour la réponse
    await user.populate('agencies', 'name code client');

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          agencies: user.agencies,
          isActive: user.isActive,
          stats: user.stats,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Liste des utilisateurs avec filtres et recherche
 * @access  Admin
 */
router.get('/', validateQuery(userSearchSchema), async (req, res) => {
  try {
    const { page, limit, search, agence, statut, role, sort, order } = req.query;

    // Construire les filtres
    const filters = {};
    
    if (search) {
      filters.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (agence) {
      filters.agencies = agence;
    }

    if (statut !== 'all') {
      filters.isActive = statut === 'active';
    }

    if (role) {
      filters.role = role;
    }

    // Compter le total
    const total = await User.countDocuments(filters);

    // Récupérer les utilisateurs avec pagination
    const users = await User.find(filters)
      .populate('agencies', 'name code client')
      .select('-password')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Calculer les statistiques globales
    const stats = await User.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactiveUsers: { $sum: { $cond: ['$isActive', 0, 1] } },
          preparateurs: { $sum: { $cond: [{ $eq: ['$role', USER_ROLES.PREPARATEUR] }, 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ['$role', USER_ROLES.ADMIN] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          agencies: user.agencies,
          isActive: user.isActive,
          stats: user.stats,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          search,
          agence,
          statut,
          role
        },
        stats: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          preparateurs: 0,
          admins: 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Obtenir un utilisateur spécifique
 * @access  Admin
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('agencies', 'name code client address')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          agencies: user.agencies,
          isActive: user.isActive,
          stats: user.stats,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Modifier un utilisateur
 * @access  Admin
 */
router.put('/:id', validateObjectId('id'), validateBody(userUpdateSchema), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier les agences si modifiées
    if (req.body.agencies) {
      const validAgencies = await Agency.find({ 
        _id: { $in: req.body.agencies }, 
        isActive: true 
      });
      
      if (validAgencies.length !== req.body.agencies.length) {
        return res.status(400).json({
          success: false,
          message: 'Une ou plusieurs agences sont invalides ou inactives'
        });
      }
    }

    // Empêcher la désactivation du dernier admin
    if (req.body.isActive === false && user.role === USER_ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ 
        role: USER_ROLES.ADMIN, 
        isActive: true,
        _id: { $ne: user._id }
      });
      
      if (adminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de désactiver le dernier administrateur'
        });
      }
    }

    // Mettre à jour les champs
    Object.keys(req.body).forEach(key => {
      user[key] = req.body[key];
    });

    user.updatedAt = new Date();
    await user.save();

    // Charger les agences pour la réponse
    await user.populate('agencies', 'name code client');

    res.json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          agencies: user.agencies,
          isActive: user.isActive,
          stats: user.stats,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur modification utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Désactiver un utilisateur (soft delete)
 * @access  Admin
 */
router.delete('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Empêcher la suppression du dernier admin
    if (user.role === USER_ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ 
        role: USER_ROLES.ADMIN, 
        isActive: true,
        _id: { $ne: user._id }
      });
      
      if (adminCount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer le dernier administrateur'
        });
      }
    }

    // Soft delete
    user.isActive = false;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   POST /api/admin/users/check-email
 * @desc    Vérifier la disponibilité d'un email
 * @access  Admin
 */
router.post('/check-email', validateBody(emailCheckSchema), async (req, res) => {
  try {
    const { email, excludeUserId } = req.body;

    const query = { email: email.toLowerCase() };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const existingUser = await User.findOne(query).select('firstName lastName email role');

    if (existingUser) {
      return res.json({
        success: false,
        available: false,
        message: 'Cet email est déjà utilisé',
        conflictUser: {
          id: existingUser._id,
          name: `${existingUser.firstName} ${existingUser.lastName}`,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }

    res.json({
      success: true,
      available: true,
      message: 'Email disponible'
    });

  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

module.exports = router;