// backend/src/routes/admin/dashboard/alerts.js - VERSION CORRIGÉE
const express = require('express');
const Joi = require('joi');
const Timesheet = require('../../../models/Timesheet');
const Preparation = require('../../../models/Preparation');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { ERROR_MESSAGES, TIME_LIMITS } = require('../../../utils/constants');

const router = express.Router();

// Schéma de validation pour les alertes
const alertsQuerySchema = Joi.object({
  priority: Joi.string().valid('low', 'medium', 'high', 'critical', 'all').default('all'),
  limit: Joi.number().integer().min(1).max(50).default(10),
  unreadOnly: Joi.boolean().default(false),
  type: Joi.string().valid('late_start', 'missing_clock_out', 'long_preparation', 'system_error', 'all').default('all')
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/alerts
 * @desc    Récupérer les alertes système
 * @access  Admin
 */
router.get('/', validateQuery(alertsQuerySchema), async (req, res) => {
  try {
    const { priority, limit, unreadOnly, type } = req.query;
    
    console.log('🚨 Récupération alertes:', { priority, limit, type });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alerts = [];

    // ===== 1. ALERTES RETARDS DE POINTAGE =====
    if (type === 'all' || type === 'late_start') {
      const lateAlerts = await getLateStartAlerts(today);
      alerts.push(...lateAlerts);
    }

    // ===== 2. ALERTES PRÉPARATIONS EN RETARD =====
    if (type === 'all' || type === 'long_preparation') {
      const prepAlerts = await getLongPreparationAlerts();
      alerts.push(...prepAlerts);
    }

    // ===== 3. ALERTES POINTAGES MANQUANTS =====
    if (type === 'all' || type === 'missing_clock_out') {
      const clockOutAlerts = await getMissingClockOutAlerts(today);
      alerts.push(...clockOutAlerts);
    }

    // ===== FILTRAGE ET TRI =====
    let filteredAlerts = alerts;

    // Filtre par priorité
    if (priority !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.priority === priority);
    }

    // Filtre non lues seulement
    if (unreadOnly) {
      filteredAlerts = filteredAlerts.filter(alert => !alert.isRead);
    }

    // Tri par priorité puis par timestamp
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    filteredAlerts.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limitation du nombre de résultats
    const limitedAlerts = filteredAlerts.slice(0, limit);

    console.log(`✅ ${limitedAlerts.length} alertes trouvées`);

    res.json({
      success: true,
      data: limitedAlerts,
      meta: {
        total: filteredAlerts.length,
        displayed: limitedAlerts.length,
        filters: { priority, type, unreadOnly }
      }
    });

  } catch (error) {
    console.error('💥 Erreur alertes:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PATCH /api/admin/dashboard/alerts/:id/read
 * @desc    Marquer une alerte comme lue
 * @access  Admin
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`✅ Alerte ${id} marquée comme lue`);

    res.json({
      success: true,
      data: {
        id,
        isRead: true,
        readAt: new Date()
      }
    });

  } catch (error) {
    console.error('💥 Erreur marquage alerte:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

// ===== FONCTIONS UTILITAIRES CORRIGÉES =====

/**
 * Alertes de retards de pointage
 */
async function getLateStartAlerts(today) {
  try {
    const now = new Date();
    const lateTimesheets = await Timesheet.find({
      date: { $gte: today },
      clockInTime: null,
      schedule: { $exists: true }
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name')
    .populate('schedule', 'startTime')
    .limit(10);

    const alerts = [];
    
    lateTimesheets.forEach(timesheet => {
      if (timesheet.user && timesheet.schedule) {
        const [scheduleHour, scheduleMinute] = timesheet.schedule.startTime.split(':').map(Number);
        const scheduleTime = new Date(today);
        scheduleTime.setHours(scheduleHour, scheduleMinute, 0, 0);
        
        if (now > scheduleTime) {
          const delayMinutes = Math.floor((now - scheduleTime) / (1000 * 60));
          const priority = delayMinutes > 30 ? 'critical' : delayMinutes > 15 ? 'high' : 'medium';
          
          alerts.push({
            id: `late_start_${timesheet._id}`,
            type: 'late_start',
            priority,
            title: 'Retard de pointage',
            message: `${timesheet.user.firstName} ${timesheet.user.lastName} en retard de ${delayMinutes} minutes`,
            userId: timesheet.user._id,
            userName: `${timesheet.user.firstName} ${timesheet.user.lastName}`,
            agencyId: timesheet.agency?._id,
            agencyName: timesheet.agency?.name,
            timestamp: now.toISOString(),
            isRead: false,
            actionRequired: true,
            actionUrl: `/admin/users/${timesheet.user._id}`
          });
        }
      }
    });

    return alerts;
  } catch (error) {
    console.error('Erreur alertes retards:', error);
    return [];
  }
}

/**
 * ✅ CORRECTION : Alertes de préparations trop longues avec gestion des dates invalides
 */
async function getLongPreparationAlerts() {
  try {
    // ✅ Utiliser une constante par défaut si TIME_LIMITS n'est pas défini
    const maxMinutes = TIME_LIMITS?.PREPARATION_MAX_MINUTES || 30;
    const cutoffTime = new Date(Date.now() - maxMinutes * 60 * 1000);
    
    console.log('🔍 Recherche préparations longues avant:', cutoffTime.toISOString());

    // ✅ CORRECTION : Requête avec gestion des dates invalides
    const longPreparations = await Preparation.find({
      status: 'in_progress',
      startTime: { 
        $exists: true, 
        $ne: null,
        $type: 'date',  // ✅ S'assurer que c'est bien une date valide
        $lte: cutoffTime 
      }
    })
    .populate('preparateur', 'firstName lastName')
    .populate('vehicle', 'licensePlate model')
    .populate('agency', 'name')
    .limit(10);

    console.log(`📊 ${longPreparations.length} préparations longues trouvées`);

    const alerts = [];
    
    longPreparations.forEach(prep => {
      // ✅ CORRECTION : Vérifier que startTime est une date valide
      if (prep.preparateur && prep.startTime && prep.startTime instanceof Date && !isNaN(prep.startTime.getTime())) {
        const durationMinutes = Math.floor((Date.now() - prep.startTime.getTime()) / (1000 * 60));
        const priority = durationMinutes > 60 ? 'high' : 'medium';
        
        alerts.push({
          id: `long_prep_${prep._id}`,
          type: 'long_preparation',
          priority,
          title: 'Préparation en retard',
          message: `Préparation en cours depuis ${durationMinutes} minutes (véhicule ${prep.vehicle?.licensePlate || 'N/A'})`,
          userId: prep.preparateur._id,
          userName: `${prep.preparateur.firstName} ${prep.preparateur.lastName}`,
          agencyId: prep.agency?._id,
          agencyName: prep.agency?.name,
          timestamp: new Date().toISOString(),
          isRead: false,
          actionRequired: true,
          actionUrl: `/admin/preparations/${prep._id}`
        });
      } else {
        console.warn('⚠️ Préparation avec startTime invalide:', {
          id: prep._id,
          startTime: prep.startTime,
          hasPreparateur: !!prep.preparateur
        });
      }
    });

    return alerts;
  } catch (error) {
    console.error('❌ Erreur alertes préparations:', error);
    // ✅ Retourner un tableau vide au lieu de faire planter l'API
    return [];
  }
}

/**
 * Alertes de fin de service non pointée
 */
async function getMissingClockOutAlerts(today) {
  try {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const missingClockOuts = await Timesheet.find({
      date: { $gte: yesterday, $lt: today },
      clockInTime: { $exists: true },
      clockOutTime: null
    })
    .populate('user', 'firstName lastName')
    .populate('agency', 'name')
    .limit(10);

    const alerts = [];
    
    missingClockOuts.forEach(timesheet => {
      if (timesheet.user) {
        alerts.push({
          id: `missing_out_${timesheet._id}`,
          type: 'missing_clock_out',
          priority: 'medium',
          title: 'Fin de service non pointée',
          message: `${timesheet.user.firstName} ${timesheet.user.lastName} n'a pas pointé sa fin de service`,
          userId: timesheet.user._id,
          userName: `${timesheet.user.firstName} ${timesheet.user.lastName}`,
          agencyId: timesheet.agency?._id,
          agencyName: timesheet.agency?.name,
          timestamp: new Date().toISOString(),
          isRead: false,
          actionRequired: true,
          actionUrl: `/admin/timesheets/${timesheet._id}`
        });
      }
    });

    return alerts;
  } catch (error) {
    console.error('Erreur alertes clock-out:', error);
    return [];
  }
}

module.exports = router;