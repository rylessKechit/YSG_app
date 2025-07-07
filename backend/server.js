// backend/server.js - AJOUTS MINIMAUX SEULEMENT
// ✅ Gardez votre code existant et ajoutez juste ces parties

require('dotenv').config();
const app = require('./src/app');

// ✅ AJOUT 1: Import du planificateur d'alertes
const lateAlertsScheduler = require('./src/jobs/lateAlertsScheduler');

// Import existant de database
const { connectDB } = require('./src/config/database');

// Connexion à la base de données (votre code existant)
connectDB();

// ✅ AJOUT 2: Fonction d'initialisation des alertes
async function initializeAlerts() {
  try {
    console.log('🚨 Initialisation système d\'alertes...');
    const alertsInitialized = await lateAlertsScheduler.initialize();
    
    if (alertsInitialized) {
      lateAlertsScheduler.start();
      console.log('✅ Alertes de retard activées');
      console.log('   → Vérifications toutes les 5min (6h-22h)');
    } else {
      console.log('⚠️  Alertes désactivées (config email manquante)');
    }
  } catch (error) {
    console.error('❌ Erreur alertes:', error.message);
  }
}

// Démarrage du serveur (votre code existant)
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, async () => { // ✅ AJOUT: async
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Mode: ${process.env.NODE_ENV}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Configuré' : 'Non configuré'}`);
  
  // ✅ AJOUT 3: Démarrer les alertes après le serveur
  await initializeAlerts();
});

// ✅ AJOUT 4: Route de test (optionnel, dev uniquement)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test/alerts', async (req, res) => {
    try {
      const result = await lateAlertsScheduler.runManually('all');
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

// ✅ AJOUT 5: Arrêt propre des alertes
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM reçu. Arrêt du serveur...');
  if (lateAlertsScheduler.isInitialized) {
    lateAlertsScheduler.stop(); // ✅ AJOUT: Arrêter les alertes
  }
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT reçu. Arrêt du serveur...');
  if (lateAlertsScheduler.isInitialized) {
    lateAlertsScheduler.stop(); // ✅ AJOUT: Arrêter les alertes
  }
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

// Votre code existant pour les erreurs...
process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;