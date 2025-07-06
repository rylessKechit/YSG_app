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
        agencies: activeAgencies
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
 * @desc    Récupérer la préparation en cours de l'utilisateur
 * @access  Preparateur
 */
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('🔍 Recherche préparation en cours:', userId);
    
    const preparation = await Preparation.findOne({
      user: userId,
      status: PREPARATION_STATUS.IN_PROGRESS
    }).populate([
      { path: 'vehicle' },
      { path: 'agency', select: 'name code client' },
      { path: 'user', select: 'firstName lastName' }
    ]);

    if (!preparation) {
      return res.json({
        success: true,
        data: {
          preparation: null
        }
      });
    }

    console.log('✅ Préparation en cours trouvée:', preparation._id);

    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id,
          vehicle: preparation.vehicle || preparation.vehicleInfo,
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
      const { 
        agencyId, 
        licensePlate, 
        brand, 
        model
        // ❌ SUPPRIMÉ: year, fuelType, notes, color, condition
      } = req.body;
      const userId = req.user.userId;

      console.log('🚀 Démarrage préparation:', { agencyId, licensePlate, userId });

      // Vérifier qu'il n'y a pas déjà une préparation en cours pour cet utilisateur
      const existingPreparation = await Preparation.findOne({
        user: userId,
        status: PREPARATION_STATUS.IN_PROGRESS
      });

      if (existingPreparation) {
        return res.status(400).json({
          success: false,
          message: 'Une préparation est déjà en cours'
        });
      }

      // Vérifier l'autorisation sur l'agence
      const user = await User.findById(userId).populate('agencies');
      const assignedAgency = user.agencies.find(agency => agency._id.toString() === agencyId);
      if (!assignedAgency) {
        return res.status(403).json({
          success: false,
          message: 'Agence non autorisée pour cet utilisateur'
        });
      }

      // ✅ ÉTAPE 1: Créer ou récupérer le véhicule SIMPLIFIÉ
      let vehicle = await Vehicle.findOne({ licensePlate: licensePlate.toUpperCase() });
      
      if (!vehicle) {
        vehicle = await Vehicle.create({
          licensePlate: licensePlate.toUpperCase(),
          brand,
          model,
          agency: agencyId,
          status: 'available' // ✅ Créer d'abord en available
          // ❌ SUPPRIMÉ: year, fuelType
        });
        console.log('🚗 Nouveau véhicule créé:', vehicle.licensePlate);
      } else {
        // Mettre à jour les informations du véhicule (MINIMAL)
        vehicle.brand = brand;
        vehicle.model = model;
        vehicle.agency = agencyId;
        await vehicle.save();
        console.log('🔄 Véhicule mis à jour:', vehicle.licensePlate);
      }

      // ✅ ÉTAPE 2: Créer la préparation SIMPLIFIÉE
      const preparation = await Preparation.create({
        vehicle: vehicle._id,
        // ✅ Sauvegarder les infos véhicule minimales
        vehicleInfo: {
          licensePlate: vehicle.licensePlate,
          brand: vehicle.brand,
          model: vehicle.model
          // ❌ SUPPRIMÉ: year, fuelType
        },
        user: userId,           // ✅ Champ principal
        preparateur: userId,    // ✅ Champ pour compatibilité
        agency: agencyId,
        status: PREPARATION_STATUS.IN_PROGRESS
        // ❌ SUPPRIMÉ: notes
      });

      console.log('✅ Préparation créée:', preparation._id);

      // ✅ ÉTAPE 3: Maintenant mettre à jour le véhicule avec la préparation
      vehicle.status = 'in_preparation';
      vehicle.currentPreparation = preparation._id;
      await vehicle.save();

      console.log('✅ Véhicule mis à jour avec la préparation');

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
              model: preparation.vehicle.model
              // ❌ SUPPRIMÉ: year, fuelType
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
      const { step, notes } = req.body;
      const userId = req.user.userId;
      const photoUrl = req.uploadedFile?.url || req.uploadedFile?.secure_url;

      console.log('📸 Complétion étape:', { 
        preparationId: id, 
        step, 
        hasPhoto: !!photoUrl 
      });

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

      // Trouver l'étape avec la propriété 'step'
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
      await preparation.populate(['vehicle', 'agency', 'user']);

      console.log('✅ Étape complétée:', step, 'Photo URL:', photoUrl);

      // ✅ CORRECTION: Structure manuelle au lieu de toApiResponse()
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
      preparation.status = PREPARATION_STATUS.COMPLETED;
      preparation.endTime = new Date();
      preparation.totalTime = Math.floor((preparation.endTime - preparation.startTime) / (1000 * 60)); // en minutes
      preparation.notes = notes || '';
      
      await preparation.save();

      // Mettre à jour le statut du véhicule
      await Vehicle.findByIdAndUpdate(preparation.vehicle, {
        status: 'ready',
        currentPreparation: null
      });

      // Recharger avec les relations pour la réponse
      await preparation.populate([
        { path: 'vehicle' },
        { path: 'agency', select: 'name code client' },
        { path: 'user', select: 'firstName lastName' }
      ]);

      console.log('✅ Préparation terminée:', preparation._id, `(${preparation.totalTime}min)`);

      // ✅ CORRECTION: Structure manuelle au lieu de toApiResponse()
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
            currentDuration: preparation.currentDuration,
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