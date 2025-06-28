// ===== backend/src/routes/admin/schedules/templates.js - VERSION CORRIGÉE =====
const express = require('express');
const Joi = require('joi'); // ✅ Import explicite de Joi
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery, objectId, timeFormat } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

// Templates de plannings en mémoire (en production, stocker en DB)
let scheduleTemplates = [
  {
    id: 'template_standard',
    name: 'Planning Standard',
    description: 'Horaires classiques 8h-17h avec pause déjeuner',
    category: 'standard',
    template: {
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00'
    },
    defaultAgencies: [],
    isDefault: true,
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  },
  {
    id: 'template_matin',
    name: 'Équipe Matin',
    description: 'Service matinal 6h-14h avec pause 10h',
    category: 'shifts',
    template: {
      startTime: '06:00',
      endTime: '14:00',
      breakStart: '10:00',
      breakEnd: '10:30'
    },
    defaultAgencies: [],
    isDefault: false,
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  },
  {
    id: 'template_apresmidi',
    name: 'Équipe Après-midi',
    description: 'Service après-midi 14h-22h avec pause 18h',
    category: 'shifts',
    template: {
      startTime: '14:00',
      endTime: '22:00',
      breakStart: '18:00',
      breakEnd: '18:30'
    },
    defaultAgencies: [],
    isDefault: false,
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  },
  {
    id: 'template_weekend',
    name: 'Weekend',
    description: 'Horaires week-end 9h-16h avec pause courte',
    category: 'special',
    template: {
      startTime: '09:00',
      endTime: '16:00',
      breakStart: '12:30',
      breakEnd: '13:00'
    },
    defaultAgencies: [],
    isDefault: false,
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    usageCount: 0
  }
];

// ===== FONCTIONS UTILITAIRES =====

/**
 * Convertir un horaire en minutes depuis minuit
 */
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
}

/**
 * Valider la cohérence des horaires d'un template
 */
function validateTemplateSchedule(template) {
  const errors = [];
  
  const startMinutes = timeToMinutes(template.startTime);
  const endMinutes = timeToMinutes(template.endTime);
  
  if (endMinutes <= startMinutes) {
    errors.push('L\'heure de fin doit être postérieure à l\'heure de début');
  }
  
  if (template.breakStart && template.breakEnd) {
    const breakStartMinutes = timeToMinutes(template.breakStart);
    const breakEndMinutes = timeToMinutes(template.breakEnd);
    
    if (breakEndMinutes <= breakStartMinutes) {
      errors.push('L\'heure de fin de pause doit être postérieure au début de pause');
    }
    
    if (breakStartMinutes <= startMinutes || breakEndMinutes >= endMinutes) {
      errors.push('La pause doit être comprise dans les horaires de travail');
    }
  }
  
  const totalMinutes = endMinutes - startMinutes;
  if (totalMinutes > 12 * 60) {
    errors.push('La durée de travail ne peut excéder 12 heures');
  }
  
  return errors;
}

// ===== SCHÉMAS DE VALIDATION =====

const templateSchema = Joi.object({
  startTime: timeFormat.required(),
  endTime: timeFormat.required(),
  breakStart: timeFormat.allow(null),
  breakEnd: timeFormat.allow(null)
});

const createTemplateSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(200).optional(),
  category: Joi.string().valid('standard', 'shifts', 'special', 'custom').default('custom'),
  template: templateSchema.required(),
  defaultAgencies: Joi.array().items(objectId).default([])
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().max(200),
  category: Joi.string().valid('standard', 'shifts', 'special', 'custom'),
  template: templateSchema,
  defaultAgencies: Joi.array().items(objectId)
});

const applyTemplateSchema = Joi.object({
  templateId: Joi.string().required(),
  userIds: Joi.array().items(objectId).min(1).required(),
  dateRange: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().required()
  }).required(),
  agencyId: objectId.required(),
  options: Joi.object({
    skipConflicts: Joi.boolean().default(true),
    notifyUsers: Joi.boolean().default(false),
    overwrite: Joi.boolean().default(false)
  }).default({})
});

const templateQuerySchema = Joi.object({
  category: Joi.string().valid('all', 'standard', 'shifts', 'special', 'custom').default('all'),
  includeUsage: Joi.boolean().default(true)
});

// ===== ROUTES =====

/**
 * @route   GET /api/admin/schedules/templates
 * @desc    Liste des templates de planning
 * @access  Admin
 */
router.get('/', validateQuery(templateQuerySchema), async (req, res) => {
  try {
    const { category, includeUsage } = req.query;
    
    // Filtrer par catégorie
    let filteredTemplates = category === 'all' ? 
      scheduleTemplates : 
      scheduleTemplates.filter(t => t.category === category);
    
    // Calculer l'usage si demandé
    if (includeUsage) {
      for (const template of filteredTemplates) {
        // Compter l'utilisation du template (exemple basique)
        template.recentUsage = await Schedule.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 derniers jours
          // Dans une vraie implémentation, on stockerait l'ID du template utilisé
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        templates: filteredTemplates.map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          template: template.template,
          defaultAgencies: template.defaultAgencies,
          isDefault: template.isDefault,
          usageCount: template.usageCount,
          recentUsage: template.recentUsage || 0,
          createdAt: template.createdAt
        })),
        categories: {
          standard: scheduleTemplates.filter(t => t.category === 'standard').length,
          shifts: scheduleTemplates.filter(t => t.category === 'shifts').length,
          special: scheduleTemplates.filter(t => t.category === 'special').length,
          custom: scheduleTemplates.filter(t => t.category === 'custom').length
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   POST /api/admin/schedules/templates
 * @desc    Créer un nouveau template
 * @access  Admin
 */
router.post('/', validateBody(createTemplateSchema), async (req, res) => {
  try {
    const { name, description, category, template, defaultAgencies } = req.body;
    
    // Valider les horaires
    const scheduleErrors = validateTemplateSchedule(template);
    if (scheduleErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs dans les horaires du template',
        errors: scheduleErrors
      });
    }
    
    // Vérifier que le nom n'existe pas déjà
    const existingTemplate = scheduleTemplates.find(t => 
      t.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingTemplate) {
      return res.status(409).json({
        success: false,
        message: 'Un template avec ce nom existe déjà'
      });
    }
    
    // Vérifier que les agences par défaut existent
    if (defaultAgencies.length > 0) {
      const validAgencies = await Agency.find({ 
        _id: { $in: defaultAgencies }, 
        isActive: true 
      });
      
      if (validAgencies.length !== defaultAgencies.length) {
        return res.status(400).json({
          success: false,
          message: 'Une ou plusieurs agences par défaut sont invalides'
        });
      }
    }
    
    // Créer le nouveau template
    const newTemplate = {
      id: `template_${Date.now()}`,
      name,
      description,
      category,
      template,
      defaultAgencies,
      isDefault: false,
      createdBy: req.user.userId,
      createdAt: new Date(),
      usageCount: 0
    };
    
    scheduleTemplates.push(newTemplate);
    
    res.status(201).json({
      success: true,
      message: 'Template créé avec succès',
      data: {
        template: newTemplate
      }
    });

  } catch (error) {
    console.error('Erreur création template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   GET /api/admin/schedules/templates/:id
 * @desc    Obtenir un template spécifique
 * @access  Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const template = scheduleTemplates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: {
        template
      }
    });

  } catch (error) {
    console.error('Erreur récupération template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   PUT /api/admin/schedules/templates/:id
 * @desc    Modifier un template
 * @access  Admin
 */
router.put('/:id', validateBody(updateTemplateSchema), async (req, res) => {
  try {
    const templateIndex = scheduleTemplates.findIndex(t => t.id === req.params.id);
    
    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    const template = scheduleTemplates[templateIndex];
    
    // Empêcher la modification des templates système
    if (template.isDefault && template.createdBy === 'system') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de modifier un template système'
      });
    }
    
    // Valider les horaires si modifiés
    if (req.body.template) {
      const scheduleErrors = validateTemplateSchedule(req.body.template);
      if (scheduleErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Erreurs dans les horaires du template',
          errors: scheduleErrors
        });
      }
    }
    
    // Vérifier l'unicité du nom si modifié
    if (req.body.name && req.body.name !== template.name) {
      const existingTemplate = scheduleTemplates.find(t => 
        t.name.toLowerCase() === req.body.name.toLowerCase() && t.id !== req.params.id
      );
      
      if (existingTemplate) {
        return res.status(409).json({
          success: false,
          message: 'Un template avec ce nom existe déjà'
        });
      }
    }
    
    // Mettre à jour le template
    Object.keys(req.body).forEach(key => {
      template[key] = req.body[key];
    });
    
    template.updatedAt = new Date();
    
    res.json({
      success: true,
      message: 'Template modifié avec succès',
      data: {
        template
      }
    });

  } catch (error) {
    console.error('Erreur modification template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   DELETE /api/admin/schedules/templates/:id
 * @desc    Supprimer un template
 * @access  Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const templateIndex = scheduleTemplates.findIndex(t => t.id === req.params.id);
    
    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    const template = scheduleTemplates[templateIndex];
    
    // Empêcher la suppression des templates système
    if (template.isDefault && template.createdBy === 'system') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer un template système'
      });
    }
    
    // Supprimer le template
    scheduleTemplates.splice(templateIndex, 1);
    
    res.json({
      success: true,
      message: 'Template supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   POST /api/admin/schedules/templates/:id/duplicate
 * @desc    Dupliquer un template
 * @access  Admin
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const sourceTemplate = scheduleTemplates.find(t => t.id === req.params.id);
    
    if (!sourceTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template source non trouvé'
      });
    }
    
    // Créer le template dupliqué
    const duplicatedTemplate = {
      id: `template_${Date.now()}`,
      name: `${sourceTemplate.name} (Copie)`,
      description: sourceTemplate.description,
      category: 'custom', // Les copies sont toujours custom
      template: { ...sourceTemplate.template },
      defaultAgencies: [...sourceTemplate.defaultAgencies],
      isDefault: false,
      createdBy: req.user.userId,
      createdAt: new Date(),
      usageCount: 0
    };
    
    scheduleTemplates.push(duplicatedTemplate);
    
    res.status(201).json({
      success: true,
      message: 'Template dupliqué avec succès',
      data: {
        template: duplicatedTemplate
      }
    });

  } catch (error) {
    console.error('Erreur duplication template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

/**
 * @route   POST /api/admin/schedules/apply-template
 * @desc    Appliquer un template à des utilisateurs
 * @access  Admin
 */
router.post('/apply-template', validateBody(applyTemplateSchema), async (req, res) => {
  try {
    const { templateId, userIds, dateRange, agencyId, options } = req.body;
    
    // Vérifier que le template existe
    const template = scheduleTemplates.find(t => t.id === templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    // Vérifier que l'agence existe
    const agency = await Agency.findById(agencyId);
    if (!agency || !agency.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée ou inactive'
      });
    }
    
    // Vérifier que les utilisateurs existent
    const users = await User.find({ 
      _id: { $in: userIds }, 
      isActive: true 
    });
    
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Un ou plusieurs utilisateurs sont introuvables ou inactifs'
      });
    }
    
    // Générer les dates entre start et end
    const dates = [];
    const currentDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const results = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;
    
    // Appliquer le template pour chaque utilisateur et chaque date
    for (const user of users) {
      for (const date of dates) {
        try {
          const scheduleDate = new Date(date);
          scheduleDate.setHours(0, 0, 0, 0);
          
          // Vérifier les conflits existants
          const existingSchedule = await Schedule.findOne({
            user: user._id,
            date: scheduleDate,
            status: 'active'
          });
          
          if (existingSchedule) {
            if (options.overwrite) {
              // Supprimer l'ancien planning
              existingSchedule.status = 'cancelled';
              await existingSchedule.save();
            } else if (options.skipConflicts) {
              skipped++;
              continue;
            } else {
              throw new Error('Conflit de planning');
            }
          }
          
          // Créer le nouveau planning
          const schedule = new Schedule({
            user: user._id,
            agency: agencyId,
            date: scheduleDate,
            startTime: template.template.startTime,
            endTime: template.template.endTime,
            breakStart: template.template.breakStart,
            breakEnd: template.template.breakEnd,
            notes: `Appliqué depuis template: ${template.name}`,
            createdBy: req.user.userId
          });
          
          await schedule.save();
          created++;
          
        } catch (error) {
          failed++;
          results.push({
            userId: user._id,
            userName: `${user.firstName} ${user.lastName}`,
            date: date.toISOString().split('T')[0],
            error: error.message
          });
        }
      }
    }
    
    // Incrémenter le compteur d'usage du template
    template.usageCount = (template.usageCount || 0) + created;
    
    res.json({
      success: true,
      message: `Template appliqué: ${created} plannings créés, ${skipped} ignorés, ${failed} échecs`,
      data: {
        template: {
          id: template.id,
          name: template.name
        },
        results: {
          created,
          skipped,
          failed,
          total: created + skipped + failed,
          errors: results
        },
        applied: {
          users: users.length,
          dates: dates.length,
          agency: agency.name
        }
      }
    });

  } catch (error) {
    console.error('Erreur application template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur interne du serveur'
    });
  }
});

module.exports = router;