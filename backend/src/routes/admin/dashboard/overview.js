// backend/src/routes/admin/dashboard/overview.js - CORRECTION FINALE
const express = require('express');
const Joi = require('joi');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const Schedule = require('../../../models/Schedule');
const Timesheet = require('../../../models/Timesheet');
const Preparation = require('../../../models/Preparation');
const Vehicle = require('../../../models/Vehicle');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery } = require('../../../middleware/validation');
const { ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// Schéma de validation pour l'overview
const overviewQuerySchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeAlerts: Joi.boolean().default(true)
});

// Middleware auth
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/dashboard/overview
 * @desc    Vue d'ensemble du dashboard admin
 * @access  Admin
 */
router.get('/', validateQuery(overviewQuerySchema), async (req, res) => {
  try {
    const { date, includeAlerts } = req.query;
    
    // Date par défaut = aujourd'hui
    const today = date ? new Date(date) : new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📊 Overview - Date:', today.toISOString().split('T')[0]);

    // ===== STATISTIQUES GLOBALES =====
    const [
      totalUsers,
      activeUsers,
      totalAgencies,
      totalVehicles,
      todaySchedules,
      todayPresent,
      todayPreparations,
      ongoingPreparations
    ] = await Promise.all([
      // Utilisateurs
      User.countDocuments({ role: 'preparateur' }),
      User.countDocuments({ role: 'preparateur', isActive: true }),
      
      // Agences
      Agency.countDocuments({}),
      
      // Véhicules (si le modèle existe)
      Vehicle?.countDocuments?.({}) || Promise.resolve(0),
      
      // ✅ CORRECTION MAJEURE: Plannings du jour (sans filtre status)
      Schedule.countDocuments({
        date: {
          $gte: today,
          $lt: tomorrow
        }
        // ✅ Suppression du filtre status: 'active' qui empêchait la récupération
      }),
      
      // ✅ CORRECTION: Présents aujourd'hui (qui ont pointé)
      Timesheet.countDocuments({
        date: {
          $gte: today,
          $lt: tomorrow
        },
        startTime: { $exists: true, $ne: null } // ✅ startTime au lieu de clockInTime
      }),
      
      // Préparations aujourd'hui
      Preparation.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow }
      }),
      
      // Préparations en cours
      Preparation.countDocuments({ status: 'in_progress' })
    ]);

    // ===== ✅ CORRECTION MAJEURE : CALCUL DES RETARDS =====
    const todayLate = await calculateTodayLateCountFixed(today, tomorrow);

    // ===== CALCUL DES TAUX =====
    const presentRate = todaySchedules > 0 ? Math.round((todayPresent / todaySchedules) * 100) : 0;
    const punctualityRate = todayPresent > 0 ? Math.round(((todayPresent - todayLate) / todayPresent) * 100) : 0;

    // ===== ALERTES RÉCENTES =====
    let alerts = [];
    if (includeAlerts) {
      alerts = await getRecentAlertsFixed(today);
    }

    // ===== RESPONSE =====
    const overview = {
      stats: {
        totalUsers,
        activeUsers,
        totalAgencies,
        totalVehicles,
        todaySchedules,
        todayPresent,
        todayLate, // ✅ Maintenant calculé correctement
        todayPreparations,
        ongoingPreparations
      },
      rates: {
        presentRate,
        punctualityRate
      },
      alerts,
      date: today.toISOString().split('T')[0],
      timestamp: new Date()
    };

    console.log('✅ Overview calculé:', {
      todaySchedules,
      todayPresent,
      todayLate,
      presentRate,
      punctualityRate
    });

    res.json({
      success: true,
      data: overview
    });

  } catch (error) {
    console.error('💥 Erreur overview:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== ✅ FONCTION COMPLÈTEMENT CORRIGÉE AVEC DEBUG =====

/**
 * ✅ Calculer le nombre d'employés en retard aujourd'hui - AVEC DEBUG COMPLET
 */
async function calculateTodayLateCountFixed(today, tomorrow) {
  try {
    console.log('🔍 Calcul retards pour le dashboard...');
    console.log('📅 Période:', today.toISOString().split('T')[0], 'au', tomorrow.toISOString().split('T')[0]);
    
    const now = new Date();
    
    // ✅ ÉTAPE 1: Debug - Vérifier TOUS les plannings d'aujourd'hui sans filtre status
    const allTodaySchedules = await Schedule.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('user', 'firstName lastName');

    console.log(`🔍 DEBUG: ${allTodaySchedules.length} planning(s) total(aux) trouvé(s) aujourd'hui (sans filtre status)`);
    
    if (allTodaySchedules.length > 0) {
      console.log('📋 Plannings trouvés:');
      allTodaySchedules.forEach(schedule => {
        console.log(`   • ${schedule.user?.firstName || 'User inconnu'} ${schedule.user?.lastName || ''} - ${schedule.startTime} (status: ${schedule.status || 'undefined'})`);
      });
    }

    // ✅ ÉTAPE 2: Utiliser TOUS les plannings (sans filtre status)
    const todaySchedules = allTodaySchedules;

    console.log(`📊 ${todaySchedules.length} planning(s) trouvé(s) pour le calcul des retards`);

    if (todaySchedules.length === 0) {
      console.log('⚠️  Aucun planning pour aujourd\'hui');
      return 0;
    }

    let lateCount = 0;
    const TIME_THRESHOLD = 15; // minutes de retard acceptable

    for (const schedule of todaySchedules) {
      console.log(`🔍 Vérification: ${schedule.user.firstName} ${schedule.user.lastName} (${schedule.startTime})`);
      
      // Vérifier s'il y a un pointage
      const timesheet = await Timesheet.findOne({
        user: schedule.user._id,
        date: {
          $gte: today,
          $lt: tomorrow
        }
      });

      // Si pas de pointage OU pas d'heure de début
      if (!timesheet || !timesheet.startTime) {
        // Calculer si l'employé est considéré comme "en retard"
        const [hour, minute] = schedule.startTime.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hour, minute, 0, 0);
        
        const delayMinutes = Math.floor((now - scheduledTime) / (1000 * 60));
        
        console.log(`   ⏰ ${schedule.user.firstName}: pas de pointage, retard de ${delayMinutes}min depuis ${schedule.startTime}`);
        
        // Compter comme "en retard" si dépassement du seuil
        if (delayMinutes > TIME_THRESHOLD) {
          lateCount++;
          console.log(`   🚨 RETARD: ${schedule.user.firstName} ${schedule.user.lastName} - ${delayMinutes}min`);
        } else {
          console.log(`   ⏳ En attente: ${schedule.user.firstName} - ${delayMinutes}min (seuil: ${TIME_THRESHOLD}min)`);
        }
      } else {
        // Si pointage existe, vérifier s'il était en retard
        const [scheduleHour, scheduleMinute] = schedule.startTime.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(scheduleHour, scheduleMinute, 0, 0);
        
        const actualStartTime = new Date(timesheet.startTime);
        const delayMinutes = Math.floor((actualStartTime - scheduledTime) / (1000 * 60));
        
        console.log(`   ✅ ${schedule.user.firstName}: pointé à ${actualStartTime.toLocaleTimeString('fr-FR')}, retard de ${delayMinutes}min`);
        
        if (delayMinutes > TIME_THRESHOLD) {
          lateCount++;
          console.log(`   🚨 RETARD POINTÉ: ${schedule.user.firstName} ${schedule.user.lastName} - ${delayMinutes}min`);
        } else {
          console.log(`   ✅ À l'heure: ${schedule.user.firstName} - ${delayMinutes}min`);
        }
      }
    }

    console.log(`📊 RÉSULTAT FINAL: ${lateCount} employé(s) en retard sur ${todaySchedules.length} planifié(s)`);
    return lateCount;

  } catch (error) {
    console.error('❌ Erreur calcul retards dashboard:', error);
    return 0;
  }
}

/**
 * ✅ FONCTION CORRIGÉE POUR LES ALERTES RÉCENTES
 */
async function getRecentAlertsFixed(today) {
  try {
    const alerts = [];
    const now = new Date();

    // 1. Alertes de retards de pointage - ✅ SANS FILTRE STATUS
    const todaySchedules = await Schedule.find({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
      // ✅ Suppression du filtre status: 'active'
    })
    .populate('user', 'firstName lastName')
    .populate('agency', 'name')
    .limit(10);

    for (const schedule of todaySchedules) {
      // ✅ CORRECTION: Utiliser startTime
      const timesheet = await Timesheet.findOne({
        user: schedule.user._id,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      // Si pas de pointage et que l'heure est dépassée
      if (!timesheet || !timesheet.startTime) {
        const [hour, minute] = schedule.startTime.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hour, minute, 0, 0);
        
        const delayMinutes = Math.floor((now - scheduledTime) / (1000 * 60));
        
        if (delayMinutes > 15) {
          alerts.push({
            id: `late_${schedule._id}`,
            type: 'late_start',
            priority: delayMinutes > 30 ? 'critical' : 'high',
            title: 'Retard de pointage',
            message: `${schedule.user.firstName} ${schedule.user.lastName} en retard de ${delayMinutes} minutes`,
            userId: schedule.user._id,
            userName: `${schedule.user.firstName} ${schedule.user.lastName}`,
            agencyName: schedule.agency?.name,
            timestamp: now.toISOString(),
            isRead: false,
            actionRequired: true
          });
        }
      }
    }

    console.log(`🚨 ${alerts.length} alerte(s) récente(s) trouvée(s)`);
    return alerts.slice(0, 10);

  } catch (error) {
    console.error('❌ Erreur récupération alertes:', error);
    return [];
  }
}

module.exports = router;