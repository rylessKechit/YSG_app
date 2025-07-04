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

// ===== SCHÉMAS DE VALIDATION CORRIGÉS =====
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

// 🔧 SCHÉMA CORRIGÉ - Support des deux formats
const userSearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().min(1).max(100).optional().allow(''),
  
  // Support des deux formats pour rétrocompatibilité
  agence: objectId.optional(),          // Format documentation 
  agency: objectId.optional(),          // Format frontend
  
  statut: Joi.string().valid('all', 'active', 'inactive').optional(), // Format documentation
  status: Joi.string().valid('all', 'active', 'inactive').optional(), // Format frontend
  
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

    // Créer l'utilisateur
    const user = new User({
      email: email.toLowerCase(),
      password: password,
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
 * @desc    Liste des utilisateurs avec filtres et recherche - VERSION CORRIGÉE
 * @access  Admin
 */
router.get('/', validateQuery(userSearchSchema), async (req, res) => {
  try {
    console.log('🔍 Requête GET /api/admin/users avec params:', req.query);
    
    // 🔧 NORMALISATION DES PARAMÈTRES - Support des deux formats
    const { 
      page, 
      limit, 
      search, 
      role, 
      sort, 
      order 
    } = req.query;
    
    // Normaliser agency/agence
    const agencyFilter = req.query.agency || req.query.agence;
    
    // Normaliser status/statut avec valeur par défaut
    const statusFilter = req.query.status || req.query.statut || 'all';

    console.log('📊 Filtres normalisés:', {
      page,
      limit,
      search,
      agency: agencyFilter,
      status: statusFilter,
      role,
      sort,
      order
    });

    // Construire les filtres MongoDB
    const filters = {};
    
    // Filtre de recherche
    if (search && search.trim() !== '') {
      filters.$or = [
        { firstName: { $regex: search.trim(), $options: 'i' } },
        { lastName: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // Filtre agence
    if (agencyFilter) {
      filters.agencies = agencyFilter;
    }

    // Filtre statut
    if (statusFilter !== 'all') {
      filters.isActive = statusFilter === 'active';
    }

    // Filtre rôle
    if (role) {
      filters.role = role;
    }

    console.log('🎯 Filtres MongoDB:', filters);

    // Compter le total
    const total = await User.countDocuments(filters);
    console.log('📈 Total utilisateurs trouvés:', total);

    // Récupérer les utilisateurs avec pagination
    const users = await User.find(filters)
      .populate('agencies', 'name code client')
      .select('-password')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log('👥 Utilisateurs récupérés:', users.length);

    // Calculer les statistiques globales
    const stats = await User.aggregate([
      { $match: {} }, // Toutes les données pour les stats
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

    // Construire la réponse
    const response = {
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
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: {
          search: search || '',
          agency: agencyFilter || null,
          status: statusFilter,
          role: role || null
        },
        stats: stats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          preparateurs: 0,
          admins: 0
        }
      }
    };

    console.log('✅ Réponse envoyée:', {
      usersCount: response.data.users.length,
      pagination: response.data.pagination,
      filters: response.data.filters
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      if (req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
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
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
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
          message: 'Impossible de désactiver le dernier administrateur'
        });
      }
    }

    user.isActive = false;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès'
    });

  } catch (error) {
    console.error('Erreur désactivation utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   PATCH /api/admin/users/:id/reactivate
 * @desc    Réactiver un utilisateur
 * @access  Admin
 */
router.patch('/:id/reactivate', validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur est déjà actif'
      });
    }

    // Réactiver l'utilisateur
    user.isActive = true;
    user.updatedAt = new Date();
    await user.save();

    // Charger les agences pour la réponse
    await user.populate('agencies', 'name code client');

    console.log(`✅ Utilisateur ${user.email} réactivé par ${req.user.email}`);

    res.json({
      success: true,
      message: 'Utilisateur réactivé avec succès',
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
    console.error('Erreur réactivation utilisateur:', error);
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

    const existingUser = await User.findOne(query);

    res.json({
      success: true,
      available: !existingUser,
      message: existingUser ? 'Email déjà utilisé' : 'Email disponible'
    });

  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Réinitialiser le mot de passe d'un utilisateur
 * @access  Admin
 */
router.post('/:id/reset-password', validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Mettre à jour l'utilisateur
    user.password = hashedPassword;
    user.mustChangePassword = true; // Flag pour forcer le changement de mot de passe
    user.updatedAt = new Date();
    await user.save();

    console.log(`🔑 Mot de passe réinitialisé pour ${user.email} par ${req.user.email}`);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
      data: {
        tempPassword: tempPassword,
        userId: user._id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

module.exports = router;