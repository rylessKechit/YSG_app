// backend/src/routes/admin/timesheets/index.js - POINT D'ENTRÉE PRINCIPAL
const express = require('express');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');

const router = express.Router();

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

// Routes principales (pattern identique à users/index.js et agencies/index.js)
try {
  // CRUD basique
  router.use('/', require('./crud'));
  console.log('✅ Routes timesheets CRUD chargées');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes timesheets CRUD:', error.message);
}

try {
  // Comparaison planning vs pointage
  router.use('/compare', require('./comparison'));
  console.log('✅ Routes timesheets comparison chargées');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes timesheets comparison:', error.message);
}

try {
  // Statistiques
  router.use('/stats', require('./stats'));
  console.log('✅ Routes timesheets stats chargées');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes timesheets stats:', error.message);
}

module.exports = router;