// backend/src/jobs/checkLateTimesheets.js - VERSION CORRIGÉE
const nodemailer = require('nodemailer');
const { EMAIL_CONFIG } = require('../utils/constants');

// Configuration email
const transporter = nodemailer.createTransporter({
  service: EMAIL_CONFIG.SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Limites de temps en minutes
const TIME_LIMITS = {
  LATE_THRESHOLD: 15,
  PREPARATION_MAX_MINUTES: 30
};

/**
 * Fonction principale de vérification des retards
 */
const checkLateTimesheets = async () => {
  try {
    console.log('🔍 Vérification des retards...');
    
    // Vérifier les retards de pointage
    const overdueCount = await checkOverdueClockIns();
    
    // Vérifier les préparations trop longues
    const alertsSent = await checkOvertimePreparations();
    
    // Vérifier les fins de service manquantes
    await checkMissingClockOuts();

    if (overdueCount > 0 || alertsSent > 0) {
      console.log(`✅ Vérification terminée: ${overdueCount} retards détectés, ${alertsSent} alertes envoyées`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des retards:', error);
  }
};

/**
 * ✅ CORRECTION : Vérifier les préparations qui dépassent le temps limite avec gestion des dates invalides
 */
const checkOvertimePreparations = async () => {
  try {
    const Preparation = require('../models/Preparation');
    
    // Chercher les préparations en cours depuis plus de 30 minutes
    const cutoffTime = new Date(Date.now() - TIME_LIMITS.PREPARATION_MAX_MINUTES * 60 * 1000);
    
    console.log('🔍 Recherche préparations longues avant:', cutoffTime.toISOString());

    // ✅ CORRECTION : Requête avec protection contre les dates invalides
    const overtimePreparations = await Preparation.find({
      status: 'in_progress',
      startTime: { 
        $exists: true,
        $ne: null,
        $type: 'date',  // ✅ S'assurer que c'est bien une date valide
        $lt: cutoffTime 
      }
    })
    .populate('user', 'firstName lastName email')
    .populate('vehicle', 'licensePlate')
    .populate('agency', 'name code');

    console.log(`📊 ${overtimePreparations.length} préparations longues trouvées`);

    let alertsSent = 0;

    for (const preparation of overtimePreparations) {
      // ✅ CORRECTION : Vérifier que startTime est une date valide
      if (!preparation.startTime || !(preparation.startTime instanceof Date) || isNaN(preparation.startTime.getTime())) {
        console.warn('⚠️ Préparation avec startTime invalide dans job:', {
          id: preparation._id,
          startTime: preparation.startTime
        });
        continue; // Ignorer cette préparation
      }

      const duration = Math.floor((new Date() - preparation.startTime.getTime()) / (1000 * 60));
      
      // Envoyer une alerte pour les préparations très longues (plus de 45 min)
      if (duration >= 45) {
        try {
          await sendAlertEmail({
            type: 'overtime_preparation',
            employee: preparation.user,
            agency: preparation.agency,
            vehicle: preparation.vehicle,
            duration,
            preparation
          });
          
          console.log(`⏰ Alerte préparation longue: ${preparation.user.firstName} ${preparation.user.lastName} - ${duration}min`);
          alertsSent++;
          
        } catch (emailError) {
          console.error('❌ Erreur envoi email alerte préparation:', emailError);
        }
      }
    }

    return alertsSent;
  } catch (error) {
    console.error('❌ Erreur vérification préparations longues:', error);
    return 0; // ✅ Retourner 0 au lieu de faire planter le job
  }
};

/**
 * Vérifier les retards de pointage
 */
const checkOverdueClockIns = async () => {
  try {
    const Schedule = require('../models/Schedule');
    const Timesheet = require('../models/Timesheet');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const now = new Date();
    
    // Chercher les plannings d'aujourd'hui sans pointage
    const overdueSchedules = await Schedule.find({
      date: today,
      status: 'active'
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name');

    let overdueCount = 0;

    for (const schedule of overdueSchedules) {
      // Vérifier s'il y a déjà un pointage pour cet utilisateur aujourd'hui
      const existingTimesheet = await Timesheet.findOne({
        user: schedule.user._id,
        date: today
      });

      if (!existingTimesheet || !existingTimesheet.clockInTime) {
        // Calculer si l'employé est en retard
        const [hour, minute] = schedule.startTime.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hour, minute, 0, 0);
        
        const delayMinutes = Math.floor((now - scheduledTime) / (1000 * 60));
        
        if (delayMinutes > TIME_LIMITS.LATE_THRESHOLD) {
          overdueCount++;
          
          // Envoyer une alerte email pour les retards importants (>30min)
          if (delayMinutes > 30) {
            try {
              await sendAlertEmail({
                type: 'late_start',
                employee: schedule.user,
                agency: schedule.agency,
                delayMinutes,
                scheduledTime: schedule.startTime
              });
            } catch (emailError) {
              console.error('❌ Erreur envoi email retard:', emailError);
            }
          }
        }
      }
    }

    return overdueCount;
  } catch (error) {
    console.error('❌ Erreur vérification retards pointage:', error);
    return 0;
  }
};

/**
 * Vérifier les fins de service manquantes
 */
const checkMissingClockOuts = async () => {
  try {
    const Timesheet = require('../models/Timesheet');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Chercher les pointages d'hier sans fin de service
    const missingClockOuts = await Timesheet.find({
      date: { $gte: yesterday, $lt: today },
      clockInTime: { $exists: true },
      clockOutTime: null
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name');

    for (const timesheet of missingClockOuts) {
      try {
        await sendAlertEmail({
          type: 'missing_clock_out',
          employee: timesheet.user,
          agency: timesheet.agency,
          date: timesheet.date
        });
      } catch (emailError) {
        console.error('❌ Erreur envoi email clock-out manquant:', emailError);
      }
    }

    if (missingClockOuts.length > 0) {
      console.log(`📧 ${missingClockOuts.length} alertes envoyées pour fins de service manquantes`);
    }

    return missingClockOuts.length;
  } catch (error) {
    console.error('❌ Erreur vérification fins de service:', error);
    return 0;
  }
};

/**
 * Envoyer un email d'alerte
 */
const sendAlertEmail = async (alertData) => {
  try {
    // ✅ CORRECTION : Récupérer les emails des admins depuis la DB
    const User = require('../models/User');
    
    const adminUsers = await User.find({
      role: 'admin',
      isActive: true,
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('email firstName lastName');
    
    if (adminUsers.length === 0) {
      console.warn('⚠️ Aucun administrateur actif trouvé en base de données');
      return;
    }
    
    const adminEmails = adminUsers.map(admin => admin.email);
    console.log(`📧 Envoi alerte à ${adminEmails.length} administrateur(s):`, adminEmails);

    let subject, html;

    switch (alertData.type) {
      case 'late_start':
        subject = `🚨 Retard de pointage - ${alertData.employee.firstName} ${alertData.employee.lastName}`;
        html = `
          <h3>Retard de pointage détecté</h3>
          <p><strong>Employé:</strong> ${alertData.employee.firstName} ${alertData.employee.lastName}</p>
          <p><strong>Email:</strong> ${alertData.employee.email}</p>
          <p><strong>Agence:</strong> ${alertData.agency.name}</p>
          <p><strong>Heure prévue:</strong> ${alertData.scheduledTime}</p>
          <p><strong>Retard:</strong> ${alertData.delayMinutes} minutes</p>
          <p><strong>Heure actuelle:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        `;
        break;

      case 'overtime_preparation':
        subject = `⏰ Préparation en retard - ${alertData.employee.firstName} ${alertData.employee.lastName}`;
        html = `
          <h3>Préparation dépassant le temps limite</h3>
          <p><strong>Préparateur:</strong> ${alertData.employee.firstName} ${alertData.employee.lastName}</p>
          <p><strong>Email:</strong> ${alertData.employee.email}</p>
          <p><strong>Agence:</strong> ${alertData.agency.name}</p>
          <p><strong>Véhicule:</strong> ${alertData.vehicle.licensePlate}</p>
          <p><strong>Durée:</strong> ${alertData.duration} minutes</p>
          <p><strong>Limite normale:</strong> ${TIME_LIMITS.PREPARATION_MAX_MINUTES} minutes</p>
        `;
        break;

      case 'missing_clock_out':
        subject = `📊 Fin de service non pointée - ${alertData.employee.firstName} ${alertData.employee.lastName}`;
        html = `
          <h3>Fin de service non pointée</h3>
          <p><strong>Employé:</strong> ${alertData.employee.firstName} ${alertData.employee.lastName}</p>
          <p><strong>Email:</strong> ${alertData.employee.email}</p>
          <p><strong>Agence:</strong> ${alertData.agency.name}</p>
          <p><strong>Date:</strong> ${alertData.date.toLocaleDateString('fr-FR')}</p>
        `;
        break;

      default:
        return;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmails.join(','),
      subject,
      html: html + `
        <hr>
        <p style="color: #666; font-size: 12px;">
          <strong>Destinataires:</strong> ${adminUsers.map(admin => `${admin.firstName} ${admin.lastName} (${admin.email})`).join(', ')}<br>
          <strong>Heure d'envoi:</strong> ${new Date().toLocaleString('fr-FR')}<br>
          <strong>Système:</strong> Vehicle Prep - Alertes automatiques
        </p>
      `
    });

    console.log(`✅ Email d'alerte envoyé à ${adminEmails.length} administrateur(s) pour: ${alertData.type}`);

  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    throw error;
  }
};

module.exports = {
  checkLateTimesheets,
  checkOvertimePreparations,
  checkOverdueClockIns,
  checkMissingClockOuts
};