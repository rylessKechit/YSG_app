// backend/src/middleware/validation.js
const Joi = require('joi');

// Helper pour ObjectId
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/, 'valid ObjectId');

// Middleware de validation
const validateBody = (schema) => {
  return (req, res, next) => {
    // Vérifier que le schema existe et a une méthode validate
    if (!schema || typeof schema.validate !== 'function') {
      console.error('❌ Schéma de validation invalide');
      return res.status(500).json({
        success: false,
        message: 'Erreur de configuration de validation'
      });
    }

    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors
        });
      }

      // Remplacer req.body par les données validées
      req.body = value;
      next();
    } catch (err) {
      console.error('❌ Erreur validation:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la validation'
      });
    }
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    if (!schema || typeof schema.validate !== 'function') {
      console.error('❌ Schéma de validation query invalide');
      return res.status(500).json({
        success: false,
        message: 'Erreur de configuration de validation'
      });
    }

    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
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
        message: `${paramName} invalide`
      });
    }

    next();
  };
};

// Schémas de validation pour les préparations
const preparationSchemas = {
  startWithVehicle: Joi.object({
    agencyId: objectId.required(),
    licensePlate: Joi.string().required().trim().uppercase(),
    brand: Joi.string().required().trim(),
    model: Joi.string().required().trim(),
    color: Joi.string().optional().allow('').trim(),
    year: Joi.number().integer().min(1990).max(new Date().getFullYear() + 1).optional().allow(null),
    fuelType: Joi.string().valid('essence', 'diesel', 'electrique', 'hybride').default('essence'),
    condition: Joi.string().valid('excellent', 'bon', 'correct', 'mediocre').default('bon'),
    notes: Joi.string().optional().allow('').max(500).trim()
  }),

  completeStep: Joi.object({
    stepType: Joi.string().required(),
    notes: Joi.string().optional().allow('').max(200).trim()
  }),

  completePreparation: Joi.object({
    notes: Joi.string().optional().allow('').max(500).trim()
  }),

  reportIssue: Joi.object({
    type: Joi.string().required(),
    description: Joi.string().required().max(500).trim(),
    severity: Joi.string().valid('low', 'medium', 'high').default('medium')
  })
};

// Schémas pour les queries
const querySchemas = {
  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    agencyId: objectId.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  preparationHistory: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    agencyId: objectId.optional(),
    search: Joi.string().optional().allow('').max(50).trim(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

module.exports = {
  validateBody,
  validateQuery,
  validateObjectId,
  preparationSchemas,
  querySchemas,
  objectId
};