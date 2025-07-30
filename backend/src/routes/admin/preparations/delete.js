// backend/src/routes/admin/preparations/delete.js - ROUTES DE SUPPRESSION

const express = require('express');
const router = express.Router();
const Joi = require('joi');

const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId } = require('../../../middleware/validation');

const Preparation = require('../../../models/Preparation');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, PREPARATION_STATUS } = require('../../../utils/constants');

// ===== SCHÉMAS DE VALIDATION =====

const deleteSingleSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required(),
  preserveData: Joi.boolean().default(false)
});

const deleteMultipleSchema = Joi.object({
  preparationIds: Joi.array().items(
    Joi.string().regex(/^[0-9a-fA-F]{24}$/)
  ).min(1).max(50).required(),
  reason: Joi.string().min(10).max(500).required(),
  preserveData: Joi.boolean().default(false)
});

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

/**
 * ✅ CORRECTION : Utiliser POST au lieu de DELETE pour avoir un body
 * @route   POST /api/admin/preparations/:id/delete
 * @desc    Supprimer une préparation spécifique
 * @access  Admin
 */
router.post('/:id/delete',
  validateObjectId(),
  validateBody(deleteSingleSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, preserveData } = req.body;
      const adminId = req.user.userId;

      console.log('🗑️ Suppression préparation:', id, 'Par:', req.user.email);
      console.log('📝 Reason:', reason, 'PreserveData:', preserveData);

      // Vérifier que la préparation existe
      const preparation = await Preparation.findById(id);
      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée'
        });
      }

      // Vérifier si déjà supprimée (soft delete)
      if (preparation.isDeleted) {
        return res.status(400).json({
          success: false,
          message: 'Préparation déjà supprimée'
        });
      }

      // Vérifier les contraintes métier
      if (preparation.status === 'in_progress') {
        console.log('⚠️ Suppression d\'une préparation en cours');
        // On peut quand même supprimer mais avec un avertissement
      }

      // Enregistrer les informations de suppression
      const deletionData = {
        deletedAt: new Date(),
        deletedBy: adminId,
        deletionReason: reason,
        preserveData,
        originalData: preserveData ? {
          id: preparation._id,
          vehicleInfo: `${preparation.vehicle?.brand} ${preparation.vehicle?.model}`,
          licensePlate: preparation.vehicle?.licensePlate,
          status: preparation.status,
          duration: preparation.totalTime,
          completedAt: preparation.endTime,
          agencyId: preparation.agency?.id
        } : null
      };

      if (preserveData) {
        // Si on préserve les données, marquer comme supprimé plutôt que supprimer
        await Preparation.findByIdAndUpdate(id, {
          isDeleted: true,
          deletionData
        });
        console.log('✅ Préparation marquée comme supprimée (données préservées)');
      } else {
        // Suppression complète
        await Preparation.findByIdAndDelete(id);
        console.log('✅ Préparation supprimée définitivement');
      }

      res.json({
        success: true,
        message: 'Préparation supprimée avec succès',
        data: {
          id,
          preserveData,
          deletedAt: deletionData.deletedAt
        }
      });

    } catch (error) {
      console.error('❌ Erreur suppression préparation:', error);
      
      // Gestion des erreurs spécifiques
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID de préparation invalide'
        });
      }
      
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
);

/**
 * @route   POST /api/admin/preparations/bulk-delete
 * @desc    Supprimer plusieurs préparations
 * @access  Admin
 */
router.post('/bulk-delete',
  validateBody(deleteMultipleSchema),
  async (req, res) => {
    try {
      const { preparationIds, reason, preserveData } = req.body;
      const adminId = req.user.userId;

      console.log('🗑️ Suppression multiple:', preparationIds.length, 'préparations');

      // Vérifier que toutes les préparations existent
      const preparations = await Preparation.find({
        _id: { $in: preparationIds },
        isDeleted: { $ne: true } // Exclure celles déjà supprimées
      });

      if (preparations.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucune préparation trouvée ou toutes déjà supprimées'
        });
      }

      // Statistiques avant suppression
      const stats = {
        total: preparations.length,
        completed: preparations.filter(p => p.status === 'completed').length,
        inProgress: preparations.filter(p => p.status === 'in_progress').length,
        pending: preparations.filter(p => p.status === 'pending').length,
        cancelled: preparations.filter(p => p.status === 'cancelled').length
      };

      console.log('📊 Statistiques suppression:', stats);

      const deletionData = {
        deletedAt: new Date(),
        deletedBy: adminId,
        deletionReason: reason,
        preserveData,
        bulkOperation: true,
        totalCount: preparations.length
      };

      let deletedCount = 0;
      const errors = [];

      // Traiter chaque préparation
      for (const preparation of preparations) {
        try {
          if (preserveData) {
            await Preparation.findByIdAndUpdate(preparation._id, {
              isDeleted: true,
              deletionData: {
                ...deletionData,
                originalData: {
                  id: preparation._id,
                  vehicleInfo: `${preparation.vehicle?.brand} ${preparation.vehicle?.model}`,
                  licensePlate: preparation.vehicle?.licensePlate,
                  status: preparation.status,
                  duration: preparation.totalTime,
                  completedAt: preparation.endTime,
                  agencyId: preparation.agency?.id
                }
              }
            });
          } else {
            await Preparation.findByIdAndDelete(preparation._id);
          }
          deletedCount++;
        } catch (error) {
          console.error(`❌ Erreur suppression ${preparation._id}:`, error);
          errors.push({
            id: preparation._id.toString(),
            error: error.message
          });
        }
      }

      console.log(`✅ Suppression terminée: ${deletedCount}/${preparations.length}`);

      res.json({
        success: true,
        message: `${deletedCount} préparation(s) supprimée(s) avec succès`,
        data: {
          deleted: deletedCount,
          total: preparations.length,
          preserveData,
          stats,
          errors: errors.length > 0 ? errors : undefined,
          deletedAt: deletionData.deletedAt
        }
      });

    } catch (error) {
      console.error('❌ Erreur suppression multiple:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
);

/**
 * @route   POST /api/admin/preparations/:id/soft-delete
 * @desc    Suppression logique (soft delete) d'une préparation
 * @access  Admin
 */
router.post('/:id/soft-delete',
  validateObjectId(),
  validateBody(deleteSingleSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.userId;

      console.log('🗑️ Soft delete préparation:', id);

      const preparation = await Preparation.findById(id);
      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée'
        });
      }

      if (preparation.isDeleted) {
        return res.status(400).json({
          success: false,
          message: 'Préparation déjà supprimée'
        });
      }

      // Marquer comme supprimé logiquement
      const updatedPreparation = await Preparation.findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletionData: {
            deletedAt: new Date(),
            deletedBy: adminId,
            deletionReason: reason,
            preserveData: true,
            type: 'soft_delete'
          }
        },
        { new: true }
      );

      console.log('✅ Soft delete terminé');

      res.json({
        success: true,
        message: 'Préparation supprimée (suppression logique)',
        data: {
          id,
          isDeleted: true,
          deletedAt: updatedPreparation.deletionData.deletedAt
        }
      });

    } catch (error) {
      console.error('❌ Erreur soft delete:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
);

/**
 * @route   POST /api/admin/preparations/:id/restore
 * @desc    Restaurer une préparation supprimée logiquement
 * @access  Admin
 */
router.post('/:id/restore',
  validateObjectId(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.userId;

      console.log('🔄 Restauration préparation:', id);

      const preparation = await Preparation.findById(id);
      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée'
        });
      }

      if (!preparation.isDeleted) {
        return res.status(400).json({
          success: false,
          message: 'Préparation non supprimée'
        });
      }

      // Restaurer la préparation
      const restoredPreparation = await Preparation.findByIdAndUpdate(
        id,
        {
          $unset: { isDeleted: 1, deletionData: 1 },
          restoredAt: new Date(),
          restoredBy: adminId
        },
        { new: true }
      );

      console.log('✅ Préparation restaurée');

      res.json({
        success: true,
        message: 'Préparation restaurée avec succès',
        data: {
          id,
          restoredAt: restoredPreparation.restoredAt
        }
      });

    } catch (error) {
      console.error('❌ Erreur restauration:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
);

module.exports = router;