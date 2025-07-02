// backend/src/routes/admin/timesheets/index.js - VERSION CORRIGÉE
const express = require('express');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');

const router = express.Router();

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

// ===== ORDRE CRITIQUE DES ROUTES =====
// Les routes spécifiques DOIVENT être définies AVANT les routes dynamiques (:id)

try {
  // 1. Routes de comparaison (AVANT /:id)
  router.use('/compare', require('./comparison'));
  console.log('✅ Routes timesheets comparison chargées');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes timesheets comparison:', error.message);
}

try {
  // 2. Routes de statistiques (AVANT /:id)
  router.use('/stats', require('./stats'));
  console.log('✅ Routes timesheets stats chargées');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes timesheets stats:', error.message);
}

try {
  // 3. CRUD principal (inclut /:id - DOIT être en DERNIER)
  router.use('/', require('./crud'));
  console.log('✅ Routes timesheets CRUD chargées');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes timesheets CRUD:', error.message);
}

module.exports = router;