// ===== SCRIPT MANUEL RAPPORTS HEBDOMADAIRES AMÉLIORÉS =====
// backend/scripts/manual-weekly-report.js - VERSION COMPLÈTE

require('dotenv').config();
const mongoose = require('mongoose');

async function runWeeklyReport() {
  try {
    console.log('🚀 Démarrage du script de rapport hebdomadaire COMPLET');
    console.log('   📋 Préparations par agence + par employé');
    
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
    
    // Déterminer la période
    let startDate, endDate;
    
    if (process.argv[2] && process.argv[3]) {
      // Période personnalisée
      startDate = new Date(process.argv[2]);
      endDate = new Date(process.argv[3]);
    } else if (process.argv[2]) {
      // Semaine spécifique (date de début fournie)
      startDate = new Date(process.argv[2]);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      // Semaine écoulée par défaut (lundi à dimanche)
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      // Trouver le lundi de la semaine écoulée
      const dayOfWeek = endDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche, reculer de 6 jours
      
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - daysToSubtract - 6); // -6 pour avoir la semaine d'avant
      startDate.setHours(0, 0, 0, 0);
    }
    
    console.log(`📅 Période du rapport: ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`);
    
    // Générer et envoyer le rapport hebdomadaire avec préparations
    const result = await dailyReportService.generateAndSendWeeklyReport(startDate, endDate);
    
    console.log('\n✅ RAPPORT HEBDOMADAIRE COMPLET ENVOYÉ AVEC SUCCÈS !');
    console.log('===================================================');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`👥 Destinataires: ${result.sentTo.join(', ')}`);
    console.log(`📅 Période: ${result.reportData.period}`);
    console.log(`🚗 Total préparations: ${result.reportData.totalPreparations}`);
    console.log(`🏢 Agences actives: ${result.reportData.agenciesActive}`);
    console.log(`👨‍🔧 Employés avec préparations: ${result.reportData.employeesActive}`);
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
  runWeeklyReport();
}

module.exports = { runWeeklyReport };

// ===== USAGE =====
/*
# Rapport pour la semaine écoulée (automatique)
node scripts/manual-weekly-report.js

# Rapport pour une semaine spécifique (à partir d'une date de début)
node scripts/manual-weekly-report.js 2024-01-15

# Rapport pour une période personnalisée
node scripts/manual-weekly-report.js 2024-01-15 2024-01-21
*/