// backend/src/routes/admin/reports/list.js
const express = require('express');
const router = express.Router();
const { ERROR_MESSAGES } = require('./utils');

// ================================
// LISTE DES RAPPORTS SAUVEGARDÉS
// ================================

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;

    // Validation des paramètres
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Numéro de page invalide'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limite invalide (1-100)'
      });
    }

    // Dans un vrai système, ces données viendraient d'une collection MongoDB
    // Pour l'instant, on utilise des données simulées
    const allReports = [
      {
        id: 'report_1719651000_abc123',
        titre: 'Ponctualité Juin 2024',
        description: 'Rapport mensuel de ponctualité pour toutes les agences',
        type: 'ponctualite',
        periode: {
          debut: '2024-06-01',
          fin: '2024-06-30'
        },
        statut: 'ready',
        creeA: '2024-06-29T08:30:00Z',
        creeParUserId: req.user.id,
        creeParUserNom: `${req.user.firstName} ${req.user.lastName}`,
        taille: 2400000, // 2.4 MB
        format: 'excel',
        lienTelechargement: '/downloads/rapport-ponctualite-juin-2024.xlsx'
      },
      {
        id: 'report_1719564600_def456',
        titre: 'Performance Q2 2024',
        description: 'Rapport trimestriel de performance avec comparaison',
        type: 'performance',
        periode: {
          debut: '2024-04-01',
          fin: '2024-06-30'
        },
        statut: 'ready',
        creeA: '2024-06-28T14:15:00Z',
        creeParUserId: req.user.id,
        creeParUserNom: `${req.user.firstName} ${req.user.lastName}`,
        taille: 1800000, // 1.8 MB
        format: 'pdf',
        lienTelechargement: '/downloads/rapport-performance-q2-2024.pdf'
      },
      {
        id: 'report_1719478200_ghi789',
        titre: 'Activité Mensuelle Mai 2024',
        description: 'Analyse détaillée de l\'activité par agence et utilisateur',
        type: 'activite',
        periode: {
          debut: '2024-05-01',
          fin: '2024-05-31'
        },
        statut: 'generating',
        creeA: '2024-06-27T09:45:00Z',
        creeParUserId: req.user.id,
        creeParUserNom: `${req.user.firstName} ${req.user.lastName}`,
        taille: null,
        format: 'excel',
        lienTelechargement: null
      },
      {
        id: 'report_1719391800_jkl012',
        titre: 'Rapport Personnalisé - Agence Paris',
        description: 'Rapport custom pour l\'agence Paris Centre uniquement',
        type: 'custom',
        periode: {
          debut: '2024-06-15',
          fin: '2024-06-25'
        },
        statut: 'error',
        creeA: '2024-06-26T16:20:00Z',
        creeParUserId: req.user.id,
        creeParUserNom: `${req.user.firstName} ${req.user.lastName}`,
        taille: null,
        format: 'csv',
        lienTelechargement: null,
        erreur: 'Données insuffisantes pour la période sélectionnée'
      },
      {
        id: 'report_1719305400_mno345',
        titre: 'Ponctualité Hebdomadaire S25',
        description: 'Rapport hebdomadaire semaine 25',
        type: 'ponctualite',
        periode: {
          debut: '2024-06-17',
          fin: '2024-06-23'
        },
        statut: 'ready',
        creeA: '2024-06-25T11:30:00Z',
        creeParUserId: req.user.id,
        creeParUserNom: `${req.user.firstName} ${req.user.lastName}`,
        taille: 850000, // 850 KB
        format: 'json',
        lienTelechargement: '/downloads/rapport-ponctualite-s25-2024.json'
      }
    ];

    // Filtrer par type si spécifié
    let filteredReports = allReports;
    if (type) {
      const validTypes = ['ponctualite', 'performance', 'activite', 'custom'];
      if (validTypes.includes(type)) {
        filteredReports = allReports.filter(r => r.type === type);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Type de rapport invalide'
        });
      }
    }

    // Filtrer par statut si spécifié
    if (status) {
      const validStatuses = ['ready', 'generating', 'error'];
      if (validStatuses.includes(status)) {
        filteredReports = filteredReports.filter(r => r.statut === status);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Statut invalide'
        });
      }
    }

    // Tri par date de création (plus récent en premier)
    filteredReports.sort((a, b) => new Date(b.creeA) - new Date(a.creeA));

    // Pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    // Statistiques
    const stats = {
      total: filteredReports.length,
      ready: filteredReports.filter(r => r.statut === 'ready').length,
      generating: filteredReports.filter(r => r.statut === 'generating').length,
      error: filteredReports.filter(r => r.statut === 'error').length,
      totalSize: filteredReports
        .filter(r => r.taille)
        .reduce((sum, r) => sum + r.taille, 0)
    };

    res.json({
      success: true,
      data: {
        reports: paginatedReports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredReports.length,
          pages: Math.ceil(filteredReports.length / limitNum),
          hasNext: endIndex < filteredReports.length,
          hasPrev: pageNum > 1
        },
        stats,
        filters: {
          type: type || null,
          status: status || null
        }
      },
      message: 'Liste des rapports récupérée avec succès'
    });

  } catch (error) {
    console.error('Erreur liste rapports:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ================================
// DÉTAILS D'UN RAPPORT SPÉCIFIQUE
// ================================

router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    // Validation du format de l'ID
    if (!reportId || typeof reportId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'ID de rapport invalide'
      });
    }

    // Dans un vrai système, on récupérerait depuis MongoDB
    // Pour l'instant, simulation avec les données de la liste
    const reports = [
      {
        id: 'report_1719651000_abc123',
        titre: 'Ponctualité Juin 2024',
        description: 'Rapport mensuel de ponctualité pour toutes les agences',
        type: 'ponctualite',
        periode: {
          debut: '2024-06-01',
          fin: '2024-06-30'
        },
        statut: 'ready',
        creeA: '2024-06-29T08:30:00Z',
        creeParUserId: req.user.id,
        creeParUserNom: `${req.user.firstName} ${req.user.lastName}`,
        taille: 2400000,
        format: 'excel',
        lienTelechargement: '/downloads/rapport-ponctualite-juin-2024.xlsx',
        // Détails supplémentaires
        parametres: {
          agencies: ['all'],
          includeDetails: true,
          includeComparison: true
        },
        tempsGeneration: 45, // secondes
        nombreLignes: 1250,
        derniereModification: '2024-06-29T08:35:00Z'
      }
    ];

    const report = reports.find(r => r.id === reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    res.json({
      success: true,
      data: report,
      message: 'Détails du rapport récupérés avec succès'
    });

  } catch (error) {
    console.error('Erreur détails rapport:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ================================
// SUPPRIMER UN RAPPORT
// ================================

router.delete('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    // Validation de l'ID
    if (!reportId || typeof reportId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'ID de rapport invalide'
      });
    }

    // Dans un vrai système, on:
    // 1. Vérifierait que le rapport existe
    // 2. Vérifierait les permissions (le créateur ou un admin)
    // 3. Supprimerait le fichier du stockage
    // 4. Supprimerait l'entrée de la base de données

    // Simulation de la suppression
    console.log(`Suppression du rapport ${reportId} par ${req.user.firstName} ${req.user.lastName}`);

    res.json({
      success: true,
      data: {
        reportId,
        deletedAt: new Date().toISOString(),
        deletedBy: req.user.id
      },
      message: 'Rapport supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression rapport:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ================================
// TÉLÉCHARGEMENT DE RAPPORT
// ================================

router.get('/:reportId/download', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { format = 'excel' } = req.query;

    // Validation
    if (!reportId || typeof reportId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'ID de rapport invalide'
      });
    }

    const validFormats = ['excel', 'pdf', 'csv', 'json'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Format de téléchargement invalide'
      });
    }

    // Dans un vrai système, on récupérerait le fichier depuis le stockage
    // Pour l'instant, on simule une erreur car les fichiers n'existent pas encore
    
    res.status(404).json({
      success: false,
      message: 'Fichier de rapport non trouvé - Fonctionnalité en développement',
      data: {
        reportId,
        requestedFormat: format,
        available: false,
        reason: 'Les fichiers de rapports ne sont pas encore générés physiquement'
      }
    });

  } catch (error) {
    console.error('Erreur téléchargement:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;