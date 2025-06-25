const Schedule = require('../models/Schedule');
const Timesheet = require('../models/Timesheet');
const { sendAlertEmail } = require('../services/emailService');
const { TIME_LIMITS } = require('../utils/constants');

/**
 * Job de vérification des retards de pointage
 * Exécuté toutes les 5 minutes via node-cron
 */
const checkLateTimesheets = async () => {
  try {
    console.log('🔍 Vérification des retards de pointage...');
    
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Chercher tous les plannings du jour
    const todaySchedules = await Schedule.find({
      date: today,
      status: 'active'
    }).populate('user agency');

    let alertsSent = 0;
    let overdueCount = 0;

    for (const schedule of todaySchedules) {
      try {
        // Calculer l'heure prévue de début
        const [hours, minutes] = schedule.startTime.split(':');
        const scheduledStart = new Date(today);
        scheduledStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Calculer le retard en minutes
        const delayMinutes = Math.floor((now - scheduledStart) / (1000 * 60));
        
        // Vérifier si c'est un retard significatif
        if (delayMinutes >= TIME_LIMITS.LATE_THRESHOLD_MINUTES) {
          overdueCount++;
          
          // Chercher ou créer le timesheet correspondant
          let timesheet = await Timesheet.findOne({
            user: schedule.user._id,
            agency: schedule.agency._id,
            date: today
          });

          // Si pas de pointage du tout, ou pointage pas encore fait
          if (!timesheet || !timesheet.startTime) {
            // Créer ou mettre à jour le timesheet avec le retard
            if (!timesheet) {
              timesheet = new Timesheet({
                user: schedule.user._id,
                agency: schedule.agency._id,
                date: today,
                schedule: schedule._id,
                delays: { startDelay: delayMinutes }
              });
            } else {
              timesheet.schedule = schedule._id;
              timesheet.delays.startDelay = delayMinutes;
            }

            await timesheet.save();

            // Envoyer l'alerte si pas déjà envoyée
            if (!timesheet.alertsSent.lateStart) {
              try {
                await sendAlertEmail({
                  type: 'late_start',
                  employee: schedule.user,
                  agency: schedule.agency,
                  scheduledTime: schedule.startTime,
                  delayMinutes,
                  schedule
                });
                
                // Marquer l'alerte comme envoyée
                timesheet.alertsSent.lateStart = true;
                await timesheet.save();
                
                alertsSent++;
                console.log(`📧 Alerte envoyée pour ${schedule.user.firstName} ${schedule.user.lastName} (${delayMinutes}min de retard)`);
                
              } catch (emailError) {
                console.error('❌ Erreur envoi email pour:', schedule.user.email, emailError.message);
              }
            }
          }
        }
      } catch (scheduleError) {
        console.error('❌ Erreur traitement planning:', schedule._id, scheduleError.message);
      }
    }

    // Vérifier aussi les préparations qui traînent trop
    await checkOvertimePreparations();
    
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
 * Vérifier les préparations qui dépassent le temps limite
 */
const checkOvertimePreparations = async () => {
  try {
    const Preparation = require('../models/Preparation');
    
    // Chercher les préparations en cours depuis plus de 30 minutes
    const cutoffTime = new Date(Date.now() - TIME_LIMITS.PREPARATION_MAX_MINUTES * 60 * 1000);
    
    const overtimePreparations = await Preparation.find({
      status: 'in_progress',
      startTime: { $lt: cutoffTime }
    })
    .populate('user', 'firstName lastName email')
    .populate('vehicle', 'licensePlate')
    .populate('agency', 'name code');

    for (const preparation of overtimePreparations) {
      const duration = Math.floor((new Date() - preparation.startTime) / (1000 * 60));
      
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
          
        } catch (emailError) {
          console.error('❌ Erreur envoi alerte préparation longue:', emailError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur vérification préparations longues:', error);
  }
};

/**
 * Vérifier les fins de service manquantes
 */
const checkMissingClockOuts = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Chercher les timesheets d'hier sans pointage de fin
    const missingClockOuts = await Timesheet.find({
      date: { $gte: yesterday, $lte: yesterdayEnd },
      startTime: { $exists: true },
      endTime: { $exists: false },
      'alertsSent.missingClockOut': { $ne: true }
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code');

    for (const timesheet of missingClockOuts) {
      try {
        await sendAlertEmail({
          type: 'missing_clock_out',
          employee: timesheet.user,
          agency: timesheet.agency,
          date: timesheet.date,
          clockInTime: timesheet.startTime
        });
        
        // Marquer l'alerte comme envoyée
        timesheet.alertsSent.missingClockOut = true;
        await timesheet.save();
        
        console.log(`📤 Alerte fin manquante: ${timesheet.user.firstName} ${timesheet.user.lastName}`);
        
      } catch (emailError) {
        console.error('❌ Erreur envoi alerte fin manquante:', emailError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur vérification fins manquantes:', error);
  }
};

module.exports = checkLateTimesheets;