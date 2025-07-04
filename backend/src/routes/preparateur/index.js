// backend/src/routes/preparateur/index.js
// ✅ Index des routes préparateur avec gestion d'erreurs robuste

const express = require('express');
const router = express.Router();

// Middlewares d'authentification
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');

// ===== MIDDLEWARES GLOBAUX =====

// Appliquer l'authentification et l'autorisation sur toutes les routes préparateur
router.use(auth);
router.use(preparateurAuth);

// Middleware de logging pour debug
router.use((req, res, next) => {
  console.log(`🔄 Route préparateur: ${req.method} ${req.originalUrl}`);
  console.log(`👤 Utilisateur: ${req.user?.email} (${req.user?.role})`);
  next();
});

// ===== ROUTE DE SANTÉ =====

// Route de santé pour vérifier que les routes préparateur fonctionnent
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Routes préparateur opérationnelles',
    data: {
      user: {
        id: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        agencies: req.user.agencies?.length || 0
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
});

// Route de test pour vérifier l'authentification
router.get('/test-auth', (req, res) => {
  res.json({
    success: true,
    message: 'Authentification préparateur réussie',
    data: {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      agencies: req.user.agencies?.map(agency => ({
        id: agency._id,
        name: agency.name,
        code: agency.code,
        client: agency.client
      })) || [],
      permissions: [
        'view_own_preparations',
        'create_preparations',
        'complete_steps',
        'report_issues',
        'view_own_timesheets',
        'clock_in_out',
        'view_own_profile'
      ]
    }
  });
});

// ===== MONTAGE DES SOUS-ROUTES =====

// Routes des préparations
try {
  const preparationsRouter = require('./preparations');
  router.use('/preparations', preparationsRouter);
  console.log('✅ Routes préparateur/preparations chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes préparateur/preparations:', error.message);
  console.error('Stack trace:', error.stack);
  
  // Route de fallback pour éviter le crash
  router.use('/preparations', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service préparations temporairement indisponible',
      error: 'Module preparations non trouvé ou erreur de chargement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
}

// Routes des pointages (timesheets)
try {
  const timesheetsRouter = require('./timesheets');
  router.use('/timesheets', timesheetsRouter);
  console.log('✅ Routes préparateur/timesheets chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes préparateur/timesheets:', error.message);
  
  // Route de fallback
  router.use('/timesheets', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service pointages temporairement indisponible',
      error: 'Module timesheets non trouvé ou erreur de chargement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
}

// Routes du profil
try {
  const profileRouter = require('./profile');
  router.use('/profile', profileRouter);
  console.log('✅ Routes préparateur/profile chargées avec succès');
} catch (error) {
  console.error('❌ Erreur chargement routes préparateur/profile:', error.message);
  
  // Route de fallback
  router.use('/profile', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Service profil temporairement indisponible',
      error: 'Module profile non trouvé ou erreur de chargement',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });
}

// Routes des notifications (optionnel)
try {
  const notificationsRouter = require('./notifications');
  router.use('/notifications', notificationsRouter);
  console.log('✅ Routes préparateur/notifications chargées avec succès');
} catch (error) {
  console.warn('⚠️ Routes notifications non trouvées (optionnel)');
  
  // Route de fallback basique pour notifications
  router.get('/notifications', (req, res) => {
    res.json({
      success: true,
      message: 'Service notifications non encore implémenté',
      data: {
        notifications: [],
        unreadCount: 0
      }
    });
  });
}

// ===== ROUTES UTILITAIRES =====

// Route pour obtenir les informations utilisateur complètes
router.get('/me', async (req, res) => {
  try {
    // Récupérer l'utilisateur complet avec populate
    const User = require('../../models/User');
    const user = await User.findById(req.user.userId)
      .populate('agencies', 'name code client workingHours isActive')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          agencies: user.agencies.map(agency => ({
            id: agency._id,
            name: agency.name,
            code: agency.code,
            client: agency.client,
            workingHours: agency.workingHours,
            isActive: agency.isActive
          })),
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération informations utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations utilisateur'
    });
  }
});

// Route pour obtenir les statistiques rapides
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Requêtes parallèles pour les statistiques
    const [currentPreparation, todayTimesheet, weekStats] = await Promise.all([
      // Préparation en cours
      require('../../models/Preparation').findOne({
        user: userId,
        status: 'in_progress'
      }).populate('vehicle agency'),

      // Pointage du jour
      require('../../models/Timesheet').findOne({
        user: userId,
        date: today
      }),

      // Statistiques de la semaine
      require('../../models/Preparation').aggregate([
        {
          $match: {
            user: require('mongoose').Types.ObjectId(userId),
            startTime: {
              $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: null,
            totalPreparations: { $sum: 1 },
            completedPreparations: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            avgTime: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ['$totalTime', null] }, { $gt: ['$totalTime', 0] }] },
                  '$totalTime',
                  null
                ]
              }
            }
          }
        }
      ])
    ]);

    const weekStatsData = weekStats[0] || {
      totalPreparations: 0,
      completedPreparations: 0,
      avgTime: 0
    };

    res.json({
      success: true,
      data: {
        currentPreparation: currentPreparation ? {
          id: currentPreparation._id,
          vehicle: currentPreparation.vehicle,
          agency: currentPreparation.agency,
          progress: currentPreparation.progress,
          startTime: currentPreparation.startTime,
          currentDuration: currentPreparation.currentDuration,
          isOnTime: currentPreparation.isOnTime
        } : null,
        todayTimesheet: todayTimesheet ? {
          isWorking: !!todayTimesheet.startTime && !todayTimesheet.endTime,
          isOnBreak: !!todayTimesheet.breakStart && !todayTimesheet.breakEnd,
          startTime: todayTimesheet.startTime,
          totalWorkedToday: todayTimesheet.totalWorkedMinutes || 0
        } : {
          isWorking: false,
          isOnBreak: false,
          startTime: null,
          totalWorkedToday: 0
        },
        weekStats: {
          totalPreparations: weekStatsData.totalPreparations,
          completedPreparations: weekStatsData.completedPreparations,
          completionRate: weekStatsData.totalPreparations > 0 
            ? Math.round((weekStatsData.completedPreparations / weekStatsData.totalPreparations) * 100)
            : 0,
          averageTime: Math.round(weekStatsData.avgTime || 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du dashboard'
    });
  }
});

// ===== GESTION DES ERREURS =====

// Route pour les chemins non trouvés dans les routes préparateur
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route préparateur non trouvée',
    data: {
      method: req.method,
      path: req.originalUrl,
      user: req.user?.email,
      availableRoutes: [
        'GET /api/preparateur/health',
        'GET /api/preparateur/test-auth',
        'GET /api/preparateur/me',
        'GET /api/preparateur/dashboard',
        'Routes /preparations/*',
        'Routes /timesheets/*',
        'Routes /profile/*',
        'Routes /notifications/*'
      ]
    }
  });
});

// Middleware de gestion d'erreurs spécifique aux routes préparateur
router.use((error, req, res, next) => {
  console.error('❌ Erreur dans les routes préparateur:', error);
  
  // Erreur de permissions
  if (error.name === 'UnauthorizedError' || error.status === 403) {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Droits préparateur requis',
      data: {
        userRole: req.user?.role,
        requiredRole: 'preparateur'
      }
    });
  }

  // Erreur de ressource non trouvée
  if (error.status === 404) {
    return res.status(404).json({
      success: false,
      message: 'Ressource non trouvée',
      data: {
        path: req.originalUrl,
        method: req.method
      }
    });
  }

  // Erreur générique pour les routes préparateur
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Erreur dans les services préparateur',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
});

module.exports = router;