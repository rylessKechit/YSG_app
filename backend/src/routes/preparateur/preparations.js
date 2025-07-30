// backend/src/routes/preparateur/preparations.js
// ✅ FICHIER COMPLET AVEC MULTER ET TOUTES LES ROUTES

const express = require('express');
const multer = require('multer');
const router = express.Router();

// Models
const Preparation = require('../../models/Preparation');
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');

// Middlewares
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');
const { uploadPreparationPhoto } = require('../../middleware/upload');

// Utils
const { formatPreparationResponse } = require('../../utils/preparationHelpers');

// ===== CONFIGURATION MULTER =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// ===== MIDDLEWARES GLOBAUX =====
router.use(auth);
router.use(preparateurAuth);

// ===== ROUTES =====

/**
 * @route   POST /api/preparations/start
 * @desc    Démarrer une nouvelle préparation
 * @access  Preparateur
 */
router.post('/start', async (req, res) => {
  try {
    const { agencyId, licensePlate, model, vehicleType, year, fuelType, color, condition, notes } = req.body;
    const userId = req.user.userId;

    console.log('🚀 Démarrage préparation:', { userId, agencyId, licensePlate });

    // Vérifier qu'il n'y a pas de préparation active
    const existingPreparation = await Preparation.findOne({
      user: userId,
      status: 'in_progress'
    });

    if (existingPreparation) {
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà une préparation en cours. Terminez-la avant d\'en démarrer une nouvelle.',
        data: {
          currentPreparation: {
            id: existingPreparation._id,
            licensePlate: existingPreparation.vehicleData?.licensePlate || 'N/A'
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
        brand: 'N/A',
        model: model.trim(),
        agency: agencyId,
        vehicleType: vehicleType || 'particulier',
        year: year || null,
        fuelType: fuelType || 'essence',
        color: color?.trim() || '',
        condition: condition || 'good'
      });
      await vehicle.save();
      console.log('✅ Nouveau véhicule créé:', vehicle._id);
    }

    // Données véhicule unifiées
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

    // Créer la préparation
    const preparation = new Preparation({
      user: userId,
      preparateur: userId,
      agency: agencyId,
      vehicle: vehicle._id,
      vehicleData: vehicleData,
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
    console.log('✅ Préparation créée:', preparation._id);

    // Réponse simple sans helper pour éviter les erreurs
    res.status(201).json({
      success: true,
      message: 'Préparation démarrée avec succès',
      data: {
        preparation: {
          id: preparation._id.toString(),
          vehicle: {
            licensePlate: vehicleData.licensePlate,
            brand: vehicleData.brand,
            model: vehicleData.model,
            vehicleType: vehicleData.vehicleType
          },
          status: preparation.status,
          startTime: preparation.startTime,
          steps: preparation.steps,
          progress: preparation.progress,
          currentDuration: preparation.currentDuration
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur démarrage préparation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la préparation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/preparations/current
 * @desc    Récupérer la préparation en cours
 * @access  Preparateur
 */
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.userId;

    const preparation = await Preparation.findOne({
      user: userId,
      status: 'in_progress'
    }).populate('user', 'firstName lastName email')
      .populate('agency', 'name code client');

    if (!preparation) {
      return res.json({
        success: true,
        data: { preparation: null }
      });
    }

    // Réponse formatée
    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id.toString(),
          vehicle: {
            licensePlate: preparation.vehicleData?.licensePlate || 'N/A',
            brand: preparation.vehicleData?.brand || 'N/A',
            model: preparation.vehicleData?.model || 'Véhicule',
            vehicleType: preparation.vehicleData?.vehicleType || 'particulier'
          },
          user: preparation.user ? {
            id: preparation.user._id.toString(),
            firstName: preparation.user.firstName,
            lastName: preparation.user.lastName,
            email: preparation.user.email
          } : null,
          agency: preparation.agency ? {
            id: preparation.agency._id.toString(),
            name: preparation.agency.name,
            code: preparation.agency.code,
            client: preparation.agency.client
          } : null,
          status: preparation.status,
          startTime: preparation.startTime,
          endTime: preparation.endTime,
          steps: preparation.steps || [],
          progress: preparation.progress || 0,
          currentDuration: preparation.currentDuration || 0,
          isOnTime: preparation.isOnTime,
          notes: preparation.notes || '',
          issues: preparation.issues || [],
          createdAt: preparation.createdAt,
          updatedAt: preparation.updatedAt
        }
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
 * @route   GET /api/preparations/my
 * @desc    Récupérer mes préparations
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
      .populate('agency', 'name code client')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Preparation.countDocuments(query);

    // Formater les préparations
    const formattedPreparations = preparations.map(prep => ({
      id: prep._id.toString(),
      vehicle: {
        licensePlate: prep.vehicleData?.licensePlate || 'N/A',
        brand: prep.vehicleData?.brand || 'N/A',
        model: prep.vehicleData?.model || 'Véhicule',
        vehicleType: prep.vehicleData?.vehicleType || 'particulier'
      },
      agency: prep.agency ? {
        id: prep.agency._id.toString(),
        name: prep.agency.name,
        code: prep.agency.code,
        client: prep.agency.client
      } : null,
      status: prep.status,
      progress: prep.progress || 0,
      startTime: prep.startTime,
      endTime: prep.endTime,
      totalTime: prep.totalTime,
      isOnTime: prep.isOnTime,
      createdAt: prep.createdAt
    }));

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
 * @route   GET /api/preparations/user-agencies
 * @desc    Récupérer les agences de l'utilisateur
 * @access  Preparateur
 */
router.get('/user-agencies', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('🏢 Récupération agences utilisateur:', userId);
    
    const user = await User.findById(userId).populate('agencies', 'name code client workingHours isActive');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

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
 * @route   PUT /api/preparations/:id/step
 * @desc    Compléter une étape - VERSION OPTIMISÉE AVEC VRAI CLOUDINARY
 * @access  Preparateur
 */
router.put('/:id/step', uploadPreparationPhoto, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { step, notes = '' } = req.body;
    const userId = req.user.userId;

    // ✅ RÉCUPÉRATION URL CLOUDINARY RÉELLE (pas de simulation)
    const photoUrl = req.uploadedFile?.secure_url || req.body.photoUrl;

    console.log('📸 Upload Cloudinary:', {
      step,
      hasCloudinaryUrl: !!photoUrl,
      cloudinaryUrl: photoUrl?.substring(0, 60) + '...'
    });

    // ✅ VALIDATION ULTRA-RAPIDE
    if (!step || !photoUrl || !['exterior', 'interior', 'fuel', 'tires_fluids', 'special_wash', 'parking'].includes(step)) {
      return res.status(400).json({
        success: false,
        message: !step ? 'Étape requise' : !photoUrl ? 'Upload photo échoué' : 'Étape invalide'
      });
    }

    // ✅ MISE À JOUR ATOMIQUE - Une seule requête DB avec URL Cloudinary réelle
    const updateResult = await Preparation.updateOne(
      {
        _id: id,
        user: userId,
        status: 'in_progress',
        'steps.step': step,
        'steps.completed': false
      },
      {
        $set: {
          'steps.$.completed': true,
          'steps.$.completedAt': new Date(),
          'steps.$.notes': notes,
          'steps.$.photos': [{
            url: photoUrl, // ✅ URL CLOUDINARY RÉELLE
            description: `Photo ${step}`,
            uploadedAt: new Date()
          }],
          updatedAt: new Date()
        }
      }
    );

    // ✅ VÉRIFICATION RÉSULTAT
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée, terminée ou étape déjà complétée'
      });
    }

    // ✅ CALCUL PROGRESSION - Pipeline d'agrégation
    const [progressResult] = await Preparation.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $project: {
          progress: {
            $multiply: [
              { $divide: [
                { $size: { $filter: { input: "$steps", cond: { $eq: ["$this.completed", true] } } } },
                { $size: "$steps" }
              ]},
              100
            ]
          },
          currentDuration: {
            $divide: [{ $subtract: [new Date(), "$startTime"] }, 60000]
          }
        }
      }
    ]);

    // ✅ MISE À JOUR PROGRESSION
    await Preparation.updateOne(
      { _id: id },
      {
        $set: {
          progress: Math.round(progressResult?.progress || 0),
          currentDuration: Math.floor(progressResult?.currentDuration || 0),
          isOnTime: (progressResult?.currentDuration || 0) <= 30
        }
      }
    );

    const executionTime = Date.now() - startTime;
    console.log(`✅ Étape ${step} complétée avec Cloudinary en ${executionTime}ms`);

    // ✅ RÉPONSE AVEC URL CLOUDINARY RÉELLE
    return res.json({
      success: true,
      message: `Étape ${step} complétée`,
      data: {
        step,
        completed: true,
        photoUrl, // ✅ URL CLOUDINARY RÉELLE dans la réponse
        progress: Math.round(progressResult?.progress || 0),
        duration: Math.floor(progressResult?.currentDuration || 0),
        executionTime
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Erreur étape avec Cloudinary (${executionTime}ms):`, error.message);
    
    // ✅ RÉPONSE D'ERREUR
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Erreur traitement photo',
        executionTime
      });
    }
  }
});

/**
 * @route   POST /api/preparations/:id/complete
 * @desc    Terminer une préparation
 * @access  Preparateur
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const preparationId = req.params.id;
    const userId = req.user.userId;
    const { notes } = req.body;

    console.log('🏁 Finalisation préparation:', { preparationId, userId });

    // Vérifier que la préparation existe et appartient à l'utilisateur
    const preparation = await Preparation.findOne({
      _id: preparationId,
      user: userId
    });

    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée ou accès refusé'
      });
    }

    // Vérifier que la préparation est en cours
    if (preparation.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Cette préparation est déjà terminée'
      });
    }

    // Finaliser la préparation
    preparation.status = 'completed';
    preparation.endTime = new Date();
    preparation.totalTime = Math.floor((preparation.endTime.getTime() - preparation.startTime.getTime()) / (1000 * 60));
    preparation.isOnTime = preparation.totalTime <= 30; // 30 minutes max
    
    if (notes && notes.trim()) {
      preparation.notes = notes.trim();
    }

    // Sauvegarder
    await preparation.save();

    console.log('✅ Préparation finalisée avec succès');

    res.json({
      success: true,
      message: 'Préparation terminée avec succès',
      data: {
        preparation: {
          id: preparation._id.toString(),
          status: preparation.status,
          endTime: preparation.endTime,
          totalTime: preparation.totalTime,
          isOnTime: preparation.isOnTime,
          progress: preparation.progress
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
});

/**
 * @route   POST /api/preparations/:id/issue
 * @desc    Signaler un incident
 * @access  Preparateur
 */
router.post('/:id/issue', async (req, res) => {
  try {
    const preparationId = req.params.id;
    const userId = req.user.userId;
    const { type, description, severity = 'medium' } = req.body;

    console.log('🚨 Signalement incident:', { preparationId, type, severity });

    // Vérifier que la préparation existe et appartient à l'utilisateur
    const preparation = await Preparation.findOne({
      _id: preparationId,
      user: userId
    });

    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée ou accès refusé'
      });
    }

    // Créer l'incident
    const issue = {
      id: new Date().getTime().toString(),
      type,
      description,
      severity,
      reportedAt: new Date(),
      resolved: false,
      photos: []
    };

    // Ajouter l'incident à la préparation
    if (!preparation.issues) {
      preparation.issues = [];
    }
    preparation.issues.push(issue);

    // Sauvegarder
    await preparation.save();

    console.log('✅ Incident signalé avec succès');

    res.json({
      success: true,
      message: 'Incident signalé avec succès',
      data: {
        issue: issue
      }
    });

  } catch (error) {
    console.error('❌ Erreur signalement incident:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du signalement de l\'incident'
    });
  }
});

/**
 * @route   GET /api/preparations/vehicle-history/:licensePlate
 * @desc    Historique des préparations d'un véhicule
 * @access  Preparateur
 */
router.get('/vehicle-history/:licensePlate', async (req, res) => {
  try {
    const { licensePlate } = req.params;
    const { limit = 10 } = req.query;

    // Rechercher par plaque dans vehicleData
    const preparations = await Preparation.find({
      'vehicleData.licensePlate': licensePlate.toUpperCase()
    })
    .populate('user', 'firstName lastName')
    .populate('agency', 'name code')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    const formattedPreparations = preparations.map(prep => ({
      id: prep._id.toString(),
      vehicle: {
        licensePlate: prep.vehicleData?.licensePlate || 'N/A',
        brand: prep.vehicleData?.brand || 'N/A',
        model: prep.vehicleData?.model || 'Véhicule'
      },
      user: prep.user ? {
        name: `${prep.user.firstName} ${prep.user.lastName}`
      } : null,
      agency: prep.agency ? {
        name: prep.agency.name,
        code: prep.agency.code
      } : null,
      status: prep.status,
      progress: prep.progress || 0,
      startTime: prep.startTime,
      endTime: prep.endTime,
      totalTime: prep.totalTime,
      createdAt: prep.createdAt
    }));

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