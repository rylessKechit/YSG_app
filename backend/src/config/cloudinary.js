const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Vérifier la configuration au démarrage
const verifyCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  
  if (!cloud_name || !api_key || !api_secret) {
    console.warn('⚠️  Configuration Cloudinary incomplète');
    console.warn('   Vérifiez vos variables d\'environnement:');
    console.warn('   - CLOUDINARY_CLOUD_NAME');
    console.warn('   - CLOUDINARY_API_KEY');
    console.warn('   - CLOUDINARY_API_SECRET');
    return false;
  }
  
  console.log('✅ Configuration Cloudinary OK');
  return true;
};

// Test de connexion (optionnel)
const testCloudinaryConnection = async () => {
  try {
    await cloudinary.api.ping();
    console.log('📡 Connexion Cloudinary testée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur connexion Cloudinary:', error.message);
    return false;
  }
};

module.exports = {
  cloudinary,
  verifyCloudinaryConfig,
  testCloudinaryConnection
};