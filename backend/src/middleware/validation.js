// backend/src/middleware/validation.js
// ✅ Fichier de validation corrigé complet

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
  // ✅ Schéma pour votre payload exact : { agencyId, brand, model, licensePlate, etc. }
  startPreparation: Joi.object({
    agencyId: objectId.required(),
    // Champs de véhicule directement au niveau racine (comme votre payload)
    licensePlate: Joi.string()
      .required()
      .trim()
      .min(2)
      .max(15)
      .pattern(/^[A-Z0-9\-\s]+$/i)
      .messages({
        'string.pattern.base': 'Format de plaque d\'immatriculation invalide'
      }),
    brand: Joi.string() // ✅ SUPPRIMÉ : .required()
      .trim()
      .max(50)
      .allow('') // ✅ AJOUTÉ : permet les chaînes vides
      .optional(),
    model: Joi.string().required().trim().min(1).max(50),
    notes: Joi.string().optional().trim().max(500).allow('')
  }),

  // ✅ Compléter une étape - SANS VALIDATION D'ORDRE
  completeStep: Joi.object({
    step: Joi.string()
      .required()
      .valid('exterior', 'interior', 'fuel', 'tires_fluids', 'special_wash', 'parking')
      .messages({
        'any.only': 'Type d\'étape invalide. Types autorisés: exterior, interior, fuel, tires_fluids, special_wash, parking'
      }),
    notes: Joi.string().optional().trim().max(500)
    // Photo gérée par le middleware d'upload
  }),

  // ✅ Terminer une préparation - FLEXIBLE
  completePreparation: Joi.object({
    notes: Joi.string().optional().trim().max(1000)
    // Plus de validation "toutes étapes complétées"
  }),

  // Signaler un incident
  reportIssue: Joi.object({
    type: Joi.string()
      .required()
      .valid('damage', 'cleanliness', 'missing_item', 'mechanical', 'other'),
    description: Joi.string().required().trim().min(10).max(500),
    severity: Joi.string().valid('low', 'medium', 'high').default('medium')
    // Photo gérée par le middleware d'upload
  }),

  // Recherche de préparations
  searchPreparations: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    agencyId: objectId.optional(),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').optional(),
    licensePlate: Joi.string().optional().trim().min(2).max(15)
  })
};

// ===== SCHÉMAS DE VALIDATION POUR LES REQUÊTES =====

const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional().min(Joi.ref('startDate'))
  }),

  preparationFilters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').optional(),
    agencyId: objectId.optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    search: Joi.string().optional().trim().max(100)
  })
};

// ===== SCHÉMAS D'AUTHENTIFICATION =====

const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required().min(6)
  }),

  register: Joi.object({
    firstName: Joi.string().required().trim().min(2).max(50),
    lastName: Joi.string().required().trim().min(2).max(50),
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
      }),
    role: Joi.string().valid('admin', 'preparateur').default('preparateur')
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  })
};

// ===== SCHÉMAS POUR LES TIMESHEETS =====

const timesheetSchemas = {
  clockIn: Joi.object({
    agencyId: objectId.required()
  }),

  clockOut: Joi.object({
    agencyId: objectId.required(),
    notes: Joi.string().optional().trim().max(300)
  }),

  breakAction: Joi.object({
    agencyId: objectId.required()
  })
};

// ===== SCHÉMAS POUR LES UTILISATEURS =====

const userSchemas = {
  createUser: Joi.object({
    firstName: Joi.string().required().trim().min(2).max(50),
    lastName: Joi.string().required().trim().min(2).max(50),
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required().min(8),
    role: Joi.string().valid('admin', 'preparateur').default('preparateur'),
    agencies: Joi.array().items(objectId).min(1).required()
  }),

  updateUser: Joi.object({
    firstName: Joi.string().optional().trim().min(2).max(50),
    lastName: Joi.string().optional().trim().min(2).max(50),
    email: Joi.string().email().optional().trim().lowercase(),
    role: Joi.string().valid('admin', 'preparateur').optional(),
    agencies: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean().optional()
  })
};

// ===== SCHÉMAS POUR LES AGENCES =====

const agencySchemas = {
  createAgency: Joi.object({
    name: Joi.string().required().trim().min(2).max(100),
    code: Joi.string().required().trim().min(2).max(10).uppercase(),
    client: Joi.string().required().trim().min(2).max(100),
    address: Joi.object({
      street: Joi.string().required().trim(),
      city: Joi.string().required().trim(),
      zipCode: Joi.string().required().trim(),
      country: Joi.string().default('France')
    }).optional()
  }),

  updateAgency: Joi.object({
    name: Joi.string().optional().trim().min(2).max(100),
    code: Joi.string().optional().trim().min(2).max(10).uppercase(),
    client: Joi.string().optional().trim().min(2).max(100),
    address: Joi.object({
      street: Joi.string().optional().trim(),
      city: Joi.string().optional().trim(),
      zipCode: Joi.string().optional().trim(),
      country: Joi.string().optional()
    }).optional(),
    isActive: Joi.boolean().optional()
  })
};

// ===== SCHÉMAS POUR LES VÉHICULES =====

const vehicleSchemas = {
  createVehicle: Joi.object({
    licensePlate: Joi.string()
      .required()
      .trim()
      .max(15)
      .pattern(/^[A-Z0-9\-\s]+$/)
      .messages({
        'string.pattern.base': 'Format de plaque invalide'
      }),
    brand: Joi.string() // ✅ SUPPRIMÉ : .required()
      .trim()
      .max(50)
      .allow('') // ✅ AJOUTÉ : permet les chaînes vides
      .optional(),
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

  // ✅ Validation des types d'étapes autorisés SEULEMENT
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
  
  // ✅ Schémas par catégorie - TOUS DÉFINIS
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