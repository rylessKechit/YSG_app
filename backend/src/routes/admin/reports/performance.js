// backend/src/routes/admin/reports/performance.js
const express = require('express');
const router = express.Router();
const { ERROR_MESSAGES, getDateRange, loadModels, generateMockData, validateFilters } = require('./utils');

// ================================
// RAPPORT DE PERFORMANCE
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
      agencyFilter = { agencyId: { $in: agencyIds } };
    }

    // Récupérer toutes les préparations terminées de la période
    const preparations = await models.Preparation.find({
      ...agencyFilter,
      startTime: { $gte: dateStart, $lte: dateEnd },
      status: 'completed'
    }).populate('userId', 'firstName lastName')
      .populate('agencyId', 'name');

    // Calculer les métriques globales
    const totalPreparations = preparations.length;
    const totalTime = preparations.reduce((sum, prep) => {
      const duration = new Date(prep.endTime) - new Date(prep.startTime);
      return sum + (duration / (1000 * 60)); // en minutes
    }, 0);

    const tempsMoyenGlobal = totalPreparations > 0 ? totalTime / totalPreparations : 0;
    const objectifTemps = 25; // 25 minutes - configurable
    const preparationsRespectantObjectif = preparations.filter(prep => {
      const duration = new Date(prep.endTime) - new Date(prep.startTime);
      const minutes = duration / (1000 * 60);
      return minutes <= objectifTemps;
    }).length;

    const tauxRespectObjectif = totalPreparations > 0 ? 
      (preparationsRespectantObjectif / totalPreparations) * 100 : 0;

    // Performance par agence
    const agencies_list = await models.Agency.find(agencyFilter.agencyId ? { _id: agencyFilter.agencyId } : {});
    const agencyStats = [];

    for (const agency of agencies_list) {
      const agencyPreps = preparations.filter(prep => 
        prep.agencyId && prep.agencyId._id.toString() === agency._id.toString()
      );

      const agencyTotalTime = agencyPreps.reduce((sum, prep) => {
        const duration = new Date(prep.endTime) - new Date(prep.startTime);
        return sum + (duration / (1000 * 60));
      }, 0);

      const agencyAvgTime = agencyPreps.length > 0 ? agencyTotalTime / agencyPreps.length : 0;
      const agencyObjectifResp = agencyPreps.filter(prep => {
        const duration = new Date(prep.endTime) - new Date(prep.startTime);
        return (duration / (1000 * 60)) <= objectifTemps;
      }).length;

      const agencySuccessRate = agencyPreps.length > 0 ? 
        (agencyObjectifResp / agencyPreps.length) * 100 : 0;

      agencyStats.push({
        agenceId: agency._id,
        nom: agency.name,
        totalPreparations: agencyPreps.length,
        tempsMoyen: parseFloat(agencyAvgTime.toFixed(1)),
        tempsMoyenObjectif: objectifTemps,
        tauxReussiteObjectif: parseFloat(agencySuccessRate.toFixed(1)),
        efficacite: agencySuccessRate >= 90 ? 'excellent' : 
                   agencySuccessRate >= 80 ? 'bon' : 
                   agencySuccessRate >= 70 ? 'moyen' : 'faible'
      });
    }

    // Évolution dans le temps (par jour)
    const dailyStats = {};
    preparations.forEach(prep => {
      const day = prep.startTime.toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { total: 0, totalTime: 0 };
      }
      dailyStats[day].total++;
      const duration = new Date(prep.endTime) - new Date(prep.startTime);
      dailyStats[day].totalTime += (duration / (1000 * 60));
    });

    const evolution = Object.keys(dailyStats)
      .sort()
      .map(date => ({
        date,
        tempsMoyen: dailyStats[date].total > 0 ? 
          parseFloat((dailyStats[date].totalTime / dailyStats[date].total).toFixed(1)) : 0,
        totalPreparations: dailyStats[date].total
      }));

    // Pics d'activité par heure
    const hourlyStats = {};
    preparations.forEach(prep => {
      const hour = new Date(prep.startTime).getHours();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { count: 0, totalTime: 0 };
      }
      hourlyStats[hour].count++;
      const duration = new Date(prep.endTime) - new Date(prep.startTime);
      hourlyStats[hour].totalTime += (duration / (1000 * 60));
    });

    const picActivite = Object.keys(hourlyStats).map(hour => ({
      heure: parseInt(hour),
      nombrePreparations: hourlyStats[hour].count,
      tempsMoyen: hourlyStats[hour].count > 0 ? 
        parseFloat((hourlyStats[hour].totalTime / hourlyStats[hour].count).toFixed(1)) : 0
    })).sort((a, b) => a.heure - b.heure);

    // Performance par utilisateur
    const userStats = {};
    preparations.forEach(prep => {
      const userId = prep.userId._id.toString();
      const agencyName = prep.agencyId ? prep.agencyId.name : 'Non définie';

      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          prenom: prep.userId.firstName,
          nom: prep.userId.lastName,
          agence: agencyName,
          totalPreparations: 0,
          totalTime: 0,
          times: []
        };
      }

      userStats[userId].totalPreparations++;
      const duration = new Date(prep.endTime) - new Date(prep.startTime);
      const minutes = duration / (1000 * 60);
      userStats[userId].totalTime += minutes;
      userStats[userId].times.push(minutes);
    });

    const parUtilisateur = Object.values(userStats)
      .map(user => {
        const avgTime = user.totalPreparations > 0 ? user.totalTime / user.totalPreparations : 0;
        const sortedTimes = user.times.sort((a, b) => a - b);
        const best = sortedTimes[0] || 0;
        const worst = sortedTimes[sortedTimes.length - 1] || 0;
        
        // Calculer la constance (écart-type inversé)
        const mean = avgTime;
        const variance = user.times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / user.times.length;
        const stdDev = Math.sqrt(variance);
        const constance = stdDev > 0 ? Math.max(0, 100 - (stdDev / mean * 100)) : 100;

        return {
          ...user,
          tempsMoyen: parseFloat(avgTime.toFixed(1)),
          meilleurePerformance: parseFloat(best.toFixed(1)),
          pirePerformance: parseFloat(worst.toFixed(1)),
          constance: parseFloat(constance.toFixed(1)),
          classement: 0 // Sera calculé après tri
        };
      })
      .sort((a, b) => a.tempsMoyen - b.tempsMoyen)
      .map((user, index) => ({ ...user, classement: index + 1 }));

    const reportData = {
      periode: {
        debut: dateStart.toISOString().split('T')[0],
        fin: dateEnd.toISOString().split('T')[0]
      },
      global: {
        totalPreparations,
        tempsMoyenGlobal: parseFloat(tempsMoyenGlobal.toFixed(1)),
        objectifTemps,
        tauxRespectObjectif: parseFloat(tauxRespectObjectif.toFixed(1))
      },
      parAgence: agencyStats,
      parUtilisateur,
      tendances: {
        evolution,
        picActivite
      }
    };

    // Ajouter comparaison si demandée
    if (includeComparison === 'true') {
      const previousPeriodStart = new Date(dateStart.getTime() - (dateEnd - dateStart));
      const previousPreparations = await models.Preparation.find({
        ...agencyFilter,
        startTime: { $gte: previousPeriodStart, $lt: dateStart },
        status: 'completed'
      });

      const previousTotalTime = previousPreparations.reduce((sum, prep) => {
        const duration = new Date(prep.endTime) - new Date(prep.startTime);
        return sum + (duration / (1000 * 60));
      }, 0);

      const previousAvgTime = previousPreparations.length > 0 ? 
        previousTotalTime / previousPreparations.length : 0;

      reportData.comparaison = {
        periodePrecedente: {
          tempsMoyen: parseFloat(previousAvgTime.toFixed(1)),
          evolution: parseFloat((tempsMoyenGlobal - previousAvgTime).toFixed(1))
        }
      };
    }

    res.json({
      success: true,
      data: reportData,
      message: 'Rapport de performance généré avec succès'
    });

  } catch (error) {
    console.error('Erreur rapport performance:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;