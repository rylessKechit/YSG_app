// backend/scripts/test-alerts-manual.js
// ✅ NOUVEAU FICHIER - Script pour tester manuellement les alertes

require('dotenv').config();
const mongoose = require('mongoose');

// Imports des jobs
const { checkLateTimesheets, getAdminEmails } = require('../src/jobs/checkLateTimesheets');
const lateAlertsScheduler = require('../src/jobs/lateAlertsScheduler');

async function testAlertsSystem() {
  try {
    console.log('🧪 DÉBUT DU TEST SYSTÈME D\'ALERTES');
    console.log('==================================');
    
    // Connexion à la base
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion MongoDB réussie');
    
    // 1. Test configuration email
    console.log('\n📧 ÉTAPE 1: Test configuration email');
    console.log('------------------------------------');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('❌ ERREUR: Configuration email manquante');
      console.log('   → Ajoutez EMAIL_USER et EMAIL_PASS dans .env');
      return;
    }
    
    console.log(`✅ Email configuré: ${process.env.EMAIL_USER}`);
    
    // 2. Test récupération emails admins
    console.log('\n👥 ÉTAPE 2: Test récupération emails admins');
    console.log('--------------------------------------------');
    
    const { emails, users } = await getAdminEmails();
    
    if (emails.length === 0) {
      console.log('❌ ERREUR: Aucun admin trouvé en base');
      console.log('   → Créez un utilisateur admin avec email valide');
      return;
    }
    
    console.log(`✅ ${emails.length} admin(s) trouvé(s):`);
    users.forEach(admin => {
      console.log(`   • ${admin.firstName} ${admin.lastName} (${admin.email})`);
    });
    
    // 3. Test initialisation planificateur
    console.log('\n⚙️  ÉTAPE 3: Test initialisation planificateur');
    console.log('-----------------------------------------------');
    
    const initialized = await lateAlertsScheduler.initialize();
    
    if (!initialized) {
      console.log('❌ ERREUR: Planificateur non initialisé');
      return;
    }
    
    console.log('✅ Planificateur initialisé avec succès');
    
    // 4. Test vérification des données
    console.log('\n📊 ÉTAPE 4: Vérification des données');
    console.log('-----------------------------------');
    
    const User = require('../src/models/User');
    const Schedule = require('../src/models/Schedule');
    const Timesheet = require('../src/models/Timesheet');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [totalUsers, todaySchedules, todayTimesheets] = await Promise.all([
      User.countDocuments({ role: 'preparateur', isActive: true }),
      Schedule.countDocuments({ 
        date: { $gte: today, $lt: tomorrow }, 
        status: 'active' 
      }),
      Timesheet.countDocuments({ 
        date: { $gte: today, $lt: tomorrow } 
      })
    ]);
    
    console.log(`📊 Préparateurs actifs: ${totalUsers}`);
    console.log(`📊 Plannings aujourd'hui: ${todaySchedules}`);
    console.log(`📊 Pointages aujourd'hui: ${todayTimesheets}`);
    
    if (todaySchedules === 0) {
      console.log('⚠️  ATTENTION: Aucun planning pour aujourd\'hui');
      console.log('   → Les tests de retard ne donneront aucun résultat');
      console.log('   → Créez des plannings dans l\'admin-app pour tester');
    }
    
    // 5. Test exécution manuelle des vérifications
    console.log('\n🔍 ÉTAPE 5: Test exécution des vérifications');
    console.log('--------------------------------------------');
    
    console.log('🔍 Test vérification retards...');
    const overdueCount = await lateAlertsScheduler.runManually('latecomers');
    console.log(`   Résultat: ${overdueCount} employé(s) en retard`);
    
    console.log('🔍 Test vérification préparations longues...');
    const overtimeCount = await lateAlertsScheduler.runManually('overtimePreparations');
    console.log(`   Résultat: ${overtimeCount} alerte(s) envoyée(s)`);
    
    console.log('🔍 Test vérification fins de service...');
    const missingCount = await lateAlertsScheduler.runManually('missingClockOuts');
    console.log(`   Résultat: ${missingCount} fin(s) manquante(s)`);
    
    // 6. Test email de validation (optionnel)
    if (process.argv.includes('--send-test-email')) {
      console.log('\n📤 ÉTAPE 6: Test envoi email');
      console.log('----------------------------');
      
      try {
        const { sendAlertEmail } = require('../src/jobs/checkLateTimesheets');
        
        await sendAlertEmail({
          type: 'late_start',
          employee: {
            firstName: 'Test',
            lastName: 'Utilisateur',
            email: 'test@example.com'
          },
          agency: {
            name: 'Agence Test',
            code: 'TEST'
          },
          delayMinutes: 35,
          scheduledTime: '08:00',
          currentTime: '08:35'
        });
        
        console.log('✅ Email de test envoyé avec succès');
        
      } catch (emailError) {
        console.log('❌ Erreur envoi email de test:', emailError.message);
      }
    }
    
    // 7. Résumé final
    console.log('\n🎯 RÉSUMÉ DU TEST');
    console.log('=================');
    
    const allGood = emails.length > 0 && initialized && process.env.EMAIL_USER;
    
    if (allGood) {
      console.log('✅ Système d\'alertes opérationnel !');
      console.log('');
      console.log('📋 Prochaines étapes:');
      console.log('   1. Redémarrez votre serveur backend');
      console.log('   2. Vérifiez les logs au démarrage');
      console.log('   3. Créez des plannings dans l\'admin-app');
      console.log('   4. Attendez 5 minutes pour voir les alertes');
      console.log('');
      console.log('🔧 Pour tester immédiatement:');
      console.log('   → GET http://localhost:4000/api/test/alerts');
      
    } else {
      console.log('❌ Problèmes détectés dans le système');
      
      if (emails.length === 0) {
        console.log('   → Créez un utilisateur admin en base');
      }
      if (!initialized) {
        console.log('   → Vérifiez la configuration email');
      }
      if (!process.env.EMAIL_USER) {
        console.log('   → Configurez EMAIL_USER/EMAIL_PASS dans .env');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur pendant les tests:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  testAlertsSystem();
}

// ===== USAGE =====
/*
# Test complet
node scripts/test-alerts-manual.js

# Test avec envoi d'email de validation
node scripts/test-alerts-manual.js --send-test-email
*/