// backend/src/routes/admin/reports/performance.js
const express = require('express');
const router = express.Router();
const { ERROR_MESSAGES, getDateRange, loadModels, generateMockData, validateFilters } = require('./utils');

// ================================
// RAPPORT DE PERFORMANCE - VERSION CORRIGÉE
// ================================

router.get('/', async (req, res) => {
  try {
    const { 
      period = 'month', 
      startDate, 
      endDate, 
      agencies = [],
      includeComparison = false 
    } = req.query;

    // Validation des filtres
    const validationErrors = validateFilters({ period, startDate, endDate });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(', ')
      });
    }

    const { start: dateStart, end: dateEnd } = getDateRange(period, startDate, endDate);
    const models = loadModels();

    // Si les modèles ne sont pas disponibles, utiliser des données simulées
    if (!models.Preparation || !models.Agency) {
      console.warn('📊 Modèles non disponibles, utilisation de données simulées pour rapport performance');
      const mockData = generateMockData('performance', period);
      
      return res.json({
        success: true,
        data: mockData,
        message: 'Rapport de performance généré avec succès (données simulées)'
      });
    }

    // Filtres pour les agences
    let agencyFilter = {};
    if (agencies.length > 0) {
      const agencyIds = Array.isArray(agencies) ? agencies : [agencies];
      agencyFilter = { agency: { $in: agencyIds } }; // ✅ CORRIGÉ: agency au lieu de agencyId
    }

    // ✅ CORRIGÉ: Populate avec les bons noms de champs
    // Récupérer toutes les préparations terminées de la période
    const preparations = await models.Preparation.find({
      ...agencyFilter,
      startTime: { $gte: dateStart, $lte: dateEnd },
      status: 'completed'
    }).populate('user', 'firstName lastName') // ✅ CORRIGÉ: user au lieu de userId
      .populate('agency', 'name'); // ✅ CORRIGÉ: agency au lieu de agencyId

    // Calculer les métriques globales
    const totalPreparations = preparations.length;
    const totalTime = preparations.reduce((sum, prep) => {
      // ✅ CORRIGÉ: Utiliser totalTime qui est déjà en minutes
      return sum + (prep.totalTime || 0);
    }, 0);

    const tempsMoyenGlobal = totalPreparations > 0 ? totalTime / totalPreparations : 0;
    const objectifTemps = 25; // 25 minutes - configurable
    const preparationsRespectantObjectif = preparations.filter(prep => {
      return (prep.totalTime || 0) <= objectifTemps;
    }).length;

    const tauxRespectObjectif = totalPreparations > 0 ? 
      (preparationsRespectantObjectif / totalPreparations) * 100 : 0;

    // Performance par agence
    const agencies_list = await models.Agency.find(
      agencyFilter.agency ? { _id: { $in: agencyFilter.agency.$in } } : {}
    );

    const performanceParAgence = agencies_list.map(agency => {
      const preparationsAgence = preparations.filter(prep => 
        prep.agency && prep.agency._id.toString() === agency._id.toString()
      );
      
      const totalAgence = preparationsAgence.length;
      const tempsTotalAgence = preparationsAgence.reduce((sum, prep) => sum + (prep.totalTime || 0), 0);
      const tempsMoyenAgence = totalAgence > 0 ? tempsTotalAgence / totalAgence : 0;
      const objectifRespectedAgence = preparationsAgence.filter(prep => (prep.totalTime || 0) <= objectifTemps).length;
      const tauxAgence = totalAgence > 0 ? (objectifRespectedAgence / totalAgence) * 100 : 0;

      return {
        agencyId: agency._id,
        agencyName: agency.name,
        totalPreparations: totalAgence,
        tempsMoyen: Math.round(tempsMoyenAgence),
        tauxRespectObjectif: Math.round(tauxAgence * 10) / 10,
        objectifTemps: objectifTemps
      };
    });

    // Performance par préparateur
    const performanceParPreparateur = [];
    const preparateursMap = new Map();

    preparations.forEach(prep => {
      if (prep.user) {
        const userId = prep.user._id.toString();
        if (!preparateursMap.has(userId)) {
          preparateursMap.set(userId, {
            userId: userId,
            preparateurNom: `${prep.user.firstName} ${prep.user.lastName}`,
            preparations: [],
            totalPreparations: 0,
            tempsTotal: 0,
            objectifRespected: 0
          });
        }
        
        const prepData = preparateursMap.get(userId);
        prepData.preparations.push(prep);
        prepData.totalPreparations += 1;
        prepData.tempsTotal += (prep.totalTime || 0);
        if ((prep.totalTime || 0) <= objectifTemps) {
          prepData.objectifRespected += 1;
        }
      }
    });

    preparateursMap.forEach((data, userId) => {
      const tempsMoyen = data.totalPreparations > 0 ? data.tempsTotal / data.totalPreparations : 0;
      const tauxRespect = data.totalPreparations > 0 ? (data.objectifRespected / data.totalPreparations) * 100 : 0;

      performanceParPreparateur.push({
        userId: userId,
        preparateurNom: data.preparateurNom,
        totalPreparations: data.totalPreparations,
        tempsMoyen: Math.round(tempsMoyen),
        tauxRespectObjectif: Math.round(tauxRespect * 10) / 10,
        efficacite: tempsMoyen > 0 ? Math.round((objectifTemps / tempsMoyen) * 100) : 0
      });
    });

    // Trier par efficacité décroissante
    performanceParPreparateur.sort((a, b) => b.efficacite - a.efficacite);

    // Tendances (données comparatives pour la période précédente si demandé)
    let tendances = null;
    if (includeComparison) {
      const periodDuration = dateEnd - dateStart;
      const previousStart = new Date(dateStart.getTime() - periodDuration);
      const previousEnd = new Date(dateStart.getTime() - 1);

      const preparationsPrecedentes = await models.Preparation.find({
        ...agencyFilter,
        startTime: { $gte: previousStart, $lte: previousEnd },
        status: 'completed'
      });

      const totalPrecedent = preparationsPrecedentes.length;
      const tempsPrecedent = preparationsPrecedentes.reduce((sum, prep) => sum + (prep.totalTime || 0), 0);
      const tempsMoyenPrecedent = totalPrecedent > 0 ? tempsPrecedent / totalPrecedent : 0;

      tendances = {
        evolutionNombrePreparations: totalPrecedent > 0 ? 
          Math.round(((totalPreparations - totalPrecedent) / totalPrecedent) * 100) : 0,
        evolutionTempsMoyen: tempsMoyenPrecedent > 0 ? 
          Math.round(((tempsMoyenGlobal - tempsMoyenPrecedent) / tempsMoyenPrecedent) * 100) : 0,
        periodePrecedente: {
          startDate: previousStart,
          endDate: previousEnd,
          totalPreparations: totalPrecedent,
          tempsMoyen: Math.round(tempsMoyenPrecedent)
        }
      };
    }

    // Construire la réponse finale
    const performanceData = {
      periode: {
        startDate: dateStart,
        endDate: dateEnd,
        duration: Math.ceil((dateEnd - dateStart) / (1000 * 60 * 60 * 24)) + ' jours'
      },
      metriques: {
        totalPreparations,
        tempsMoyenGlobal: Math.round(tempsMoyenGlobal),
        objectifTemps,
        preparationsRespectantObjectif,
        tauxRespectObjectif: Math.round(tauxRespectObjectif * 10) / 10,
        performanceGlobale: Math.round((tauxRespectObjectif / 100) * 10 * 10) // Score sur 100
      },
      agences: performanceParAgence,
      preparateurs: performanceParPreparateur.slice(0, 10), // Top 10
      tendances,
      metadata: {
        generatedAt: new Date(),
        generatedBy: req.user.email,
        dataSource: 'mongodb',
        version: '1.0.0'
      }
    };

    res.json({
      success: true,
      data: performanceData,
      message: `Rapport de performance généré avec succès (${totalPreparations} préparations analysées)`
    });

  } catch (error) {
    console.error('❌ Erreur rapport performance:', error);
    
    // ✅ Gestion spécifique de l'erreur populate
    if (error.message.includes('populate') || error.message.includes('StrictPopulate')) {
      return res.status(500).json({
        success: false,
        message: 'Erreur de structure de données. Veuillez vérifier la cohérence des modèles.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
      });
    }

    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de la génération du rapport',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;