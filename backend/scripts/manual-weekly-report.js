const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function runWeeklyReport() {
  try {
    console.log('🚀 Démarrage du script de rapport hebdomadaire manuel');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    const dailyReportScheduler = require('../src/jobs/dailyReportScheduler');
    
    // Calculer les dates (semaine dernière par défaut)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    console.log(`📈 Génération du rapport hebdomadaire:`);
    console.log(`   📅 Du: ${startDate.toLocaleDateString('fr-FR')}`);
    console.log(`   📅 Au: ${endDate.toLocaleDateString('fr-FR')}`);
    
    const result = await dailyReportScheduler.generateWeeklyReport(startDate, endDate);
    
    console.log('✅ Rapport hebdomadaire envoyé avec succès:');
    console.log(`   📊 Jours: ${result.summary.totalDays}`);
    console.log(`   👥 Employés: ${result.summary.uniqueEmployees}`);
    console.log(`   ⏰ Ponctualité moyenne: ${Math.round(result.summary.avgPunctualityRate)}%`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  runWeeklyReport();
}