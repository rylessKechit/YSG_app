// backend/src/jobs/checkLateTimesheets.js - VERSION CORRIGÉE AVEC DB ADMINS
const nodemailer = require('nodemailer');

// Limites de temps en minutes
const TIME_LIMITS = {
  LATE_THRESHOLD: 15,        // Retard considéré comme "en retard"
  CRITICAL_LATE: 30,         // Retard critique (envoi email)
  PREPARATION_MAX_MINUTES: 30 // Temps max préparation
};

/**
 * Configuration du transporteur email
 */
const getEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Configuration email manquante (EMAIL_USER/EMAIL_PASS)');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * ✅ CORRECTION : Récupérer les emails des admins depuis la DB
 */
const getAdminEmails = async () => {
  try {
    const User = require('../models/User');
    
    const adminUsers = await User.find({
      role: 'admin',
      isActive: true,
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('email firstName lastName');
    
    if (adminUsers.length === 0) {
      console.warn('⚠️  Aucun administrateur actif trouvé en base de données');
      return { emails: [], users: [] };
    }
    
    const emails = adminUsers.map(admin => admin.email);
    console.log(`📧 Emails admins récupérés: ${emails.join(', ')}`);
    
    return { emails, users: adminUsers };
  } catch (error) {
    console.error('❌ Erreur récupération emails admins:', error);
    return { emails: [], users: [] };
  }
};

/**
 * Fonction principale de vérification des retards
 */
const checkLateTimesheets = async () => {
  try {
    console.log('🔍 Vérification complète des retards...');
    
    // Vérifier les retards de pointage
    const overdueCount = await checkOverdueClockIns();
    
    // Vérifier les préparations trop longues
    const alertsSent = await checkOvertimePreparations();
    
    // Vérifier les fins de service manquantes
    const missingCount = await checkMissingClockOuts();

    console.log(`✅ Vérification terminée: ${overdueCount} retards, ${alertsSent} alertes préparations, ${missingCount} fins manquantes`);
    
    return {
      overdueCount,
      alertsSent,
      missingCount,
      total: overdueCount + alertsSent + missingCount
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des retards:', error);
    return { overdueCount: 0, alertsSent: 0, missingCount: 0, total: 0 };
  }
};

/**
 * ✅ CORRECTION : Vérifier les retards de pointage avec emails DB
 */
const checkOverdueClockIns = async () => {
  try {
    const Schedule = require('../models/Schedule');
    const Timesheet = require('../models/Timesheet');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const now = new Date();
    
    console.log(`🔍 Recherche plannings d'aujourd'hui: ${today.toLocaleDateString('fr-FR')}`);
    
    // Chercher les plannings d'aujourd'hui
    const todaySchedules = await Schedule.find({
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'active'
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code');

    console.log(`📊 ${todaySchedules.length} planning(s) trouvé(s) pour aujourd'hui`);

    let overdueCount = 0;
    let criticalLateCount = 0;

    for (const schedule of todaySchedules) {
      // Vérifier s'il y a déjà un pointage pour cet utilisateur aujourd'hui
      const existingTimesheet = await Timesheet.findOne({
        user: schedule.user._id,
        date: {
          $gte: today,
          $lt: tomorrow
        }
      });

      // Si pas de pointage ou pas de startTime
      if (!existingTimesheet || !existingTimesheet.startTime) {
        // Calculer si l'employé est en retard
        const [hour, minute] = schedule.startTime.split(':').map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hour, minute, 0, 0);
        
        const delayMinutes = Math.floor((now - scheduledTime) / (1000 * 60));
        
        // Compter comme "en retard" si dépassement du seuil
        if (delayMinutes > TIME_LIMITS.LATE_THRESHOLD) {
          overdueCount++;
          
          console.log(`🚨 Retard détecté: ${schedule.user.firstName} ${schedule.user.lastName} - ${delayMinutes}min (prévu ${schedule.startTime})`);
          
          // Envoyer une alerte email pour les retards critiques (>30min)
          if (delayMinutes > TIME_LIMITS.CRITICAL_LATE) {
            criticalLateCount++;
            
            try {
              await sendAlertEmail({
                type: 'late_start',
                employee: schedule.user,
                agency: schedule.agency,
                delayMinutes,
                scheduledTime: schedule.startTime,
                currentTime: now.toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              });
              
              console.log(`📧 Email d'alerte envoyé pour retard critique: ${schedule.user.firstName} ${schedule.user.lastName}`);
              
            } catch (emailError) {
              console.error('❌ Erreur envoi email retard:', emailError.message);
            }
          }
        }
      }
    }

    if (overdueCount > 0) {
      console.log(`📊 Résultat: ${overdueCount} employé(s) en retard (${criticalLateCount} critique(s))`);
    }

    return overdueCount;
  } catch (error) {
    console.error('❌ Erreur vérification retards pointage:', error);
    return 0;
  }
};

/**
 * ✅ CORRECTION : Vérifier les préparations longues avec emails DB
 */
const checkOvertimePreparations = async () => {
  try {
    const Preparation = require('../models/Preparation');
    
    // Chercher les préparations en cours depuis plus de 30 minutes
    const cutoffTime = new Date(Date.now() - TIME_LIMITS.PREPARATION_MAX_MINUTES * 60 * 1000);
    
    console.log('🔍 Recherche préparations longues avant:', cutoffTime.toLocaleTimeString('fr-FR'));

    const overtimePreparations = await Preparation.find({
      status: 'in_progress',
      startTime: { 
        $exists: true,
        $ne: null,
        $type: 'date',
        $lt: cutoffTime 
      }
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code');

    console.log(`📊 ${overtimePreparations.length} préparation(s) longue(s) trouvée(s)`);

    let alertsSent = 0;

    for (const preparation of overtimePreparations) {
      // Vérifier que startTime est une date valide
      if (!preparation.startTime || !(preparation.startTime instanceof Date) || isNaN(preparation.startTime.getTime())) {
        console.warn('⚠️ Préparation avec startTime invalide:', {
          id: preparation._id,
          startTime: preparation.startTime
        });
        continue;
      }

      const duration = Math.floor((new Date() - preparation.startTime.getTime()) / (1000 * 60));
      
      // Envoyer une alerte pour les préparations très longues (plus de 45 min)
      if (duration >= 45) {
        try {
          await sendAlertEmail({
            type: 'overtime_preparation',
            employee: preparation.user,
            agency: preparation.agency,
            vehicle: preparation.vehicle || { licensePlate: 'N/A' },
            duration,
            preparation
          });
          
          console.log(`⏰ Alerte préparation longue: ${preparation.user.firstName} ${preparation.user.lastName} - ${duration}min`);
          alertsSent++;
          
        } catch (emailError) {
          console.error('❌ Erreur envoi email alerte préparation:', emailError.message);
        }
      }
    }

    return alertsSent;
  } catch (error) {
    console.error('❌ Erreur vérification préparations longues:', error);
    return 0;
  }
};

/**
 * ✅ CORRECTION : Vérifier les fins de service manquantes avec emails DB
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
      startTime: { $exists: true, $ne: null },
      endTime: null
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code');

    console.log(`📊 ${missingClockOuts.length} fin(s) de service manquante(s) détectée(s)`);

    for (const timesheet of missingClockOuts) {
      try {
        await sendAlertEmail({
          type: 'missing_clock_out',
          employee: timesheet.user,
          agency: timesheet.agency,
          date: timesheet.date
        });
        
        console.log(`📧 Alerte fin de service manquante: ${timesheet.user.firstName} ${timesheet.user.lastName}`);
        
      } catch (emailError) {
        console.error('❌ Erreur envoi email clock-out manquant:', emailError.message);
      }
    }

    return missingClockOuts.length;
  } catch (error) {
    console.error('❌ Erreur vérification fins de service:', error);
    return 0;
  }
};

/**
 * ✅ CORRECTION MAJEURE : Envoyer un email d'alerte avec admins de la DB
 */
const sendAlertEmail = async (alertData) => {
  try {
    // Récupérer les emails des admins depuis la DB
    const { emails: adminEmails, users: adminUsers } = await getAdminEmails();
    
    if (adminEmails.length === 0) {
      console.warn('⚠️ Aucun email admin disponible - alerte non envoyée');
      return;
    }
    
    console.log(`📧 Envoi alerte "${alertData.type}" à ${adminEmails.length} admin(s)`);

    const transporter = getEmailTransporter();
    
    let subject, html;

    switch (alertData.type) {
      case 'late_start':
        subject = `🚨 Retard de pointage - ${alertData.employee.firstName} ${alertData.employee.lastName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px;">
              🚨 Retard de pointage détecté
            </h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Employé:</strong> ${alertData.employee.firstName} ${alertData.employee.lastName}</p>
              <p><strong>Email:</strong> ${alertData.employee.email}</p>
              <p><strong>Agence:</strong> ${alertData.agency.name} (${alertData.agency.code})</p>
              <p><strong>Heure prévue:</strong> ${alertData.scheduledTime}</p>
              <p><strong>Heure actuelle:</strong> ${alertData.currentTime}</p>
              <p style="color: #dc3545;"><strong>Retard:</strong> ${alertData.delayMinutes} minutes</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Envoyé le ${new Date().toLocaleString('fr-FR')}<br>
              Système Vehicle Prep - Alertes automatiques
            </p>
          </div>
        `;
        break;

      case 'overtime_preparation':
        subject = `⏰ Préparation en retard - ${alertData.employee.firstName} ${alertData.employee.lastName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #fd7e14; border-bottom: 2px solid #fd7e14; padding-bottom: 10px;">
              ⏰ Préparation dépassant le temps limite
            </h2>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Préparateur:</strong> ${alertData.employee.firstName} ${alertData.employee.lastName}</p>
              <p><strong>Email:</strong> ${alertData.employee.email}</p>
              <p><strong>Agence:</strong> ${alertData.agency.name} (${alertData.agency.code})</p>
              <p><strong>Véhicule:</strong> ${alertData.vehicle.licensePlate || 'N/A'}</p>
              <p style="color: #fd7e14;"><strong>Durée:</strong> ${alertData.duration} minutes</p>
              <p><strong>Limite normale:</strong> ${TIME_LIMITS.PREPARATION_MAX_MINUTES} minutes</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Envoyé le ${new Date().toLocaleString('fr-FR')}<br>
              Système Vehicle Prep - Alertes automatiques
            </p>
          </div>
        `;
        break;

      case 'missing_clock_out':
        subject = `📊 Fin de service non pointée - ${alertData.employee.firstName} ${alertData.employee.lastName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6c757d; border-bottom: 2px solid #6c757d; padding-bottom: 10px;">
              📊 Fin de service non pointée
            </h2>
            <div style="background: #e2e3e5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Employé:</strong> ${alertData.employee.firstName} ${alertData.employee.lastName}</p>
              <p><strong>Email:</strong> ${alertData.employee.email}</p>
              <p><strong>Agence:</strong> ${alertData.agency.name} (${alertData.agency.code})</p>
              <p><strong>Date:</strong> ${alertData.date.toLocaleDateString('fr-FR')}</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Envoyé le ${new Date().toLocaleString('fr-FR')}<br>
              Système Vehicle Prep - Alertes automatiques
            </p>
          </div>
        `;
        break;

      default:
        console.error('Type d\'alerte inconnu:', alertData.type);
        return;
    }

    // Ajouter la liste des destinataires au footer
    html += `
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
      <p style="color: #6c757d; font-size: 11px;">
        <strong>Destinataires:</strong> ${adminUsers.map(admin => `${admin.firstName} ${admin.lastName} (${admin.email})`).join(', ')}
      </p>
    `;

    await transporter.sendMail({
      from: `"Vehicle Prep System" <${process.env.EMAIL_USER}>`,
      to: adminEmails.join(','),
      subject,
      html
    });

    console.log(`✅ Email d'alerte "${alertData.type}" envoyé avec succès à ${adminEmails.length} administrateur(s)`);

  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    throw error;
  }
};

module.exports = {
  checkLateTimesheets,
  checkOverdueClockIns,
  checkOvertimePreparations,
  checkMissingClockOuts,
  sendAlertEmail,
  getAdminEmails
};