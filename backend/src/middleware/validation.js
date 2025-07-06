// backend/src/middleware/validation.js
// ✅ CORRECTION COMPLÈTE du middleware de validation

const Joi = require('joi');
const mongoose = require('mongoose');
const { PREPARATION_STEPS, PREPARATION_STATUS } = require('../utils/constants');

// ===== VALIDATION HELPERS =====

// Validation ObjectId MongoDB
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation').messages({
  'any.invalid': 'ID invalide'
});

// Pattern pour les heures (HH:MM)
const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const timeFormat = Joi.string().pattern(timePattern).messages({
  'string.pattern.base': 'Format horaire invalide (HH:MM attendu)'
});

// ===== SCHÉMAS DE VALIDATION =====

// ✅ Schémas d'authentification
const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Format d\'email invalide',
      'any.required': 'L\'email est requis'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Le mot de passe doit contenir au moins 6 caractères',
      'any.required': 'Le mot de passe est requis'
    })
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    role: Joi.string().valid('admin', 'preparateur', 'superviseur').default('preparateur')
  })
};

// ✅ Schémas de préparations (CORRIGÉS)
const preparationSchemas = {
  // Démarrer une préparation avec informations véhicule
  startWithVehicle: Joi.object({
    agencyId: objectId.required().messages({
      'any.required': 'L\'ID de l\'agence est requis'
    }),
    licensePlate: Joi.string().min(2).max(20).required().messages({
      'any.required': 'La plaque d\'immatriculation est requise',
      'string.min': 'La plaque doit contenir au moins 2 caractères',
      'string.max': 'La plaque ne peut pas dépasser 20 caractères'
    }),
    brand: Joi.string().min(2).max(50).required().messages({
      'any.required': 'La marque est requise'
    }),
    model: Joi.string().min(1).max(50).required().messages({
      'any.required': 'Le modèle est requis'
    }),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).optional(),
    fuelType: Joi.string().valid('essence', 'diesel', 'electrique', 'hybride').optional(),
    color: Joi.string().max(30).optional(),
    condition: Joi.string().valid('excellent', 'bon', 'correct', 'mediocre', 'mauvais').optional(),
    notes: Joi.string().max(500).optional().allow('')
  }),

  // Compléter une étape
  completeStep: Joi.object({
    step: Joi.string().valid(...Object.values(PREPARATION_STEPS)).required().messages({
      'any.required': 'Le type d\'étape est requis',
      'any.only': `Type d'étape invalide. Types autorisés: ${Object.values(PREPARATION_STEPS).join(', ')}`
    }),
    notes: Joi.string().max(500).optional().allow(''),
    photo: Joi.any().optional() // Géré par multer
  }),

  // Terminer une préparation
  completePreparation: Joi.object({
    notes: Joi.string().max(500).optional().allow(''),
    skipRemainingSteps: Joi.boolean().default(true)
  }),

  // Signaler un incident
  reportIssue: Joi.object({
    type: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(10).max(1000).required(),
    severity: Joi.string().valid('low', 'medium', 'high').default('medium'),
    photo: Joi.any().optional()
  }),

  // ✅ AJOUT: Mise à jour du statut (pour admin)
  statusUpdate: Joi.object({
    status: Joi.string().valid(...Object.values(PREPARATION_STATUS)).required(),
    notes: Joi.string().max(500).optional().allow('')
  })
};

// ✅ Schémas de requêtes avec filtres
const querySchemas = {
  // Liste des préparations avec filtres
  preparationsList: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('all', ...Object.values(PREPARATION_STATUS)).default('all'),
    agencyId: objectId.optional(),
    userId: objectId.optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional().min(Joi.ref('startDate')),
    search: Joi.string().max(100).optional().allow(''),
    sort: Joi.string().valid('startTime', 'endTime', 'progress', 'user', 'agency').default('startTime'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Recherche générale
  search: Joi.object({
    q: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid('preparations', 'vehicles', 'users', 'all').default('all'),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })
};

// ✅ Schémas de pointage
const timesheetSchemas = {
  clockIn: Joi.object({
    agencyId: objectId.required()
  }),

  clockOut: Joi.object({
    agencyId: objectId.required(),
    notes: Joi.string().max(500).optional().allow('')
  }),

  breakAction: Joi.object({
    agencyId: objectId.required(),
    notes: Joi.string().max(200).optional().allow('')
  })
};

// ✅ Schémas utilisateurs
const userSchemas = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    agencies: Joi.array().items(objectId).optional(),
    role: Joi.string().valid('admin', 'preparateur', 'superviseur').default('preparateur')
  }),

  update: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    agencies: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean().optional()
  })
};

// ✅ Schémas agences
const agencySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(10).required(),
    client: Joi.string().min(2).max(100).required(),
    address: Joi.string().max(200).optional(),
    city: Joi.string().max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    email: Joi.string().email().optional(),
    workingHours: Joi.object({
      start: timeFormat.required(),
      end: timeFormat.required(),
      break: Joi.object({
        start: timeFormat.optional(),
        end: timeFormat.optional()
      }).optional()
    }).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    code: Joi.string().min(2).max(10).optional(),
    client: Joi.string().min(2).max(100).optional(),
    address: Joi.string().max(200).optional(),
    city: Joi.string().max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    email: Joi.string().email().optional(),
    workingHours: Joi.object({
      start: timeFormat.optional(),
      end: timeFormat.optional(),
      break: Joi.object({
        start: timeFormat.optional(),
        end: timeFormat.optional()
      }).optional()
    }).optional(),
    isActive: Joi.boolean().optional()
  })
};

// ✅ Schémas véhicules  
const vehicleSchemas = {
  create: Joi.object({
    licensePlate: Joi.string().min(2).max(20).required(),
    brand: Joi.string().min(2).max(50).required(),
    model: Joi.string().min(1).max(50).required(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).optional(),
    fuelType: Joi.string().valid('essence', 'diesel', 'electrique', 'hybride').optional(),
    color: Joi.string().max(30).optional(),
    condition: Joi.string().valid('excellent', 'bon', 'correct', 'mediocre', 'mauvais').default('bon'),
    mileage: Joi.number().integer().min(0).optional(),
    location: Joi.string().max(100).optional(),
    notes: Joi.string().max(500).optional().allow('')
  }),

  update: Joi.object({
    brand: Joi.string().min(2).max(50).optional(),
    model: Joi.string().min(1).max(50).optional(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).optional(),
    fuelType: Joi.string().valid('essence', 'diesel', 'electrique', 'hybride').optional(),
    color: Joi.string().max(30).optional(),
    condition: Joi.string().valid('excellent', 'bon', 'correct', 'mediocre', 'mauvais').optional(),
    mileage: Joi.number().integer().min(0).optional(),
    location: Joi.string().max(100).optional(),
    status: Joi.string().valid('available', 'reserved', 'in_preparation', 'ready', 'rented', 'maintenance', 'out_of_service').optional(),
    notes: Joi.string().max(500).optional().allow('')
  })
};

// ===== MIDDLEWARES DE VALIDATION =====

/**
 * Middleware pour valider le body d'une requête
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errorMessages
        });
      }

      req.body = value;
      next();

    } catch (validationError) {
      console.error('❌ Erreur validation body:', validationError);
      res.status(500).json({
        success: false,
        message: 'Erreur de validation'
      });
    }
  };
};

/**
 * Middleware pour valider les paramètres de requête
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Paramètres de requête invalides',
          errors: errorMessages
        });
      }

      req.query = value;
      next();

    } catch (validationError) {
      console.error('❌ Erreur validation query:', validationError);
      res.status(500).json({
        success: false,
        message: 'Erreur de validation des paramètres'
      });
    }
  };
};

/**
 * Middleware pour valider un ObjectId dans les paramètres
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      const id = req.params[paramName];
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: `Paramètre ${paramName} requis`
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: `${paramName} invalide`
        });
      }

      next();

    } catch (error) {
      console.error('❌ Erreur validation ObjectId:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur de validation de l\'ID'
      });
    }
  };
};

/**
 * Middleware pour valider plusieurs ObjectIds
 */
const validateMultipleObjectIds = (fieldName) => {
  return (req, res, next) => {
    try {
      const ids = req.body[fieldName];
      
      if (!Array.isArray(ids)) {
        return res.status(400).json({
          success: false,
          message: `${fieldName} doit être un tableau`
        });
      }

      const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
      
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: `IDs invalides dans ${fieldName}: ${invalidIds.join(', ')}`
        });
      }

      next();

    } catch (error) {
      console.error('❌ Erreur validation ObjectIds multiples:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur de validation des IDs'
      });
    }
  };
};

/**
 * ✅ Middleware pour valider les uploads de préparation
 */
const validatePreparationUpload = (req, res, next) => {
  try {
    const { step, stepType } = req.body;
    const preparationId = req.params.id || req.params.preparationId || req.body.preparationId;

    // Valider le type d'étape
    const validSteps = Object.values(PREPARATION_STEPS);
    const stepToValidate = step || stepType;
    
    if (!stepToValidate) {
      return res.status(400).json({
        success: false,
        message: 'Le type d\'étape est requis'
      });
    }

    if (!validSteps.includes(stepToValidate)) {
      return res.status(400).json({
        success: false,
        message: `Type d'étape invalide: ${stepToValidate}. Types autorisés: ${validSteps.join(', ')}`
      });
    }

    if (!preparationId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de préparation est requis'
      });
    }

    // Valider l'ObjectId de la préparation
    const { error } = objectId.validate(preparationId);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'ID de préparation invalide'
      });
    }

    // Ajouter l'ID à req.body pour les middlewares suivants
    req.body.preparationId = preparationId;

    next();

  } catch (error) {
    console.error('❌ Erreur validation upload préparation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de validation de l\'upload'
    });
  }
};

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
 * Middleware pour valider les paramètres de pagination
 */
const validatePagination = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  });

  const { error, value } = schema.validate({
    page: req.query.page,
    limit: req.query.limit
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Paramètres de pagination invalides',
      errors: error.details.map(detail => detail.message)
    });
  }

  req.pagination = value;
  next();
};

/**
 * Middleware pour valider les filtres de date
 */
const validateDateFilters = (req, res, next) => {
  const schema = Joi.object({
    startDate: Joi.date().optional().iso(),
    endDate: Joi.date().optional().iso().min(Joi.ref('startDate'))
  });

  const { error, value } = schema.validate({
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Filtres de date invalides',
      errors: error.details.map(detail => detail.message)
    });
  }

  req.dateFilters = value;
  next();
};

// ===== EXPORTS =====

module.exports = {
  // Middlewares principaux
  validateBody,
  validateQuery,
  validateObjectId,
  validateMultipleObjectIds,
  
  // Schémas par catégorie
  preparationSchemas,
  querySchemas,
  authSchemas,
  timesheetSchemas,
  userSchemas,
  agencySchemas,
  vehicleSchemas,
  
  // Middlewares spécialisés
  validatePreparationUpload,
  requirePhoto,
  validatePagination,
  validateDateFilters,
  
  // Utilitaires
  objectId,
  timePattern,
  timeFormat
};