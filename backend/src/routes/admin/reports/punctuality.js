// backend/src/routes/admin/reports/punctuality.js
const express = require('express');
const router = express.Router();
const { ERROR_MESSAGES, getDateRange, loadModels, generateMockData, validateFilters } = require('./utils');

// ================================
// RAPPORT DE PONCTUALITÉ
// ================================

router.get('/', async (req, res) => {
  try {
    const { 
      period = 'month', 
      startDate, 
      endDate, 
      agencies = [], 
      format = 'json',
      includeDetails = false 
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
    if (!models.Timesheet || !models.Agency) {
      console.warn('📊 Modèles non disponibles, utilisation de données simulées pour rapport ponctualité');
      const mockData = generateMockData('punctuality', period);
      
      return res.json({
        success: true,
        data: mockData,
        message: 'Rapport de ponctualité généré avec succès (données simulées)'
      });
    }

    // Filtres pour les agences
    let agencyFilter = {};
    if (agencies.length > 0) {
      const agencyIds = Array.isArray(agencies) ? agencies : [agencies];
      agencyFilter = { agencyId: { $in: agencyIds } };
    }

    // Récupérer tous les pointages de la période
    const timesheets = await models.Timesheet.find({
      ...agencyFilter,
      clockInTime: { $gte: dateStart, $lte: dateEnd }
    }).populate('userId', 'firstName lastName email')
      .populate('agencyId', 'name code');

    // Calculer les statistiques globales
    const totalPointages = timesheets.length;
    let ponctuelArrivees = 0;
    let retards = 0;
    let totalRetardMinutes = 0;

    timesheets.forEach(ts => {
      const scheduledTime = new Date(ts.scheduledStartTime);
      const actualTime = new Date(ts.clockInTime);
      const diffMinutes = (actualTime - scheduledTime) / (1000 * 60);

      if (diffMinutes <= 5) { // 5 minutes de tolérance
        ponctuelArrivees++;
      } else {
        retards++;
        totalRetardMinutes += diffMinutes;
      }
    });

    const tauxPonctualite = totalPointages > 0 ? (ponctuelArrivees / totalPointages) * 100 : 0;
    const retardMoyen = retards > 0 ? totalRetardMinutes / retards : 0;

    // Statistiques par agence
    const agencies_list = await models.Agency.find(agencyFilter.agencyId ? { _id: agencyFilter.agencyId } : {});
    const agencyStats = [];

    for (const agency of agencies_list) {
      const agencyTimesheets = timesheets.filter(ts => 
        ts.agencyId && ts.agencyId._id.toString() === agency._id.toString()
      );

      let agencyOnTime = 0;
      let agencyLate = 0;
      let agencyTotalRetard = 0;

      agencyTimesheets.forEach(ts => {
        const scheduledTime = new Date(ts.scheduledStartTime);
        const actualTime = new Date(ts.clockInTime);
        const diffMinutes = (actualTime - scheduledTime) / (1000 * 60);

        if (diffMinutes <= 5) {
          agencyOnTime++;
        } else {
          agencyLate++;
          agencyTotalRetard += diffMinutes;
        }
      });

      const agencyRate = agencyTimesheets.length > 0 ? 
        (agencyOnTime / agencyTimesheets.length) * 100 : 0;
      const agencyAvgDelay = agencyLate > 0 ? agencyTotalRetard / agencyLate : 0;

      agencyStats.push({
        agenceId: agency._id,
        nom: agency.name,
        code: agency.code,
        totalPointages: agencyTimesheets.length,
        ponctuelArrivees: agencyOnTime,
        retards: agencyLate,
        taux: parseFloat(agencyRate.toFixed(1)),
        retardMoyen: parseFloat(agencyAvgDelay.toFixed(1)),
        statut: agencyRate >= 95 ? 'excellent' : 
                agencyRate >= 85 ? 'bon' : 
                agencyRate >= 70 ? 'moyen' : 'faible'
      });
    }

    // Tendances par jour de la semaine
    const dayStats = {};
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    timesheets.forEach(ts => {
      const dayOfWeek = new Date(ts.clockInTime).getDay();
      const dayName = dayNames[dayOfWeek];

      if (!dayStats[dayName]) {
        dayStats[dayName] = { total: 0, onTime: 0 };
      }

      dayStats[dayName].total++;
      
      const scheduledTime = new Date(ts.scheduledStartTime);
      const actualTime = new Date(ts.clockInTime);
      const diffMinutes = (actualTime - scheduledTime) / (1000 * 60);

      if (diffMinutes <= 5) {
        dayStats[dayName].onTime++;
      }
    });

    const weeklyTrends = Object.keys(dayStats).map(day => ({
      jour: day,
      totalPointages: dayStats[day].total,
      retards: dayStats[day].total - dayStats[day].onTime,
      taux: dayStats[day].total > 0 ? 
        parseFloat(((dayStats[day].onTime / dayStats[day].total) * 100).toFixed(1)) : 0
    }));

    // Calculer l'évolution par rapport à la période précédente
    const previousPeriodStart = new Date(dateStart.getTime() - (dateEnd - dateStart));
    const previousTimesheets = await models.Timesheet.find({
      ...agencyFilter,
      clockInTime: { $gte: previousPeriodStart, $lt: dateStart }
    });

    const previousOnTime = previousTimesheets.filter(ts => {
      const scheduledTime = new Date(ts.scheduledStartTime);
      const actualTime = new Date(ts.clockInTime);
      return (actualTime - scheduledTime) / (1000 * 60) <= 5;
    }).length;

    const previousRate = previousTimesheets.length > 0 ? 
      (previousOnTime / previousTimesheets.length) * 100 : 0;
    const evolution = parseFloat((tauxPonctualite - previousRate).toFixed(1));

    const reportData = {
      periode: {
        debut: dateStart.toISOString().split('T')[0],
        fin: dateEnd.toISOString().split('T')[0],
        jours: Math.ceil((dateEnd - dateStart) / (1000 * 60 * 60 * 24))
      },
      global: {
        totalPointages,
        ponctuelArrivees,
        retards,
        tauxPonctualite: parseFloat(tauxPonctualite.toFixed(1)),
        retardMoyen: parseFloat(retardMoyen.toFixed(1)),
        evolution,
        objectif: 90 // Configurable
      },
      parAgence: agencyStats,
      tendances: {
        parJourSemaine: weeklyTrends
      },
      metadata: {
        genereA: new Date().toISOString(),
        filtres: { agencies, format },
        includeDetails
      }
    };

    // Ajouter détails par utilisateur si demandé
    if (includeDetails === 'true') {
      const userStats = {};
      
      timesheets.forEach(ts => {
        const userId = ts.userId._id.toString();
        const agencyName = ts.agencyId ? ts.agencyId.name : 'Non définie';

        if (!userStats[userId]) {
          userStats[userId] = {
            userId,
            prenom: ts.userId.firstName,
            nom: ts.userId.lastName,
            agence: agencyName,
            totalPointages: 0,
            retards: 0,
            totalRetardMinutes: 0
          };
        }

        userStats[userId].totalPointages++;

        const scheduledTime = new Date(ts.scheduledStartTime);
        const actualTime = new Date(ts.clockInTime);
        const diffMinutes = (actualTime - scheduledTime) / (1000 * 60);

        if (diffMinutes > 5) {
          userStats[userId].retards++;
          userStats[userId].totalRetardMinutes += diffMinutes;
        }
      });

      const userPerformances = Object.values(userStats).map(user => ({
        ...user,
        taux: user.totalPointages > 0 ? 
          parseFloat(((user.totalPointages - user.retards) / user.totalPointages * 100).toFixed(1)) : 0,
        retardMoyen: user.retards > 0 ? 
          parseFloat((user.totalRetardMinutes / user.retards).toFixed(1)) : 0,
        performance: (() => {
          const rate = user.totalPointages > 0 ? 
            (user.totalPointages - user.retards) / user.totalPointages * 100 : 0;
          return rate >= 95 ? 'excellent' : 
                 rate >= 85 ? 'bon' : 
                 rate >= 70 ? 'moyen' : 'faible';
        })()
      }));

      reportData.topFlop = {
        meilleursPerformers: userPerformances
          .filter(u => u.performance === 'excellent')
          .sort((a, b) => b.taux - a.taux)
          .slice(0, 10),
        bonnesPerformances: userPerformances
          .filter(u => u.performance === 'bon')
          .sort((a, b) => b.taux - a.taux)
          .slice(0, 10),
        aAmeliorer: userPerformances
          .filter(u => ['moyen', 'faible'].includes(u.performance))
          .sort((a, b) => a.taux - b.taux)
          .slice(0, 10)
      };
    }

    res.json({
      success: true,
      data: reportData,
      message: 'Rapport de ponctualité généré avec succès'
    });

  } catch (error) {
    console.error('Erreur rapport ponctualité:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;