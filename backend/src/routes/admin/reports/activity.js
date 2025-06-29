// backend/src/routes/admin/reports/activity.js
const express = require('express');
const router = express.Router();
const { ERROR_MESSAGES, getDateRange, loadModels, generateMockData, validateFilters } = require('./utils');

// ================================
// RAPPORT D'ACTIVITÉ
// ================================

router.get('/', async (req, res) => {
  try {
    const { 
      period = 'month', 
      startDate, 
      endDate, 
      agencies = [] 
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
      console.warn('📊 Modèles non disponibles, utilisation de données simulées pour rapport activité');
      const mockData = generateMockData('activity', period);
      
      return res.json({
        success: true,
        data: mockData,
        message: 'Rapport d\'activité généré avec succès (données simulées)'
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
    }).populate('userId', 'firstName lastName')
      .populate('agencyId', 'name');

    // Calculer la volumétrie
    const totalJoursOuvres = Math.ceil((dateEnd - dateStart) / (1000 * 60 * 60 * 24));
    const joursAvecActivite = new Set(
      timesheets.map(ts => ts.clockInTime.toISOString().split('T')[0])
    ).size;

    const totalHeures = timesheets.reduce((sum, ts) => {
      if (ts.clockOutTime) {
        const duration = new Date(ts.clockOutTime) - new Date(ts.clockInTime);
        return sum + (duration / (1000 * 60 * 60));
      }
      return sum;
    }, 0);

    const moyenneHeuresParJour = joursAvecActivite > 0 ? totalHeures / joursAvecActivite : 0;

    // Répartition par agence
    const agencies_list = await models.Agency.find(agencyFilter.agencyId ? { _id: agencyFilter.agencyId } : {});
    const agencyStats = [];

    for (const agency of agencies_list) {
      const agencyTimesheets = timesheets.filter(ts => 
        ts.agencyId && ts.agencyId._id.toString() === agency._id.toString()
      );

      const agencyHours = agencyTimesheets.reduce((sum, ts) => {
        if (ts.clockOutTime) {
          const duration = new Date(ts.clockOutTime) - new Date(ts.clockInTime);
          return sum + (duration / (1000 * 60 * 60));
        }
        return sum;
      }, 0);

      const agencyDays = new Set(
        agencyTimesheets.map(ts => ts.clockInTime.toISOString().split('T')[0])
      ).size;

      // Déterminer le pic d'activité
      const hourlyActivity = {};
      agencyTimesheets.forEach(ts => {
        const hour = new Date(ts.clockInTime).getHours();
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      });

      const peakHour = Object.keys(hourlyActivity).reduce((a, b) => 
        hourlyActivity[a] > hourlyActivity[b] ? a : b, '0');

      agencyStats.push({
        agenceId: agency._id,
        nom: agency.name,
        totalHeures: parseFloat(agencyHours.toFixed(1)),
        pourcentageTotal: totalHeures > 0 ? 
          parseFloat((agencyHours / totalHeures * 100).toFixed(1)) : 0,
        moyenneParJour: agencyDays > 0 ? 
          parseFloat((agencyHours / agencyDays).toFixed(1)) : 0,
        picActivite: `${peakHour}h00`
      });
    }

    // Répartition par jour de la semaine
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const weeklyActivity = {};

    timesheets.forEach(ts => {
      const dayOfWeek = new Date(ts.clockInTime).getDay();
      const dayName = dayNames[dayOfWeek];

      if (!weeklyActivity[dayName]) {
        weeklyActivity[dayName] = 0;
      }

      if (ts.clockOutTime) {
        const duration = new Date(ts.clockOutTime) - new Date(ts.clockInTime);
        weeklyActivity[dayName] += (duration / (1000 * 60 * 60));
      }
    });

    const parJourSemaine = dayNames.map(day => ({
      jour: day,
      totalHeures: parseFloat((weeklyActivity[day] || 0).toFixed(1)),
      pourcentage: totalHeures > 0 ? 
        parseFloat(((weeklyActivity[day] || 0) / totalHeures * 100).toFixed(1)) : 0,
      moyenneUtilisateurs: 0 // À calculer si nécessaire
    }));

    // Répartition par heure de la journée
    const hourlyActivity = {};
    timesheets.forEach(ts => {
      const hour = new Date(ts.clockInTime).getHours();
      
      if (!hourlyActivity[hour]) {
        hourlyActivity[hour] = { total: 0, count: 0 };
      }

      hourlyActivity[hour].count++;
      if (ts.clockOutTime) {
        const duration = new Date(ts.clockOutTime) - new Date(ts.clockInTime);
        hourlyActivity[hour].total += (duration / (1000 * 60 * 60));
      }
    });

    const maxActivity = Math.max(...Object.values(hourlyActivity).map(h => h.total));
    const parHeureJour = Array.from({ length: 24 }, (_, hour) => {
      const activity = hourlyActivity[hour] || { total: 0, count: 0 };
      const percentage = maxActivity > 0 ? (activity.total / maxActivity) : 0;
      
      let intensite = 'faible';
      if (percentage > 0.8) intensite = 'pic';
      else if (percentage > 0.6) intensite = 'forte';
      else if (percentage > 0.3) intensite = 'moyenne';

      return {
        heure: hour,
        heureLibelle: `${hour.toString().padStart(2, '0')}h00`,
        totalActivite: parseFloat(activity.total.toFixed(1)),
        pourcentage: parseFloat((percentage * 100).toFixed(1)),
        intensite
      };
    });

    // Performance des utilisateurs
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
          totalHeures: 0,
          jours: new Set()
        };
      }

      if (ts.clockOutTime) {
        const duration = new Date(ts.clockOutTime) - new Date(ts.clockInTime);
        userStats[userId].totalHeures += (duration / (1000 * 60 * 60));
      }
      
      userStats[userId].jours.add(ts.clockInTime.toISOString().split('T')[0]);
    });

    const parUtilisateur = Object.values(userStats).map(user => {
      const joursActifs = user.jours.size;
      const moyenneParJour = joursActifs > 0 ? user.totalHeures / joursActifs : 0;
      
      // Calculer la régularité (pourcentage de jours travaillés)
      const regularite = totalJoursOuvres > 0 ? (joursActifs / totalJoursOuvres) * 100 : 0;

      return {
        userId: user.userId,
        prenom: user.prenom,
        nom: user.nom,
        agence: user.agence,
        totalHeures: parseFloat(user.totalHeures.toFixed(1)),
        moyenneParJour: parseFloat(moyenneParJour.toFixed(1)),
        joursActifs,
        regularite: parseFloat(regularite.toFixed(1))
      };
    }).sort((a, b) => b.totalHeures - a.totalHeures);

    // Calculer les tendances (croissance)
    const previousPeriodStart = new Date(dateStart.getTime() - (dateEnd - dateStart));
    const previousTimesheets = await models.Timesheet.find({
      ...agencyFilter,
      clockInTime: { $gte: previousPeriodStart, $lt: dateStart }
    });

    const previousTotalHours = previousTimesheets.reduce((sum, ts) => {
      if (ts.clockOutTime) {
        const duration = new Date(ts.clockOutTime) - new Date(ts.clockInTime);
        return sum + (duration / (1000 * 60 * 60));
      }
      return sum;
    }, 0);

    const croissance = previousTotalHours > 0 ? 
      ((totalHeures - previousTotalHours) / previousTotalHours) * 100 : 0;

    const reportData = {
      periode: {
        debut: dateStart.toISOString().split('T')[0],
        fin: dateEnd.toISOString().split('T')[0]
      },
      volumetrie: {
        totalJoursOuvres,
        joursAvecActivite,
        totalHeures: parseFloat(totalHeures.toFixed(1)),
        moyenneHeuresParJour: parseFloat(moyenneHeuresParJour.toFixed(1))
      },
      repartition: {
        parAgence: agencyStats,
        parUtilisateur,
        parJourSemaine,
        parHeureJour
      },
      tendances: {
        croissance: parseFloat(croissance.toFixed(1)),
        saisonnalite: [] // Peut être ajouté plus tard avec plus de données historiques
      }
    };

    res.json({
      success: true,
      data: reportData,
      message: 'Rapport d\'activité généré avec succès'
    });

  } catch (error) {
    console.error('Erreur rapport activité:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;