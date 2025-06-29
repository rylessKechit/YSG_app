// ===== backend/src/routes/admin/users/bulk-actions.js =====
const express = require('express');
const Joi = require('joi');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES, USER_ROLES } = require('../../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/users/bulk-actions
 * @desc    Actions en masse sur les utilisateurs
 * @access  Admin
 */
router.post('/bulk-actions', validateBody(Joi.object({
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
    
    console.log(`🔄 Action en masse: ${action} sur ${userIds.length} utilisateurs`);
    
    // Vérifier que tous les utilisateurs existent
    const users = await User.find({ 
      _id: { $in: userIds }
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
            if (!user.isActive) {
              user.isActive = true;
              user.updatedAt = new Date();
              await user.save();
              results.push({ userId: user._id, status: 'activated' });
            } else {
              results.push({ userId: user._id, status: 'already_active' });
            }
            break;
            
          case 'deactivate':
            // Empêcher la désactivation du dernier admin
            if (user.role === USER_ROLES.ADMIN) {
              const adminCount = await User.countDocuments({ 
                role: USER_ROLES.ADMIN, 
                isActive: true,
                _id: { $ne: user._id }
              });
              if (adminCount === 0) {
                results.push({ 
                  userId: user._id, 
                  status: 'error', 
                  error: 'Impossible de désactiver le dernier administrateur' 
                });
                failed++;
                continue;
              }
            }
            
            if (user.isActive) {
              user.isActive = false;
              user.updatedAt = new Date();
              await user.save();
              results.push({ userId: user._id, status: 'deactivated' });
            } else {
              results.push({ userId: user._id, status: 'already_inactive' });
            }
            break;
            
          case 'change_agency':
            if (!params.newAgencyId) {
              throw new Error('ID agence requis pour changement');
            }
            
            // Vérifier que l'agence existe
            const agency = await Agency.findById(params.newAgencyId);
            if (!agency) {
              throw new Error('Agence non trouvée');
            }
            
            user.agencies = [params.newAgencyId];
            user.updatedAt = new Date();
            await user.save();
            results.push({ 
              userId: user._id, 
              status: 'agency_changed',
              newAgency: agency.name 
            });
            break;
            
          case 'export':
            // Pour l'export, on collecte juste les données
            results.push({
              userId: user._id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              isActive: user.isActive,
              agencies: user.agencies
            });
            break;
            
          default:
            throw new Error(`Action non supportée: ${action}`);
        }
        
        processed++;
        
      } catch (userError) {
        console.error(`Erreur pour utilisateur ${user._id}:`, userError);
        results.push({ 
          userId: user._id, 
          status: 'error', 
          error: userError.message 
        });
        failed++;
      }
    }

    // Logging de l'action
    console.log(`✅ Action ${action} terminée: ${processed} réussies, ${failed} échecs`);

    // Réponse selon le type d'action
    if (action === 'export') {
      const format = params.format || 'json';
      
      if (format === 'csv') {
        // Générer CSV
        const csvHeader = 'Email,Prénom,Nom,Rôle,Statut,Agences\n';
        const csvData = results.map(user => 
          `${user.email},"${user.firstName}","${user.lastName}",${user.role},${user.isActive ? 'Actif' : 'Inactif'},"${user.agencies.length}"`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="utilisateurs.csv"');
        res.send(csvHeader + csvData);
        return;
      }
      
      // Export JSON par défaut
      res.json({
        success: true,
        action: 'export',
        data: {
          users: results,
          exportedAt: new Date(),
          exportedBy: req.user.email,
          total: results.length
        }
      });
      
    } else {
      // Réponse standard pour les autres actions
      res.json({
        success: true,
        action,
        data: {
          processed,
          failed,
          total: userIds.length,
          results: results,
          performedBy: req.user.email,
          performedAt: new Date()
        }
      });
    }

  } catch (error) {
    console.error('Erreur action en masse:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;