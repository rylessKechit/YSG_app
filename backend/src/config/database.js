const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI non défini dans les variables d\'environnement');
    }

    // ✅ Options de connexion minimales et compatibles
    const options = {
      maxPoolSize: 10, // Maximum 10 connexions dans le pool
      serverSelectionTimeoutMS: 5000, // Timeout après 5s si pas de serveur
      socketTimeoutMS: 45000 // Fermer les sockets après 45s d'inactivité
      
      // ❌ SUPPRIMÉ: toutes les options de buffering obsolètes
      // Les versions récentes de Mongoose gèrent ça automatiquement
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    
    // Logs des événements de connexion
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose connecté à MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err);
      // ✅ Ne pas crash le serveur, juste logger
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📡 Mongoose déconnecté de MongoDB');
    });

    // Fermeture propre en cas d'arrêt de l'application
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔒 Connexion MongoDB fermée');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erreur fermeture MongoDB:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    
    // ✅ En développement, permettre de continuer sans DB pour les tests
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Continuation en mode développement sans DB');
      return;
    }
    
    // En production, on arrête tout
    console.error('🛑 Arrêt du serveur en production sans DB');
    process.exit(1);
  }
};

module.exports = connectDB;