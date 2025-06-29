// backend/src/routes/admin/reports/quick-metrics.js
const express = require('express');
const router = express.Router();
const { ERROR_MESSAGES, getDateRange, loadModels, generateMockData } = require('./utils');

// ================================
// MÉTRIQUES RAPIDES
// ================================

router.get('/', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const { start: dateStart, end: dateEnd } = getDateRange(period);
    const models = loadModels();

    // Si les modèles ne sont pas disponibles, utiliser des données simulées
    if (!models.Timesheet || !models.Preparation) {
      console.warn('📊 Modèles non disponibles, utilisation de données simulées pour quick-metrics');
      const mockData = generateMockData('quick-metrics', period);
      
      return res.json({
        success: true,
        data: mockData,
        message: 'Métriques récupérées avec succès (données simulées)'
      });
    }

    // Calculer les métriques de ponctualité
    const timesheets = await models.Timesheet.find({
      clockInTime: { $gte: dateStart, $lte: dateEnd }
    }).populate('userId', 'firstName lastName');

    const totalShifts = timesheets.length;
    const onTimeShifts = timesheets.filter(ts => {
      const scheduledTime = new Date(ts.scheduledStartTime);
      const actualTime = new Date(ts.clockInTime);
      return actualTime <= new Date(scheduledTime.getTime() + 5 * 60000); // 5 min de tolérance
    }).length;

    const punctualityRate = totalShifts > 0 ? (onTimeShifts / totalShifts) * 100 : 0;

    // Calculer les métriques de performance
    const preparations = await models.Preparation.find({
      startTime: { $gte: dateStart, $lte: dateEnd },
      status: 'completed'
    });

    const totalTime = preparations.reduce((sum, prep) => {
      const duration = new Date(prep.endTime) - new Date(prep.startTime);
      return sum + (duration / (1000 * 60)); // en minutes
    }, 0);

    const averageTime = preparations.length > 0 ? totalTime / preparations.length : 0;

    // Calculer les métriques d'activité
    const totalHours = timesheets.reduce((sum, ts) => {
      if (ts.clockOutTime) {
        const duration = new Date(ts.clockOutTime) - new Date(ts.clockInTime);
        return sum + (duration / (1000 * 60 * 60)); // en heures
      }
      return sum;
    }, 0);

    // Calculer les tendances (période précédente)
    const previousPeriodStart = new Date(dateStart.getTime() - (dateEnd - dateStart));
    const previousPeriodEnd = dateStart;

    const previousTimesheets = await models.Timesheet.find({
      clockInTime: { $gte: previousPeriodStart, $lt: previousPeriodEnd }
    });

    const previousPreparations = await models.Preparation.find({
      startTime: { $gte: previousPeriodStart, $lt: previousPeriodEnd },
      status: 'completed'
    });

    const previousPunctualityRate = previousTimesheets.length > 0 ? 
      (previousTimesheets.filter(ts => {
        const scheduledTime = new Date(ts.scheduledStartTime);
        const actualTime = new Date(ts.clockInTime);
        return actualTime <= new Date(scheduledTime.getTime() + 5 * 60000);
      }).length / previousTimesheets.length) * 100 : 0;

    const previousAverageTime = previousPreparations.length > 0 ? 
      previousPreparations.reduce((sum, prep) => {
        const duration = new Date(prep.endTime) - new Date(prep.startTime);
        return sum + (duration / (1000 * 60));
      }, 0) / previousPreparations.length : 0;

    const previousTotalHours = previousTimesheets.reduce((sum, ts) => {
      if (ts.clockOutTime) {
        const duration = new Date(ts.clockOutTime) - new Date(ts.clockInTime);
        return sum + (duration / (1000 * 60 * 60));
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      data: {
        punctuality: {
          rate: parseFloat(punctualityRate.toFixed(1)),
          trend: parseFloat((punctualityRate - previousPunctualityRate).toFixed(1))
        },
        performance: {
          averageTime: parseFloat(averageTime.toFixed(1)),
          trend: parseFloat((averageTime - previousAverageTime).toFixed(1))
        },
        activity: {
          totalHours: parseFloat(totalHours.toFixed(1)),
          trend: parseFloat(((totalHours - previousTotalHours) / Math.max(previousTotalHours, 1) * 100).toFixed(1))
        }
      },
      message: 'Métriques récupérées avec succès'
    });

  } catch (error) {
    console.error('Erreur métriques rapides:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;