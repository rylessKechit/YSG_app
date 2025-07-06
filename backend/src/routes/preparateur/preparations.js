// backend/src/routes/preparateur/preparations.js
const express = require('express');
const router = express.Router();

// ===== IMPORTATIONS =====

// Middlewares d'authentification
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');

// Middlewares de validation
const { 
  validateBody, 
  validateObjectId, 
  preparationSchemas, 
  validatePreparationUpload 
} = require('../../middleware/validation');

// Middlewares d'upload
const { 
  uploadPreparationPhoto
} = require('../../middleware/upload');

// Modèles
const Preparation = require('../../models/Preparation');
const Agency = require('../../models/Agency');
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');

// Utilitaires
const { PREPARATION_STATUS, isValidPreparationStep } = require('../../utils/constants');

// ===== APPLICATION DES MIDDLEWARES =====

// Appliquer l'authentification et l'autorisation préparateur sur toutes les routes
router.use(auth);
router.use(preparateurAuth);

// ===== ROUTES SPÉCIFIQUES (AVANT LES ROUTES AVEC PARAMÈTRES) =====

/**
 * @route   GET /api/preparations/user-agencies
 * @desc    Récupérer les agences assignées à l'utilisateur
 * @access  Preparateur
 */
router.get('/user-agencies', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('🏢 Récupération agences utilisateur:', userId);
    
    // Récupérer l'utilisateur avec ses agences
    const user = await User.findById(userId).populate('agencies', 'name code client workingHours isActive');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Filtrer les agences actives uniquement
    const activeAgencies = user.agencies.filter(agency => agency.isActive);

    console.log('✅ Agences utilisateur récupérées:', activeAgencies.length);

    res.json({
      success: true,
      data: {
        agencies: activeAgencies.map(agency => ({
          id: agency._id,
          name: agency.name,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          isActive: agency.isActive
        }))
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération agences utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agences'
    });
  }
});

/**
 * @route   GET /api/preparations/current
 * @desc    Récupérer la préparation en cours de l'utilisateur
 * @access  Preparateur
 */
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📋 Récupération préparation courante:', userId);
    
    const preparation = await Preparation.findOne({
      user: userId,
      status: PREPARATION_STATUS.IN_PROGRESS
    })
    .populate('agency', 'name code client')
    .populate('user', 'firstName lastName email')
    .lean();

    if (!preparation) {
      console.log('ℹ️ Aucune préparation en cours trouvée');
      return res.json({
        success: true,
        data: {
          preparation: null
        }
      });
    }

    console.log('✅ Préparation courante trouvée:', preparation._id);

    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id,
          vehicle: preparation.vehicleInfo || preparation.vehicle,
          agency: preparation.agency,
          user: preparation.user,
          status: preparation.status,
          steps: preparation.steps,
          startTime: preparation.startTime,
          endTime: preparation.endTime,
          totalTime: preparation.totalTime,
          progress: preparation.progress,
          currentDuration: preparation.currentDuration,
          isOnTime: preparation.isOnTime,
          issues: preparation.issues || [],
          notes: preparation.notes
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération préparation courante:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la préparation'
    });
  }
});

/**
 * @route   GET /api/preparations/history
 * @desc    Obtenir l'historique des préparations de l'utilisateur
 * @access  Preparateur
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, agencyId, search } = req.query;
    const userId = req.user.userId;

    console.log('📋 Récupération historique préparations:', { 
      userId, 
      page, 
      limit, 
      filters: { startDate, endDate, agencyId, search }
    });

    // Dates par défaut (30 derniers jours si non spécifiées)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? 
      new Date(startDate) : 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Construction de la requête
    const query = {
      user: userId,
      createdAt: {
        $gte: defaultStartDate,
        $lte: defaultEndDate
      }
    };

    // Filtres optionnels
    if (agencyId) {
      query.agency = agencyId;
    }

    if (search) {
      query.$or = [
        { 'vehicleInfo.licensePlate': { $regex: search, $options: 'i' } },
        { 'vehicleInfo.brand': { $regex: search, $options: 'i' } },
        { 'vehicleInfo.model': { $regex: search, $options: 'i' } },
        { 'vehicle.licensePlate': { $regex: search, $options: 'i' } },
        { 'vehicle.brand': { $regex: search, $options: 'i' } },
        { 'vehicle.model': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Requête avec pagination
    const [preparations, totalCount] = await Promise.all([
      Preparation.find(query)
        .populate('agency', 'name code client')
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Preparation.countDocuments(query)
    ]);

    // Formatage des données
    const formattedPreparations = preparations.map(prep => ({
      id: prep._id,
      vehicle: prep.vehicleInfo || prep.vehicle,
      agency: prep.agency,
      user: prep.user,
      status: prep.status,
      startTime: prep.startTime,
      endTime: prep.endTime,
      totalTime: prep.totalTime,
      progress: prep.progress,
      currentDuration: prep.currentDuration,
      isOnTime: prep.isOnTime,
      issues: prep.issues || [],
      steps: prep.steps || [],
      createdAt: prep.createdAt
    }));

    // Calcul pagination
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    console.log('✅ Historique préparations récupéré:', {
      count: formattedPreparations.length,
      total: totalCount,
      page: pageNum,
      totalPages
    });

    res.json({
      success: true,
      data: {
        preparations: formattedPreparations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
          agencyId,
          search
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
});

/**
 * @route   GET /api/preparations/my-stats
 * @desc    Obtenir les statistiques personnelles de l'utilisateur
 * @access  Preparateur
 */
router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period = '30d' } = req.query;

    console.log('📊 Récupération statistiques utilisateur:', { userId, period });

    // Définir la période
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const query = {
      user: userId,
      status: { $in: [PREPARATION_STATUS.COMPLETED, PREPARATION_STATUS.CANCELLED] },
      createdAt: { $gte: startDate }
    };

    const preparations = await Preparation.find(query).lean();
    
    const completedPreparations = preparations.filter(p => p.status === PREPARATION_STATUS.COMPLETED);

    // Calcul des statistiques
    const totalPreparations = preparations.length;
    const completedCount = completedPreparations.length;
    const completionRate = totalPreparations > 0 ? (completedCount / totalPreparations) * 100 : 0;
    
    const averageTime = completedPreparations.length > 0 ?
      completedPreparations.reduce((sum, prep) => sum + (prep.totalTime || 0), 0) / completedPreparations.length : 0;
    
    const onTimeCount = completedPreparations.filter(prep => prep.totalTime <= 30).length;
    const onTimeRate = completedCount > 0 ? (onTimeCount / completedCount) * 100 : 0;

    const bestTime = completedPreparations.length > 0 ?
      Math.min(...completedPreparations.map(prep => prep.totalTime || Infinity).filter(time => time !== Infinity)) : 0;

    const worstTime = completedPreparations.length > 0 ?
      Math.max(...completedPreparations.map(prep => prep.totalTime || 0)) : 0;

    console.log('✅ Statistiques calculées:', {
      totalPreparations,
      completionRate: Math.round(completionRate),
      averageTime: Math.round(averageTime),
      onTimeRate: Math.round(onTimeRate)
    });

    res.json({
      success: true,
      data: {
        totalPreparations,
        averageTime: Math.round(averageTime),
        onTimeRate: Math.round(onTimeRate),
        completionRate: Math.round(completionRate),
        bestTime: bestTime || 0,
        worstTime: worstTime || 0,
        period,
        lastCalculated: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * @route   GET /api/preparations/vehicle-history/:licensePlate
 * @desc    Obtenir l'historique d'un véhicule par plaque
 * @access  Preparateur
 */
router.get('/vehicle-history/:licensePlate', async (req, res) => {
  try {
    const { licensePlate } = req.params;
    const { limit = 10 } = req.query;

    console.log('🚗 Récupération historique véhicule:', licensePlate);

    const preparations = await Preparation.find({
      $or: [
        { 'vehicleInfo.licensePlate': { $regex: licensePlate, $options: 'i' } },
        { 'vehicle.licensePlate': { $regex: licensePlate, $options: 'i' } }
      ],
      status: { $in: [PREPARATION_STATUS.COMPLETED, PREPARATION_STATUS.CANCELLED] }
    })
    .populate('agency', 'name code client')
    .populate('user', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

    const formattedPreparations = preparations.map(prep => ({
      id: prep._id,
      vehicle: prep.vehicleInfo || prep.vehicle,
      agency: prep.agency,
      user: prep.user,
      status: prep.status,
      startTime: prep.startTime,
      endTime: prep.endTime,
      totalTime: prep.totalTime,
      progress: prep.progress,
      isOnTime: prep.isOnTime,
      issues: prep.issues || [],
      createdAt: prep.createdAt
    }));

    console.log('✅ Historique véhicule trouvé:', formattedPreparations.length);

    res.json({
      success: true,
      data: {
        preparations: formattedPreparations
      }
    });

  } catch (error) {
    console.error('❌ Erreur historique véhicule:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique du véhicule'
    });
  }
});

// ===== 🚀 NOUVELLE ROUTE - DÉTAILS D'UNE PRÉPARATION =====

/**
 * @route   GET /api/preparations/:id
 * @desc    Récupérer les détails d'une préparation spécifique
 * @access  Preparateur
 */
router.get('/:id', 
  validateObjectId(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      console.log('📋 Récupération détails préparation:', { id, userId });

      // Rechercher la préparation avec population complète
      const preparation = await Preparation.findOne({
        _id: id,
        user: userId // S'assurer que l'utilisateur peut seulement voir ses préparations
      })
      .populate('agency', 'name code client')
      .populate('user', 'firstName lastName email')
      .lean();

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée ou vous n\'avez pas les droits pour la voir'
        });
      }

      // Formater la réponse
      const formattedPreparation = {
        id: preparation._id,
        vehicle: preparation.vehicleInfo || preparation.vehicle,
        agency: {
          id: preparation.agency._id,
          name: preparation.agency.name,
          code: preparation.agency.code,
          client: preparation.agency.client
        },
        user: {
          id: preparation.user._id,
          firstName: preparation.user.firstName,
          lastName: preparation.user.lastName,
          email: preparation.user.email
        },
        status: preparation.status,
        steps: preparation.steps || [],
        startTime: preparation.startTime,
        endTime: preparation.endTime,
        totalTime: preparation.totalTime,
        progress: preparation.progress || 0,
        currentDuration: preparation.currentDuration || 0,
        isOnTime: preparation.isOnTime,
        issues: preparation.issues || [],
        notes: preparation.notes || '',
        qualityCheck: preparation.qualityCheck,
        createdAt: preparation.createdAt,
        updatedAt: preparation.updatedAt
      };

      console.log('✅ Détails préparation récupérés:', { 
        id: preparation._id,
        status: preparation.status,
        stepsCount: preparation.steps?.length || 0
      });

      res.json({
        success: true,
        data: formattedPreparation
      });

    } catch (error) {
      console.error('❌ Erreur récupération détails préparation:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des détails de la préparation'
      });
    }
  }
);

// ===== ROUTES AVEC ACTIONS (POST/PUT) =====

/**
 * @route   POST /api/preparations/start
 * @desc    Démarrer une nouvelle préparation
 * @access  Preparateur
 */
router.post('/start', 
  validateBody(preparationSchemas.startPreparation),
  async (req, res) => {
    // ... code existant pour démarrer une préparation
  }
);

/**
 * @route   PUT /api/preparations/:id/step
 * @desc    Compléter une étape de préparation
 * @access  Preparateur
 */
router.put('/:id/step',
  validateObjectId(),
  uploadPreparationPhoto,
  validateBody(preparationSchemas.completeStep),
  async (req, res) => {
    // ... code existant pour compléter une étape
  }
);

/**
 * @route   POST /api/preparations/:id/complete
 * @desc    Terminer une préparation
 * @access  Preparateur
 */
router.post('/:id/complete',
  validateObjectId(),
  validateBody(preparationSchemas.completePreparation),
  async (req, res) => {
    // ... code existant pour terminer une préparation
  }
);

/**
 * @route   POST /api/preparations/:id/issue
 * @desc    Signaler un incident sur une préparation
 * @access  Preparateur
 */
router.post('/:id/issue',
  validateObjectId(),
  uploadPreparationPhoto,
  validateBody(preparationSchemas.reportIssue),
  async (req, res) => {
    // ... code existant pour signaler un incident
  }
);

module.exports = router;