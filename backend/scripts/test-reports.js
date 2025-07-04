const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function testReports() {
  try {
    console.log('🧪 Démarrage des tests de rapports');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    // Test 1: Configuration email
    console.log('\n📧 Test 1: Configuration email');
    const { verifyEmailConfig, getAdminEmails } = require('../src/services/emailService');
    
    const emailConfigured = await verifyEmailConfig();
    console.log(`   Email configuré: ${emailConfigured ? '✅' : '❌'}`);
    
    const adminEmails = await getAdminEmails();
    console.log(`   Emails admin: ${adminEmails.length > 0 ? '✅' : '❌'} (${adminEmails.length})`);
    console.log(`   Liste: ${adminEmails.join(', ')}`);
    
    if (!emailConfigured) {
      console.log('   ⚠️  Vérifiez EMAIL_USER et EMAIL_PASS dans .env');
    }
    
    if (adminEmails.length === 0) {
      console.log('   ⚠️  Créez au moins un utilisateur avec role="admin" et isActive=true en BDD');
    }
    
    // Test 2: Données disponibles
    console.log('\n📊 Test 2: Disponibilité des données');
    const User = require('../src/models/User');
    const Agency = require('../src/models/Agency');
    const Timesheet = require('../src/models/Timesheet');
    const Schedule = require('../src/models/Schedule');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usersCount = await User.countDocuments({ role: 'preparateur', isActive: true });
    const agenciesCount = await Agency.countDocuments({ isActive: true });
    const schedulesToday = await Schedule.countDocuments({ date: today });
    const timesheetsToday = await Timesheet.countDocuments({ date: today });
    
    console.log(`   Préparateurs actifs: ${usersCount}`);
    console.log(`   Agences actives: ${agenciesCount}`);
    console.log(`   Plannings aujourd'hui: ${schedulesToday}`);
    console.log(`   Pointages aujourd'hui: ${timesheetsToday}`);
    
    if (schedulesToday === 0) {
      console.log('   ⚠️  Aucun planning aujourd\'hui - le rapport sera vide');
      console.log('   💡 Utilisez: npm run reports:create-data pour créer des données de test');
    }
    
    // Test 3: Service de rapport
    console.log('\n🔧 Test 3: Service de rapport');
    const dailyReportService = require('../src/services/dailyReportService');
    
    const serviceInitialized = await dailyReportService.initialize();
    console.log(`   Service initialisé: ${serviceInitialized ? '✅' : '❌'}`);
    
    if (serviceInitialized) {
      try {
        const reportData = await dailyReportService.getDailyData();
        console.log(`   Données récupérées: ✅`);
        console.log(`   Employés prévus: ${reportData.totalEmployes}`);
        console.log(`   Employés présents: ${reportData.presentsCount}`);
        console.log(`   Taux de ponctualité: ${reportData.ponctualiteRate}%`);
        
        const workbook = await dailyReportService.createExcelReport(reportData);
        console.log(`   Fichier Excel créé: ✅`);
        console.log(`   Feuilles: ${workbook.worksheets.length}`);
        
      } catch (error) {
        console.log(`   Erreur génération: ❌`);
        console.log(`   Détail: ${error.message}`);
      }
    }
    
    // Test 4: Planificateur
    console.log('\n📅 Test 4: Planificateur CRON');
    const dailyReportScheduler = require('../src/jobs/dailyReportScheduler');
    
    const schedulerInitialized = await dailyReportScheduler.initialize();
    console.log(`   Planificateur initialisé: ${schedulerInitialized ? '✅' : '❌'}`);
    
    if (schedulerInitialized) {
      const status = dailyReportScheduler.getStatus();
      console.log(`   Tâches configurées: ${Object.keys(status).length}`);
      Object.entries(status).forEach(([name, info]) => {
        console.log(`   - ${name}: ${info.scheduled ? 'programmé' : 'non programmé'}`);
      });
    }
    
    // Test 5: Envoi d'email de test (optionnel)
    if (process.argv.includes('--send-test') && emailConfigured && adminEmails.length > 0) {
      console.log('\n📤 Test 5: Envoi d\'email de test');
      try {
        const { sendTestEmail } = require('../src/services/emailService');
        const result = await sendTestEmail();
        
        if (result.success) {
          console.log(`   Email de test envoyé: ✅`);
          console.log(`   Message ID: ${result.messageId}`);
          console.log(`   Destinataires: ${result.sentTo.join(', ')}`);
        } else {
          console.log(`   Erreur envoi: ❌`);
          console.log(`   Détail: ${result.error}`);
        }
      } catch (error) {
        console.log(`   Erreur envoi: ❌`);
        console.log(`   Détail: ${error.message}`);
      }
    }
    
    // Résumé final
    console.log('\n🎯 RÉSUMÉ DES TESTS');
    const allGood = emailConfigured && adminEmails.length > 0 && serviceInitialized && schedulerInitialized;
    
    if (allGood) {
      console.log('✅ Tous les tests sont au vert !');
      console.log('🚀 Le système de rapports automatiques est prêt');
      console.log('');
      console.log('📋 Prochaines étapes:');
      console.log('   1. Vérifier que le serveur démarre sans erreur');
      console.log('   2. Tester un rapport manuel: npm run reports:daily');
      console.log('   3. Surveiller les logs à 20h00 pour le premier rapport automatique');
    } else {
      console.log('❌ Certains tests ont échoué');
      console.log('🔧 Vérifiez la configuration avant de démarrer le système');
      
      if (!emailConfigured) console.log('   → Configurez EMAIL_USER et EMAIL_PASS dans .env');
      if (adminEmails.length === 0) console.log('   → Créez un utilisateur admin en BDD');
      if (!serviceInitialized) console.log('   → Vérifiez la configuration email');
      if (!schedulerInitialized) console.log('   → Vérifiez ENABLE_DAILY_REPORTS dans .env');
    }
    
  } catch (error) {
    console.error('❌ Erreur pendant les tests:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  testReports();
}

// ===== USAGE =====
/*
# Tests complets
node scripts/test-reports.js

# Tests avec envoi d'email de test
node scripts/test-reports.js --send-test
*/