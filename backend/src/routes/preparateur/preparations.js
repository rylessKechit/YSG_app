// backend/src/routes/preparateur/preparations.js
// ✅ VERSION ALLÉGÉE ET PROPRE

const express = require('express');
const router = express.Router();

// Imports
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');
const { validateBody, validateObjectId, preparationSchemas, validatePreparationUpload } = require('../../middleware/validation');
const { uploadPreparationPhoto } = require('../../middleware/upload');
const Preparation = require('../../models/Preparation');
const Agency = require('../../models/Agency');
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');
const { PREPARATION_STATUS, VEHICLE_STATUS } = require('../../utils/constants');

// Middlewares globaux
router.use(auth);
router.use(preparateurAuth);

/**
 * GET /api/preparations/user-agencies
 * Récupérer les agences de l'utilisateur
 */
router.get('/user-agencies', async (req, res) => {
  try {
    const { userId, role } = req.user;
    
    if (role === 'admin') {
      const agencies = await Agency.find({ isActive: true })
        .select('name code client workingHours')
        .sort({ name: 1 });
      
      return res.json({
        success: true,
        data: { agencies }
      });
    }
    
    const user = await User.findById(userId).populate('agencies', 'name code client workingHours isActive');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    const activeAgencies = user.agencies.filter(agency => agency.isActive);
    
    res.json({
      success: true,
      data: { agencies: activeAgencies }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agences'
    });
  }
});

/**
 * GET /api/preparations/current
 * Récupérer la préparation en cours
 */
router.get('/current', async (req, res) => {
  try {
    const { userId, role } = req.user;
    
    if (role === 'admin') {
      return res.json({
        success: true,
        data: { preparation: null },
        message: 'Aucune préparation en cours (utilisateur administrateur)'
      });
    }
    
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
        data: { preparation: null }
      });
    }

    // Calculs
    const startTime = new Date(preparation.startTime);
    const now = new Date();
    const currentDuration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
    const completedSteps = preparation.steps.filter(step => step.completed).length;
    const totalSteps = preparation.steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id,
          vehicle: preparation.vehicle ? {
            id: preparation.vehicle._id,
            licensePlate: preparation.vehicle.licensePlate,
            brand: preparation.vehicle.brand,
            model: preparation.vehicle.model
          } : preparation.vehicleInfo,
          agency: {
            id: preparation.agency._id,
            name: preparation.agency.name,
            code: preparation.agency.code,
            client: preparation.agency.client
          },
          startTime: preparation.startTime,
          status: preparation.status,
          steps: preparation.steps.map(step => ({
            step: step.step,
            label: step.label,
            completed: step.completed,
            completedAt: step.completedAt,
            notes: step.notes,
            photos: step.photos || []
          })),
          progress,
          currentDuration,
          isOnTime: currentDuration <= 45,
          issues: preparation.issues || [],
          notes: preparation.notes
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la préparation en cours'
    });
  }
});

/**
 * POST /api/preparations/start
 * Démarrer une nouvelle préparation
 */
router.post('/start', validateBody(preparationSchemas.startWithVehicle), async (req, res) => {
  try {
    const { agencyId, licensePlate, brand, model, year, fuelType, color, condition, notes } = req.body;
    const { userId, role } = req.user;

    // Vérifier qu'il n'y a pas de préparation en cours
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

    // Vérifier l'agence
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    // Vérifier l'accès à l'agence pour les préparateurs
    if (role === 'preparateur') {
      const user = await User.findById(userId).populate('agencies');
      const hasAccess = user.agencies.some(userAgency => 
        userAgency._id.toString() === agencyId.toString()
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé à cette agence'
        });
      }
    }

    // Gérer le véhicule
    let vehicle = await Vehicle.findOne({ licensePlate: licensePlate.trim() });
    let vehicleInfo = null;

    if (vehicle) {
      if (vehicle.currentPreparation) {
        return res.status(400).json({
          success: false,
          message: 'Ce véhicule est déjà en cours de préparation'
        });
      }
      vehicle.status = VEHICLE_STATUS.IN_PREPARATION;
    } else {
      vehicleInfo = {
        licensePlate: licensePlate.trim(),
        brand: brand.trim(),
        model: model.trim(),
        year: year || null,
        fuelType: fuelType || null,
        color: color?.trim() || null,
        condition: condition || 'bon'
      };
    }

    // Créer la préparation
    const preparation = new Preparation({
      user: userId,
      agency: agencyId,
      vehicle: vehicle ? vehicle._id : null,
      vehicleInfo,
      status: PREPARATION_STATUS.IN_PROGRESS,
      startTime: new Date(),
      notes: notes?.trim() || ''
    });

    await preparation.save();

    if (vehicle) {
      vehicle.currentPreparation = preparation._id;
      await vehicle.save();
    }

    // Recharger avec relations
    await preparation.populate([
      { path: 'vehicle' },
      { path: 'agency', select: 'name code client' },
      { path: 'user', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Préparation démarrée avec succès',
      data: {
        preparation: {
          id: preparation._id,
          vehicle: vehicle ? {
            id: preparation.vehicle._id,
            licensePlate: preparation.vehicle.licensePlate,
            brand: preparation.vehicle.brand,
            model: preparation.vehicle.model
          } : vehicleInfo,
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
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la préparation'
    });
  }
});

/**
 * PUT /api/preparations/:id/step
 * Compléter une étape avec photo
 */
router.put('/:id/step',
  validateObjectId(),
  uploadPreparationPhoto,
  validatePreparationUpload,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { step, notes } = req.body;
      const { userId, role } = req.user;
      const photoUrl = req.uploadedFile?.url || req.uploadedFile?.secure_url;

      if (!photoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Photo requise pour compléter l\'étape'
        });
      }

      // Récupérer la préparation
      const query = { _id: id, status: PREPARATION_STATUS.IN_PROGRESS };
      if (role !== 'admin') {
        query.user = userId;
      }

      const preparation = await Preparation.findOne(query);
      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée ou déjà terminée'
        });
      }

      // Trouver et compléter l'étape
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

      stepToComplete.completed = true;
      stepToComplete.completedAt = new Date();
      stepToComplete.notes = notes || '';
      
      if (!stepToComplete.photos) stepToComplete.photos = [];
      stepToComplete.photos.push({
        url: photoUrl,
        description: `Photo étape ${step}`,
        uploadedAt: new Date()
      });

      await preparation.save();
      await preparation.populate(['vehicle', 'agency', 'user']);

      res.json({
        success: true,
        message: `Étape "${step}" complétée avec succès`,
        data: {
          preparation: {
            id: preparation._id,
            vehicle: preparation.vehicle || preparation.vehicleInfo,
            agency: {
              id: preparation.agency._id,
              name: preparation.agency.name,
              code: preparation.agency.code,
              client: preparation.agency.client
            },
            startTime: preparation.startTime,
            status: preparation.status,
            steps: preparation.steps.map(s => ({
              step: s.step,
              label: s.label,
              completed: s.completed,
              completedAt: s.completedAt,
              notes: s.notes,
              photos: s.photos || []
            })),
            progress: preparation.progress,
            currentDuration: preparation.currentDuration,
            isOnTime: preparation.isOnTime,
            issues: preparation.issues || [],
            notes: preparation.notes
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la complétion de l\'étape'
      });
    }
  }
);

/**
 * POST /api/preparations/:id/complete
 * Terminer une préparation (workflow flexible)
 */
router.post('/:id/complete',
  validateObjectId(),
  validateBody(preparationSchemas.completePreparation),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const { userId, role } = req.user;

      // Récupérer la préparation
      const query = { _id: id, status: PREPARATION_STATUS.IN_PROGRESS };
      if (role !== 'admin') {
        query.user = userId;
      }

      const preparation = await Preparation.findOne(query);
      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée ou déjà terminée'
        });
      }

      // Validation flexible: au moins une étape complétée
      const completedSteps = preparation.steps.filter(step => step.completed);
      if (completedSteps.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Au moins une étape doit être complétée pour terminer la préparation'
        });
      }

      const remainingSteps = preparation.steps.filter(step => !step.completed);

      // Finaliser
      preparation.status = PREPARATION_STATUS.COMPLETED;
      preparation.endTime = new Date();
      preparation.notes = notes || preparation.notes || '';

      const startTime = new Date(preparation.startTime);
      const endTime = new Date(preparation.endTime);
      preparation.totalTime = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      await preparation.save();

      // Mettre à jour le véhicule
      if (preparation.vehicle) {
        await Vehicle.findByIdAndUpdate(preparation.vehicle, {
          status: VEHICLE_STATUS.READY,
          currentPreparation: null,
          lastPreparationDate: new Date()
        });
      }

      await preparation.populate(['vehicle', 'agency', 'user']);

      res.json({
        success: true,
        message: `Préparation terminée avec succès (${completedSteps.length}/${preparation.steps.length} étapes complétées)`,
        data: {
          preparation: {
            id: preparation._id,
            status: preparation.status,
            startTime: preparation.startTime,
            endTime: preparation.endTime,
            totalTime: preparation.totalTime,
            progress: preparation.progress,
            completedSteps: completedSteps.length,
            totalSteps: preparation.steps.length,
            stepsCompleted: completedSteps.map(step => step.step),
            stepsSkipped: remainingSteps.map(step => step.step),
            notes: preparation.notes,
            vehicle: preparation.vehicle || preparation.vehicleInfo,
            agency: {
              id: preparation.agency._id,
              name: preparation.agency.name,
              code: preparation.agency.code
            }
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la finalisation de la préparation'
      });
    }
  }
);

/**
 * GET /api/preparations/my-stats
 * Statistiques personnelles
 */
router.get('/my-stats', async (req, res) => {
  try {
    const { userId, role } = req.user;
    
    if (role === 'admin') {
      const [totalPreparations, completedToday, inProgress] = await Promise.all([
        Preparation.countDocuments(),
        Preparation.countDocuments({ 
          status: PREPARATION_STATUS.COMPLETED,
          endTime: { $gte: new Date().setHours(0, 0, 0, 0) }
        }),
        Preparation.countDocuments({ status: PREPARATION_STATUS.IN_PROGRESS })
      ]);
      
      return res.json({
        success: true,
        data: {
          stats: {
            totalPreparations,
            completedToday,
            inProgress,
            averageTime: 0,
            completionRate: 100,
            isAdmin: true
          }
        }
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    
    const [totalPreparations, completedToday, weekPreparations, avgTimeResult] = await Promise.all([
      Preparation.countDocuments({ user: userId }),
      Preparation.countDocuments({ 
        user: userId, 
        status: PREPARATION_STATUS.COMPLETED,
        endTime: { $gte: today }
      }),
      Preparation.countDocuments({ 
        user: userId,
        startTime: { $gte: weekStart }
      }),
      Preparation.aggregate([
        { $match: { user: userId, totalTime: { $exists: true } } },
        { $group: { _id: null, avgTime: { $avg: '$totalTime' } } }
      ])
    ]);
    
    const averageTime = avgTimeResult[0]?.avgTime || 0;
    
    res.json({
      success: true,
      data: {
        stats: {
          totalPreparations,
          completedToday,
          weekPreparations,
          averageTime: Math.round(averageTime),
          completionRate: 95,
          isAdmin: false
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

/**
 * POST /api/preparations/:id/issue
 * Signaler un incident
 */
router.post('/:id/issue',
  validateObjectId(),
  uploadPreparationPhoto,
  validateBody(preparationSchemas.reportIssue),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type, description, severity = 'medium' } = req.body;
      const { userId, role } = req.user;
      const photoUrl = req.uploadedFile?.url || req.uploadedFile?.secure_url;

      const query = { _id: id };
      if (role !== 'admin') {
        query.user = userId;
      }

      const preparation = await Preparation.findOne(query);
      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée'
        });
      }

      const incident = {
        type: type.trim(),
        description: description.trim(),
        severity,
        reportedAt: new Date(),
        reportedBy: userId,
        resolved: false
      };

      if (photoUrl) {
        incident.photos = [photoUrl];
      }

      if (!preparation.issues) {
        preparation.issues = [];
      }
      preparation.issues.push(incident);

      await preparation.save();

      res.json({
        success: true,
        message: 'Incident signalé avec succès',
        data: {
          incident: {
            id: preparation.issues[preparation.issues.length - 1]._id,
            type: incident.type,
            description: incident.description,
            severity: incident.severity,
            reportedAt: incident.reportedAt,
            hasPhoto: !!photoUrl
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors du signalement de l\'incident'
      });
    }
  }
);

/**
 * GET /api/preparations/:id
 * Récupérer une préparation par ID
 */
router.get('/:id', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    const query = { _id: id };
    if (role !== 'admin') {
      query.user = userId;
    }

    const preparation = await Preparation.findOne(query)
      .populate('vehicle')
      .populate('agency', 'name code client')
      .populate('user', 'firstName lastName email');

    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée'
      });
    }

    let currentDuration = 0;
    if (preparation.status === PREPARATION_STATUS.IN_PROGRESS) {
      const startTime = new Date(preparation.startTime);
      const now = new Date();
      currentDuration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
    }

    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id,
          vehicle: preparation.vehicle || preparation.vehicleInfo,
          agency: {
            id: preparation.agency._id,
            name: preparation.agency.name,
            code: preparation.agency.code,
            client: preparation.agency.client
          },
          user: role === 'admin' && preparation.user ? {
            id: preparation.user._id,
            firstName: preparation.user.firstName,
            lastName: preparation.user.lastName,
            email: preparation.user.email
          } : undefined,
          startTime: preparation.startTime,
          endTime: preparation.endTime,
          status: preparation.status,
          steps: preparation.steps.map(step => ({
            step: step.step,
            label: step.label,
            completed: step.completed,
            completedAt: step.completedAt,
            notes: step.notes,
            photos: step.photos || []
          })),
          progress: preparation.progress,
          currentDuration,
          totalTime: preparation.totalTime,
          isOnTime: preparation.isOnTime,
          issues: preparation.issues || [],
          notes: preparation.notes,
          createdAt: preparation.createdAt,
          updatedAt: preparation.updatedAt
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la préparation'
    });
  }
});

module.exports = router;