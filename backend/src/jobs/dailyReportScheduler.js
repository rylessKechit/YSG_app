// ===== PLANIFICATEUR CRON AMÉLIORÉ AVEC VÉHICULES =====
// backend/src/jobs/dailyReportScheduler.js - VERSION COMPLÈTE

const cron = require('node-cron');
const dailyReportService = require('../services/dailyReportService');

/**
 * Planificateur de tâches CRON pour les rapports automatiques complets
 */
class DailyReportScheduler {
  constructor() {
    this.isInitialized = false;
    this.jobs = new Map();
  }

  /**
   * Initialiser le planificateur
   */
  async initialize() {
    try {
      console.log('📅 Initialisation du planificateur de rapports complets...');
      
      // Vérifier la configuration
      if (process.env.ENABLE_DAILY_REPORTS === 'false') {
        console.log('ℹ️  Rapports automatiques désactivés (ENABLE_DAILY_REPORTS=false)');
        return false;
      }

      // Initialiser le service de rapport
      const serviceInitialized = await dailyReportService.initialize();
      if (!serviceInitialized) {
        console.warn('⚠️  Service de rapport non initialisé - tâches CRON désactivées');
        return false;
      }

      // Planifier les tâches
      this.scheduleDailyReport();
      this.scheduleWeeklyReport();
      this.scheduleTestJobs();

      this.isInitialized = true;
      console.log('✅ Planificateur de rapports complets initialisé avec succès');
      console.log('   🕒 Rapport quotidien: tous les jours à 20h00');
      console.log('   🕕 Rapport hebdomadaire: dimanche à 18h00');
      return true;

    } catch (error) {
      console.error('❌ Erreur initialisation planificateur:', error);
      return false;
    }
  }

  /**
   * ✅ MODIFIÉ : Planifier le rapport quotidien avec véhicules à 20h00
   */
  scheduleDailyReport() {
    // CRON: Tous les jours à 20h00
    const dailyTask = cron.schedule('0 20 * * *', async () => {
      console.log('🕒 20h00 - Déclenchement du rapport quotidien automatique COMPLET');
      
      try {
        // ✅ Utiliser la nouvelle fonction avec véhicules
        const result = await dailyReportService.generateAndSendDailyReport();
        
        console.log('✅ Rapport quotidien complet envoyé avec succès:', {
          messageId: result.messageId,
          recipients: result.sentTo.length,
          employees: result.reportData.totalEmployees,
          punctuality: result.reportData.punctualityRate + '%',
          preparations: result.reportData.totalPreparations, // ✅ NOUVEAU
          agencies: result.reportData.preparationsByAgency // ✅ NOUVEAU
        });
        
      } catch (error) {
        console.error('❌ Erreur envoi rapport quotidien automatique:', error);
        
        // Tenter d'envoyer une alerte aux admins
        try {
          await this.sendErrorAlert('Rapport quotidien complet', error.message);
        } catch (alertError) {
          console.error('❌ Impossible d\'envoyer l\'alerte d\'erreur:', alertError);
        }
      }
    }, {
      scheduled: false, // Ne pas démarrer automatiquement
      timezone: "Europe/Paris"
    });

    this.jobs.set('dailyReport', dailyTask);
    console.log('📋 Tâche quotidienne programmée: tous les jours à 20h00 (avec véhicules)');
  }

  /**
   * ✅ NOUVEAU : Planifier un rapport hebdomadaire complet le dimanche à 18h00
   */
  scheduleWeeklyReport() {
    const weeklyTask = cron.schedule('0 18 * * 0', async () => {
      console.log('🕕 18h00 Dimanche - Déclenchement du rapport hebdomadaire COMPLET');
      
      try {
        // Calculer la période : semaine écoulée (lundi à dimanche)
        const endDate = new Date(); // Dimanche actuel
        endDate.setHours(23, 59, 59, 999);
        
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6); // Lundi de la semaine
        startDate.setHours(0, 0, 0, 0);
        
        console.log(`📅 Génération rapport pour: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`);
        
        // ✅ Utiliser la nouvelle fonction hebdomadaire avec préparations
        const result = await dailyReportService.generateAndSendWeeklyReport(startDate, endDate);
        
        console.log('✅ Rapport hebdomadaire complet envoyé avec succès:', {
          messageId: result.messageId,
          recipients: result.sentTo.length,
          period: result.reportData.period,
          totalPreparations: result.reportData.totalPreparations,
          agenciesActive: result.reportData.agenciesActive,
          employeesActive: result.reportData.employeesActive
        });
        
      } catch (error) {
        console.error('❌ Erreur rapport hebdomadaire complet:', error);
        await this.sendErrorAlert('Rapport hebdomadaire complet', error.message);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    this.jobs.set('weeklyReport', weeklyTask);
    console.log('📋 Tâche hebdomadaire programmée: dimanche à 18h00 (avec préparations par agence/employé)');
  }

  /**
   * Planifier des tâches de test (dev uniquement)
   */
  scheduleTestJobs() {
    if (process.env.NODE_ENV !== 'development') return;

    // Test toutes les 5 minutes en développement (désactivé par défaut)
    if (process.env.ENABLE_TEST_REPORTS === 'true') {
      const testDailyTask = cron.schedule('*/5 * * * *', async () => {
        console.log('🧪 Test automatique du rapport quotidien complet');
        try {
          await dailyReportService.testReport();
          console.log('✅ Test automatique quotidien réussi');
        } catch (error) {
          console.error('❌ Test automatique quotidien échoué:', error.message);
        }
      }, {
        scheduled: false,
        timezone: "Europe/Paris"
      });

      // Test rapport hebdomadaire (toutes les 10 minutes en dev)
      const testWeeklyTask = cron.schedule('*/10 * * * *', async () => {
        console.log('🧪 Test automatique du rapport hebdomadaire complet');
        try {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 7);
          
          await dailyReportService.generateAndSendWeeklyReport(startDate, endDate);
          console.log('✅ Test automatique hebdomadaire réussi');
        } catch (error) {
          console.error('❌ Test automatique hebdomadaire échoué:', error.message);
        }
      }, {
        scheduled: false,
        timezone: "Europe/Paris"
      });

      this.jobs.set('testDailyReport', testDailyTask);
      this.jobs.set('testWeeklyReport', testWeeklyTask);
      console.log('🧪 Tâches de test programmées:');
      console.log('   → Test quotidien: toutes les 5 minutes');
      console.log('   → Test hebdomadaire: toutes les 10 minutes');
    }
  }

  /**
   * ✅ NOUVEAU : Générer un rapport hebdomadaire manuel pour une période spécifique
   */
  async generateWeeklyReportManual(startDate, endDate) {
    try {
      console.log(`📊 Génération manuelle rapport hebdomadaire: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`);
      
      const result = await dailyReportService.generateAndSendWeeklyReport(startDate, endDate);
      
      console.log('✅ Rapport hebdomadaire manuel généré:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur génération manuelle rapport hebdomadaire:', error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Générer un rapport quotidien manuel pour une date spécifique
   */
  async generateDailyReportManual(date = new Date()) {
    try {
      console.log(`📊 Génération manuelle rapport quotidien: ${date.toLocaleDateString('fr-FR')}`);
      
      const result = await dailyReportService.generateAndSendDailyReport(date);
      
      console.log('✅ Rapport quotidien manuel généré:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur génération manuelle rapport quotidien:', error);
      throw error;
    }
  }

  /**
   * Démarrer toutes les tâches programmées
   */
  start() {
    if (!this.isInitialized) {
      console.warn('⚠️  Planificateur non initialisé - impossible de démarrer');
      return false;
    }

    console.log('🚀 Démarrage des tâches programmées...');
    
    let startedJobs = 0;
    this.jobs.forEach((job, name) => {
      try {
        job.start();
        startedJobs++;
        console.log(`✅ Tâche "${name}" démarrée`);
      } catch (error) {
        console.error(`❌ Erreur démarrage tâche "${name}":`, error.message);
      }
    });

    console.log(`🎯 ${startedJobs}/${this.jobs.size} tâche(s) démarrée(s) avec succès`);
    return startedJobs > 0;
  }

  /**
   * Arrêter toutes les tâches programmées
   */
  stop() {
    console.log('🛑 Arrêt des tâches programmées...');
    
    let stoppedJobs = 0;
    this.jobs.forEach((job, name) => {
      try {
        job.stop();
        stoppedJobs++;
        console.log(`⏹️  Tâche "${name}" arrêtée`);
      } catch (error) {
        console.error(`❌ Erreur arrêt tâche "${name}":`, error.message);
      }
    });

    console.log(`✅ ${stoppedJobs}/${this.jobs.size} tâche(s) arrêtée(s)`);
    this.isInitialized = false;
  }

  /**
   * Obtenir le statut de toutes les tâches
   */
  getStatus() {
    const status = {
      initialized: this.isInitialized,
      totalJobs: this.jobs.size,
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false
      };
    });

    return status;
  }

  /**
   * Envoyer une alerte d'erreur aux administrateurs
   */
  async sendErrorAlert(reportType, errorMessage) {
    try {
      const { createTransporter, getAdminEmails } = require('../services/emailService');
      
      const adminEmails = await getAdminEmails();
      if (adminEmails.length === 0) {
        console.warn('⚠️  Aucun admin pour recevoir l\'alerte d\'erreur');
        return;
      }

      const transporter = createTransporter();
      
      await transporter.sendMail({
        from: `"Système de Gestion Véhicules" <${process.env.EMAIL_USER}>`,
        to: adminEmails,
        subject: `🚨 Erreur Génération Rapport - ${reportType}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
              <h2>🚨 Erreur Système de Rapports</h2>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h3>Détails de l'erreur</h3>
              <p><strong>Type de rapport:</strong> ${reportType}</p>
              <p><strong>Date/Heure:</strong> ${new Date().toLocaleString('fr-FR')}</p>
              <p><strong>Message d'erreur:</strong></p>
              <pre style="background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; overflow-x: auto;">
${errorMessage}
              </pre>
              <hr>
              <p style="font-size: 12px; color: #666;">
                Veuillez vérifier la configuration du système et les logs du serveur.
              </p>
            </div>
          </div>
        `
      });

      console.log(`📧 Alerte d'erreur envoyée aux admins pour: ${reportType}`);
    } catch (emailError) {
      console.error('❌ Impossible d\'envoyer l\'alerte d\'erreur:', emailError.message);
    }
  }

  /**
   * ✅ NOUVEAU : Fonction de test complète du système
   */
  async testCompleteSystem() {
    try {
      console.log('🧪 TEST COMPLET DU SYSTÈME DE RAPPORTS');
      console.log('=====================================');
      
      // 1. Test initialisation
      console.log('\n1️⃣  Test initialisation...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Échec initialisation');
      }
      console.log('✅ Initialisation OK');

      // 2. Test rapport quotidien
      console.log('\n2️⃣  Test rapport quotidien...');
      const dailyResult = await this.generateDailyReportManual();
      console.log('✅ Rapport quotidien OK:', dailyResult.filename);

      // 3. Test rapport hebdomadaire
      console.log('\n3️⃣  Test rapport hebdomadaire...');
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      
      const weeklyResult = await this.generateWeeklyReportManual(startDate, endDate);
      console.log('✅ Rapport hebdomadaire OK:', weeklyResult.filename);

      // 4. Test démarrage planificateur
      console.log('\n4️⃣  Test démarrage planificateur...');
      const started = this.start();
      if (!started) {
        throw new Error('Échec démarrage planificateur');
      }
      console.log('✅ Planificateur démarré OK');

      // 5. Afficher le statut
      console.log('\n5️⃣  Statut final:');
      const status = this.getStatus();
      console.log(JSON.stringify(status, null, 2));

      console.log('\n🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
      console.log('📋 Le système de rapports complets est opérationnel');
      
      return {
        success: true,
        dailyReport: dailyResult,
        weeklyReport: weeklyResult,
        status
      };

    } catch (error) {
      console.error('\n❌ ÉCHEC DU TEST COMPLET:', error.message);
      throw error;
    }
  }
}

module.exports = new DailyReportScheduler();