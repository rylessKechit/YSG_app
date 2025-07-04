// ===== backend/src/config/database.js - VERSION OPTIMISÉE MOBILE =====

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI non défini dans les variables d\'environnement');
    }

    // ✅ Options optimisées pour les connexions mobiles
    const options = {
      maxPoolSize: 10,
      
      // 🔥 CONFIGURATION MOBILE - Timeouts plus longs
      serverSelectionTimeoutMS: 30000,    // 30s au lieu de 5s
      socketTimeoutMS: 60000,              // 60s au lieu de 45s
      connectTimeoutMS: 30000,             // 30s pour la connexion initiale
      
      // ✅ Options de résilience réseau
      maxIdleTimeMS: 30000,                // Fermer connexions inactives après 30s
      heartbeatFrequencyMS: 10000,         // Vérification toutes les 10s
      
      // ✅ Retry automatique
      retryWrites: true,
      retryReads: true,
      
      // ✅ Compression pour réseaux lents
      compressors: ['zlib'],
      
      // ✅ Priorité de lecture pour la latence
      readPreference: 'primaryPreferred'
    };

    console.log('🔌 Tentative de connexion à MongoDB...');
    console.log(`📡 Timeout serveur: ${options.serverSelectionTimeoutMS/1000}s`);
    
    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`🌍 Base de données: ${conn.connection.name}`);
    
    // Logs d'événements avec plus de détails
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose connecté à MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err.message);
      console.error('🔍 Code erreur:', err.code);
      
      // Diagnostic spécifique pour erreurs réseau
      if (err.code === 'ENOTFOUND') {
        console.error('🌐 Problème DNS - Vérifiez votre connexion internet');
      } else if (err.code === 'ECONNREFUSED') {
        console.error('🚫 Connexion refusée - Vérifiez l\'URL MongoDB');
      } else if (err.name === 'MongoServerSelectionError') {
        console.error('⏱️  Timeout serveur - Connexion trop lente ou MongoDB indisponible');
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📡 Mongoose déconnecté de MongoDB');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 Mongoose reconnecté à MongoDB');
    });

    // Gestion gracieuse de l'arrêt
    const gracefulShutdown = async (signal) => {
      console.log(`🛑 ${signal} reçu. Fermeture connexion MongoDB...`);
      try {
        await mongoose.connection.close();
        console.log('🔒 Connexion MongoDB fermée proprement');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erreur fermeture MongoDB:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    console.error('🔍 Détails:', error);
    
    // En développement, plus de détails de debug
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Continuation en mode développement sans DB');
      console.log('💡 Vérifiez:');
      console.log('   - MONGODB_URI dans votre .env');
      console.log('   - Connexion internet');
      console.log('   - Configuration MongoDB Atlas (whitelist IP)');
      return;
    }
    
    // En production, on arrête tout
    console.error('🛑 Arrêt du serveur en production sans DB');
    process.exit(1);
  }
};

// ✅ Fonction de test de connexion
const testConnection = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    console.log('🏓 Test ping MongoDB: OK');
    return true;
  } catch (error) {
    console.error('❌ Test ping MongoDB: ÉCHEC', error.message);
    return false;
  }
};

module.exports = { connectDB, testConnection };