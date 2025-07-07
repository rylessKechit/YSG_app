// backend/src/jobs/lateAlertsScheduler.js
// ✅ NOUVEAU FICHIER - Planificateur spécifique pour les alertes de retard

const cron = require('node-cron');
const { checkLateTimesheets, checkOverdueClockIns } = require('./checkLateTimesheets');

/**
 * Planificateur pour les alertes de retard
 */
class LateAlertsScheduler {
  constructor() {
    this.isInitialized = false;
    this.jobs = new Map();
  }

  /**
   * Initialiser le planificateur d'alertes
   */
  async initialize() {
    try {
      console.log('🚨 Initialisation du planificateur d\'alertes de retard...');
      
      // Vérifier si les alertes sont activées
      if (process.env.ENABLE_LATE_ALERTS === 'false') {
        console.log('ℹ️  Alertes de retard désactivées (ENABLE_LATE_ALERTS=false)');
        return false;
      }

      // Vérifier la configuration email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  Configuration email manquante - alertes désactivées');
        console.warn('   → Configurez EMAIL_USER et EMAIL_PASS dans .env');
        return false;
      }

      // Vérifier qu'il y a au moins un admin en DB
      const User = require('../models/User');
      const adminCount = await User.countDocuments({
        role: 'admin',
        isActive: true,
        email: { $exists: true, $ne: null, $ne: '' }
      });

      if (adminCount === 0) {
        console.warn('⚠️  Aucun administrateur actif trouvé en base - alertes désactivées');
        console.warn('   → Créez au moins un utilisateur admin avec email valide');
        return false;
      }

      console.log(`📧 ${adminCount} administrateur(s) trouvé(s) pour recevoir les alertes`);

      // Planifier les vérifications
      this.scheduleLatecomerChecks();
      this.scheduleMissingClockOutChecks();
      this.scheduleOvertimePreparationChecks();

      this.isInitialized = true;
      console.log('✅ Planificateur d\'alertes initialisé avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur initialisation planificateur alertes:', error);
      return false;
    }
  }

  /**
   * ✅ CORRECTION MAJEURE : Vérifier les retards toutes les 5 minutes
   */
  scheduleLatecomerChecks() {
    // CRON: Toutes les 5 minutes pendant les heures d'ouverture (6h-22h)
    const lateCheckTask = cron.schedule('*/5 6-22 * * 1-6', async () => {
      console.log('🔍 Vérification automatique des retards de pointage...');
      
      try {
        const overdueCount = await checkOverdueClockIns();
        
        if (overdueCount > 0) {
          console.log(`🚨 ${overdueCount} employé(s) en retard détecté(s)`);
        } else {
          console.log('✅ Aucun retard détecté');
        }
        
      } catch (error) {
        console.error('❌ Erreur vérification retards:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    this.jobs.set('latecomers', lateCheckTask);
    console.log('🕐 Tâche retards programmée: toutes les 5min (6h-22h, Lun-Sam)');
  }

  /**
   * Vérifier les fins de service manquantes (1x par jour à 23h)
   */
  scheduleMissingClockOutChecks() {
    const clockOutTask = cron.schedule('0 23 * * 1-6', async () => {
      console.log('🔍 Vérification fins de service manquantes...');
      
      try {
        const { checkMissingClockOuts } = require('./checkLateTimesheets');
        const missingCount = await checkMissingClockOuts();
        
        if (missingCount > 0) {
          console.log(`📧 ${missingCount} alerte(s) envoyée(s) pour fins de service manquantes`);
        }
        
      } catch (error) {
        console.error('❌ Erreur vérification fins de service:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    this.jobs.set('missingClockOuts', clockOutTask);
    console.log('🕚 Tâche fins de service programmée: 23h (Lun-Sam)');
  }

  /**
   * Vérifier les préparations qui traînent (toutes les 15 minutes)
   */
  scheduleOvertimePreparationChecks() {
    const overtimeTask = cron.schedule('*/15 6-22 * * 1-6', async () => {
      console.log('🔍 Vérification préparations en retard...');
      
      try {
        const { checkOvertimePreparations } = require('./checkLateTimesheets');
        const alertsSent = await checkOvertimePreparations();
        
        if (alertsSent > 0) {
          console.log(`⏰ ${alertsSent} alerte(s) envoyée(s) pour préparations longues`);
        }
        
      } catch (error) {
        console.error('❌ Erreur vérification préparations longues:', error);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    this.jobs.set('overtimePreparations', overtimeTask);
    console.log('⏰ Tâche préparations longues programmée: toutes les 15min (6h-22h, Lun-Sam)');
  }

  /**
   * Démarrer toutes les tâches d'alertes
   */
  start() {
    if (!this.isInitialized) {
      console.warn('⚠️  Planificateur alertes non initialisé');
      return false;
    }

    let started = 0;
    this.jobs.forEach((job, name) => {
      try {
        job.start();
        console.log(`✅ Alerte "${name}" démarrée`);
        started++;
      } catch (error) {
        console.error(`❌ Erreur démarrage alerte "${name}":`, error);
      }
    });

    console.log(`🚀 ${started}/${this.jobs.size} alerte(s) démarrée(s)`);
    return started > 0;
  }

  /**
   * Arrêter toutes les alertes
   */
  stop() {
    let stopped = 0;
    this.jobs.forEach((job, name) => {
      try {
        job.stop();
        console.log(`⏹️  Alerte "${name}" arrêtée`);
        stopped++;
      } catch (error) {
        console.error(`❌ Erreur arrêt alerte "${name}":`, error);
      }
    });

    console.log(`⏹️  ${stopped}/${this.jobs.size} alerte(s) arrêtée(s)`);
    return stopped;
  }

  /**
   * Obtenir le statut des alertes
   */
  getStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false,
        options: job.options || {}
      };
    });
    return status;
  }

  /**
   * Test manuel d'une alerte (pour debug)
   */
  async runManually(alertType) {
    console.log(`🔧 Test manuel de l'alerte: ${alertType}`);
    
    try {
      switch (alertType) {
        case 'latecomers':
          return await checkOverdueClockIns();
        
        case 'missingClockOuts':
          const { checkMissingClockOuts } = require('./checkLateTimesheets');
          return await checkMissingClockOuts();
        
        case 'overtimePreparations':
          const { checkOvertimePreparations } = require('./checkLateTimesheets');
          return await checkOvertimePreparations();
        
        case 'all':
          return await checkLateTimesheets();
        
        default:
          throw new Error(`Type d'alerte inconnu: ${alertType}`);
      }
    } catch (error) {
      console.error(`❌ Erreur test manuel "${alertType}":`, error);
      throw error;
    }
  }
}

module.exports = new LateAlertsScheduler();