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
    
    console.log('📊 Récupération KPIs:', { period, agencies });

    // Calculer les dates selon la période
    const dateRange = calculateDateRange(period);
    
    // Filtres de base
    const baseFilter = {};
    if (agencies && agencies.length > 0) {
      baseFilter.agency = { $in: agencies };
    }

    // ===== CALCULS KPIs SIMPLES (éviter MongoDB complexe) =====
    
    // 1. Compteurs utilisateurs
    const [totalPreparateurs, activePreparateurs] = await Promise.all([
      User.countDocuments({ role: 'preparateur' }),
      User.countDocuments({ role: 'preparateur', isActive: true })
    ]);

    // 2. Compteur agences
    const totalAgencies = await Agency.countDocuments({});

    // 3. Préparations aujourd'hui (requête simple)
    const preparationsToday = await Preparation.countDocuments({
      ...baseFilter,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    // 4. Préparations cette semaine
    const startOfWeek = getStartOfWeek(new Date());
    const endOfWeek = getEndOfWeek(new Date());
    
    const preparationsThisWeek = await Preparation.countDocuments({
      ...baseFilter,
      createdAt: {
        $gte: startOfWeek,
        $lt: endOfWeek
      }
    });

    // 5. Temps moyen simple (éviter aggregation complexe)
    const avgTimeResult = await Preparation.find({
      ...baseFilter,
      status: 'completed',
      totalTime: { $exists: true, $ne: null },
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    }).select('totalTime');

    const averageTimeToday = avgTimeResult.length > 0 
      ? Math.round(avgTimeResult.reduce((sum, prep) => sum + prep.totalTime, 0) / avgTimeResult.length)
      : 0;

    // 6. Taux de ponctualité simple
    const punctualityRate = await calculateSimplePunctuality(dateRange, baseFilter);

    // ===== RESPONSE =====
    const kpis = {
      totalPreparateurs,
      activePreparateurs,
      totalAgencies,
      preparationsToday,
      preparationsThisWeek,
      averageTimeToday,
      punctualityRate,
      timestamp: new Date()
    };

    console.log('✅ KPIs calculés:', kpis);

    res.json({
      success: true,
      data: {
        kpis,
        period,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        }
      }
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

// ===== FONCTIONS UTILITAIRES =====

function calculateDateRange(period) {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      };
      
    case 'week':
      return {
        start: getStartOfWeek(today),
        end: getEndOfWeek(today)
      };
      
    case 'month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: startOfMonth,
        end: endOfMonth
      };
      
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      return {
        start: startOfQuarter,
        end: endOfQuarter
      };
      
    case 'year':
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      return {
        start: startOfYear,
        end: endOfYear
      };
      
    default:
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      };
  }
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début semaine
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date) {
  const startOfWeek = getStartOfWeek(date);
  return new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
}

async function calculateSimplePunctuality(dateRange, baseFilter) {
  try {
    // Méthode simple sans aggregation complexe
    const timesheets = await Timesheet.find({
      ...baseFilter,
      clockInTime: {
        $gte: dateRange.start,
        $lt: dateRange.end
      }
    }).populate('schedule', 'startTime');

    if (timesheets.length === 0) return 0;

    let onTimeCount = 0;
    timesheets.forEach(timesheet => {
      if (timesheet.schedule && timesheet.clockInTime) {
        const clockInHour = timesheet.clockInTime.getHours();
        const clockInMinute = timesheet.clockInTime.getMinutes();
        const clockInTime = clockInHour * 60 + clockInMinute;
        
        const [scheduleHour, scheduleMinute] = timesheet.schedule.startTime.split(':').map(Number);
        const scheduleTime = scheduleHour * 60 + scheduleMinute;
        
        if (clockInTime <= scheduleTime + 5) { // 5 min de tolérance
          onTimeCount++;
        }
      }
    });

    return Math.round((onTimeCount / timesheets.length) * 100);
  } catch (error) {
    console.error('Erreur calcul ponctualité:', error);
    return 0;
  }
}

module.exports = router;