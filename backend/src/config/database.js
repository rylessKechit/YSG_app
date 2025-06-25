const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI non défini dans les variables d\'environnement');
    }

    const options = {
      // Options de connexion optimisées
      maxPoolSize: 10, // Maximum 10 connexions dans le pool
      serverSelectionTimeoutMS: 5000, // Timeout après 5s si pas de serveur
      socketTimeoutMS: 45000, // Fermer les sockets après 45s d'inactivité
      bufferMaxEntries: 0, // Désactiver mongoose buffering
      bufferCommands: false // Désactiver mongoose buffering
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    
    // Logs des événements de connexion
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose connecté à MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📡 Mongoose déconnecté de MongoDB');
    });

    // Fermeture propre en cas d'arrêt de l'application
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔒 Connexion MongoDB fermée');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    
    // En développement, on peut continuer sans DB pour tester
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️  Continuation en mode développement sans DB');
      return;
    }
    
    // En production, on arrête tout
    process.exit(1);
  }
};

module.exports = connectDB;