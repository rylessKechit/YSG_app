// ===== backend/src/routes/admin/schedules-templates.js =====
const express = require('express');
const Joi = require('joi');
const Schedule = require('../../models/Schedule');
const User = require('../../models/User');
const Agency = require('../../models/Agency');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery } = require('../../middleware/validation');
const { objectId, timeFormat } = require('../../middleware/validation');
const { ERROR_MESSAGES } = require('../../utils/constants');

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
router.post('/', validateBody(Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(200).optional(),
  category: Joi.string().valid('standard', 'shifts', 'special', 'custom').default('custom'),
  template: Joi.object({
    startTime: timeFormat.required(),
    endTime: timeFormat.required(),
    breakStart: timeFormat.optional().allow(null, ''),
    breakEnd: timeFormat.optional().allow(null, '')
  }).required(),
  defaultAgencies: Joi.array().items(objectId).optional(),
  notes: Joi.string().max(500).optional()
})), async (req, res) => {
  try {
    const { name, description, category, template, defaultAgencies = [], notes } = req.body;
    
    // Vérifier que le nom n'existe pas déjà
    const existingTemplate = scheduleTemplates.find(t => 
      t.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Un template avec ce nom existe déjà'
      });
    }
    
    // Valider les horaires
    const validation = validateTemplateHours(template);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }
    
    // Vérifier que les agences existent
    if (defaultAgencies.length > 0) {
      const agencies = await Agency.find({ 
        _id: { $in: defaultAgencies },
        isActive: true 
      });
      
      if (agencies.length !== defaultAgencies.length) {
        return res.status(400).json({
          success: false,
          message: 'Certaines agences spécifiées sont introuvables'
        });
      }
    }
    
    // Créer le nouveau template
    const newTemplate = {
      id: `template_${Date.now()}`,
      name,
      description: description || '',
      category,
      template: {
        startTime: template.startTime,
        endTime: template.endTime,
        breakStart: template.breakStart || null,
        breakEnd: template.breakEnd || null
      },
      defaultAgencies,
      notes: notes || '',
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
router.put('/:id', validateBody(Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(200).optional(),
  category: Joi.string().valid('standard', 'shifts', 'special', 'custom').optional(),
  template: Joi.object({
    startTime: timeFormat.optional(),
    endTime: timeFormat.optional(),
    breakStart: timeFormat.optional().allow(null, ''),
    breakEnd: timeFormat.optional().allow(null, '')
  }).optional(),
  defaultAgencies: Joi.array().items(objectId).optional(),
  notes: Joi.string().max(500).optional()
})), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const templateIndex = scheduleTemplates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }
    
    const template = scheduleTemplates[templateIndex];
    
    // Vérifier permissions
    if (template.createdBy === 'system') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de modifier un template système'
      });
    }
    
    // Vérifier unicité du nom si modifié
    if (updates.name && updates.name !== template.name) {
      const existingTemplate = scheduleTemplates.find(t => 
        t.name.toLowerCase() === updates.name.toLowerCase() && t.id !== id
      );
      
      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: 'Un template avec ce nom existe déjà'
        });
      }
    }
    
    // Valider les horaires si modifiés
    if (updates.template) {
      const mergedTemplate = { ...template.template, ...updates.template };
      const validation = validateTemplateHours(mergedTemplate);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
    }
    
    // Appliquer les modifications
    const updatedTemplate = {
      ...template,
      ...updates,
      template: updates.template ? { ...template.template, ...updates.template } : template.template,
      updatedAt: new Date(),
      updatedBy: req.user.userId
    };
    
    scheduleTemplates[templateIndex] = updatedTemplate;
    
    res.json({
      success: true,
      message: 'Template modifié avec succès',
      data: {
        template: {
          ...updatedTemplate,
          workingDuration: calculateTemplateDuration(updatedTemplate.template),
          formattedDuration: formatDuration(calculateTemplateDuration(updatedTemplate.template))
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
    
    // Vérifier permissions
    if (template.createdBy === 'system') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer un template système'
      });
    }
    
    // Vérifier usage (en production, vérifier dans les plannings)