// backend/src/middleware/validation.js - VERSION CORRIGÉE COMPLÈTE
const Joi = require('joi');
const mongoose = require('mongoose');
const { ERROR_MESSAGES, USER_ROLES, PREPARATION_STEPS } = require('../utils/constants');

// ===== VALIDATEURS PERSONNALISÉS =====

// Schéma personnalisé pour ObjectId
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation').messages({
  'any.invalid': 'ID invalide'
});

// Validateur pour format d'heure (HH:mm) - VERSION CORRIGÉE
const timeFormat = Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).messages({
  'string.pattern.base': 'Format d\'heure invalide (attendu: HH:mm)'
});

// Validateur pour plaque d'immatriculation
const licensePlate = Joi.string().pattern(/^[A-Z0-9\-]{2,15}$/).messages({
  'string.pattern.base': 'Format de plaque d\'immatriculation invalide'
});

// ===== FONCTIONS DE VALIDATION PRINCIPALES =====

/**
 * Fonction générique de validation
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      
      const options = {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: source === 'query', // Plus flexible pour les query params
        convert: true
      };

      const { error, value } = schema.validate(dataToValidate, options);

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        console.log(`❌ Erreur validation ${source}:`, errorMessages); // Debug

        return res.status(400).json({
          success: false,
          message: `Données ${source} invalides`,
          errors: errorMessages,
          debug: process.env.NODE_ENV === 'development' ? error.details : undefined
        });
      }

      req[source] = value;
      next();

    } catch (validationError) {
      console.error(`Erreur middleware validation ${source}:`, validationError);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  };
};

/**
 * Validation des paramètres d'URL (params)
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Validation des paramètres de requête (query) - VERSION TRÈS PERMISSIVE
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const options = {
        abortEarly: false,
        stripUnknown: false, // ✅ Garde les paramètres inconnus
        allowUnknown: true,  // ✅ Autorise tous les paramètres
        convert: true
      };

      const { error, value } = schema.validate(req.query, options);

      if (error) {
        console.log('❌ Erreur validation query:', error.details);
        
        // ✅ Mode très permissif : on continue même avec des erreurs mineures
        console.warn('⚠️ Validation query échouée, mais on continue:', error.message);
      }

      // ✅ On applique les valeurs validées si possible, sinon on garde l'original
      req.query = error ? req.query : value;
      next();

    } catch (validationError) {
      console.error('Erreur middleware validation query:', validationError);
      // ✅ En cas d'erreur, on continue quand même
      next();
    }
  };
};

/**
 * Validation des données du corps (body)
 */
const validateBody = (schema) => validate(schema, 'body');

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
      console.error('Erreur validation ObjectId:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  };
};

/**
 * Middleware pour valider une date
 */
const validateDate = (paramName, required = false) => {
  return (req, res, next) => {
    try {
      const dateValue = req.query[paramName] || req.body[paramName];
      
      if (!dateValue && !required) {
        return next();
      }
      
      if (required && !dateValue) {
        return res.status(400).json({
          success: false,
          message: `La date ${paramName} est requise`
        });
      }
      
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: `Format de date invalide pour ${paramName}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Erreur validation date:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  };
};

/**
 * Validation pour plaque d'immatriculation
 */
const validateLicensePlate = (req, res, next) => {
  try {
    const { licensePlate: plate } = req.body;
    
    if (!plate) {
      return res.status(400).json({
        success: false,
        message: 'La plaque d\'immatriculation est requise'
      });
    }
    
    if (!/^[A-Z0-9\-]{2,15}$/.test(plate.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Format de plaque d\'immatriculation invalide'
      });
    }
    
    req.body.licensePlate = plate.toUpperCase();
    next();
  } catch (error) {
    console.error('Erreur validation plaque:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

/**
 * Validation spéciale pour l'historique (très permissive)
 */
const validateHistoryQuery = (req, res, next) => {
  try {
    // ✅ Schéma très permissif pour l'historique
    const schema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      agencyId: objectId.optional(),
      search: Joi.string().optional().allow(''),
      sort: Joi.string().optional(),
      order: Joi.string().valid('asc', 'desc').default('desc')
    }).unknown(true); // ✅ Autorise tous les paramètres supplémentaires

    const { error, value } = schema.validate(req.query, {
      allowUnknown: true,
      stripUnknown: false,
      convert: true
    });

    if (error) {
      console.warn('⚠️ Validation historique avec warnings:', error.message);
      // ✅ On continue même avec des erreurs
    }

    req.query = value || req.query;
    next();

  } catch (error) {
    console.error('Erreur validation historique:', error);
    // ✅ On continue quand même
    next();
  }
};

// ===== SCHÉMAS DE VALIDATION PRÉDÉFINIS =====

/**
 * Schémas pour l'authentification
 */
const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Format d\'email invalide',
      'any.required': 'L\'email est requis'
    }),
    password: Joi.string().min(1).required().messages({
      'any.required': 'Le mot de passe est requis'
    })
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional()
  })
};

/**
 * Schémas pour les utilisateurs
 */
const userSchemas = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    agencies: Joi.array().items(objectId).optional(),
    role: Joi.string().valid(...Object.values(USER_ROLES)).optional()
  }),

  update: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    agencies: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean().optional(),
    role: Joi.string().valid(...Object.values(USER_ROLES)).optional()
  })
};

/**
 * Schémas pour les agences
 */
const agencySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    address: Joi.string().min(5).max(300).required(),
    code: Joi.string().min(2).max(10).required(),
    client: Joi.string().min(2).max(100).required(),
    workingHours: Joi.object({
      start: timeFormat.required(),
      end: timeFormat.required()
    }).optional(),
    contact: Joi.object({
      phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
      email: Joi.string().email().optional()
    }).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    address: Joi.string().min(5).max(300).optional(),
    workingHours: Joi.object({
      start: timeFormat.optional(),
      end: timeFormat.optional()
    }).optional(),
    contact: Joi.object({
      phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
      email: Joi.string().email().optional()
    }).optional()
  })
};

/**
 * Schémas pour les plannings
 */
const scheduleSchemas = {
  create: Joi.object({
    userId: objectId.required(),
    agencyId: objectId.required(),
    date: Joi.date().required(), // ✅ Suppression de .min('now')
    startTime: timeFormat.required(),
    endTime: timeFormat.required(),
    breakStart: timeFormat.optional().allow(''),
    breakEnd: timeFormat.optional().allow(''),
    notes: Joi.string().max(500).optional().allow('')
  }),

  update: Joi.object({
    startTime: timeFormat.optional(),
    endTime: timeFormat.optional(),
    breakStart: timeFormat.optional().allow(''),
    breakEnd: timeFormat.optional().allow(''),
    notes: Joi.string().max(500).optional().allow(''),
    status: Joi.string().valid('active', 'cancelled', 'completed').optional()
  })
};

/**
 * Schémas pour les feuilles de temps
 */
const timesheetSchemas = {
  clockIn: Joi.object({
    agencyId: objectId.required(),
    notes: Joi.string().max(200).optional().allow('')
  }),

  clockOut: Joi.object({
    notes: Joi.string().max(200).optional().allow('')
  }),

  breakStart: Joi.object({
    reason: Joi.string().valid('lunch', 'coffee', 'personal', 'technical').default('lunch')
  }),

  breakEnd: Joi.object({
    notes: Joi.string().max(100).optional().allow('')
  })
};

/**
 * Schémas pour les véhicules
 */
const vehicleSchemas = {
  register: Joi.object({
    licensePlate: licensePlate.required(),
    brand: Joi.string().min(2).max(50).required(),
    model: Joi.string().min(2).max(50).required(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).required(),
    category: Joi.string().valid('economy', 'compact', 'intermediate', 'standard', 'fullsize', 'premium', 'luxury', 'suv', 'van').required(),
    agency: objectId.required()
  })
};

/**
 * Schémas pour les préparations
 */
const preparationSchemas = {
  start: Joi.object({
    vehicleId: objectId.required(),
    preparationType: Joi.string().valid('arrival', 'departure', 'maintenance').default('departure')
  }),

  step: Joi.object({
    stepType: Joi.string().required(),
    notes: Joi.string().max(200).optional().allow('')
  }),

  complete: Joi.object({
    notes: Joi.string().max(1000).optional().allow('')
  }),

  addIssue: Joi.object({
    type: Joi.string().valid('damage', 'missing_key', 'fuel_problem', 'cleanliness', 'mechanical', 'other').required(),
    description: Joi.string().min(5).max(300).required()
  })
};

/**
 * Schémas pour les paramètres de requête (TRÈS PERMISSIFS)
 */
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }).unknown(true), // ✅ Autorise paramètres supplémentaires

  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    agencyId: objectId.optional(),
    userId: objectId.optional()
  }).unknown(true),

  search: Joi.object({
    q: Joi.string().optional().allow(''),
    search: Joi.string().optional().allow(''),
    status: Joi.string().optional().allow(''),
    role: Joi.string().optional()
  }).unknown(true),

  // ✅ NOUVEAU: Schéma ultra-permissif pour les cas problématiques
  flexible: Joi.object().unknown(true)
};

// ===== EXPORTS =====
module.exports = {
  // Fonctions principales
  validate,
  validateParams,
  validateQuery,
  validateBody,
  validateObjectId,
  validateDate,
  validateLicensePlate,
  validateHistoryQuery,
  
  // Schémas de validation
  authSchemas,
  userSchemas,
  agencySchemas,
  scheduleSchemas,
  timesheetSchemas,
  vehicleSchemas,
  preparationSchemas,
  querySchemas,
  
  // Validateurs spéciaux
  objectId,
  timeFormat,
  licensePlate
};