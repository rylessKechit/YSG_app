// ===== backend/src/routes/admin/users-bulk.js =====
const express = require('express');
const Joi = require('joi');
const User = require('../../models/User');
const Agency = require('../../models/Agency');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateBody } = require('../../middleware/validation');
const { objectId } = require('../../middleware/validation');
const { ERROR_MESSAGES, USER_ROLES } = require('../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/users/bulk-actions
 * @desc    Actions en masse sur les utilisateurs
 * @access  Admin
 */
router.post('/', validateBody(Joi.object({
  action: Joi.string().valid('activate', 'deactivate', 'change_agency', 'export').required(),
  userIds: Joi.array().items(objectId).min(1).required(),
  params: Joi.object({
    newAgencyId: objectId.optional(),
    format: Joi.string().valid('excel', 'csv').optional(),
    notify: Joi.boolean().default(false)
  }).optional()
})), async (req, res) => {
  try {
    const { action, userIds, params = {} } = req.body;
    
    // Vérifier que tous les utilisateurs existent
    const users = await User.find({ 
      _id: { $in: userIds },
      role: USER_ROLES.PREPARATEUR // Sécurité: seulement les préparateurs
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Certains utilisateurs sont introuvables'
      });
    }

    const results = [];
    let processed = 0;
    let failed = 0;

    for (const user of users) {
      try {
        switch (action) {
          case 'activate':
            user.isActive = true;
            await user.save();
            break;
            
          case 'deactivate':
            // Empêcher la désactivation du dernier admin
            if (user.role === USER_ROLES.ADMIN) {
              const adminCount = await User.countDocuments({ 
                role: USER_ROLES.ADMIN, 
                isActive: true 
              });
              if (adminCount <= 1) {
                throw new Error('Impossible de désactiver le dernier administrateur');
              }
            }
            user.isActive = false;
            await user.save();
            break;
            
          case 'change_agency':
            if (!params.newAgencyId) {
              throw new Error('ID agence requis pour changement');
            }
            // Vérifier que l'agence existe
            const agency = await Agency.findById(params.newAgencyId);
            if (!agency) {
              throw new Error('Agence introuvable');
            }
            user.agencies = [params.newAgencyId];
            await user.save();
            break;
            
          case 'export':
            // L'export sera géré après la boucle
            break;
        }

        results.push({
          userId: user._id,
          status: 'success',
          message: `${action} réussie`
        });
        processed++;

        // Envoyer notification si demandé
        if (params.notify && ['activate', 'deactivate', 'change_agency'].includes(action)) {
          // TODO: Implémenter service de notification
          console.log(`Notification à envoyer à ${user.email} pour ${action}`);
        }

      } catch (error) {
        results.push({
          userId: user._id,
          status: 'failed',
          message: error.message
        });
        failed++;
      }
    }

    // Gestion de l'export
    if (action === 'export') {
      const exportData = users.map(user => ({
        'Prénom': user.firstName,
        'Nom': user.lastName,
        'Email': user.email,
        'Téléphone': user.phone || '',
        'Agences': user.agencies.map(a => a.name).join(', '),
        'Statut': user.isActive ? 'Actif' : 'Inactif',
        'Dernière connexion': user.lastLogin ? user.lastLogin.toLocaleDateString('fr-FR') : 'Jamais',
        'Date création': user.createdAt.toLocaleDateString('fr-FR')
      }));

      // Pour un vrai projet, vous pourriez utiliser une lib comme 'exceljs' ou 'json2csv'
      return res.json({
        success: true,
        data: {
          action: 'export',
          format: params.format || 'csv',
          data: exportData,
          filename: `preparateurs_${new Date().toISOString().split('T')[0]}.${params.format || 'csv'}`
        }
      });
    }

    res.json({
      success: true,
      data: {
        action,
        processed,
        failed,
        results
      }
    });

  } catch (error) {
    console.error('Erreur action en masse:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/users/check-email
 * @desc    Vérifier disponibilité email
 * @access  Admin
 */
router.post('/check-email', validateBody(Joi.object({
  email: Joi.string().email().required(),
  excludeUserId: objectId.optional()
})), async (req, res) => {
  try {
    const { email, excludeUserId } = req.body;
    
    const query = { 
      email: email.toLowerCase(),
      isActive: true
    };
    
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    
    const existingUser = await User.findOne(query).select('firstName lastName');
    
    if (existingUser) {
      return res.json({
        success: true,
        data: {
          available: false,
          message: `Email déjà utilisé par ${existingUser.firstName} ${existingUser.lastName}`
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        available: true,
        message: 'Email disponible'
      }
    });

  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;