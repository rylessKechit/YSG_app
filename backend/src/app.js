const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cron = require('node-cron');
const path = require('path');

const app = express();

// ===== MIDDLEWARES GLOBAUX =====

// Compression gzip
app.use(compression());

// Sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Pour Cloudinary
}));

// CORS - Configurer selon vos besoins
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-admin-domain.com', 'https://your-app-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  }
});
app.use('/api/', limiter);

// Parsing JSON et URL
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging des requêtes (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// ===== ROUTES DE BASE =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'Vehicle Prep API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// ===== ROUTES AUTHENTIFICATION =====

try {
  app.use('/api/auth', require('./routes/auth'));
} catch (error) {
  console.warn('⚠️  Route auth non trouvée, sera ajoutée plus tard');
}

// ===== ROUTES ADMIN =====

try {
  // Users
  app.use('/api/admin/users', require('./routes/admin/users/users'));
  app.use('/api/admin/users', require('./routes/admin/users/bulk-actions'));
  app.use('/api/admin/users', require('./routes/admin/users/profile-complete'));
} catch (error) {
  console.warn(error);
}

try {
  // Agencies
  app.use('/api/admin/agencies', require('./routes/admin/agencies'));
} catch (error) {
  console.warn(error);
}

try {
  // Schedules
  app.use('/api/admin/schedules', require('./routes/admin/schedules/schedules'));
  app.use('/api/admin/schedules', require('./routes/admin/schedules/calendar'));
  app.use('/api/admin/schedules/templates', require('./routes/admin/schedules/templates'));
  app.use('/api/admin/schedules/conflicts', require('./routes/admin/schedules/conflicts'));
} catch (error) {
  console.warn(error);
}

try {
  // Dashboard
  app.use('/api/admin/dashboard', require('./routes/admin/dashboard/dashboard'));
  app.use('/api/admin/dashboard/kpis', require('./routes/admin/dashboard/kpis'));
  app.use('/api/admin/dashboard/charts', require('./routes/admin/dashboard/charts'));
  app.use('/api/admin/dashboard/alerts', require('./routes/admin/dashboard/alerts'));
} catch (error) {
  console.warn(error);
}

try {
  // Reports
  app.use('/api/admin/reports', require('./routes/admin/reports'));
} catch (error) {
  console.warn('⚠️  Route admin/reports non trouvée');
}

try {
  // Settings
  app.use('/api/admin/settings', require('./routes/admin/settings'));
} catch (error) {
  console.warn('⚠️  Route admin/settings non trouvée');
}

// ===== ROUTES PRÉPARATEUR =====

try {
  app.use('/api/timesheets', require('./routes/preparateur/timesheets'));
  app.use('/api/preparations', require('./routes/preparateur/preparations'));
  app.use('/api/profile', require('./routes/preparateur/profile'));
} catch (error) {
  console.warn('⚠️  Certaines routes préparateur non trouvées, seront ajoutées plus tard');
}

// ===== GESTION DES ERREURS =====

// Route 404 pour les API non trouvées
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route API non trouvée: ${req.method} ${req.originalUrl}`,
    availableRoutes: {
      auth: [
        'POST /api/auth/login',
        'GET /api/auth/me',
        'POST /api/auth/refresh'
      ],
      admin: [
        'GET /api/admin/users',
        'POST /api/admin/users',
        'GET /api/admin/agencies',
        'GET /api/admin/schedules',
        'GET /api/admin/dashboard',
        'GET /api/admin/reports',
        'GET /api/admin/settings'
      ],
      health: [
        'GET /health',
        'GET /'
      ]
    }
  });
});

// Gestionnaire d'erreur global
app.use((error, req, res, next) => {
  console.error('❌ Erreur serveur:', error);
  
  // Erreur de validation Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors
    });
  }

  // Erreur de duplication MongoDB
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Cette ressource existe déjà'
    });
  }

  // Erreur générique
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ===== TÂCHES CRON (OPTIONNEL) =====

// Vérification des retards toutes les 5 minutes (seulement en production)
if (process.env.NODE_ENV === 'production') {
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Appeler le job de vérification des retards
      const checkLateTimesheets = require('./jobs/checkLateTimesheets');
      await checkLateTimesheets();
      console.log('🕒 Vérification des retards terminée');
    } catch (error) {
      console.error('❌ Erreur vérification retards:', error);
    }
  });
}

module.exports = app;