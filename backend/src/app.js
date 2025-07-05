// backend/src/app.js
// ✅ Configuration Express corrigée avec gestion d'erreurs améliorée

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ===== MIDDLEWARES DE BASE =====

// Sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Limitation du taux de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limite chaque IP à 1000 requêtes par fenêtre
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== ROUTES DE SANTÉ =====

// Route de santé générale
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Serveur opérationnel',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }
  });
});

// Route API de base
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API YSG opérationnelle',
    data: {
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        admin: '/api/admin',
        preparateur: {
          preparations: '/api/preparations',
          timesheets: '/api/timesheets',
          profile: '/api/profile'
        }
      }
    }
  });
});

// ===== ROUTES D'AUTHENTIFICATION =====

try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Routes auth chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes auth:', error.message);
}

// ===== ROUTES ADMIN =====

try {
  // Users - ✅ CORRIGÉ: Utilise le nouveau fichier index.js
  app.use('/api/admin/users', require('./routes/admin/users/index'));
  console.log('✅ Routes admin/users chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes admin/users:', error.message);
  
  // Route de fallback pour éviter le crash complet
  app.use('/api/admin/users', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service utilisateurs temporairement indisponible',
      error: 'Module routes/admin/users/index non trouvé'
    });
  });
}

try {
  // Agencies
  app.use('/api/admin/agencies', require('./routes/admin/agencies'));
  console.log('✅ Routes admin/agencies chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/agencies:', error.message);
}

try {
  // Schedules - ✅ CORRIGÉ: Utilise le nouveau fichier index.js
  app.use('/api/admin/schedules', require('./routes/admin/schedules/index'));
  console.log('✅ Routes admin/schedules chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes admin/schedules:', error.message);
  
  // Route de fallback pour éviter le crash complet
  app.use('/api/admin/schedules', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service plannings temporairement indisponible',
      error: 'Module routes/admin/schedules/index non trouvé'
    });
  });
}

try {
  // Timesheets
  app.use('/api/admin/timesheets', require('./routes/admin/timesheets/index'));
  console.log('✅ Routes admin/timesheets chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/timesheets:', error.message);
}

try {
  // Preparations admin
  app.use('/api/admin/preparations', require('./routes/preparateur/preparations'));
  console.log('✅ Routes admin/preparations chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/preparations:', error.message);
}

try {
  // Dashboard
  app.use('/api/admin/dashboard/overview', require('./routes/admin/dashboard/overview'));
  app.use('/api/admin/dashboard/charts', require('./routes/admin/dashboard/charts'));
  app.use('/api/admin/dashboard/alerts', require('./routes/admin/dashboard/alerts'));
  console.log('✅ Routes admin/dashboard chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/dashboard:', error.message);
}

try {
  // Reports
  app.use('/api/admin/reports', require('./routes/admin/reports/index'));
  console.log('✅ Routes admin/reports chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/reports:', error.message);
}

// ===== ROUTES PRÉPARATEUR =====

try {
  // Timesheets préparateur
  app.use('/api/timesheets', require('./routes/preparateur/timesheets'));
  console.log('✅ Routes timesheets chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes timesheets:', error.message);
}

try {
  // Preparations préparateur
  app.use('/api/preparations', require('./routes/preparateur/preparations'));
  console.log('✅ Routes preparations chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes preparations:', error.message);
}

try {
  // Profile préparateur
  app.use('/api/profile', require('./routes/preparateur/profile'));
  console.log('✅ Routes profile chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes profile:', error.message);
}

// ===== GESTION DES ERREURS =====

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    data: {
      method: req.method,
      url: req.originalUrl,
      availableEndpoints: [
        '/api/auth/*',
        '/api/admin/*',
        '/api/timesheets/*',
        '/api/preparations/*',
        '/api/profile/*'
      ]
    }
  });
});

// Middleware de gestion globale des erreurs
app.use((error, req, res, next) => {
  console.error('❌ Erreur non gérée:', error);
  
  // Erreur de validation Joi
  if (error.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides',
      errors: error.details?.map(detail => ({
        field: detail.path?.join('.'),
        message: detail.message
      }))
    });
  }

  // Erreur MongoDB
  if (error.name === 'MongoError' || error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de base de données',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // Erreur JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expiré'
    });
  }

  // Erreur générique
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// ===== EXPORT =====
module.exports = app;