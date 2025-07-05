// backend/src/routes/admin/users/index.js
// ✅ Fichier INDEX manquant pour les routes admin/users

const express = require('express');
const router = express.Router();

// ✅ Import des middlewares d'authentification
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');

// ✅ Application des middlewares pour toutes les routes
router.use(auth, adminAuth);

// ===== MONTAGE DES SOUS-ROUTES =====

try {
  // Routes CRUD principales des utilisateurs
  router.use('/', require('./users'));
  console.log('✅ Routes admin/users/users chargées');
} catch (error) {
  console.error('❌ Erreur chargement routes admin/users/users:', error.message);
  // Route de fallback pour éviter le crash
  router.use('/', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service utilisateurs temporairement indisponible',
      error: 'Module users.js non trouvé'
    });
  });
}

try {
  // Routes des profils utilisateurs détaillés
  router.use('/', require('./profile-complete'));
  console.log('✅ Routes admin/users/profile-complete chargées');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/users/profile-complete:', error.message);
}

// ===== ROUTES DE VÉRIFICATION =====

/**
 * @route   POST /api/admin/users/check-email
 * @desc    Vérifier si un email est disponible
 * @access  Admin
 */
router.post('/check-email', async (req, res) => {
  try {
    const { email, excludeUserId } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis'
      });
    }

    const query = { email: email.toLowerCase() };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const User = require('../../../models/User');
    const existingUser = await User.findOne(query);

    res.json({
      success: true,
      data: {
        available: !existingUser,
        email: email.toLowerCase()
      }
    });

  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de l\'email'
    });
  }
});

/**
 * @route   GET /api/admin/users/roles
 * @desc    Obtenir la liste des rôles disponibles
 * @access  Admin
 */
router.get('/roles', (req, res) => {
  try {
    const { USER_ROLES } = require('../../../utils/constants');
    
    const roles = Object.entries(USER_ROLES).map(([key, value]) => ({
      key,
      value,
      label: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
    }));

    res.json({
      success: true,
      data: { roles }
    });

  } catch (error) {
    console.error('Erreur récupération rôles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des rôles'
    });
  }
});

module.exports = router;