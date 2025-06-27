// ===== backend/src/routes/admin/schedules-templates.js =====
const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery } = require('../../../middleware/validation');
const { objectId, timeFormat } = require('../../../middleware/validation');
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
    description: 'Horaires weekend 9h-16h sans pause',
    category: 'special',
    template: {
      startTime: '09:00',
      endTime: '16:00',
      breakStart: null,
      breakEnd: null
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
 * Générer un ID unique pour template
 */
function generateTemplateId() {
  return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Calculer la durée de travail d'un template (en minutes)
 */
function calculateTemplateDuration(template) {
  const startMinutes = timeToMinutes(template.startTime);
  const endMinutes = timeToMinutes(template.endTime);
  let workingMinutes = endMinutes - startMinutes;
  
  // Soustraire la pause si elle existe
  if (template.breakStart && template.breakEnd) {
    const breakStartMinutes = timeToMinutes(template.breakStart);
    const breakEndMinutes = timeToMinutes(template.breakEnd);
    const breakDuration = breakEndMinutes - breakStartMinutes;
    workingMinutes -= breakDuration;
  }
  
  return workingMinutes;
}

/**
 * Convertir heure "HH:MM" en minutes
 */
function timeToMinutes(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Formater durée en minutes vers "Xh YYm"
 */
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
}

/**
 * Obtenir les catégories de templates
 */
function getTemplateCategories() {
  return [
    { key: 'all', label: 'Tous les templates', count: scheduleTemplates.length },
    { key: 'standard', label: 'Standards', count: scheduleTemplates.filter(t => t.category === 'standard').length },
    { key: 'shifts', label: 'Équipes', count: scheduleTemplates.filter(t => t.category === 'shifts').length },
    { key: 'special', label: 'Spéciaux', count: scheduleTemplates.filter(t => t.category === 'special').length },
    { key: 'custom', label: 'Personnalisés', count: scheduleTemplates.filter(t => t.category === 'custom').length }
  ];
}

/**
 * Résumé des templates par catégorie
 */
function getTemplateSummary() {
  const summary = {};
  scheduleTemplates.forEach(template => {
    summary[template.category] = (summary[template.category] || 0) + 1;
  });
  return summary;
}

/**
 * Valider qu'un template est cohérent
 */
function validateTemplateLogic(template) {
  const errors = [];
  
  const startMinutes = timeToMinutes(template.startTime);
  const endMinutes = timeToMinutes(template.endTime);
  
  // Vérifier que fin > début
  if (endMinutes <= startMinutes) {
    errors.push('L\'heure de fin doit être après l\'heure de début');
  }
  
  // Vérifier la pause si elle existe
  if (template.breakStart && template.breakEnd) {
    const breakStartMinutes = timeToMinutes(template.breakStart);
    const breakEndMinutes = timeToMinutes(template.breakEnd);
    
    if (breakEndMinutes <= breakStartMinutes) {
      errors.push('L\'heure de fin de pause doit être après l\'heure de début');
    }
    
    if (breakStartMinutes < startMinutes || breakEndMinutes > endMinutes) {
      errors.push('La pause doit être comprise dans les horaires de travail');
    }
  }
  
  // Vérifier durée minimale
  const workingMinutes = calculateTemplateDuration(template);
  if (workingMinutes < 60) {
    errors.push('La durée de travail doit être d\'au moins 1 heure');
  }
  
  if (workingMinutes > 12 * 60) {
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

// ===== ROUTES =====

/**
 * @route   GET /api/admin/schedules/templates
 * @desc    Liste des templates de planning
 * @access  Admin
 */
router.get('/', validateQuery(Joi.object({
  category: Joi.string().valid('all', 'standard', 'shifts', 'special', 'custom').default('all'),
  includeUsage: Joi.boolean().default(true)
})), async (req, res) => {
  try {
    const { category, includeUsage } = req.query;
    
    // Filtrer par catégorie
    let filteredTemplates = category === 'all' ? 
      [...scheduleTemplates] : 
      scheduleTemplates.filter(t => t.category === category);
    
    // Calculer usage si demandé
    if (includeUsage) {
      for (const template of filteredTemplates) {
        // En production, compter depuis la DB
        // const usage = await Schedule.countDocuments({ templateId: template.id });
        // template.usageCount = usage;
        
        // Simulation pour l'exemple
        template.recentUsage = Math.floor(Math.random() * 50);
        template.lastUsed = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      }
    }
    
    // Trier par usage et date
    filteredTemplates.sort((a, b) => {
      if (a.isDefault !== b.isDefault) return b.isDefault - a.isDefault;
      return (b.recentUsage || 0) - (a.recentUsage || 0);
    });

    res.json({
      success: true,
      data: {
        templates: filteredTemplates.map(template => ({
          ...template,
          workingDuration: calculateTemplateDuration(template.template),
          formattedDuration: formatDuration(calculateTemplateDuration(template.template)),
          canEdit: template.createdBy !== 'system',
          canDelete: template.createdBy !== 'system' && (template.recentUsage || 0) === 0
        })),
        categories: getTemplateCategories(),
        summary: {
          total: filteredTemplates.length,
          byCategory: getTemplateSummary(),
          mostUsed: filteredTemplates.slice(0, 3)
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
    
    // Vérifier l'unicité du nom
    const existingTemplate = scheduleTemplates.find(t => 
      t.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Un template avec ce nom existe déjà'
      });
    }
    
    // Valider la logique du template
    const validationErrors = validateTemplateLogic(template);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Template invalide',
        errors: validationErrors
      });
    }
    
    // Vérifier que les agences existent
    if (defaultAgencies.length > 0) {
      const agenciesCount = await Agency.countDocuments({
        _id: { $in: defaultAgencies }
      });
      
      if (agenciesCount !== defaultAgencies.length) {
        return res.status(400).json({
          success: false,
          message: 'Une ou plusieurs agences spécifiées n\'existent pas'
        });
      }
    }
    
    // Créer le nouveau template
    const newTemplate = {
      id: generateTemplateId(),
      name,
      description: description || '',
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
        template: {
          ...newTemplate,
          workingDuration: calculateTemplateDuration(newTemplate.template),
          formattedDuration: formatDuration(calculateTemplateDuration(newTemplate.template))
        }
      }
    });

  } catch (error) {
    console.error('Erreur création template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/schedules/templates/:id
 * @desc    Détails d'un template spécifique
 * @access  Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = scheduleTemplates.find(t => t.id === id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    // Récupérer les agences par défaut avec détails
    let defaultAgenciesDetails = [];
    if (template.defaultAgencies.length > 0) {
      defaultAgenciesDetails = await Agency.find({
        _id: { $in: template.defaultAgencies }
      }).select('name code client');
    }
    
    // Calculer usage récent (simulation)
    const usageStats = {
      totalUsage: template.usageCount || Math.floor(Math.random() * 100),
      lastMonth: Math.floor(Math.random() * 20),
      lastWeek: Math.floor(Math.random() * 5),
      avgPerMonth: Math.floor(Math.random() * 15)
    };

    res.json({
      success: true,
      data: {
        template: {
          ...template,
          defaultAgenciesDetails,
          workingDuration: calculateTemplateDuration(template.template),
          formattedDuration: formatDuration(calculateTemplateDuration(template.template)),
          usageStats,
          canEdit: template.createdBy !== 'system',
          canDelete: template.createdBy !== 'system' && usageStats.totalUsage === 0
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
    const { id } = req.params;
    const updateData = req.body;
    
    const templateIndex = scheduleTemplates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    const template = scheduleTemplates[templateIndex];
    
    // Vérifier les permissions
    if (template.createdBy === 'system') {
      return res.status(403).json({
        success: false,
        message: 'Les templates système ne peuvent pas être modifiés'
      });
    }
    
    // Vérifier l'unicité du nom si modifié
    if (updateData.name && updateData.name !== template.name) {
      const existingTemplate = scheduleTemplates.find(t => 
        t.name.toLowerCase() === updateData.name.toLowerCase() && t.id !== id
      );
      
      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'Un template avec ce nom existe déjà'
        });
      }
    }
    
    // Valider la logique du template si modifié
    if (updateData.template) {
      const validationErrors = validateTemplateLogic(updateData.template);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Template invalide',
          errors: validationErrors
        });
      }
    }
    
    // Vérifier que les agences existent si modifiées
    if (updateData.defaultAgencies && updateData.defaultAgencies.length > 0) {
      const agenciesCount = await Agency.countDocuments({
        _id: { $in: updateData.defaultAgencies }
      });
      
      if (agenciesCount !== updateData.defaultAgencies.length) {
        return res.status(400).json({
          success: false,
          message: 'Une ou plusieurs agences spécifiées n\'existent pas'
        });
      }
    }
    
    // Mettre à jour le template
    scheduleTemplates[templateIndex] = {
      ...template,
      ...updateData,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'Template modifié avec succès',
      data: {
        template: {
          ...scheduleTemplates[templateIndex],
          workingDuration: calculateTemplateDuration(scheduleTemplates[templateIndex].template),
          formattedDuration: formatDuration(calculateTemplateDuration(scheduleTemplates[templateIndex].template))
        }
      }
    });

  } catch (error) {
    console.error('Erreur modification template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
    const { id } = req.params;
    
    const templateIndex = scheduleTemplates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    const template = scheduleTemplates[templateIndex];
    
    // Vérifier les permissions
    if (template.createdBy === 'system') {
      return res.status(403).json({
        success: false,
        message: 'Les templates système ne peuvent pas être supprimés'
      });
    }
    
    // Vérifier que le template n'est pas utilisé
    // En production, vérifier dans la DB
    // const usageCount = await Schedule.countDocuments({ templateId: id });
    const usageCount = 0; // Simulation
    
    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Ce template est utilisé dans ${usageCount} planning(s) et ne peut pas être supprimé`
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
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/schedules/apply-template
 * @desc    Appliquer un template à des utilisateurs sur une période
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
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }
    
    // Vérifier que les utilisateurs existent
    const users = await User.find({
      _id: { $in: userIds },
      role: 'preparateur',
      isActive: true
    });
    
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Un ou plusieurs utilisateurs sont invalides ou inactifs'
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
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      conflicts: []
    };
    
    // Créer/modifier les plannings pour chaque utilisateur et chaque date
    for (const user of users) {
      for (const date of dates) {
        try {
          // Vérifier s'il existe déjà un planning
          const existingSchedule = await Schedule.findOne({
            user: user._id,
            agency: agencyId,
            date: date
          });
          
          if (existingSchedule && !options.overwrite) {
            if (options.skipConflicts) {
              results.skipped++;
              continue;
            } else {
              results.conflicts.push({
                userId: user._id.toString(),
                userName: `${user.firstName} ${user.lastName}`,
                date: date.toISOString().split('T')[0],
                reason: 'Planning existant'
              });
              results.skipped++;
              continue;
            }
          }
          
          if (existingSchedule) {
            // Mettre à jour
            existingSchedule.startTime = template.template.startTime;
            existingSchedule.endTime = template.template.endTime;
            existingSchedule.breakStart = template.template.breakStart;
            existingSchedule.breakEnd = template.template.breakEnd;
            existingSchedule.updatedAt = new Date();
            
            await existingSchedule.save();
            results.updated++;
          } else {
            // Créer nouveau
            const newSchedule = new Schedule({
              user: user._id,
              agency: agencyId,
              date: date,
              startTime: template.template.startTime,
              endTime: template.template.endTime,
              breakStart: template.template.breakStart,
              breakEnd: template.template.breakEnd,
              createdBy: req.user.userId,
              notes: `Appliqué depuis template: ${template.name}`
            });
            
            await newSchedule.save();
            results.created++;
          }
          
        } catch (scheduleError) {
          console.error('Erreur création planning individuel:', scheduleError);
          results.conflicts.push({
            userId: user._id.toString(),
            userName: `${user.firstName} ${user.lastName}`,
            date: date.toISOString().split('T')[0],
            reason: 'Erreur de création'
          });
          results.skipped++;
        }
      }
    }
    
    // Incrémenter l'usage du template
    template.usageCount = (template.usageCount || 0) + results.created + results.updated;

    res.json({
      success: true,
      message: `Template appliqué avec succès`,
      data: {
        results,
        template: {
          id: template.id,
          name: template.name
        },
        summary: {
          usersAffected: users.length,
          datesProcessed: dates.length,
          totalOperations: results.created + results.updated + results.skipped
        }
      }
    });

  } catch (error) {
    console.error('Erreur application template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/schedules/templates/:id/duplicate
 * @desc    Dupliquer un template existant
 * @access  Admin
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const originalTemplate = scheduleTemplates.find(t => t.id === id);
    
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    // Créer une copie
    const duplicateTemplate = {
      id: generateTemplateId(),
      name: `${originalTemplate.name} (Copie)`,
      description: originalTemplate.description,
      category: 'custom', // Les copies sont toujours custom
      template: { ...originalTemplate.template },
      defaultAgencies: [...originalTemplate.defaultAgencies],
      isDefault: false,
      createdBy: req.user.userId,
      createdAt: new Date(),
      usageCount: 0
    };
    
    scheduleTemplates.push(duplicateTemplate);

    res.status(201).json({
      success: true,
      message: 'Template dupliqué avec succès',
      data: {
        template: {
          ...duplicateTemplate,
          workingDuration: calculateTemplateDuration(duplicateTemplate.template),
          formattedDuration: formatDuration(calculateTemplateDuration(duplicateTemplate.template))
        }
      }
    });

  } catch (error) {
    console.error('Erreur duplication template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;