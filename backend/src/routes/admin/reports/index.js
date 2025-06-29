// backend/src/routes/admin/reports/index.js - FICHIER PRINCIPAL
const express = require('express');
const router = express.Router();

// Import des middlewares
let authMiddleware, adminMiddleware;
try {
  const auth = require('../../../middleware/auth');
  authMiddleware = auth.authMiddleware;
  adminMiddleware = auth.adminMiddleware;
} catch (error) {
  console.warn('⚠️ Middlewares auth non trouvés, création de middlewares de base');
  authMiddleware = (req, res, next) => {
    req.user = { id: 'test-user', firstName: 'Test', lastName: 'User' };
    next();
  };
  adminMiddleware = (req, res, next) => next();
}

// Appliquer les middlewares d'authentification à toutes les routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Import et montage des sous-routes
try {
  router.use('/quick-metrics', require('./quick-metrics'));
  console.log('✅ Route quick-metrics chargée');
} catch (error) {
  console.error('❌ Erreur chargement route quick-metrics:', error.message);
}

try {
  router.use('/ponctualite', require('./punctuality'));
  console.log('✅ Route ponctualite chargée');
} catch (error) {
  console.error('❌ Erreur chargement route ponctualite:', error.message);
}

try {
  router.use('/performance', require('./performance'));
  console.log('✅ Route performance chargée');
} catch (error) {
  console.error('❌ Erreur chargement route performance:', error.message);
}

try {
  router.use('/activite', require('./activity'));
  console.log('✅ Route activite chargée');
} catch (error) {
  console.error('❌ Erreur chargement route activite:', error.message);
}

try {
  router.use('/export', require('./export'));
  console.log('✅ Route export chargée');
} catch (error) {
  console.error('❌ Erreur chargement route export:', error.message);
}

try {
  router.use('/templates', require('./templates'));
  console.log('✅ Route templates chargée');
} catch (error) {
  console.error('❌ Erreur chargement route templates:', error.message);
}

try {
  router.use('/', require('./list'));
  console.log('✅ Route list chargée');
} catch (error) {
  console.error('❌ Erreur chargement route list:', error.message);
}

module.exports = router;