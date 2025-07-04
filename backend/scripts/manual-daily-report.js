const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function runDailyReport() {
  try {
    console.log('🚀 Démarrage du script de rapport quotidien manuel');
    
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    // Import du service
    const dailyReportService = require('../src/services/dailyReportService');
    
    // Initialiser le service
    const initialized = await dailyReportService.initialize();
    if (!initialized) {
      throw new Error('Service email non configuré ou aucun admin trouvé en BDD');
    }
    
    // Générer et envoyer le rapport
    const date = process.argv[2] ? new Date(process.argv[2]) : new Date();
    console.log(`📊 Génération du rapport pour: ${date.toLocaleDateString('fr-FR')}`);
    
    const result = await dailyReportService.generateAndSendDailyReport(date);
    
    console.log('✅ Rapport envoyé avec succès:');
    console.log(`   📧 Message ID: ${result.messageId}`);
    console.log(`   👥 Destinataires: ${result.sentTo.join(', ')}`);
    console.log(`   📊 Employés: ${result.reportData.totalEmployees}`);
    console.log(`   ⏰ Ponctualité: ${result.reportData.punctualityRate}%`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Connexion fermée');
    process.exit(0);
  }
}

if (require.main === module) {
  runDailyReport();
}

// ===== USAGE =====
/*
# Rapport pour aujourd'hui
node scripts/manual-daily-report.js

# Rapport pour une date spécifique
node scripts/manual-daily-report.js 2024-01-15
*/