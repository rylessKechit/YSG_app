const Joi = require('joi');
const mongoose = require('mongoose');
const { USER_ROLES, VEHICLE_STATUS, PREPARATION_STEPS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Middleware pour valider les données avec Joi
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        errors
      });
    }

    // Remplacer les données par les valeurs validées et formatées
    req[source] = value;
    next();
  };
};

/**
 * Validation pour ObjectId MongoDB
 */
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation').messages({
  'any.invalid': 'ID invalide'
});

/**
 * Validation pour les heures au format HH:mm
 */
const timeFormat = Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).messages({
  'string.pattern.base': 'Format d\'heure invalide (HH:mm attendu)'
});

/**
 * Validation pour les plaques d'immatriculation
 */
const licensePlate = Joi.string().pattern(/^[A-Z0-9\-]{2,15}$/).uppercase().messages({
  'string.pattern.base': 'Format de plaque d\'immatriculation invalide'
});

// ===== SCHÉMAS DE VALIDATION =====

/**
 * Validation pour l'authentification
 */
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
  })
};

/**
 * Validation pour les utilisateurs
 */
const userSchemas = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    agencies: Joi.array().items(objectId).optional(),
    role: Joi.string().valid(...Object.values(USER_ROLES)).optional()
  }),

  update: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
    agencies: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean().optional()
  })
};

/**
 * Validation pour les agences
 */
const agencySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    address: Joi.string().min(5).max(200).required(),
    code: Joi.string().min(2).max(10).uppercase().pattern(/^[A-Z0-9]+$/).required(),
    client: Joi.string().min(2).max(50).required(),
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
    address: Joi.string().min(5).max(200).optional(),
    client: Joi.string().min(2).max(50).optional(),
    workingHours: Joi.object({
      start: timeFormat.required(),
      end: timeFormat.required()
    }).optional(),
    contact: Joi.object({
      phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
      email: Joi.string().email().optional().allow('')
    }).optional(),
    isActive: Joi.boolean().optional()
  })
};

/**
 * Validation pour les plannings
 */
const scheduleSchemas = {
  create: Joi.object({
    userId: objectId.required(),
    agencyId: objectId.required(),
    date: Joi.date().min('now').required(),
    startTime: timeFormat.required(),
    endTime: timeFormat.required(),
    breakStart: timeFormat.optional(),
    breakEnd: timeFormat.optional(),
    notes: Joi.string().max(500).optional()
  }),

  update: Joi.object({
    startTime: timeFormat.optional(),
    endTime: timeFormat.optional(),
    breakStart: timeFormat.optional().allow(''),
    breakEnd: timeFormat.optional().allow(''),
    notes: Joi.string().max(500).optional(),
    status: Joi.string().valid('active', 'cancelled', 'completed').optional()
  })
};

/**
 * Validation pour les pointages
 */
const timesheetSchemas = {
  clockIn: Joi.object({
    agencyId: objectId.required()
  }),

  clockOut: Joi.object({
    agencyId: objectId.required(),
    notes: Joi.string().max(500).optional()
  }),

  breakAction: Joi.object({
    agencyId: objectId.required()
  })
};

/**
 * Validation pour les véhicules
 */
const vehicleSchemas = {
  create: Joi.object({
    licensePlate: licensePlate.required(),
    brand: Joi.string().max(50).optional(),
    model: Joi.string().max(50).optional(),
    color: Joi.string().max(30).optional(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).optional(),
    agencyId: objectId.required(),
    specifications: Joi.object({
      fuelType: Joi.string().valid('essence', 'diesel', 'electrique', 'hybride', 'autre').optional(),
      transmission: Joi.string().valid('manuelle', 'automatique').optional(),
      seats: Joi.number().integer().min(2).max(9).optional(),
      category: Joi.string().valid('citadine', 'compacte', 'berline', 'break', 'suv', 'utilitaire', 'luxe').optional()
    }).optional(),
    notes: Joi.string().max(500).optional()
  }),

  update: Joi.object({
    brand: Joi.string().max(50).optional(),
    model: Joi.string().max(50).optional(),
    color: Joi.string().max(30).optional(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).optional(),
    status: Joi.string().valid(...Object.values(VEHICLE_STATUS)).optional(),
    specifications: Joi.object({
      fuelType: Joi.string().valid('essence', 'diesel', 'electrique', 'hybride', 'autre').optional(),
      transmission: Joi.string().valid('manuelle', 'automatique').optional(),
      seats: Joi.number().integer().min(2).max(9).optional(),
      category: Joi.string().valid('citadine', 'compacte', 'berline', 'break', 'suv', 'utilitaire', 'luxe').optional()
    }).optional(),
    condition: Joi.string().valid('excellent', 'bon', 'moyen', 'mauvais').optional(),
    notes: Joi.string().max(500).optional(),
    isActive: Joi.boolean().optional()
  })
};

/**
 * Validation pour les préparations
 */
const preparationSchemas = {
  start: Joi.object({
    vehicleId: objectId.required(),
    agencyId: objectId.required(),
    notes: Joi.string().max(1000).optional()
  }),

  completeStep: Joi.object({
    stepType: Joi.string().valid(...Object.values(PREPARATION_STEPS)).required(),
    notes: Joi.string().max(200).optional()
  }),

  complete: Joi.object({
    notes: Joi.string().max(1000).optional()
  }),

  addIssue: Joi.object({
    type: Joi.string().valid('damage', 'missing_key', 'fuel_problem', 'cleanliness', 'mechanical', 'other').required(),
    description: Joi.string().min(5).max(300).required()
  })
};

/**
 * Validation pour les paramètres de requête
 */
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref('startDate')).optional(),
    agencyId: objectId.optional(),
    userId: objectId.optional()
  }),

  search: Joi.object({
    q: Joi.string().min(2).max(100).optional(),
    status: Joi.string().optional(),
    role: Joi.string().valid(...Object.values(USER_ROLES)).optional()
  })
};

// ===== MIDDLEWARE DE VALIDATION SPÉCIALISÉS =====

/**
 * Validation des paramètres d'URL (params)
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Validation des paramètres de requête (query)
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validation des données du corps (body)
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Middleware pour valider un ObjectId dans les paramètres
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `${paramName} invalide`
      });
    }
    
    next();
  };
};

/**
 * Middleware pour valider une date
 */
const validateDate = (paramName, required = false) => {
  return (req, res, next) => {
    const dateValue = req.query[paramName] || req.body[paramName];
    
    if (!dateValue && !required) {
      return next();
    }
    
    if (!dateValue && required) {
      return res.status(400).json({
        success: false,
        message: `${paramName} est requis`
      });
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: `${paramName} doit être une date valide`
      });
    }
    
    next();
  };
};

module.exports = {
  validate,
  validateParams,
  validateQuery,
  validateBody,
  validateObjectId,
  validateDate,
  
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