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
  console.log('🔄 Chargement du dashboard pour l\'utilisateur:', req.user.userId);
  try {
    const userId = req.user.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('📊 Dashboard pour user:', userId, 'date:', today.toISOString().split('T')[0]);

    // ✅ DEBUG COMPLET - Vérifier d'abord tous les timesheets de l'utilisateur
    console.log('🔍 DEBUG: Recherche de TOUS les timesheets de l\'utilisateur...');
    const allUserTimesheets = await Timesheet.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`📋 ${allUserTimesheets.length} timesheet(s) trouvé(s) pour l'utilisateur:`);
    allUserTimesheets.forEach((t, index) => {
      console.log(`   ${index + 1}. ID: ${t._id}`);
      console.log(`      Date: ${t.date ? t.date.toISOString() : 'null'}`);
      console.log(`      CreatedAt: ${t.createdAt ? t.createdAt.toISOString() : 'null'}`);
      console.log(`      StartTime: ${t.startTime ? t.startTime.toISOString() : 'null'}`);
      console.log(`      EndTime: ${t.endTime ? t.endTime.toISOString() : 'null'}`);
      console.log(`      Agency: ${t.agency || 'null'}`);
      console.log(`      Status: ${t.status || 'null'}`);
      console.log('      ---');
    });

    // ✅ DEBUG - Vérifier spécifiquement pour aujourd'hui
    console.log('🔍 Recherche timesheet pour aujourd\'hui avec différentes méthodes...');
    console.log(`   Recherche date exacte: ${today.toISOString()}`);
    console.log(`   Recherche plage: ${today.toISOString()} à ${tomorrow.toISOString()}`);

    // Méthode 1: Date exacte
    const method1 = await Timesheet.findOne({ 
      user: userId, 
      date: today 
    });
    console.log(`   Méthode 1 (date exacte): ${method1 ? 'TROUVÉ' : 'PAS TROUVÉ'}`);
    
    // Méthode 2: Plage de dates
    const method2 = await Timesheet.findOne({ 
      user: userId, 
      date: { $gte: today, $lt: tomorrow } 
    });
    console.log(`   Méthode 2 (plage dates): ${method2 ? 'TROUVÉ' : 'PAS TROUVÉ'}`);
    
    // Méthode 3: CreatedAt aujourd'hui
    const method3 = await Timesheet.findOne({ 
      user: userId, 
      createdAt: { $gte: today, $lt: tomorrow } 
    });
    console.log(`   Méthode 3 (createdAt): ${method3 ? 'TROUVÉ' : 'PAS TROUVÉ'}`);

    // ✅ CORRECTION CRITIQUE - Recherche timesheet avec la date exacte
    const [todaySchedule, todayTimesheet, currentPreparation, userStats] = await Promise.all([
      // Planning d'aujourd'hui
      Schedule.findOne({
        user: userId,
        date: { $gte: today, $lt: tomorrow }
      }).populate('agency', 'name code client address'),
      
      // ✅ UTILISER LE RÉSULTAT DES TESTS CI-DESSUS
      method1 || method2 || method3,
      
      // Préparation en cours
      Preparation.findOne({
        user: userId,
        status: 'in_progress'
      }).populate('vehicle agency', 'licensePlate brand model name code'),
      
      // Stats utilisateur (simplifié pour éviter les erreurs)
      Promise.resolve({
        totalPreparations: 0,
        averageTime: 0,
        onTimeRate: 0
      })
    ]);

    // ✅ POPULATE MANUEL si timesheet trouvé mais pas peuplé
    let finalTimesheet = todayTimesheet;
    if (todayTimesheet && !todayTimesheet.agency?.name) {
      finalTimesheet = await Timesheet.findById(todayTimesheet._id)
        .populate('agency', 'name code client');
      console.log('🔄 Timesheet re-peuplé avec agency');
    }

    console.log('📄 RÉSULTAT FINAL:');
    console.log('   Schedule:', todaySchedule ? `${todaySchedule.startTime}-${todaySchedule.endTime} (${todaySchedule.agency?.name})` : 'Aucun');
    console.log('   Timesheet:', finalTimesheet ? {
      id: finalTimesheet._id,
      date: finalTimesheet.date?.toISOString(),
      startTime: finalTimesheet.startTime?.toISOString(),
      endTime: finalTimesheet.endTime?.toISOString(),
      agency: finalTimesheet.agency?.name,
      status: finalTimesheet.status
    } : 'Aucun');
    console.log('   Preparation:', currentPreparation ? currentPreparation.vehicle?.licensePlate : 'Aucune');

    // ✅ CONSTRUCTION DE LA RÉPONSE STANDARDISÉE
    const dashboardData = {
      user: {
        id: req.user.userId,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        agencies: req.user.agencies || [],
        stats: userStats
      },
      today: {
        schedule: todaySchedule ? {
          id: todaySchedule._id,
          startTime: todaySchedule.startTime,
          endTime: todaySchedule.endTime,
          breakStart: todaySchedule.breakStart,
          breakEnd: todaySchedule.breakEnd,
          agency: {
            id: todaySchedule.agency._id,
            name: todaySchedule.agency.name,
            code: todaySchedule.agency.code,
            client: todaySchedule.agency.client
          }
        } : null,
        
        // ✅ TIMESHEET AVEC TOUTES LES DONNÉES + DEBUG
        timesheet: finalTimesheet ? {
          id: finalTimesheet._id,
          startTime: finalTimesheet.startTime,
          endTime: finalTimesheet.endTime,
          breakStart: finalTimesheet.breakStart,
          breakEnd: finalTimesheet.breakEnd,
          status: finalTimesheet.status,
          totalWorkedMinutes: finalTimesheet.totalWorkedMinutes || 0,
          delays: finalTimesheet.delays,
          notes: finalTimesheet.notes,
          agency: finalTimesheet.agency ? {
            id: finalTimesheet.agency._id,
            name: finalTimesheet.agency.name,
            code: finalTimesheet.agency.code
          } : null
        } : null,
        
        currentPreparation: currentPreparation ? {
          id: currentPreparation._id,
          status: currentPreparation.status,
          vehicle: {
            licensePlate: currentPreparation.vehicle.licensePlate,
            brand: currentPreparation.vehicle.brand,
            model: currentPreparation.vehicle.model
          },
          agency: {
            name: currentPreparation.agency.name,
            code: currentPreparation.agency.code
          },
          startedAt: currentPreparation.startedAt,
          steps: currentPreparation.steps
        } : null
      },
      stats: {
        thisWeek: {
          preparations: 0,
          averageTime: 0,
          onTimeRate: 0
        }
      }
    };

    console.log('✅ Dashboard construit avec succès');
    console.log('📤 ENVOI DE LA RÉPONSE:', {
      hasUser: !!dashboardData.user,
      hasSchedule: !!dashboardData.today.schedule,
      hasTimesheet: !!dashboardData.today.timesheet,
      hasPreparation: !!dashboardData.today.currentPreparation
    });

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Erreur dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement du dashboard',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
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