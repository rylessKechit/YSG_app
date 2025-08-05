// backend/src/middleware/validation.js
// ✅ Fichier de validation corrigé complet avec support Joi + Zod

const Joi = require('joi');
const { z } = require('zod');

// ===== SCHÉMAS DE BASE =====

// Schéma pour valider un ObjectId MongoDB
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'valid ObjectId');

// Schéma pour les heures (format HH:MM)
const timePattern = Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);

// ===== MIDDLEWARE DE VALIDATION HYBRIDE (JOI + ZOD) =====

/**
 * Middleware pour valider le body avec Joi OU Zod
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      // ✅ DÉTECTION AUTOMATIQUE : Joi ou Zod ?
      if (schema.validate && typeof schema.validate === 'function') {
        // ===== VALIDATION JOI =====
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
          allowUnknown: false
        });

        if (error) {
          console.log('❌ Erreur validation Joi body:', error.details);
          
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
      } else if (schema.parse && typeof schema.parse === 'function') {
        // ===== VALIDATION ZOD =====
        const validatedData = schema.parse(req.body);
        req.body = validatedData; // Remplacer par les données validées et transformées
        next();
      } else {
        throw new Error('Schéma de validation non reconnu (ni Joi ni Zod)');
      }
    } catch (error) {
      console.error('❌ Erreur validation body:', error);

      // ✅ GESTION ERREURS ZOD
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          message: 'Erreur de validation des données',
          errors
        });
      }

      // Erreur générique
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la validation des données'
      });
    }
  };
};

/**
 * Middleware pour valider les paramètres de requête (query) - JOI SEULEMENT
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

// ===== SCHÉMAS JOI POUR LES PRÉPARATIONS =====

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
      .valid('exterior', 'interior', 'fuel', 'special_wash')
      .messages({
        'any.only': 'Type d\'étape invalide. Types autorisés: exterior, interior, fuel, special_wash'
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

// ===== SCHÉMAS ZOD POUR LES NOUVELLES FONCTIONNALITÉS =====

// ✅ Schéma véhicule simplifié (3 champs + étapes)
const simplifiedVehicleSchema = z.object({
  licensePlate: z.string()
    .min(1, 'Plaque d\'immatriculation requise')
    .max(20, 'Plaque trop longue')
    .regex(/^[A-Z0-9\-\s]+$/i, 'Format de plaque invalide')
    .transform(val => val.toUpperCase().replace(/\s+/g, '')),
  
  vehicleType: z.enum(['particulier', 'utilitaire'], {
    invalid_type_error: 'Type de véhicule invalide'
  }),
  
  model: z.string()
    .min(1, 'Modèle requis')
    .max(50, 'Modèle trop long')
    .trim(),
  
  // ✅ Étapes déjà complétées
  completedSteps: z.array(z.enum([
    'exterior', 'interior', 'fuel', 'special_wash'
  ], {
    invalid_type_error: 'Étape invalide'
  })).default([])
});

const createBulkPreparations = z.object({
  userId: z.string()
    .min(1, 'Préparateur requis')
    .regex(/^[0-9a-fA-F]{24}$/, 'ID préparateur invalide'),
  
  agencyId: z.string()
    .min(1, 'Agence requise')
    .regex(/^[0-9a-fA-F]{24}$/, 'ID agence invalide'),
  
  // ✅ GESTION ROBUSTE DES DATES
  createdAt: z.union([
    // Format ISO complet (2024-08-01T10:00:00.000Z)
    z.string().datetime({ message: 'Date ISO invalide' }),
    // Format date seule (2024-08-01)
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format date YYYY-MM-DD requis'),
    // Objet Date JavaScript
    z.date()
  ]).transform((val) => {
    let date;
    
    if (typeof val === 'string') {
      if (val.includes('T')) {
        // Format ISO complet - convertir directement
        date = new Date(val);
      } else {
        // Format YYYY-MM-DD - créer une date à minuit UTC
        // pour éviter les décalages timezone
        const [year, month, day] = val.split('-').map(Number);
        date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // 12h UTC
      }
    } else {
      date = val; // Déjà un objet Date
    }
    
    // Validation: pas de date invalide
    if (isNaN(date.getTime())) {
      throw new Error('Date invalide');
    }
    
    // Valider les limites (ignorer l'heure pour la comparaison)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const now = new Date();
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const past = new Date(2020, 0, 1); // 1er janvier 2020
    const future = new Date(todayOnly);
    future.setDate(future.getDate() + 7);
    
    if (dateOnly < past || dateOnly > future) {
      throw new Error('La date doit être comprise entre 2020 et 7 jours dans le futur');
    }
    
    return date;
  }),
  
  vehicles: z.array(simplifiedVehicleSchema)
    .min(1, 'Au moins un véhicule requis')
    .max(20, 'Maximum 20 véhicules par lot'),
  
  notes: z.string()
    .max(1000, 'Notes trop longues')
    .optional(),
  
  priority: z.enum(['low', 'normal', 'high', 'urgent'], {
    invalid_type_error: 'Priorité invalide'
  }).default('normal')
});

// ✅ Schéma pour création simple (ZOD)
const createPreparation = z.object({
  userId: z.string()
    .min(1, 'ID utilisateur requis')
    .regex(/^[0-9a-fA-F]{24}$/, 'ID utilisateur invalide'),
  
  agencyId: z.string()
    .min(1, 'ID agence requis')
    .regex(/^[0-9a-fA-F]{24}$/, 'ID agence invalide'),
  
  vehicleData: z.object({
    licensePlate: z.string()
      .min(1, 'Plaque d\'immatriculation requise')
      .max(20, 'Plaque trop longue')
      .transform(val => val.toUpperCase().replace(/\s+/g, '')),
    
    brand: z.string()
      .max(50, 'Marque trop longue')
      .optional()
      .default(''),
    
    model: z.string()
      .min(1, 'Modèle requis')
      .max(50, 'Modèle trop long'),
    
    vehicleType: z.enum(['particulier', 'utilitaire'], {
      invalid_type_error: 'Type de véhicule invalide'
    }).default('particulier'),
    
    year: z.number()
      .int()
      .min(1990, 'Année trop ancienne')
      .max(new Date().getFullYear() + 2, 'Année trop récente')
      .nullable()
      .optional(),
    
    fuelType: z.enum(['essence', 'diesel', 'electrique', 'hybride'], {
      invalid_type_error: 'Type de carburant invalide'
    }).optional(),
    
    color: z.string()
      .max(30, 'Couleur trop longue')
      .optional(),
    
    condition: z.enum(['excellent', 'good', 'fair', 'poor'], {
      invalid_type_error: 'Condition invalide'
    }).default('good')
  }),
  
  notes: z.string()
    .max(1000, 'Notes trop longues')
    .optional(),
  
  assignedSteps: z.array(z.enum([
    'exterior', 'interior', 'fuel', 'special_wash'
  ], {
    invalid_type_error: 'Étape invalide'
  })).optional(),
  
  priority: z.enum(['low', 'normal', 'high', 'urgent'], {
    invalid_type_error: 'Priorité invalide'
  }).default('normal')
});

// ===== SCHÉMAS JOI POUR LES AUTRES FONCTIONNALITÉS =====

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
    brand: Joi.string()
      .trim()
      .max(50)
      .allow('')
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
  const validSteps = ['exterior', 'interior', 'fuel', 'special_wash'];
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
  
  // ✅ Schémas ZOD pour nouvelles fonctionnalités
  createBulkPreparations,
  createPreparation,
  simplifiedVehicleSchema,
  
  // Middlewares spécialisés
  validatePreparationUpload,
  requirePhoto,
  validatePagination,
  validateDateFilters,
  
  // Utilitaires
  objectId,
  timePattern
};