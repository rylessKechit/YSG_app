// backend/src/middleware/validation.js
const Joi = require('joi');

// ===== SCHÉMAS DE BASE =====

// Schéma pour valider un ObjectId MongoDB
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'valid ObjectId');

// Schéma pour les heures (format HH:MM)
const timePattern = Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);

// ===== MIDDLEWARE DE VALIDATION =====

/**
 * Middleware pour valider le body de la requête
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false
      });

      if (error) {
        console.log('❌ Erreur validation body:', error.details);
        
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors
        });
      }

      req.body = value;
      next();
    } catch (err) {
      console.error('❌ Erreur validation body:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la validation des données'
      });
    }
  };
};

/**
 * Middleware pour valider les paramètres de requête (query)
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false
      });

      if (error) {
        console.log('❌ Erreur validation query:', error.details);
        
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          success: false,
          message: 'Paramètres de requête invalides',
          errors
        });
      }

      req.query = value;
      next();
    } catch (err) {
      console.error('❌ Erreur validation query:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la validation des paramètres'
      });
    }
  };
};

/**
 * Middleware pour valider un ObjectId dans les paramètres
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `Paramètre ${paramName} manquant`
      });
    }

    const { error } = objectId.validate(id);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: `${paramName} invalide - doit être un ObjectId MongoDB valide`
      });
    }

    next();
  };
};

/**
 * Middleware pour valider plusieurs ObjectIds dans les paramètres
 */
const validateMultipleObjectIds = (...paramNames) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      
      if (!id) {
        errors.push(`Paramètre ${paramName} manquant`);
        continue;
      }
      
      const { error } = objectId.validate(id);
      if (error) {
        errors.push(`${paramName} invalide`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres invalides',
        errors
      });
    }
    
    next();
  };
};

// ===== SCHÉMAS DE VALIDATION POUR LES PRÉPARATIONS =====

const preparationSchemas = {
  // ✅ Schéma minimal pour démarrer une préparation
  startWithVehicle: Joi.object({
    agencyId: objectId.required().messages({
      'any.required': 'L\'ID de l\'agence est requis',
      'string.pattern.name': 'L\'ID de l\'agence doit être un ObjectId valide'
    }),
    licensePlate: Joi.string()
      .required()
      .trim()
      .uppercase()
      .min(2)
      .max(15)
      .pattern(/^[A-Z0-9\-\s]+$/, 'plaque d\'immatriculation valide')
      .messages({
        'any.required': 'La plaque d\'immatriculation est requise',
        'string.min': 'La plaque doit contenir au moins 2 caractères',
        'string.max': 'La plaque ne peut pas dépasser 15 caractères',
        'string.pattern.name': 'Format de plaque invalide'
      }),
    brand: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(50)
      .messages({
        'any.required': 'La marque du véhicule est requise',
        'string.max': 'La marque ne peut pas dépasser 50 caractères'
      }),
    model: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(50)
      .messages({
        'any.required': 'Le modèle du véhicule est requis',
        'string.max': 'Le modèle ne peut pas dépasser 50 caractères'
      }),
  }),

  // Finaliser une préparation
  completePreparation: Joi.object({
    notes: Joi.string()
      .optional()
      .allow('')
      .max(500)
      .messages({
        'string.max': 'Les notes ne peuvent pas dépasser 500 caractères'
      })
  }),

  // Signaler un incident
  reportIssue: Joi.object({
    type: Joi.string()
      .required()
      .valid('damage', 'missing_item', 'malfunction', 'cleanliness', 'fuel', 'other')
      .messages({
        'any.required': 'Le type d\'incident est requis',
        'any.only': 'Type d\'incident invalide'
      }),
    description: Joi.string()
      .required()
      .trim()
      .min(10)
      .max(500)
      .messages({
        'any.required': 'La description est requise',
        'string.min': 'La description doit contenir au moins 10 caractères',
        'string.max': 'La description ne peut pas dépasser 500 caractères'
      }),
    severity: Joi.string()
      .valid('low', 'medium', 'high')
      .default('medium')
  })
};

// ===== SCHÉMAS DE VALIDATION POUR LES REQUÊTES =====

const querySchemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // Filtres de date
  dateFilters: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }),

  // Recherche générale
  search: Joi.object({
    q: Joi.string().trim().min(1).max(100),
    agencyId: objectId.optional(),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').optional()
  })
};

// ===== SCHÉMAS DE VALIDATION POUR L'AUTHENTIFICATION =====

const authSchemas = {
  // Connexion
  login: Joi.object({
    email: Joi.string()
      .required()
      .email()
      .lowercase()
      .trim()
      .messages({
        'any.required': 'L\'email est requis',
        'string.email': 'Format d\'email invalide'
      }),
    password: Joi.string()
      .required()
      .min(6)
      .messages({
        'any.required': 'Le mot de passe est requis',
        'string.min': 'Le mot de passe doit contenir au moins 6 caractères'
      })
  }),

  // Inscription
  register: Joi.object({
    email: Joi.string()
      .required()
      .email()
      .lowercase()
      .trim(),
    password: Joi.string()
      .required()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'mot de passe fort'),
    firstName: Joi.string()
      .required()
      .trim()
      .min(2)
      .max(50),
    lastName: Joi.string()
      .required()
      .trim()
      .min(2)
      .max(50),
    role: Joi.string()
      .valid('admin', 'preparateur')
      .default('preparateur')
  })
};

// ===== SCHÉMAS DE VALIDATION POUR LES POINTAGES =====

const timesheetSchemas = {
  // Pointer
  clockAction: Joi.object({
    agencyId: objectId.required()
  }),

  // Pause
  breakAction: Joi.object({
    agencyId: objectId.required()
  })
};

// ===== SCHÉMAS DE VALIDATION POUR LES UTILISATEURS =====

const userSchemas = {
  // Créer un utilisateur
  createUser: Joi.object({
    email: Joi.string()
      .required()
      .email()
      .lowercase()
      .trim(),
    password: Joi.string()
      .required()
      .min(8),
    firstName: Joi.string()
      .required()
      .trim()
      .max(50),
    lastName: Joi.string()
      .required()
      .trim()
      .max(50),
    role: Joi.string()
      .valid('admin', 'preparateur')
      .default('preparateur'),
    agencies: Joi.array()
      .items(objectId)
      .default([])
  }),

  // Mettre à jour un utilisateur
  updateUser: Joi.object({
    firstName: Joi.string().optional().trim().max(50),
    lastName: Joi.string().optional().trim().max(50),
    email: Joi.string().optional().email().lowercase().trim(),
    role: Joi.string().optional().valid('admin', 'preparateur'),
    agencies: Joi.array().optional().items(objectId),
    isActive: Joi.boolean().optional()
  })
};

// ===== SCHÉMAS DE VALIDATION POUR LES AGENCES =====

const agencySchemas = {
  // Créer une agence
  createAgency: Joi.object({
    name: Joi.string()
      .required()
      .trim()
      .max(100),
    code: Joi.string()
      .required()
      .trim()
      .uppercase()
      .pattern(/^[A-Z0-9]{2,10}$/, 'code d\'agence valide'),
    client: Joi.string()
      .required()
      .trim()
      .max(100),
    address: Joi.object({
      street: Joi.string().required().trim().max(200),
      city: Joi.string().required().trim().max(100),
      zipCode: Joi.string().required().trim().max(10),
      country: Joi.string().required().trim().max(50)
    }).required(),
    workingHours: Joi.object({
      start: timePattern.required(),
      end: timePattern.required()
    }).required()
  }),

  // Mettre à jour une agence
  updateAgency: Joi.object({
    name: Joi.string().optional().trim().max(100),
    client: Joi.string().optional().trim().max(100),
    address: Joi.object({
      street: Joi.string().optional().trim().max(200),
      city: Joi.string().optional().trim().max(100),
      zipCode: Joi.string().optional().trim().max(10),
      country: Joi.string().optional().trim().max(50)
    }).optional(),
    workingHours: Joi.object({
      start: timePattern.optional(),
      end: timePattern.optional()
    }).optional(),
    isActive: Joi.boolean().optional()
  })
};

// ===== SCHÉMAS DE VALIDATION POUR LES VÉHICULES =====

const vehicleSchemas = {
  // Créer un véhicule
  createVehicle: Joi.object({
    licensePlate: Joi.string()
      .required()
      .trim()
      .uppercase()
      .max(15)
      .pattern(/^[A-Z0-9\-\s]+$/, 'plaque d\'immatriculation valide'),
    brand: Joi.string()
      .required()
      .trim()
      .max(50),
    model: Joi.string()
      .required()
      .trim()
      .max(50),
    year: Joi.number()
      .integer()
      .min(1990)
      .max(new Date().getFullYear() + 2)
      .optional(),
    fuelType: Joi.string()
      .valid('essence', 'diesel', 'electrique', 'hybride')
      .default('essence'),
    agencyId: objectId.required()
  }),

  // Mettre à jour un véhicule
  updateVehicle: Joi.object({
    brand: Joi.string().optional().trim().min(1).max(50),
    model: Joi.string().optional().trim().min(1).max(50),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 2).optional(),
    fuelType: Joi.string().valid('essence', 'diesel', 'electrique', 'hybride').optional(),
    status: Joi.string().valid('available', 'in_preparation', 'ready', 'rented').optional(),
    agencyId: objectId.optional()
  })
};

// ===== MIDDLEWARE SPÉCIALISÉS =====

/**
 * Middleware pour valider les paramètres d'upload de préparation
 */
const validatePreparationUpload = (req, res, next) => {
  const { step } = req.body;
  const preparationId = req.params.id || req.params.preparationId || req.body.preparationId;

  console.log('🔍 Validation upload préparation:', { step, preparationId });

  if (!step) {
    return res.status(400).json({
      success: false,
      message: 'Le type d\'étape (step) est requis'
    });
  }

  // ✅ Validation des types d'étapes autorisés
  const validSteps = ['exterior', 'interior', 'fuel', 'tires_fluids', 'special_wash', 'parking'];
  if (!validSteps.includes(step)) {
    return res.status(400).json({
      success: false,
      message: `Type d'étape invalide: ${step}. Types autorisés: ${validSteps.join(', ')}`
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
  timePattern
};