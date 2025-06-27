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
app.use('/api/agencies', require('./routes/common/agencies'));

// Routes administrateur
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/agencies', require('./routes/admin/agencies')); // ✅ Route agencies admin
app.use('/api/admin/schedules', require('./routes/admin/schedules'));
app.use('/api/admin/dashboard', require('./routes/admin/dashboard'));

// Routes préparateur
app.use('/api/timesheets', require('./routes/preparateur/timesheets'));
app.use('/api/preparations', require('./routes/preparateur/preparations'));
app.use('/api/profile', require('./routes/preparateur/profile'));

// Routes statistiques (communes)
app.use('/api/stats', require('./routes/common/stats'));

// ===== GESTION DES ERREURS =====

// Route non trouvée
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware de gestion d'erreur global
app.use((error, req, res, next) => {
  console.error('❌ Erreur serveur:', error);

  // Erreur de validation Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      error: 'Erreur de validation',
      details: errors
    });
  }

  // Erreur de cast MongoDB (ID invalide)
  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'ID invalide',
      field: error.path
    });
  }

  // Erreur de duplication MongoDB
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      error: 'Valeur déjà existante',
      field: field,
      value: error.keyValue[field]
    });
  }

  // Erreur JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token invalide'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expiré'
    });
  }

  // Erreur générique
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erreur interne du serveur' 
      : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ===== TÂCHES PROGRAMMÉES =====

// Vérification des retards de pointage toutes les 5 minutes
if (process.env.NODE_ENV !== 'test') {
  cron.schedule('*/5 * * * *', () => {
    require('./jobs/checkLateTimesheets')();
  });
  
  console.log('⏰ Tâche de vérification des retards programmée');
}

module.exports = app;