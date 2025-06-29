// backend/src/routes/admin/reports/templates.js
const express = require('express');
const router = express.Router();
const { ERROR_MESSAGES } = require('./utils');

// ================================
// TEMPLATES DE RAPPORTS
// ================================

router.get('/', async (req, res) => {
  try {
    // Dans un vrai système, ces templates seraient stockés en base de données
    // et pourraient être personnalisés par les utilisateurs
    const templates = [
      {
        id: 'template_ponctualite_mensuel',
        name: 'Ponctualité Mensuelle',
        type: 'ponctualite',
        description: 'Rapport de ponctualité standard pour analyse mensuelle avec détails par agence',
        category: 'standard',
        isDefault: true,
        createdBy: 'system',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-06-28T10:30:00Z',
        usageCount: 45,
        defaultFilters: {
          period: 'month',
          includeDetails: true,
          includeComparison: true,
          includeGraphiques: true,
          format: 'excel',
          agencies: []
        },
        sections: [
          'Vue d\'ensemble globale',
          'Statistiques par agence', 
          'Tendances par jour de la semaine',
          'Classement des utilisateurs',
          'Graphiques de visualisation'
        ]
      },
      {
        id: 'template_ponctualite_hebdo',
        name: 'Ponctualité Hebdomadaire',
        type: 'ponctualite',
        description: 'Suivi hebdomadaire rapide de la ponctualité',
        category: 'standard',
        isDefault: false,
        createdBy: 'system',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-06-29T08:15:00Z',
        usageCount: 23,
        defaultFilters: {
          period: 'week',
          includeDetails: false,
          includeComparison: false,
          includeGraphiques: false,
          format: 'json',
          agencies: []
        },
        sections: [
          'Métriques de base',
          'Alertes retards',
          'Résumé par agence'
        ]
      },
      {
        id: 'template_performance_trimestriel',
        name: 'Performance Trimestrielle',
        type: 'performance',
        description: 'Analyse détaillée des performances sur 3 mois avec benchmarking',
        category: 'advanced',
        isDefault: true,
        createdBy: 'system',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-06-15T14:20:00Z',
        usageCount: 12,
        defaultFilters: {
          period: 'quarter',
          includeComparison: true,
          includeGraphiques: true,
          format: 'pdf',
          agencies: []
        },
        sections: [
          'Indicateurs de performance globaux',
          'Analyse comparative par agence',
          'Évolution dans le temps',
          'Classement des préparateurs',
          'Recommandations d\'amélioration'
        ]
      },
      {
        id: 'template_performance_daily',
        name: 'Performance Quotidienne',
        type: 'performance',
        description: 'Suivi quotidien des temps de préparation et efficacité',
        category: 'monitoring',
        isDefault: false,
        createdBy: 'system',
        createdAt: '2024-02-01T00:00:00Z',
        lastUsed: '2024-06-29T16:45:00Z',
        usageCount: 87,
        defaultFilters: {
          period: 'today',
          includeComparison: false,
          includeGraphiques: true,
          format: 'json',
          agencies: []
        },
        sections: [
          'Métriques du jour',
          'Alertes dépassements',
          'Comparaison objectifs'
        ]
      },
      {
        id: 'template_activite_hebdo',
        name: 'Activité Hebdomadaire',
        type: 'activite',
        description: 'Suivi hebdomadaire de l\'activité par agence et utilisateur',
        category: 'standard',
        isDefault: true,
        createdBy: 'system',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-06-26T09:30:00Z',
        usageCount: 34,
        defaultFilters: {
          period: 'week',
          format: 'csv',
          agencies: []
        },
        sections: [
          'Volume d\'activité global',
          'Répartition par agence',
          'Pics d\'activité par heure',
          'Performance des équipes'
        ]
      },
      {
        id: 'template_activite_mensuel',
        name: 'Bilan Mensuel d\'Activité',
        type: 'activite',
        description: 'Bilan complet mensuel avec tendances et analyses',
        category: 'advanced',
        isDefault: false,
        createdBy: 'system',
        createdAt: '2024-01-01T00:00:00Z',
        lastUsed: '2024-06-01T11:15:00Z',
        usageCount: 8,
        defaultFilters: {
          period: 'month',
          includeComparison: true,
          format: 'excel',
          agencies: []
        },
        sections: [
          'Synthèse mensuelle',
          'Évolution des tendances',
          'Analyse de saisonnalité',
          'Benchmarking inter-agences',
          'Projections futures'
        ]
      },
      {
        id: 'template_executive_summary',
        name: 'Résumé Exécutif',
        type: 'custom',
        description: 'Rapport synthétique pour la direction avec KPIs essentiels',
        category: 'executive',
        isDefault: false,
        createdBy: 'admin',
        createdAt: '2024-03-15T00:00:00Z',
        lastUsed: '2024-06-20T15:00:00Z',
        usageCount: 6,
        defaultFilters: {
          period: 'month',
          includeComparison: true,
          includeGraphiques: true,
          format: 'pdf',
          agencies: []
        },
        sections: [
          'Dashboard exécutif',
          'Indicateurs clés',
          'Alertes critiques',
          'Recommandations stratégiques'
        ]
      }
    ];

    // Filtrage par catégorie si spécifié
    const { category, type } = req.query;
    let filteredTemplates = templates;

    if (category) {
      const validCategories = ['standard', 'advanced', 'monitoring', 'executive'];
      if (validCategories.includes(category)) {
        filteredTemplates = templates.filter(t => t.category === category);
      }
    }

    if (type) {
      const validTypes = ['ponctualite', 'performance', 'activite', 'custom'];
      if (validTypes.includes(type)) {
        filteredTemplates = filteredTemplates.filter(t => t.type === type);
      }
    }

    // Tri par popularité (usage) et templates par défaut en premier
    filteredTemplates.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.usageCount - a.usageCount;
    });

    // Statistiques sur les templates
    const stats = {
      total: templates.length,
      byCategory: {
        standard: templates.filter(t => t.category === 'standard').length,
        advanced: templates.filter(t => t.category === 'advanced').length,
        monitoring: templates.filter(t => t.category === 'monitoring').length,
        executive: templates.filter(t => t.category === 'executive').length
      },
      byType: {
        ponctualite: templates.filter(t => t.type === 'ponctualite').length,
        performance: templates.filter(t => t.type === 'performance').length,
        activite: templates.filter(t => t.type === 'activite').length,
        custom: templates.filter(t => t.type === 'custom').length
      },
      mostUsed: templates.reduce((max, template) => 
        template.usageCount > max.usageCount ? template : max
      )
    };

    res.json({
      success: true,
      data: {
        templates: filteredTemplates,
        stats,
        categories: ['standard', 'advanced', 'monitoring', 'executive'],
        types: ['ponctualite', 'performance', 'activite', 'custom']
      },
      message: 'Templates récupérés avec succès'
    });

  } catch (error) {
    console.error('Erreur templates:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ================================
// DÉTAILS D'UN TEMPLATE SPÉCIFIQUE
// ================================

router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    // Simulation - dans un vrai système, récupération depuis la base
    const template = {
      id: templateId,
      name: 'Ponctualité Mensuelle',
      type: 'ponctualite',
      description: 'Rapport de ponctualité standard pour analyse mensuelle avec détails par agence',
      category: 'standard',
      isDefault: true,
      createdBy: 'system',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-06-01T10:00:00Z',
      lastUsed: '2024-06-28T10:30:00Z',
      usageCount: 45,
      defaultFilters: {
        period: 'month',
        includeDetails: true,
        includeComparison: true,
        includeGraphiques: true,
        format: 'excel',
        agencies: []
      },
      sections: [
        'Vue d\'ensemble globale',
        'Statistiques par agence', 
        'Tendances par jour de la semaine',
        'Classement des utilisateurs',
        'Graphiques de visualisation'
      ],
      permissions: {
        canEdit: false,
        canDelete: false,
        canCopy: true
      }
    };

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template non trouvé'
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Détails du template récupérés avec succès'
    });

  } catch (error) {
    console.error('Erreur détails template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ================================
// CRÉER/SAUVEGARDER UN TEMPLATE
// ================================

router.post('/', async (req, res) => {
  try {
    const { name, type, description, category = 'custom', defaultFilters, sections } = req.body;

    // Validation des champs requis
    if (!name || !type || !description || !defaultFilters) {
      return res.status(400).json({
        success: false,
        message: 'Nom, type, description et filtres par défaut requis'
      });
    }

    // Validation du type
    const validTypes = ['ponctualite', 'performance', 'activite', 'custom'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type de template invalide'
      });
    }

    // Validation de la catégorie
    const validCategories = ['standard', 'advanced', 'monitoring', 'executive', 'custom'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie invalide'
      });
    }

    // Générer un ID unique
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Dans un vrai système, on sauvegarderait en base de données
    const newTemplate = {
      id: templateId,
      name: name.trim(),
      type,
      description: description.trim(),
      category,
      isDefault: false,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0,
      defaultFilters,
      sections: sections || [],
      permissions: {
        canEdit: true,
        canDelete: true,
        canCopy: true
      }
    };

    console.log(`Nouveau template créé: ${templateId} par ${req.user.firstName} ${req.user.lastName}`);

    res.status(201).json({
      success: true,
      data: { templateId: newTemplate.id },
      message: 'Template sauvegardé avec succès'
    });

  } catch (error) {
    console.error('Erreur création template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ================================
// UTILISER UN TEMPLATE (incrémente le compteur d'usage)
// ================================

router.post('/:templateId/use', async (req, res) => {
  try {
    const { templateId } = req.params;

    // Dans un vrai système, on mettrait à jour les statistiques d'usage
    console.log(`Template ${templateId} utilisé par ${req.user.firstName} ${req.user.lastName}`);

    res.json({
      success: true,
      data: {
        templateId,
        usedAt: new Date().toISOString(),
        usedBy: req.user.id
      },
      message: 'Usage du template enregistré'
    });

  } catch (error) {
    console.error('Erreur usage template:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ================================
// SUPPRIMER UN TEMPLATE
// ================================

router.delete('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    // Dans un vrai système, on vérifierait:
    // 1. Que le template existe
    // 2. Que l'utilisateur a les droits de suppression
    // 3. Que ce n'est pas un template système par défaut

    console.log(`Template ${templateId} supprimé par ${req.user.firstName} ${req.user.lastName}`);

    res.json({
      success: true,
      data: {
        templateId,
        deletedAt: new Date().toISOString(),
        deletedBy: req.user.id
      },
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

module.exports = router;