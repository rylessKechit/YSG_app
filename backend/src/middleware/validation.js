// backend/src/middleware/validation.js
// ✅ Middleware de validation complet corrigé pour compatibilité frontend

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
  // ✅ Schéma pour démarrer une préparation avec véhicule
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
    color: Joi.string()
      .optional()
      .allow('', null)
      .trim()
      .max(30),
    year: Joi.number()
      .integer()
      .min(1990)
      .max(new Date().getFullYear() + 2)
      .optional()
      .allow(null),
    fuelType: Joi.string()
      .valid('essence', 'diesel', 'electrique', 'hybride')
      .default('essence')
      .messages({
        'any.only': 'Type de carburant invalide'
      }),
    condition: Joi.string()
      .valid('excellent', 'bon', 'correct', 'mediocre')
      .default('bon')
      .messages({
        'any.only': 'État du véhicule invalide'
      }),
    notes: Joi.string()
      .optional()
      .allow('', null)
      .max(500)
      .trim()
      .messages({
        'string.max': 'Les notes ne peuvent pas dépasser 500 caractères'
      })
  }),

  // ✅ CORRECTION CRITIQUE: Schéma pour compléter une étape
  completeStep: Joi.object({
    step: Joi.string()
      .valid('exterior', 'interior', 'fuel', 'tires_fluids', 'special_wash', 'parking')
      .required()
      .messages({
        'any.required': 'Le type d\'étape est requis',
        'any.only': 'Type d\'étape invalide. Types autorisés: exterior, interior, fuel, tires_fluids, special_wash, parking'
      }),
    notes: Joi.string()
      .optional()
      .allow('', null)
      .max(200)
      .trim()
      .messages({
        'string.max': 'Les notes ne peuvent pas dépasser 200 caractères'
      })
  }),

  // ✅ Schéma pour terminer une préparation
  completePreparation: Joi.object({
    notes: Joi.string()
      .optional()
      .allow('', null)
      .max(500)
      .trim()
      .messages({
        'string.max': 'Les notes ne peuvent pas dépasser 500 caractères'
      })
  }),

  // ✅ Schéma pour signaler un incident
  reportIssue: Joi.object({
    type: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'any.required': 'Le type d\'incident est requis',
        'string.max': 'Le type d\'incident ne peut pas dépasser 100 caractères'
      }),
    description: Joi.string()
      .required()
      .trim()
      .min(10)
      .max(500)
      .messages({
        'any.required': 'La description de l\'incident est requise',
        'string.min': 'La description doit contenir au moins 10 caractères',
        'string.max': 'La description ne peut pas dépasser 500 caractères'
      }),
    severity: Joi.string()
      .valid('low', 'medium', 'high')
      .default('medium')
      .messages({
        'any.only': 'Niveau de gravité invalide'
      })
  }),

  // ✅ Schéma pour la recherche de préparations
  searchPreparations: Joi.object({
    licensePlate: Joi.string()
      .optional()
      .trim()
      .uppercase()
      .min(2)
      .max(15),
    agencyId: objectId.optional(),
    status: Joi.string()
      .valid('pending', 'in_progress', 'completed', 'cancelled')
      .optional(),
    userId: objectId.optional()
  })
};

// ===== SCHÉMAS POUR LES QUERIES =====

const querySchemas = {
  // Schéma pour les filtres de date
  dateRange: Joi.object({
    startDate: Joi.date()
      .optional()
      .iso()
      .messages({
        'date.format': 'Format de date invalide (ISO 8601 requis)'
      }),
    endDate: Joi.date()
      .optional()
      .iso()
      .min(Joi.ref('startDate'))
      .messages({
        'date.format': 'Format de date invalide (ISO 8601 requis)',
        'date.min': 'La date de fin doit être postérieure à la date de début'
      }),
    agencyId: objectId.optional(),
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.min': 'Le numéro de page doit être supérieur à 0'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.min': 'La limite doit être supérieure à 0',
        'number.max': 'La limite ne peut pas dépasser 100'
      })
  }),

  // Schéma pour l'historique des préparations
  preparationHistory: Joi.object({
    startDate: Joi.date().optional().iso(),
    endDate: Joi.date().optional().iso().min(Joi.ref('startDate')),
    agencyId: objectId.optional(),
    search: Joi.string()
      .optional()
      .allow('', null)
      .max(50)
      .trim()
      .messages({
        'string.max': 'La recherche ne peut pas dépasser 50 caractères'
      }),
    status: Joi.string()
      .valid('pending', 'in_progress', 'completed', 'cancelled')
      .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string()
      .valid('startTime', 'endTime', 'progress', 'licensePlate')
      .default('startTime'),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
  }),

  // Schéma pour les statistiques
  statsQuery: Joi.object({
    startDate: Joi.date().optional().iso(),
    endDate: Joi.date().optional().iso().min(Joi.ref('startDate')),
    agencyId: objectId.optional(),
    period: Joi.string()
      .valid('day', 'week', 'month', 'year')
      .default('month'),
    groupBy: Joi.string()
      .valid('day', 'week', 'month', 'agency', 'user')
      .optional()
  })
};

// ===== SCHÉMAS POUR L'AUTHENTIFICATION =====

const authSchemas = {
  // Schéma de connexion
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'any.required': 'L\'email est requis',
        'string.email': 'Format d\'email invalide'
      }),
    password: Joi.string()
      .required()
      .min(1)
      .messages({
        'any.required': 'Le mot de passe est requis',
        'string.min': 'Le mot de passe ne peut pas être vide'
      })
  }),

  // Schéma de changement de mot de passe
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Le mot de passe actuel est requis'
      }),
    newPassword: Joi.string()
      .required()
      .min(6)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'mot de passe sécurisé')
      .messages({
        'any.required': 'Le nouveau mot de passe est requis',
        'string.min': 'Le mot de passe doit contenir au moins 6 caractères',
        'string.pattern.name': 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
      }),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref('newPassword'))
      .messages({
        'any.required': 'La confirmation du mot de passe est requise',
        'any.only': 'Les mots de passe ne correspondent pas'
      })
  }),

  // Schéma de réinitialisation de mot de passe
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string()
      .required()
      .min(6)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'mot de passe sécurisé')
  }),

  // Schéma pour demander une réinitialisation
  forgotPassword: Joi.object({
    email: Joi.string().email().required().lowercase().trim()
  })
};

// ===== SCHÉMAS POUR LES POINTAGES =====

const timesheetSchemas = {
  // Pointage d'entrée/sortie
  clockAction: Joi.object({
    agencyId: objectId.required().messages({
      'any.required': 'L\'ID de l\'agence est requis pour le pointage'
    }),
    notes: Joi.string()
      .optional()
      .allow('', null)
      .max(200)
      .trim()
      .messages({
        'string.max': 'Les notes ne peuvent pas dépasser 200 caractères'
      })
  }),

  // Pause
  breakAction: Joi.object({
    agencyId: objectId.required().messages({
      'any.required': 'L\'ID de l\'agence est requis pour la pause'
    })
  }),

  // Correction de pointage (admin)
  correctTimesheet: Joi.object({
    startTime: Joi.date().optional().iso(),
    endTime: Joi.date().optional().iso(),
    breakStart: Joi.date().optional().iso(),
    breakEnd: Joi.date().optional().iso(),
    notes: Joi.string().optional().allow('', null).max(500).trim(),
    reason: Joi.string().required().max(200).trim()
  })
};

// ===== SCHÉMAS POUR LES UTILISATEURS =====

const userSchemas = {
  // Création d'utilisateur
  createUser: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'any.required': 'L\'email est requis',
        'string.email': 'Format d\'email invalide'
      }),
    password: Joi.string()
      .required()
      .min(6)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'mot de passe sécurisé')
      .messages({
        'any.required': 'Le mot de passe est requis',
        'string.min': 'Le mot de passe doit contenir au moins 6 caractères',
        'string.pattern.name': 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'
      }),
    firstName: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(50)
      .messages({
        'any.required': 'Le prénom est requis',
        'string.max': 'Le prénom ne peut pas dépasser 50 caractères'
      }),
    lastName: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(50)
      .messages({
        'any.required': 'Le nom est requis',
        'string.max': 'Le nom ne peut pas dépasser 50 caractères'
      }),
    role: Joi.string()
      .valid('admin', 'preparateur')
      .default('preparateur')
      .messages({
        'any.only': 'Rôle invalide'
      }),
    agencies: Joi.array()
      .items(objectId)
      .optional()
      .default([])
      .messages({
        'array.includesRequiredUnknowns': 'IDs d\'agences invalides'
      })
  }),

  // Mise à jour d'utilisateur
  updateUser: Joi.object({
    email: Joi.string().email().optional().lowercase().trim(),
    firstName: Joi.string().optional().trim().min(1).max(50),
    lastName: Joi.string().optional().trim().min(1).max(50),
    role: Joi.string().valid('admin', 'preparateur').optional(),
    agencies: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean().optional()
  }),

  // Mise à jour du profil
  updateProfile: Joi.object({
    firstName: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(50)
      .messages({
        'any.required': 'Le prénom est requis',
        'string.max': 'Le prénom ne peut pas dépasser 50 caractères'
      }),
    lastName: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(50)
      .messages({
        'any.required': 'Le nom est requis',
        'string.max': 'Le nom ne peut pas dépasser 50 caractères'
      }),
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'any.required': 'L\'email est requis',
        'string.email': 'Format d\'email invalide'
      })
  })
};

// ===== SCHÉMAS POUR LES AGENCES =====

const agencySchemas = {
  // Création d'agence
  createAgency: Joi.object({
    name: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'any.required': 'Le nom de l\'agence est requis',
        'string.max': 'Le nom ne peut pas dépasser 100 caractères'
      }),
    code: Joi.string()
      .required()
      .trim()
      .uppercase()
      .min(2)
      .max(10)
      .pattern(/^[A-Z0-9]+$/, 'code d\'agence valide')
      .messages({
        'any.required': 'Le code de l\'agence est requis',
        'string.min': 'Le code doit contenir au moins 2 caractères',
        'string.max': 'Le code ne peut pas dépasser 10 caractères',
        'string.pattern.name': 'Le code ne peut contenir que des lettres majuscules et des chiffres'
      }),
    client: Joi.string()
      .required()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'any.required': 'Le nom du client est requis',
        'string.max': 'Le nom du client ne peut pas dépasser 100 caractères'
      }),
    workingHours: Joi.object({
      start: timePattern.required().messages({
        'any.required': 'L\'heure de début est requise',
        'string.pattern.base': 'Format d\'heure invalide (HH:MM attendu)'
      }),
      end: timePattern.required().messages({
        'any.required': 'L\'heure de fin est requise',
        'string.pattern.base': 'Format d\'heure invalide (HH:MM attendu)'
      })
    }).optional(),
    isActive: Joi.boolean().default(true)
  }),

  // Mise à jour d'agence
  updateAgency: Joi.object({
    name: Joi.string().optional().trim().min(1).max(100),
    code: Joi.string().optional().trim().uppercase().min(2).max(10).pattern(/^[A-Z0-9]+$/),
    client: Joi.string().optional().trim().min(1).max(100),
    workingHours: Joi.object({
      start: timePattern.messages({
        'string.pattern.base': 'Format d\'heure invalide (HH:MM attendu)'
      }),
      end: timePattern.messages({
        'string.pattern.base': 'Format d\'heure invalide (HH:MM attendu)'
      })
    }).optional(),
    isActive: Joi.boolean().optional()
  })
};

// ===== SCHÉMAS POUR LES VÉHICULES =====

const vehicleSchemas = {
  // Création de véhicule
  createVehicle: Joi.object({
    licensePlate: Joi.string()
      .required()
      .trim()
      .uppercase()
      .min(2)
      .max(15)
      .pattern(/^[A-Z0-9\-\s]+$/, 'plaque d\'immatriculation valide'),
    brand: Joi.string().required().trim().min(1).max(50),
    model: Joi.string().required().trim().min(1).max(50),
    color: Joi.string().optional().allow('', null).trim().max(30),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 2).optional(),
    fuelType: Joi.string().valid('essence', 'diesel', 'electrique', 'hybride').default('essence'),
    agencyId: objectId.required()
  }),

  // Mise à jour de véhicule
  updateVehicle: Joi.object({
    brand: Joi.string().optional().trim().min(1).max(50),
    model: Joi.string().optional().trim().min(1).max(50),
    color: Joi.string().optional().allow('', null).trim().max(30),
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
  const { step } = req.body; // ✅ Utilise 'step' au lieu de 'stepType'
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