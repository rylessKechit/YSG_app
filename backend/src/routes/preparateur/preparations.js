// backend/src/routes/preparateur/preparations.js
// ✅ Routes des préparations avec importations et middlewares corrigés

const express = require('express');
const router = express.Router();

// ===== IMPORTATIONS CORRIGÉES =====

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
  uploadPreparationPhoto, 
  requirePhoto 
} = require('../../middleware/upload');

// Modèles
const Preparation = require('../../models/Preparation');
const Agency = require('../../models/Agency');
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');

// Utilitaires
const { PREPARATION_STATUS } = require('../../utils/constants');

// ===== APPLICATION DES MIDDLEWARES =====

// Appliquer l'authentification et l'autorisation préparateur sur toutes les routes
router.use(auth);
router.use(preparateurAuth);

// ===== ROUTES =====

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
    
    // Filtrer les agences actives
    const activeAgencies = user.agencies.filter(agency => agency.isActive);
    
    console.log('✅ Agences récupérées:', activeAgencies.length);
    
    res.json({
      success: true,
      data: {
        agencies: activeAgencies.map((agency, index) => ({
          id: agency._id,
          name: agency.name,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          isDefault: index === 0 // Première agence = défaut
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération agences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agences'
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
    
    console.log('📋 Récupération préparation courante:', userId);
    
    const preparation = await Preparation.findOne({
      user: userId,
      status: PREPARATION_STATUS.IN_PROGRESS
    }).populate([
      { path: 'vehicle' },
      { path: 'agency', select: 'name code client' }
    ]);

    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Aucune préparation en cours'
      });
    }

    console.log('✅ Préparation courante récupérée:', preparation._id);

    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id,
          vehicle: {
            id: preparation.vehicle._id,
            licensePlate: preparation.vehicle.licensePlate,
            brand: preparation.vehicle.brand,
            model: preparation.vehicle.model,
            color: preparation.vehicle.color,
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
    console.error('❌ Erreur récupération préparation courante:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la préparation'
    });
  }
});

/**
 * @route   POST /api/preparations/start
 * @desc    Démarrer une nouvelle préparation avec véhicule
 * @access  Preparateur
 */
router.post('/start',
  validateBody(preparationSchemas.startWithVehicle),
  async (req, res) => {
    try {
      const { agencyId, licensePlate, brand, model, color, year, fuelType, condition, notes } = req.body;
      const userId = req.user.userId;

      console.log('🚀 Démarrage nouvelle préparation:', { licensePlate, brand, model, agencyId });

      // Vérifier qu'il n'y a pas déjà une préparation en cours
      const existingPreparation = await Preparation.findOne({
        user: userId,
        status: PREPARATION_STATUS.IN_PROGRESS
      });

      if (existingPreparation) {
        return res.status(400).json({
          success: false,
          message: 'Vous avez déjà une préparation en cours',
          data: { currentPreparationId: existingPreparation._id }
        });
      }

      // Vérifier que l'agence existe et est assignée à l'utilisateur
      const user = await User.findById(userId).populate('agencies');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const assignedAgency = user.agencies.find(agency => agency._id.toString() === agencyId);
      if (!assignedAgency) {
        return res.status(403).json({
          success: false,
          message: 'Agence non autorisée pour cet utilisateur'
        });
      }

      // Créer ou récupérer le véhicule
      let vehicle = await Vehicle.findOne({ licensePlate: licensePlate.toUpperCase() });
      
      if (!vehicle) {
        vehicle = await Vehicle.create({
          licensePlate: licensePlate.toUpperCase(),
          brand,
          model,
          color,
          year,
          fuelType,
          agency: agencyId,
          status: 'in_preparation'
        });
        console.log('🚗 Nouveau véhicule créé:', vehicle.licensePlate);
      } else {
        // Mettre à jour les informations du véhicule
        vehicle.brand = brand;
        vehicle.model = model;
        vehicle.color = color || vehicle.color;
        vehicle.year = year || vehicle.year;
        vehicle.fuelType = fuelType || vehicle.fuelType;
        vehicle.status = 'in_preparation';
        vehicle.agency = agencyId;
        await vehicle.save();
        console.log('🔄 Véhicule mis à jour:', vehicle.licensePlate);
      }

      // Créer la préparation
      const preparation = await Preparation.create({
        vehicle: vehicle._id,
        user: userId,
        agency: agencyId,
        status: PREPARATION_STATUS.IN_PROGRESS,
        notes: notes || '',
        // Les étapes seront créées automatiquement par le middleware pre-save
      });

      // Mettre à jour le véhicule avec la préparation courante
      vehicle.currentPreparation = preparation._id;
      await vehicle.save();

      // Recharger avec les relations pour la réponse
      await preparation.populate([
        { path: 'vehicle' },
        { path: 'agency', select: 'name code client' },
        { path: 'user', select: 'firstName lastName' }
      ]);

      console.log('✅ Préparation démarrée:', preparation._id);

      res.status(201).json({
        success: true,
        message: 'Préparation démarrée avec succès',
        data: {
          preparation: {
            id: preparation._id,
            vehicle: {
              id: preparation.vehicle._id,
              licensePlate: preparation.vehicle.licensePlate,
              brand: preparation.vehicle.brand,
              model: preparation.vehicle.model,
              color: preparation.vehicle.color,
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
      res.status(500).json({
        success: false,
        message: 'Erreur lors du démarrage de la préparation'
      });
    }
  }
);

/**
 * @route   PUT /api/preparations/:id/step
 * @desc    Compléter une étape de préparation avec photo
 * @access  Preparateur
 */
router.put('/:id/step',
  validateObjectId(),
  uploadPreparationPhoto,
  validatePreparationUpload,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { step, notes } = req.body; // ✅ Utilise 'step' au lieu de 'stepType'
      const userId = req.user.userId;
      const photoUrl = req.uploadedFile?.secure_url;

      console.log('📸 Complétion étape:', { preparationId: id, step, photoUrl: !!photoUrl });

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

      // ✅ CORRECTION: Trouver l'étape avec la propriété 'step'
      const stepToComplete = preparation.steps.find(s => s.step === step);
      if (!stepToComplete) {
        return res.status(400).json({
          success: false,
          message: `Type d'étape invalide: ${step}`
        });
      }

      if (stepToComplete.completed) {
        return res.status(400).json({
          success: false,
          message: 'Cette étape est déjà complétée'
        });
      }

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
      await preparation.populate('agency', 'name code client');

      console.log('✅ Étape complétée:', step, `(${preparation.progress}%)`);

      res.json({
        success: true,
        message: `Étape "${step}" complétée avec succès`,
        data: {
          preparation: {
            id: preparation._id,
            vehicle: preparation.vehicle,
            agency: preparation.agency,
            startTime: preparation.startTime,
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
 * @desc    Terminer une préparation
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

      // Vérifier que toutes les étapes sont complétées
      const incompleteSteps = preparation.steps.filter(step => !step.completed);
      if (incompleteSteps.length > 0) {
        return res.status(400).json({
          success: false,
          message: `${incompleteSteps.length} étape(s) non complétée(s)`,
          data: { 
            incompleteSteps: incompleteSteps.map(s => s.step) 
          }
        });
      }

      // Finaliser la préparation
      await preparation.complete(notes);

      // Mettre à jour le statut du véhicule
      await Vehicle.findByIdAndUpdate(preparation.vehicle, {
        status: 'ready',
        currentPreparation: null
      });

      // Recharger avec les relations
      await preparation.populate([
        { path: 'vehicle' },
        { path: 'agency', select: 'name code client' }
      ]);

      console.log('✅ Préparation terminée:', preparation._id, `(${preparation.totalTime}min)`);

      res.json({
        success: true,
        message: 'Préparation terminée avec succès',
        data: {
          preparation: {
            id: preparation._id,
            vehicle: preparation.vehicle,
            agency: preparation.agency,
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
      const photoUrl = req.uploadedFile?.secure_url;

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
          preparation: {
            id: preparation._id,
            issues: preparation.issues
          }
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

/**
 * @route   GET /api/preparations/history
 * @desc    Récupérer l'historique des préparations de l'utilisateur
 * @access  Preparateur
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, search, agencyId, startDate, endDate } = req.query;

    console.log('📋 Récupération historique préparations:', userId);

    // Construire le filtre
    const filter = { user: userId };

    if (search) {
      filter.$or = [
        { 'vehicle.licensePlate': { $regex: search, $options: 'i' } },
        { 'vehicle.brand': { $regex: search, $options: 'i' } },
        { 'vehicle.model': { $regex: search, $options: 'i' } }
      ];
    }

    if (agencyId) {
      filter.agency = agencyId;
    }

    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Requête avec pagination
    const [preparations, total] = await Promise.all([
      Preparation.find(filter)
        .populate('agency', 'name code client')
        .populate('vehicle')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Preparation.countDocuments(filter)
    ]);

    console.log('✅ Historique récupéré:', preparations.length, 'préparations');

    res.json({
      success: true,
      data: {
        preparations: preparations.map(prep => ({
          id: prep._id,
          vehicle: prep.vehicle,
          agency: prep.agency,
          startTime: prep.startTime,
          endTime: prep.endTime,
          status: prep.status,
          progress: prep.progress,
          totalTime: prep.totalTime,
          isOnTime: prep.isOnTime,
          issues: prep.issues?.length || 0
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
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
 * @desc    Récupérer les statistiques personnelles du préparateur
 * @access  Preparateur
 */
router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period = 'month' } = req.query;

    console.log('📊 Récupération statistiques utilisateur:', userId);

    // Calculer la période
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Requêtes de statistiques
    const [totalPreparations, completedPreparations, avgTimeResult, onTimeCount] = await Promise.all([
      Preparation.countDocuments({ user: userId, startTime: { $gte: startDate } }),
      Preparation.countDocuments({ 
        user: userId, 
        status: 'completed', 
        startTime: { $gte: startDate } 
      }),
      Preparation.aggregate([
        { 
          $match: { 
            user: userId, 
            status: 'completed', 
            startTime: { $gte: startDate },
            totalTime: { $exists: true, $ne: null }
          }
        },
        { 
          $group: { 
            _id: null, 
            avgTime: { $avg: '$totalTime' } 
          } 
        }
      ]),
      Preparation.countDocuments({ 
        user: userId, 
        status: 'completed', 
        isOnTime: true, 
        startTime: { $gte: startDate } 
      })
    ]);

    const averageTime = avgTimeResult.length > 0 ? Math.round(avgTimeResult[0].avgTime) : 0;
    const completionRate = totalPreparations > 0 ? Math.round((completedPreparations / totalPreparations) * 100) : 0;
    const onTimeRate = completedPreparations > 0 ? Math.round((onTimeCount / completedPreparations) * 100) : 0;

    console.log('✅ Statistiques calculées:', { totalPreparations, completionRate, averageTime, onTimeRate });

    res.json({
      success: true,
      data: {
        stats: {
          period,
          totalPreparations,
          completedPreparations,
          completionRate,
          averageTime,
          onTimeRate,
          calculatedAt: now
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur calcul statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques'
    });
  }
});

module.exports = router;