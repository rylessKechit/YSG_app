// ===== backend/src/app.js - VERSION COMPLÈTE =====
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

// Import configuration
const { verifyCloudinaryConfig } = require('./config/cloudinary');

const app = express();

// Vérification de la configuration au démarrage
verifyCloudinaryConfig();

// ===== MIDDLEWARE DE SÉCURITÉ =====

// Helmet pour la sécurité des headers HTTP
app.use(helmet());

// CORS - Configuration pour le frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] // Remplace par ton domaine frontend
    : ['http://localhost:3000', 'http://localhost:3001'], // Développement
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - Protection contre les attaques DDoS
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requêtes par fenêtre
  message: {
    error: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ===== MIDDLEWARE DE PARSING =====

// Parse JSON avec limite de taille
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Parse URL-encoded data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== MIDDLEWARE DE LOGGING =====

// Logger simple pour le développement
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// ===== ROUTES DE SANTÉ =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Test route
app.get('/', (req, res) => {
  res.json({
    message: '🚗 API Vehicle Preparation - Serveur actif',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// ===== ROUTES API =====

// Routes d'authentification
app.use('/api/auth', require('./routes/auth'));

// Routes communes (agences, etc.)
try {
  // Vérifier si les fichiers de routes existent avant de les charger
  app.use('/api/agencies', require('./routes/agencies'));
} catch (error) {
  console.warn('⚠️  Route agencies non trouvée, sera ajoutée plus tard');
}

// Routes admin
try {
  app.use('/api/admin/users', require('./routes/admin/users'));
  app.use('/api/admin/agencies', require('./routes/admin/agencies'));
  app.use('/api/admin/schedules', require('./routes/admin/schedules'));
  app.use('/api/admin/dashboard', require('./routes/admin/dashboard'));
} catch (error) {
  console.warn('⚠️  Certaines routes admin non trouvées, seront ajoutées plus tard');
}

// Routes préparateur
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
      // Cette logique sera ajoutée plus tard
      console.log('🕒 Vérification des retards...');
    } catch (error) {
      console.error('❌ Erreur vérification retards:', error);
    }
  });
}

module.exports = app;