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
  // Users
  app.use('/api/admin/users', require('./routes/admin/users/index'));
  console.log('✅ Routes admin/users chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/users:', error.message);
}

try {
  // Agencies
  app.use('/api/admin/agencies', require('./routes/admin/agencies'));
  console.log('✅ Routes admin/agencies chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/agencies:', error.message);
}

try {
  // Schedules
  app.use('/api/admin/schedules', require('./routes/admin/schedules/index'));
  console.log('✅ Routes admin/schedules chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/schedules:', error.message);
}

try {
  // Timesheets
  app.use('/api/admin/timesheets', require('./routes/admin/timesheets/index'));
  console.log('✅ Routes admin/timesheets chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes admin/timesheets:', error.message);
}

try {
  // Preparations
  app.use('/api/admin/preparations', require('./routes/preparateur/preparations'));
  console.log('✅ Routes admin/preparations chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes preparateur/preparations:', error.message);
}

try {
  // Dashboard
  app.use('/api/admin/dashboard/overview', require('./routes/admin/dashboard/overview'));
  app.use('/api/admin/dashboard/charts', require('./routes/admin/dashboard/charts'));
  app.use('/api/admin/dashboard/alerts', require('./routes/admin/dashboard/alerts'));
  console.log('✅ Routes dashboard chargées avec succès');
} catch (error) {
  console.warn('⚠️ Erreur chargement routes dashboard:', error.message);
}

try {
  // Reports
  app.use('/api/admin/reports', require('./routes/admin/reports/index'));
  console.log('✅ Routes reports chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes reports:', error.message);
  console.warn('⚠️ Vérifiez que le dossier routes/admin/reports/ existe avec tous les fichiers');
}

try {
  // Settings
  app.use('/api/admin/settings', require('./routes/admin/settings'));
  console.log('✅ Routes settings chargées avec succès');
} catch (error) {
  console.warn('⚠️ Route admin/settings non trouvée');
}

// ===== ROUTES COMMUNES =====

try {
  // Routes communes agencies (pour préparateurs aussi)
  app.use('/api/agencies', require('./routes/common/agencies'));
  console.log('✅ Routes communes agencies chargées avec succès');
} catch (error) {
  console.warn('⚠️ Routes communes agencies non trouvées');
}

// ===== ROUTES PRÉPARATEUR =====

try {
  // ✅ CORRECTION: Routes directes (pas via index préparateur)
  app.use('/api/timesheets', require('./routes/preparateur/timesheets'));
  app.use('/api/preparations', require('./routes/preparateur/preparations'));
  app.use('/api/profile', require('./routes/preparateur/profile'));
  console.log('✅ Routes préparateur chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes préparateur:', error);
  console.error('Stack trace:', error.stack);
}

// ===== GESTION DES ERREURS =====

// Route non trouvée
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    data: {
      method: req.method,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
});

// Middleware de gestion d'erreurs global
app.use((error, req, res, next) => {
  console.error('❌ Erreur globale:', error);
  
  // Erreur de validation Joi
  if (error.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  // Erreur de cast MongoDB
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID invalide',
      data: {
        field: error.path,
        value: error.value
      }
    });
  }
  
  // Erreur de duplication MongoDB
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `${field} déjà utilisé`,
      data: {
        field,
        value: error.keyValue[field]
      }
    });
  }
  
  // Erreur de validation MongoDB
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors
    });
  }
  
  // Erreur de timeout
  if (error.code === 'ETIMEDOUT') {
    return res.status(408).json({
      success: false,
      message: 'Timeout de la requête'
    });
  }
  
  // Erreur générique
  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Erreur serveur interne';
  
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
});

// Gestion des promesses non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  console.error('À la promesse:', promise);
});

// Gestion des exceptions non gérées
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non gérée:', error);
  process.exit(1);
});

module.exports = app;