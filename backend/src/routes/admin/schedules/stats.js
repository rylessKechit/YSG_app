// backend/src/routes/admin/schedules/stats.js - VERSION SIMPLE

const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION SIMPLES =====
const statsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  agency: objectId.optional(),
  user: objectId.optional(),
  period: Joi.string().valid('week', 'month', 'quarter', 'year').default('month')
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/schedules/stats
 * @desc    Statistiques des plannings
 * @access  Admin
 */
router.get('/', validateQuery(statsQuerySchema), async (req, res) => {
  try {
    const { startDate, endDate, agency, user, period } = req.query;
    
    // Calculer les dates par défaut selon la période
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    let defaultStartDate;
    
    if (startDate) {
      defaultStartDate = new Date(startDate);
    } else {
      defaultStartDate = new Date(defaultEndDate);
      switch (period) {
        case 'week':
          defaultStartDate.setDate(defaultStartDate.getDate() - 7);
          break;
        case 'quarter':
          defaultStartDate.setMonth(defaultStartDate.getMonth() - 3);
          break;
        case 'year':
          defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
          break;
        default: // month
          defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
      }
    }

    // Construire le filtre
    const filter = {
      date: {
        $gte: defaultStartDate,
        $lte: defaultEndDate
      }
    };

    if (agency) filter.agency = agency;
    if (user) filter.user = user;

    // Requêtes simples (pas d'agrégation complexe)
    const [
      totalSchedules,
      agencies,
      users,
      allSchedules
    ] = await Promise.all([
      Schedule.countDocuments(filter),
      Agency.find(agency ? { _id: agency } : { isActive: true }).select('name'),
      User.find(user ? { _id: user } : { role: 'preparateur', isActive: true }).select('firstName lastName'),
      Schedule.find(filter).select('startTime endTime breakDuration agency user date')
    ]);

    // Calculs simples
    let totalHours = 0;
    const agencyStats = new Map();
    const userStats = new Map();

    allSchedules.forEach(schedule => {
      // Calculer les heures
      if (schedule.startTime && schedule.endTime) {
        const [startHour, startMin] = schedule.startTime.split(':').map(Number);
        const [endHour, endMin] = schedule.endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const workMinutes = endMinutes - startMinutes - (schedule.breakDuration || 30);
        
        if (workMinutes > 0) {
          totalHours += workMinutes / 60;
        }
      }

      // Stats par agence
      const agencyId = schedule.agency.toString();
      agencyStats.set(agencyId, (agencyStats.get(agencyId) || 0) + 1);

      // Stats par utilisateur
      const userId = schedule.user.toString();
      userStats.set(userId, (userStats.get(userId) || 0) + 1);
    });

    const averageHours = totalSchedules > 0 ? Math.round((totalHours / totalSchedules) * 100) / 100 : 0;

    // Stats par utilisateur avec noms
    const userStatsArray = users.map(u => ({
      userId: u._id,
      userName: `${u.firstName} ${u.lastName}`,
      schedulesCount: userStats.get(u._id.toString()) || 0
    }));

    // Stats par agence avec noms
    const agencyStatsArray = agencies.map(a => ({
      agencyId: a._id,
      agencyName: a.name,
      schedulesCount: agencyStats.get(a._id.toString()) || 0
    }));

    // Réponse finale
    const statsData = {
      period: {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        type: period
      },
      global: {
        totalSchedules,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours,
        totalUsers: users.length,
        totalAgencies: agencies.length
      },
      byUser: userStatsArray,
      byAgency: agencyStatsArray,
      trends: {
        // Simplifiés pour éviter les erreurs
        schedulesGrowth: 0,
        hoursGrowth: 0
      }
    };

    res.json({
      success: true,
      data: statsData
    });

  } catch (error) {
    console.error('Erreur stats plannings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors du calcul des statistiques'
    });
  }
});

module.exports = router;