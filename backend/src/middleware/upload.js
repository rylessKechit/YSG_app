const multer = require('multer');
const CloudinaryService = require('../services/cloudinaryService');
const { FILE_LIMITS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Configuration Multer pour stockage en mémoire
 * Les fichiers sont stockés dans un buffer avant upload vers Cloudinary
 */
const storage = multer.memoryStorage();

/**
 * Filtre pour vérifier les types de fichiers
 */
const fileFilter = (req, file, cb) => {
  // Vérifier le type MIME
  if (FILE_LIMITS.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé. Types acceptés: ${FILE_LIMITS.ALLOWED_TYPES.join(', ')}`), false);
  }
};

/**
 * Configuration de base Multer
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: FILE_LIMITS.MAX_SIZE, // 5MB max
    files: 1 // 1 fichier max par upload
  },
  fileFilter: fileFilter
});

/**
 * Middleware pour upload d'une seule image
 */
const uploadSingle = (fieldName = 'photo') => {
  return upload.single(fieldName);
};

/**
 * Middleware pour upload multiple (maximum 5 images)
 */
const uploadMultiple = (fieldName = 'photos', maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Middleware pour gérer les erreurs d'upload Multer
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: `Fichier trop volumineux. Taille maximum: ${FILE_LIMITS.MAX_SIZE / 1024 / 1024}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Trop de fichiers uploadés'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Champ de fichier inattendu'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Erreur lors de l\'upload du fichier'
        });
    }
  }

  // Autres erreurs (ex: type de fichier non autorisé)
  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

/**
 * Middleware pour valider et uploader vers Cloudinary
 * Doit être utilisé APRÈS uploadSingle ou uploadMultiple
 */
const processCloudinaryUpload = (uploadType = 'preparation') => {
  return async (req, res, next) => {
    try {
      // Si pas de fichier, continuer (upload optionnel)
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files || [req.file];
      const uploadedFiles = [];

      for (const file of files) {
        // Validation supplémentaire
        const validation = CloudinaryService.validateImageFile(file);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.errors.join(', ')
          });
        }

        // Préparer les métadonnées selon le type d'upload
        let metadata = {
          userId: req.user?.userId,
          timestamp: Date.now()
        };

        switch (uploadType) {
          case 'preparation':
            metadata = {
              ...metadata,
              vehicleId: req.body.vehicleId || req.params.vehicleId,
              stepType: req.body.stepType,
              preparationId: req.body.preparationId || req.params.preparationId
            };
            break;
          case 'incident':
            metadata = {
              ...metadata,
              vehicleId: req.body.vehicleId || req.params.vehicleId,
              issueType: req.body.issueType,
              preparationId: req.body.preparationId || req.params.preparationId
            };
            break;
        }

        // Upload vers Cloudinary
        let uploadResult;
        switch (uploadType) {
          case 'preparation':
            uploadResult = await CloudinaryService.uploadPreparationPhoto(file.buffer, metadata);
            break;
          case 'incident':
            uploadResult = await CloudinaryService.uploadIncidentPhoto(file.buffer, metadata);
            break;
          default:
            uploadResult = await CloudinaryService.uploadImage(file.buffer, { tags: [uploadType] });
        }

        uploadedFiles.push({
          originalName: file.originalname,
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          size: uploadResult.bytes,
          dimensions: {
            width: uploadResult.width,
            height: uploadResult.height
          }
        });
      }

      // Ajouter les résultats à la requête
      if (req.file) {
        req.uploadedFile = uploadedFiles[0];
      } else {
        req.uploadedFiles = uploadedFiles;
      }

      next();

    } catch (error) {
      console.error('Erreur upload Cloudinary:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.UPLOAD_FAILED,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

/**
 * Middleware combiné pour upload photo de préparation
 */
const uploadPreparationPhoto = [
  uploadSingle('photo'),
  handleUploadError,
  processCloudinaryUpload('preparation')
];

/**
 * Middleware combiné pour upload photo d'incident
 */
const uploadIncidentPhoto = [
  uploadSingle('photo'),
  handleUploadError,
  processCloudinaryUpload('incident')
];

/**
 * Middleware combiné pour upload multiple
 */
const uploadMultiplePhotos = (maxCount = 5) => [
  uploadMultiple('photos', maxCount),
  handleUploadError,
  processCloudinaryUpload('preparation')
];

/**
 * Middleware pour valider qu'une photo a été uploadée
 */
const requirePhoto = (req, res, next) => {
  if (!req.uploadedFile && !req.uploadedFiles?.length) {
    return res.status(400).json({
      success: false,
      message: 'Une photo est requise pour cette action'
    });
  }
  next();
};

/**
 * Middleware pour valider les paramètres d'upload de préparation
 */
const validatePreparationUpload = (req, res, next) => {
  const { stepType, preparationId } = req.body;

  if (!stepType) {
    return res.status(400).json({
      success: false,
      message: 'Le type d\'étape est requis'
    });
  }

  if (!preparationId) {
    return res.status(400).json({
      success: false,
      message: 'L\'ID de préparation est requis'
    });
  }

  next();
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  processCloudinaryUpload,
  uploadPreparationPhoto,
  uploadIncidentPhoto,
  uploadMultiplePhotos,
  requirePhoto,
  validatePreparationUpload
};