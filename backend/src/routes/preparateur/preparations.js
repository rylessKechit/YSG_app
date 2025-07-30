// backend/src/routes/preparateur/preparations.js - CORRECTIFS CRITIQUES
const express = require('express');
const router = express.Router();
const Preparation = require('../../models/Preparation');
const Vehicle = require('../../models/Vehicle');
const { formatPreparationResponse } = require('../../utils/preparationHelpers');

/**
 * @route   POST /api/preparations/start
 * @desc    Démarrer une nouvelle préparation (UNIFIÉ)
 * @access  Preparateur
 */
router.post('/start', async (req, res) => {
  try {
    const { agencyId, licensePlate, model, vehicleType, year, fuelType, color, condition, notes } = req.body;
    const userId = req.user.userId;

    // Vérifier qu'il n'y a pas de préparation active
    const existingPreparation = await Preparation.findActiveByUser(userId);
    if (existingPreparation) {
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà une préparation en cours. Terminez-la avant d\'en démarrer une nouvelle.',
        data: {
          currentPreparation: {
            id: existingPreparation._id,
            licensePlate: existingPreparation.vehicleData.licensePlate // ✅ UNIFIÉ
          }
        }
      });
    }

    // Créer/trouver le véhicule
    let vehicle = await Vehicle.findOne({ 
      licensePlate: licensePlate.toUpperCase().trim() 
    });

    if (!vehicle) {
      vehicle = new Vehicle({
        licensePlate: licensePlate.toUpperCase().trim(),
        brand: 'N/A', // ✅ Valeur par défaut
        model: model.trim(),
        vehicleType: vehicleType || 'particulier',
        year: year || null,
        fuelType: fuelType || 'essence',
        color: color?.trim() || '',
        condition: condition || 'good'
      });
      await vehicle.save();
    }

    // ✅ DONNÉES VÉHICULE UNIFIÉES - Une seule source
    const vehicleData = {
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand || 'N/A',
      model: vehicle.model,
      vehicleType: vehicle.vehicleType || 'particulier',
      year: vehicle.year,
      fuelType: vehicle.fuelType || 'essence',
      color: vehicle.color || '',
      condition: vehicle.condition || 'good'
    };

    // Créer la préparation avec schema unifié
    const preparation = new Preparation({
      user: userId,
      preparateur: userId, // Pour compatibilité legacy
      agency: agencyId,
      vehicle: vehicle._id,
      vehicleData: vehicleData, // ✅ SEULE SOURCE DE VÉRITÉ
      status: 'in_progress',
      notes: notes || '',
      startTime: new Date(),
      steps: require('../../utils/constants').DEFAULT_PREPARATION_STEPS.map(stepType => ({
        step: stepType,
        completed: false,
        completedAt: null,
        notes: '',
        photos: []
      })),
      progress: 0,
      currentDuration: 0
    });

    await preparation.save();
    await preparation.populate(['user', 'agency']);

    // Réponse avec format unifié
    res.status(201).json({
      success: true,
      message: 'Préparation démarrée avec succès',
      data: {
        preparation: formatPreparationResponse(preparation) // ✅ Helper unifié
      }
    });

  } catch (error) {
    console.error('❌ Erreur démarrage préparation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la préparation'
    });
  }
});

/**
 * @route   GET /api/preparations/my
 * @desc    Récupérer les préparations de l'utilisateur (UNIFIÉ)
 * @access  Preparateur
 */
router.get('/my', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    // Construire la query
    const query = { user: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Requête paginée
    const preparations = await Preparation.find(query)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client address')
      .populate('vehicle', 'licensePlate brand model')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Preparation.countDocuments(query);

    // ✅ FORMATAGE UNIFIÉ - Toutes les préparations utilisent vehicleData
    const formattedPreparations = preparations.map(prep => formatPreparationResponse(prep));

    res.json({
      success: true,
      data: {
        preparations: formattedPreparations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount: total,
          totalPages: Math.ceil(total / parseInt(limit)),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération préparations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des préparations'
    });
  }
});

/**
 * @route   GET /api/preparations/current
 * @desc    Récupérer la préparation en cours (UNIFIÉ)
 * @access  Preparateur
 */
router.get('/current', async (req, res) => {
  try {
    console.log(req)
    const userId = req.user.userId;

    const preparation = await Preparation.findActiveByUser(userId);

    if (!preparation) {
      return res.json({
        success: true,
        data: { preparation: null }
      });
    }

    // ✅ FORMATAGE UNIFIÉ
    res.json({
      success: true,
      data: {
        preparation: formatPreparationResponse(preparation)
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération préparation courante:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la préparation courante'
    });
  }
});

/**
 * @route   GET /api/preparations/vehicle-history/:licensePlate
 * @desc    Historique des préparations d'un véhicule (UNIFIÉ)
 * @access  Preparateur
 */
router.get('/vehicle-history/:licensePlate', async (req, res) => {
  try {
    const { licensePlate } = req.params;
    const { limit = 10 } = req.query;

    // ✅ QUERY UNIFIÉE - Utilise la méthode statique mise à jour
    const preparations = await Preparation.findByLicensePlate(licensePlate)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const formattedPreparations = preparations.map(prep => formatPreparationResponse(prep));

    res.json({
      success: true,
      data: {
        preparations: formattedPreparations,
        vehicleInfo: {
          licensePlate: licensePlate.toUpperCase(),
          totalPreparations: preparations.length,
          lastPreparation: preparations.length > 0 ? preparations[0].createdAt : null
        }
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

module.exports = router;

// ===== CORRECTIFS ROUTES ADMIN =====

// backend/src/routes/admin/preparations/preparations.js - CORRECTIFS
/**
 * @route   POST /api/admin/preparations/bulk
 * @desc    Créer plusieurs préparations en une fois (UNIFIÉ)
 * @access  Admin
 */
router.post('/bulk', async (req, res) => {
  try {
    const { vehicles, userId, agencyId, notes, priority } = req.body;
    const createdPreparations = [];
    const errors = [];

    for (const vehicleData of vehicles) {
      try {
        // Créer/trouver le véhicule
        let vehicle = await Vehicle.findOne({ 
          licensePlate: vehicleData.licensePlate.toUpperCase() 
        });

        if (!vehicle) {
          vehicle = new Vehicle({
            licensePlate: vehicleData.licensePlate.toUpperCase(),
            brand: 'N/A', // ✅ Valeur par défaut cohérente
            model: vehicleData.model,
            vehicleType: vehicleData.vehicleType || 'particulier',
            year: vehicleData.year,
            fuelType: vehicleData.fuelType,
            color: vehicleData.color,
            condition: vehicleData.condition || 'good'
          });
          await vehicle.save();
        }

        // ✅ DONNÉES VÉHICULE UNIFIÉES
        const unifiedVehicleData = {
          licensePlate: vehicle.licensePlate,
          brand: vehicle.brand || 'N/A',
          model: vehicle.model,
          vehicleType: vehicle.vehicleType || 'particulier',
          year: vehicle.year,
          fuelType: vehicle.fuelType || 'essence',
          color: vehicle.color || '',
          condition: vehicle.condition || 'good'
        };

        // Initialiser les étapes avec pré-complétion si demandé
        const steps = require('../../utils/constants').DEFAULT_PREPARATION_STEPS.map(stepType => {
          const isCompleted = vehicleData.completedSteps?.includes(stepType) || false;
          return {
            step: stepType,
            completed: isCompleted,
            completedAt: isCompleted ? new Date() : null,
            notes: isCompleted ? 'Étape pré-complétée lors de la création' : '',
            photos: []
          };
        });

        const completedCount = steps.filter(s => s.completed).length;
        const initialProgress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

        // Créer la préparation avec schema unifié
        const preparation = new Preparation({
          user: userId,
          agency: agencyId,
          vehicle: vehicle._id,
          vehicleData: unifiedVehicleData, // ✅ DONNÉES COMPLÈTES
          status: 'pending',
          steps: steps,
          progress: initialProgress,
          currentDuration: 0,
          totalTime: null,
          isOnTime: null,
          notes: notes || '',
          priority: priority || 'normal',
          createdBy: {
            id: req.user.userId,
            name: `${req.user.firstName} ${req.user.lastName}`,
            email: req.user.email,
            role: 'admin'
          }
        });

        await preparation.save();
        await preparation.populate(['user', 'agency']);
        
        createdPreparations.push({
          id: preparation._id,
          vehicle: {
            licensePlate: preparation.vehicleData.licensePlate,
            brand: preparation.vehicleData.brand,
            model: preparation.vehicleData.model,
            vehicleType: preparation.vehicleData.vehicleType
          },
          status: preparation.status,
          priority: preparation.priority,
          progress: preparation.progress,
          completedSteps: vehicleData.completedSteps || []
        });

      } catch (error) {
        console.error(`❌ Erreur création préparation ${vehicleData.licensePlate}:`, error);
        errors.push({
          licensePlate: vehicleData.licensePlate,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdPreparations.length} préparations créées avec succès`,
      data: {
        createdPreparations,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Erreur bulk creation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création en lot des préparations'
    });
  }
});

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
 * @route   GET /api/admin/preparations
 * @desc    Liste toutes les préparations (UNIFIÉ)
 * @access  Admin
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      agencyId, 
      vehicleType,
      search,
      startDate, 
      endDate 
    } = req.query;

    // Construire la query
    const query = {};
    
    if (status) query.status = status;
    if (agencyId) query.agency = agencyId;
    if (vehicleType) query['vehicleData.vehicleType'] = vehicleType; // ✅ UNIFIÉ
    
    if (search) {
      query.$or = [
        { 'vehicleData.licensePlate': new RegExp(search, 'i') }, // ✅ UNIFIÉ
        { 'vehicleData.model': new RegExp(search, 'i') },
        { 'vehicleData.brand': new RegExp(search, 'i') }
      ];
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Exécuter la requête
    const preparations = await Preparation.find(query)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate('vehicle', 'licensePlate brand model')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Preparation.countDocuments(query);

    // ✅ FORMATAGE UNIFIÉ
    const formattedPreparations = preparations.map(prep => formatPreparationResponse(prep));

    res.json({
      success: true,
      data: {
        preparations: formattedPreparations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount: total,
          totalPages: Math.ceil(total / parseInt(limit)),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération préparations admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des préparations'
    });
  }
});

module.exports = router;