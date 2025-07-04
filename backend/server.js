// ===== backend/server.js - VERSION CORRIGÉE =====

require('dotenv').config();
const app = require('./src/app');

// ✅ CORRECTION: Import destructuré car database.js exporte maintenant { connectDB, testConnection }
const { connectDB } = require('./src/config/database');

// Connexion à la base de données
connectDB();

// Démarrage du serveur
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌍 Mode: ${process.env.NODE_ENV}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Configuré' : 'Non configuré'}`);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT reçu. Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = server;