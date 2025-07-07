// ===== SCRIPT MANUEL RAPPORTS QUOTIDIENS AMÉLIORÉS =====
// backend/scripts/manual-daily-report.js - VERSION COMPLÈTE

require('dotenv').config();
const mongoose = require('mongoose');

async function runDailyReport() {
  try {
    console.log('🚀 Démarrage du script de rapport quotidien COMPLET (avec véhicules)');
    
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    // Import du service amélioré
    const dailyReportService = require('../src/services/dailyReportService');
    
    // Initialiser le service
    const initialized = await dailyReportService.initialize();
    if (!initialized) {
      throw new Error('Service email non configuré ou aucun admin trouvé en BDD');
    }
    
    // Déterminer la date
    const date = process.argv[2] ? new Date(process.argv[2]) : new Date();
    console.log(`📊 Génération du rapport COMPLET pour: ${date.toLocaleDateString('fr-FR')}`);
    
    // Générer et envoyer le rapport avec véhicules
    const result = await dailyReportService.generateAndSendDailyReport(date);
    
    console.log('\n✅ RAPPORT QUOTIDIEN COMPLET ENVOYÉ AVEC SUCCÈS !');
    console.log('================================================');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`👥 Destinataires: ${result.sentTo.join(', ')}`);
    console.log(`📊 Employés prévus: ${result.reportData.totalEmployees}`);
    console.log(`📈 Présents: ${result.reportData.presentCount}`);
    console.log(`⏰ Ponctualité: ${result.reportData.punctualityRate}%`);
    console.log(`🚗 Préparations: ${result.reportData.totalPreparations}`); // ✅ NOUVEAU
    console.log(`🏢 Agences actives: ${result.reportData.preparationsByAgency}`); // ✅ NOUVEAU
    console.log(`📎 Fichier: ${result.filename}`);
    
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

module.exports = { runDailyReport };

// ===== USAGE =====
/*
# Rapport pour aujourd'hui
node scripts/manual-daily-report.js

# Rapport pour une date spécifique  
node scripts/manual-daily-report.js 2024-01-15
*/