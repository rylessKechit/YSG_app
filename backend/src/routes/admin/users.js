const express = require('express');
const User = require('../../models/User');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery } = require('../../middleware/validation');
const { userSchemas, querySchemas } = require('../../middleware/validation');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, USER_ROLES } = require('../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification admin
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/users
 * @desc    Créer un nouveau préparateur
 * @access  Admin
 */
router.post('/', validateBody(userSchemas.create), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, agencies } = req.body;

    // Vérifier que l'email n'existe pas déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.USER_ALREADY_EXISTS
      });
    }

    // Créer le nouvel utilisateur
    const userData = {
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      agencies: agencies || [],
      role: USER_ROLES.PREPARATEUR // Toujours préparateur pour cette route
    };

    const user = new User(userData);
    await user.save();

    // Charger les agences pour la réponse
    await user.populate('agencies', 'name code client');

    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.USER_CREATED,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          role: user.role,
          phone: user.phone,
          agencies: user.agencies,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Obtenir la liste des préparateurs
 * @access  Admin
 */
router.get('/', validateQuery(querySchemas.pagination.concat(querySchemas.search)), async (req, res) => {
  try {
    const { page, limit, q: search, role, sort = 'createdAt', order = 'desc' } = req.query;

    // Construire les filtres
    const filters = {};
    if (search) filters.search = search;
    if (role) filters.role = role;

    // Rechercher les utilisateurs
    let query = User.findWithFilters(filters);

    // Appliquer le tri
    const sortObject = {};
    sortObject[sort] = order === 'asc' ? 1 : -1;
    query = query.sort(sortObject);

    // Appliquer la pagination
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(parseInt(limit));

    // Exécuter la requête
    const [users, totalCount] = await Promise.all([
      query.exec(),
      User.countDocuments(filters.search ? {
        isActive: true,
        $or: [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } }
        ]
      } : { isActive: true })
    ]);

    // Calculs de pagination
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          role: user.role,
          phone: user.phone,
          agencies: user.agencies,
          isActive: user.isActive,
          stats: user.stats,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
      .populate('agencies', 'name code client')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND
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
          fullName: user.getFullName(),
          role: user.role,
          phone: user.phone,
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
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Modifier un utilisateur
 * @access  Admin
 */
router.put('/:id', validateObjectId('id'), validateBody(userSchemas.update), async (req, res) => {
  try {
    const { firstName, lastName, phone, agencies, isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

    // Mettre à jour les champs modifiés
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (agencies !== undefined) user.agencies = agencies;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Charger les agences pour la réponse
    await user.populate('agencies', 'name code client');

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.USER_UPDATED,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          role: user.role,
          phone: user.phone,
          agencies: user.agencies,
          isActive: user.isActive,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur modification utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: ERROR_MESSAGES.USER_NOT_FOUND
      });
    }

    // Empêcher la suppression du dernier admin
    if (user.role === USER_ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ 
        role: USER_ROLES.ADMIN, 
        isActive: true 
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de désactiver le dernier administrateur'
        });
      }
    }

    // Soft delete - désactiver au lieu de supprimer
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.USER_DELETED
    });

  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/users/stats/overview
 * @desc    Obtenir les statistiques des utilisateurs
 * @access  Admin
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      preparateurUsers,
      recentLogins
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: USER_ROLES.ADMIN, isActive: true }),
      User.countDocuments({ role: USER_ROLES.PREPARATEUR, isActive: true }),
      User.countDocuments({ 
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isActive: true
      })
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          admins: adminUsers,
          preparateurs: preparateurUsers,
          recentLogins: recentLogins,
          loginRate: totalUsers > 0 ? Math.round((recentLogins / activeUsers) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur statistiques utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;