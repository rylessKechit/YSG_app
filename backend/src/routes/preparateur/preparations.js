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
 * @desc    Démarrer une nouvelle préparation - CORRIGÉ POUR VOTRE PAYLOAD
 * @access  Preparateur
 */
router.post('/start', 
  validateBody(preparationSchemas.startPreparation),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // ✅ Récupérer les données directement du body (pas de vehicleData nested)
      const { 
        agencyId, 
        licensePlate, 
        brand, 
        model, 
        vehicleType, // ✅ NOUVEAU : Type de véhicule
        year, 
        fuelType, 
        color, 
        condition, 
        notes 
      } = req.body;

      console.log('🚀 Démarrage préparation:', { 
        userId, 
        agencyId, 
        licensePlate, 
        brand, 
        model,
        vehicleType // ✅ NOUVEAU : Log du type
      });

      // Vérifier qu'il n'y a pas déjà une préparation en cours
      const existingPreparation = await Preparation.findOne({
        user: userId,
        status: PREPARATION_STATUS.IN_PROGRESS
      });

      if (existingPreparation) {
        return res.status(400).json({
          success: false,
          message: 'Une préparation est déjà en cours. Terminez-la avant d\'en démarrer une nouvelle.',
          data: {
            currentPreparation: {
              id: existingPreparation._id,
              licensePlate: existingPreparation.vehicle?.licensePlate || existingPreparation.vehicleInfo?.licensePlate
            }
          }
        });
      }

      // Vérifier que l'agence existe et que l'utilisateur y a accès
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({
          success: false,
          message: 'Agence non trouvée'
        });
      }

      // Vérifier l'accès à l'agence
      const user = await User.findById(userId).populate('agencies');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const hasAgencyAccess = user.agencies.some(userAgency => 
        userAgency._id.toString() === agencyId.toString()
      );

      if (!hasAgencyAccess) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à cette agence'
        });
      }

      // ✅ Créer l'objet véhicule avec vos données
      const vehicleData = {
        licensePlate: licensePlate.toUpperCase().trim(),
        brand: '',
        model: model.trim(),
        vehicleType: vehicleType, // ✅ NOUVEAU : Type de véhicule pour facturation
        year: year || null,
        fuelType: fuelType || 'essence',
        color: color?.trim() || '',
        condition: condition || 'good'
      };

      // Créer la nouvelle préparation
      const preparation = new Preparation({
        user: userId,
        preparateur: userId, // Pour compatibilité
        agency: agencyId,
        vehicle: vehicleData, // Stockage direct de l'objet véhicule
        vehicleInfo: vehicleData, // Backup pour compatibilité
        status: PREPARATION_STATUS.IN_PROGRESS,
        notes: notes || '',
        startTime: new Date()
      });

      await preparation.save();

      // Populate pour la réponse
      await preparation.populate(['agency', 'user']);

      console.log('✅ Préparation créée:', preparation._id);

      res.status(201).json({
        success: true,
        message: 'Préparation démarrée avec succès',
        data: {
          preparation: {
            id: preparation._id,
            vehicle: vehicleData,
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
            startTime: preparation.startTime,
            status: preparation.status,
            steps: preparation.steps,
            progress: preparation.progress,
            currentDuration: preparation.currentDuration,
            isOnTime: preparation.isOnTime,
            notes: preparation.notes
          }
        }
      });

    } catch (error) {
      console.error('❌ Erreur démarrage préparation:', error);
      
      // Gestion des erreurs spécifiques
      if (error.name === 'ValidationError') {
        const errors = Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Erreur de validation',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erreur lors du démarrage de la préparation'
      });
    }
  }
);

/**
 * @route   PUT /api/preparations/:id/step
 * @desc    Compléter une étape de préparation - ORDRE FLEXIBLE
 * @access  Preparateur
 */
router.put('/:id/step', 
  validateObjectId(),
  uploadPreparationPhoto,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { step, notes } = req.body;
      const userId = req.user.userId;

      console.log('📸 Complétion étape:', { id, step, notes, userId });

      // ✅ Validation de base de l'étape
      if (!step) {
        return res.status(400).json({
          success: false,
          message: 'Le type d\'étape est requis'
        });
      }

      if (!isValidPreparationStep(step)) {
        return res.status(400).json({
          success: false,
          message: `Type d'étape invalide: ${step}`
        });
      }

      // ✅ Vérifier la photo uploadée
      const photoUrl = req.uploadedFile?.secure_url || req.body.photoUrl;
      if (!photoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Photo requise pour compléter l\'étape'
        });
      }

      // Récupérer la préparation
      const preparation = await Preparation.findOne({
        _id: id,
        user: userId,
        status: PREPARATION_STATUS.IN_PROGRESS
      });

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée ou déjà terminée'
        });
      }

      // ✅ Trouver l'étape - SANS VALIDATION D'ORDRE
      const stepToComplete = preparation.steps.find(s => s.step === step);
      if (!stepToComplete) {
        return res.status(400).json({
          success: false,
          message: `Type d'étape invalide: ${step}`
        });
      }

      // ✅ Vérifier si déjà complétée
      if (stepToComplete.completed) {
        return res.status(400).json({
          success: false,
          message: 'Cette étape est déjà complétée'
        });
      }

      // ✅ SUPPRESSION : Plus de validation d'ordre séquentiel !
      // L'étape peut être complétée dans n'importe quel ordre

      // Marquer l'étape comme complétée
      stepToComplete.completed = true;
      stepToComplete.completedAt = new Date();
      stepToComplete.notes = notes || '';
      
      // Ajouter la photo
      if (!stepToComplete.photos) stepToComplete.photos = [];
      stepToComplete.photos.push({
        url: photoUrl,
        description: `Photo étape ${step}`,
        uploadedAt: new Date()
      });

      await preparation.save();

      // Recharger avec les relations pour la réponse
      await preparation.populate(['vehicle', 'agency', 'user']);

      console.log('✅ Étape complétée avec succès:', step, 'Photo URL:', photoUrl);

      // Structure de réponse
      res.json({
        success: true,
        message: `Étape "${step}" complétée avec succès`,
        data: {
          preparation: {
            id: preparation._id,
            vehicle: {
              id: preparation.vehicle._id,
              licensePlate: preparation.vehicle.licensePlate,
              brand: preparation.vehicle.brand,
              model: preparation.vehicle.model,
              year: preparation.vehicle.year,
              fuelType: preparation.vehicle.fuelType
            },
            agency: {
              id: preparation.agency._id,
              name: preparation.agency.name,
              code: preparation.agency.code,
              client: preparation.agency.client
            },
            startTime: preparation.startTime,
            endTime: preparation.endTime,
            status: preparation.status,
            steps: preparation.steps,
            progress: preparation.progress,
            currentDuration: preparation.currentDuration,
            isOnTime: preparation.isOnTime,
            issues: preparation.issues || [],
            notes: preparation.notes
          }
        }
      });

    } catch (error) {
      console.error('❌ Erreur complétion étape:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la complétion de l\'étape'
      });
    }
  }
);

/**
 * @route   POST /api/preparations/:id/complete
 * @desc    Terminer une préparation - FLEXIBLE (ne nécessite plus toutes les étapes)
 * @access  Preparateur
 */
router.post('/:id/complete', 
  validateObjectId(),
  validateBody(preparationSchemas.completePreparation),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user.userId;

      console.log('🏁 Finalisation préparation:', id);

      // Récupérer la préparation
      const preparation = await Preparation.findOne({
        _id: id,
        user: userId,
        status: PREPARATION_STATUS.IN_PROGRESS
      });

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée ou déjà terminée'
        });
      }

      // ✅ SUPPRESSION : Plus de validation "toutes les étapes complétées"
      // La préparation peut être terminée même si certaines étapes ne sont pas faites

      // ✅ Vérifier qu'au moins UNE étape est complétée
      const completedSteps = preparation.steps.filter(step => step.completed).length;
      if (completedSteps === 0) {
        return res.status(400).json({
          success: false,
          message: 'Au moins une étape doit être complétée pour terminer la préparation'
        });
      }

      // Finaliser la préparation
      preparation.status = PREPARATION_STATUS.COMPLETED;
      preparation.endTime = new Date();
      preparation.notes = notes || '';

      // Calculer le temps total
      if (preparation.startTime) {
        const duration = Math.round((preparation.endTime - preparation.startTime) / (1000 * 60));
        preparation.totalTime = duration;
      }

      await preparation.save();

      // Recharger avec les relations
      await preparation.populate(['vehicle', 'agency', 'user']);

      console.log('✅ Préparation terminée avec succès:', {
        id: preparation._id,
        completedSteps,
        totalSteps: preparation.steps.length,
        duration: preparation.totalTime
      });

      res.json({
        success: true,
        message: 'Préparation terminée avec succès',
        data: {
          preparation: {
            id: preparation._id,
            vehicle: {
              id: preparation.vehicle._id,
              licensePlate: preparation.vehicle.licensePlate,
              brand: preparation.vehicle.brand,
              model: preparation.vehicle.model,
              year: preparation.vehicle.year,
              fuelType: preparation.vehicle.fuelType
            },
            agency: {
              id: preparation.agency._id,
              name: preparation.agency.name,
              code: preparation.agency.code,
              client: preparation.agency.client
            },
            startTime: preparation.startTime,
            endTime: preparation.endTime,
            status: preparation.status,
            steps: preparation.steps,
            progress: preparation.progress,
            totalTime: preparation.totalTime,
            isOnTime: preparation.isOnTime,
            issues: preparation.issues || [],
            notes: preparation.notes
          }
        }
      });

    } catch (error) {
      console.error('❌ Erreur finalisation préparation:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la finalisation de la préparation'
      });
    }
  }
);

/**
 * @route   POST /api/preparations/:id/issue
 * @desc    Signaler un incident sur une préparation
 * @access  Preparateur
 */
router.post('/:id/issue',
  validateObjectId(),
  uploadPreparationPhoto, // Photo optionnelle pour les incidents
  validateBody(preparationSchemas.reportIssue),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type, description, severity } = req.body;
      const userId = req.user.userId;
      const photoUrl = req.uploadedFile?.url || req.uploadedFile?.secure_url;

      console.log('⚠️ Signalement incident:', { preparationId: id, type, severity });

      const preparation = await Preparation.findOne({
        _id: id,
        user: userId,
        status: PREPARATION_STATUS.IN_PROGRESS
      });

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée ou déjà terminée'
        });
      }

      // Ajouter l'incident
      const issueData = {
        type,
        description,
        severity,
        photos: photoUrl ? [photoUrl] : []
      };

      await preparation.addIssue(issueData);

      console.log('✅ Incident signalé:', type);

      res.json({
        success: true,
        message: 'Incident signalé avec succès',
        data: {
          issue: issueData
        }
      });

    } catch (error) {
      console.error('❌ Erreur signalement incident:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du signalement de l\'incident'
      });
    }
  }
);

module.exports = router;