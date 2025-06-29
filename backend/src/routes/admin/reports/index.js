// backend/src/routes/admin/reports/index.js - VERSION CORRIGÉE
const express = require('express');
const router = express.Router();

// ✅ CORRECTION: Import des bons middlewares
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');

// ✅ Application des middlewares corrects
router.use(auth);      // Authentification
router.use(adminAuth); // Vérification admin

// Import et montage des sous-routes avec gestion d'erreurs améliorée
const routes = [
  { path: '/quick-metrics', file: './quick-metrics', name: 'quick-metrics' },
  { path: '/ponctualite', file: './punctuality', name: 'ponctualite' },
  { path: '/performance', file: './performance', name: 'performance' },
  { path: '/activite', file: './activity', name: 'activite' },
  { path: '/export', file: './export', name: 'export' },
  { path: '/templates', file: './templates', name: 'templates' },
  { path: '/', file: './list', name: 'list' }
];

routes.forEach(({ path, file, name }) => {
  try {
    router.use(path, require(file));
    console.log(`✅ Route ${name} chargée`);
  } catch (error) {
    console.error(`❌ Erreur chargement route ${name}:`, error.message);
    console.error(`   Fichier: ${file}`);
    
    // Route de fallback pour éviter le crash
    router.use(path, (req, res) => {
      res.status(503).json({
        success: false,
        message: `Service ${name} temporairement indisponible`,
        error: `Module ${file} non trouvé`
      });
    });
  }
});

module.exports = router;