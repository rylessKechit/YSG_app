// backend/src/services/cloudinaryService.js
const { cloudinary } = require('../config/cloudinary');

// Configuration Cloudinary locale pour éviter les dépendances circulaires
const CLOUDINARY_CONFIG = {
  FOLDERS: {
    PREPARATIONS: 'vehicle-prep/preparations',
    INCIDENTS: 'vehicle-prep/incidents',
    PROFILES: 'vehicle-prep/profiles'
  },
  TRANSFORMATIONS: {
    COMPRESS: {
      quality: 'auto:good',
      format: 'auto',
      width: 1200,
      height: 1200,
      crop: 'limit'
    },
    MEDIUM: {
      quality: 'auto:good',
      format: 'auto',
      width: 800,
      height: 800,
      crop: 'limit'
    },
    THUMBNAIL: {
      quality: 'auto:good',
      format: 'auto',
      width: 300,
      height: 300,
      crop: 'fill'
    }
  }
};

// Configuration des fichiers
const FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp']
};

/**
 * Service pour gérer les uploads Cloudinary
 */
class CloudinaryService {
  
  /**
   * Upload une image vers Cloudinary
   * @param {Buffer} buffer - Buffer de l'image
   * @param {Object} options - Options d'upload
   * @returns {Promise<Object>} - Résultat de l'upload
   */
  static async uploadImage(buffer, options = {}) {
    try {
      const {
        folder = CLOUDINARY_CONFIG.FOLDERS.PREPARATIONS,
        filename = null,
        tags = []
      } = options;

      return new Promise((resolve, reject) => {
        const uploadOptions = {
          resource_type: 'image',
          folder: folder,
          tags: ['vehicle-prep', ...tags]
        };

        // Ajouter un nom de fichier personnalisé si fourni
        if (filename) {
          uploadOptions.public_id = `${folder}/${filename}`;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Erreur upload Cloudinary:', error);
              reject(new Error(`Échec de l'upload: ${error.message}`));
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes,
                createdAt: result.created_at
              });
            }
          }
        );

        uploadStream.end(buffer);
      });

    } catch (error) {
      console.error('Erreur service upload:', error);
      throw new Error('Erreur lors de l\'upload de l\'image');
    }
  }

  /**
   * Upload une photo de préparation
   * @param {Buffer} buffer - Buffer de l'image
   * @param {Object} metadata - Métadonnées (userId, vehicleId, stepType)
   * @returns {Promise<Object>} - Résultat de l'upload
   */
  static async uploadPreparationPhoto(buffer, metadata = {}) {
    try {
      const { userId, vehicleId, stepType, preparationId } = metadata;
      
      // Générer un nom de fichier descriptif
      const timestamp = Date.now();
      const filename = `prep_${preparationId || 'unknown'}_${stepType || 'step'}_${timestamp}`;

      const tags = [
        'preparation',
        stepType && `step-${stepType}`,
        userId && `user-${userId}`,
        vehicleId && `vehicle-${vehicleId}`
      ].filter(Boolean);

      return await this.uploadImage(buffer, {
        folder: CLOUDINARY_CONFIG.FOLDERS.PREPARATIONS,
        filename,
        tags
      });

    } catch (error) {
      console.error('Erreur upload photo préparation:', error);
      throw error;
    }
  }

  /**
   * Upload une photo d'incident
   * @param {Buffer} buffer - Buffer de l'image
   * @param {Object} metadata - Métadonnées
   * @returns {Promise<Object>} - Résultat de l'upload
   */
  static async uploadIncidentPhoto(buffer, metadata = {}) {
    try {
      const { userId, vehicleId, issueType, preparationId } = metadata;
      
      const timestamp = Date.now();
      const filename = `incident_${preparationId || 'unknown'}_${issueType || 'issue'}_${timestamp}`;

      const tags = [
        'incident',
        issueType && `issue-${issueType}`,
        userId && `user-${userId}`,
        vehicleId && `vehicle-${vehicleId}`
      ].filter(Boolean);

      return await this.uploadImage(buffer, {
        folder: CLOUDINARY_CONFIG.FOLDERS.INCIDENTS,
        filename,
        tags
      });

    } catch (error) {
      console.error('Erreur upload photo incident:', error);
      throw error;
    }
  }

  /**
   * Supprimer une image de Cloudinary
   * @param {string} publicId - ID public de l'image
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  static async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        return { success: true, publicId };
      } else {
        throw new Error(`Échec suppression: ${result.result}`);
      }
    } catch (error) {
      console.error('Erreur suppression Cloudinary:', error);
      throw new Error('Erreur lors de la suppression de l\'image');
    }
  }

  /**
   * Supprimer plusieurs images
   * @param {Array<string>} publicIds - Liste des IDs publics
   * @returns {Promise<Object>} - Résultat de la suppression
   */
  static async deleteMultipleImages(publicIds) {
    try {
      if (!Array.isArray(publicIds) || publicIds.length === 0) {
        return { success: true, deleted: {}, message: 'Aucune image à supprimer' };
      }

      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      console.error('Erreur suppression multiple Cloudinary:', error);
      throw new Error('Erreur lors de la suppression des images');
    }
  }

  /**
   * Valider un fichier image
   * @param {Object} file - Fichier Multer
   * @returns {Object} - Résultat de la validation
   */
  static validateImageFile(file) {
    const errors = [];

    if (!file) {
      errors.push('Aucun fichier fourni');
      return { isValid: false, errors };
    }

    // Vérifier la taille du fichier
    if (file.size > FILE_CONFIG.MAX_SIZE) {
      errors.push(`Fichier trop volumineux. Taille maximum: ${FILE_CONFIG.MAX_SIZE / 1024 / 1024}MB`);
    }

    // Vérifier le type MIME
    if (!FILE_CONFIG.ALLOWED_TYPES.includes(file.mimetype)) {
      errors.push(`Type de fichier non autorisé. Types acceptés: ${FILE_CONFIG.ALLOWED_TYPES.join(', ')}`);
    }

    // Vérifier l'extension
    if (file.originalname) {
      const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (!FILE_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
        errors.push(`Extension non autorisée. Extensions acceptées: ${FILE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Générer une URL de transformation
   * @param {string} publicId - ID public de l'image
   * @param {Object} transformation - Transformation à appliquer
   * @returns {string} - URL transformée
   */
  static getTransformedUrl(publicId, transformation = CLOUDINARY_CONFIG.TRANSFORMATIONS.MEDIUM) {
    try {
      return cloudinary.url(publicId, {
        ...transformation,
        secure: true
      });
    } catch (error) {
      console.error('Erreur génération URL transformée:', error);
      return null;
    }
  }

  /**
   * Obtenir les métadonnées d'une image
   * @param {string} publicId - ID public de l'image
   * @returns {Promise<Object>} - Métadonnées de l'image
   */
  static async getImageMetadata(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at,
        tags: result.tags || []
      };
    } catch (error) {
      console.error('Erreur récupération métadonnées:', error);
      throw new Error('Erreur lors de la récupération des métadonnées');
    }
  }

  /**
   * Nettoyer les images orphelines (optionnel, pour maintenance)
   * @param {Array<string>} referencedPublicIds - IDs des images encore référencées
   * @returns {Promise<Object>} - Résultat du nettoyage
   */
  static async cleanupOrphanedImages(referencedPublicIds = []) {
    try {
      // Récupérer toutes les images du dossier préparations
      const folderImages = await cloudinary.api.resources({
        type: 'upload',
        prefix: CLOUDINARY_CONFIG.FOLDERS.PREPARATIONS,
        max_results: 500
      });

      // Identifier les images orphelines
      const orphanedImages = folderImages.resources.filter(
        image => !referencedPublicIds.includes(image.public_id)
      );

      if (orphanedImages.length === 0) {
        return { success: true, deletedCount: 0, message: 'Aucune image orpheline trouvée' };
      }

      // Supprimer les images orphelines
      const orphanedIds = orphanedImages.map(img => img.public_id);
      const result = await this.deleteMultipleImages(orphanedIds);

      return {
        success: true,
        deletedCount: Object.keys(result.deleted || {}).length,
        orphanedIds,
        message: `${Object.keys(result.deleted || {}).length} images orphelines supprimées`
      };

    } catch (error) {
      console.error('Erreur nettoyage images orphelines:', error);
      throw new Error('Erreur lors du nettoyage des images orphelines');
    }
  }
}

module.exports = CloudinaryService;