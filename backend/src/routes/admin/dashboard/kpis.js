const express = require('express');
const Joi = require('joi');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const Timesheet = require('../../../models/Timesheet');
const Preparation = require('../../../models/Preparation');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// Schéma de validation pour les KPIs
const kpisQuerySchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month', 'quarter', 'year').default('today'),
  agencies: Joi.array().items(Joi.string()).optional(),
  includeComparison: Joi.boolean().default(true)
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/kpis
 * @desc    Récupérer les KPIs principaux
 * @access  Admin
 */
router.get('/', validateQuery(kpisQuerySchema), async (req, res) => {
  try {
    const { period, agencies, includeComparison } = req.query;
    
    // Calculer les dates aujourd'hui
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Filtres de base
    const baseFilter = {};
    if (agencies && agencies.length > 0) {
      baseFilter.agency = { $in: agencies };
    }

    // ===== 1. PRÉPARATEURS =====
    const [totalPreparateurs, activePreparateurs] = await Promise.all([
      User.countDocuments({ role: 'preparateur' }),
      User.countDocuments({ role: 'preparateur', isActive: true })
    ]);

    // Méthode qui a fonctionné pour les présents (combinée pour être robuste)
    const presentToday = await Timesheet.countDocuments({
      ...baseFilter,
      date: {
        $gte: todayStart,
        $lt: todayEnd
      },
      $or: [
        { clockInTime: { $exists: true } },
        { startTime: { $exists: true } }
      ]
    });

    // Préparateurs en retard
    const lateToday = await Timesheet.countDocuments({
      ...baseFilter,
      date: {
        $gte: todayStart,
        $lt: todayEnd
      },
      isLate: true
    });

    // ===== 2. PRÉPARATIONS =====
    const preparationsToday = await Preparation.countDocuments({
      ...baseFilter,
      createdAt: {
        $gte: todayStart,
        $lt: todayEnd
      }
    });

    const preparationsCompleted = await Preparation.countDocuments({
      ...baseFilter,
      status: 'completed',
      createdAt: {
        $gte: todayStart,
        $lt: todayEnd
      }
    });

    const preparationsInProgress = await Preparation.countDocuments({
      ...baseFilter,
      status: 'in_progress'
    });

    // Préparations en retard (plus de 30 min)
    const preparationsLate = await Preparation.countDocuments({
      ...baseFilter,
      status: 'in_progress',
      createdAt: {
        $lt: new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
      }
    });

    // ===== 3. TEMPS MOYEN (CORRIGÉ) =====
    const completedPreparationsToday = await Preparation.find({
      ...baseFilter,
      status: 'completed',
      totalTime: { $exists: true, $ne: null, $gt: 0 },
      createdAt: {
        $gte: todayStart,
        $lt: todayEnd
      }
    }).select('totalTime');

    let averageTimeToday = 0;
    if (completedPreparationsToday.length > 0) {
      const totalTime = completedPreparationsToday.reduce((sum, prep) => sum + prep.totalTime, 0);
      averageTimeToday = Math.round(totalTime / completedPreparationsToday.length);
    }

    // ===== 4. PONCTUALITÉ =====
    const todayTimesheets = await Timesheet.find({
      ...baseFilter,
      date: {
        $gte: todayStart,
        $lt: todayEnd
      },
      $or: [
        { clockInTime: { $exists: true } },
        { startTime: { $exists: true } }
      ]
    });

    const onTimeCount = todayTimesheets.filter(t => !t.isLate).length;
    const punctualityRate = todayTimesheets.length > 0 
      ? Math.round((onTimeCount / todayTimesheets.length) * 100)
      : 0;

    // ===== 5. AGENCES =====
    const totalAgencies = await Agency.countDocuments({ isActive: true });

    // Performance par agence (simple)
    const agencyList = await Agency.find({ isActive: true }).select('name');
    const ponctualiteParAgence = [];

    for (const agency of agencyList.slice(0, 5)) { // Limiter à 5 pour éviter la surcharge
      const agencyTimesheets = await Timesheet.find({
        agency: agency._id,
        date: {
          $gte: todayStart,
          $lt: todayEnd
        },
        $or: [
          { clockInTime: { $exists: true } },
          { startTime: { $exists: true } }
        ]
      });

      const agencyOnTime = agencyTimesheets.filter(t => !t.isLate).length;
      const agencyRate = agencyTimesheets.length > 0 
        ? Math.round((agencyOnTime / agencyTimesheets.length) * 100)
        : 0;

      ponctualiteParAgence.push({
        agencyId: agency._id,
        name: agency.name,
        rate: agencyRate
      });
    }

    // ===== CONSTRUCTION DE LA RÉPONSE =====
    const kpisData = {
      preparateurs: {
        total: totalPreparateurs,
        active: activePreparateurs,
        present: presentToday,
        late: lateToday
      },
      ponctualite: {
        global: punctualityRate,
        parAgence: ponctualiteParAgence
      },
      preparations: {
        aujourdhui: preparationsToday,
        tempsMoyen: averageTimeToday,
        enRetard: preparationsLate,
        terminees: preparationsCompleted
      },
      objectifs: {
        preparationsJour: 50,
        ponctualiteMin: 95,
        tempsMoyenMax: 30
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: kpisData
    });

  } catch (error) {
    console.error('💥 Erreur KPIs:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;