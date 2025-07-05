// backend/src/middleware/upload.js
const multer = require('multer');
const CloudinaryService = require('../services/cloudinaryService');

// Configuration locale pour éviter les dépendances circulaires
const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  MAX_FILES: 5
};

const ERROR_MESSAGES = {
  SERVER_ERROR: 'Erreur interne du serveur',
  UPLOAD_FAILED: 'Échec de l\'upload du fichier'
};

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
  if (error && error.message) {
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
      console.log('🔍 Début processCloudinaryUpload:', {
        uploadType,
        hasFile: !!req.file,
        hasFiles: !!req.files,
        fileInfo: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : 'none'
      });

      // Si pas de fichier, continuer (upload optionnel)
      if (!req.file && !req.files) {
        console.log('⚠️ Aucun fichier à uploader');
        return next();
      }

      const files = req.files || [req.file];
      const uploadedFiles = [];

      for (const file of files) {
        console.log('🔎 Traitement fichier:', {
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          hasBuffer: !!file.buffer
        });

        // Validation supplémentaire
        const validation = CloudinaryService.validateImageFile(file);
        if (!validation.isValid) {
          console.error('❌ Validation fichier échouée:', validation.errors);
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
              stepType: req.body.step, // ✅ Utilise 'step' au lieu de 'stepType'
              preparationId: req.params.id || req.params.preparationId || req.body.preparationId
            };
            break;
          case 'incident':
            metadata = {
              ...metadata,
              vehicleId: req.body.vehicleId || req.params.vehicleId,
              issueType: req.body.issueType,
              preparationId: req.params.id || req.params.preparationId || req.body.preparationId
            };
            break;
        }

        console.log('📋 Métadonnées upload:', metadata);

        // Upload vers Cloudinary
        let uploadResult;
        
        try {
          switch (uploadType) {
            case 'preparation':
              uploadResult = await CloudinaryService.uploadPreparationPhoto(file.buffer, metadata);
              break;
            case 'incident':
              uploadResult = await CloudinaryService.uploadIncidentPhoto(file.buffer, metadata);
              break;
            default:
              uploadResult = await CloudinaryService.uploadImage(file.buffer, {
                folder: 'general',
                tags: ['upload', req.user?.userId]
              });
          }
          
          console.log('✅ Résultat upload Cloudinary:', {
            url: uploadResult.url,
            secure_url: uploadResult.secure_url,
            publicId: uploadResult.publicId,
            bytes: uploadResult.bytes
          });
          
          uploadedFiles.push({
            ...uploadResult,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
          });
          
        } catch (cloudinaryError) {
          console.error('❌ Erreur upload Cloudinary:', cloudinaryError);
          return res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'upload de l\'image vers Cloudinary'
          });
        }
      }

      // ✅ Définir req.uploadedFile pour compatibilité
      if (uploadedFiles.length === 1) {
        req.uploadedFile = uploadedFiles[0];
      }
      req.uploadedFiles = uploadedFiles;

      console.log('✅ Upload terminé, uploadedFile défini:', {
        hasUploadedFile: !!req.uploadedFile,
        url: req.uploadedFile?.url,
        secure_url: req.uploadedFile?.secure_url
      });

      next();

    } catch (error) {
      console.error('❌ Erreur processCloudinaryUpload:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'upload du fichier'
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
  const { stepType } = req.body;
  const preparationId = req.params.id || req.params.preparationId || req.body.preparationId;

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

  // Ajouter l'ID à req.body pour les middlewares suivants
  req.body.preparationId = preparationId;

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