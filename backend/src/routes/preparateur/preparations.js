const express = require('express');
const Preparation = require('../../models/Preparation');
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery } = require('../../middleware/validation');
const { uploadPreparationPhoto, uploadIncidentPhoto, requirePhoto, validatePreparationUpload } = require('../../middleware/upload');
const { preparationSchemas, querySchemas } = require('../../middleware/validation');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, PREPARATION_STEPS, STEP_LABELS } = require('../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification préparateur
router.use(auth, preparateurAuth);

/**
 * @route   POST /api/preparations/start
 * @desc    Démarrer une préparation avec informations véhicule
 * @access  Preparateur
 */
router.post('/start', validateBody(preparationSchemas.startWithVehicle), async (req, res) => {
  try {
    const { agencyId, vehicle: vehicleData, notes } = req.body;
    const userId = req.user.userId;

    // Vérifier l'accès à l'agence (flexibilité pour changer d'agence)
    const hasAccess = req.user.agencies.some(
      agency => agency._id.toString() === agencyId.toString()
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas accès à cette agence'
      });
    }

    // Vérifier qu'il n'y a pas déjà une préparation en cours
    const existingPreparation = await Preparation.findOne({
      user: userId,
      status: 'in_progress'
    });

    if (existingPreparation) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà une préparation en cours'
      });
    }

    // Créer la préparation avec les informations véhicule
    const preparation = new Preparation({
      vehicle: {
        licensePlate: vehicleData.licensePlate.toUpperCase(),
        brand: vehicleData.brand,
        model: vehicleData.model,
        color: vehicleData.color,
        year: vehicleData.year,
        fuelType: vehicleData.fuelType || 'essence',
        condition: vehicleData.condition || 'bon',
        notes: vehicleData.notes
      },
      user: userId,
      agency: agencyId,
      notes,
      startTime: new Date()
    });

    await preparation.save();

    // Charger les relations pour la réponse
    await preparation.populate('agency', 'name code client');

    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.PREPARATION_STARTED,
      data: {
        preparation: {
          id: preparation._id,
          vehicle: {
            licensePlate: preparation.vehicle.licensePlate,
            brand: preparation.vehicle.brand,
            model: preparation.vehicle.model,
            fullName: preparation.vehicleFullName,
            condition: preparation.vehicle.condition,
            color: preparation.vehicle.color,
            year: preparation.vehicle.year,
            fuelType: preparation.vehicle.fuelType
          },
          agency: preparation.agency,
          startTime: preparation.startTime,
          status: preparation.status,
          notes: preparation.notes,
          steps: preparation.steps.map(step => ({
            type: step.type,
            label: STEP_LABELS[step.type],
            completed: step.completed,
            completedAt: step.completedAt,
            photoUrl: step.photoUrl,
            notes: step.notes
          })),
          progress: preparation.progress,
          currentDuration: preparation.currentDuration
        }
      }
    });

  } catch (error) {
    console.error('Erreur démarrage préparation:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/preparations/:id/step
 * @desc    Compléter une étape de préparation avec photo
 * @access  Preparateur
 */
router.put('/:id/step', 
  validateObjectId('id'),
  ...uploadPreparationPhoto,
  requirePhoto,
  validatePreparationUpload,
  async (req, res) => {
    try {
      const { stepType, notes } = req.body;
      const preparationId = req.params.id;
      const userId = req.user.userId;

      // Récupérer la préparation
      const preparation = await Preparation.findById(preparationId)
        .populate('agency', 'name code');

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.PREPARATION_NOT_FOUND
        });
      }

      // Vérifier que c'est bien l'utilisateur qui a démarré cette préparation
      if (preparation.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }

      // Vérifier que la préparation est en cours
      if (preparation.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.PREPARATION_ALREADY_COMPLETED
        });
      }

      // Vérifier que le type d'étape est valide
      if (!Object.values(PREPARATION_STEPS).includes(stepType)) {
        return res.status(400).json({
          success: false,
          message: 'Type d\'étape invalide'
        });
      }

      // Compléter l'étape avec la photo uploadée
      const step = preparation.completeStep(
        stepType,
        req.uploadedFile.url,
        req.uploadedFile.publicId,
        notes
      );

      await preparation.save();

      res.json({
        success: true,
        message: SUCCESS_MESSAGES.STEP_COMPLETED,
        data: {
          step: {
            type: step.type,
            label: STEP_LABELS[step.type],
            completed: step.completed,
            completedAt: step.completedAt,
            photoUrl: step.photoUrl,
            notes: step.notes
          },
          preparation: {
            id: preparation._id,
            progress: preparation.progress,
            currentDuration: preparation.currentDuration,
            completedStepsCount: preparation.steps.filter(s => s.completed).length,
            totalStepsCount: preparation.steps.length
          }
        }
      });

    } catch (error) {
      console.error('Erreur complétion étape:', error);
      res.status(500).json({
        success: false,
        message: error.message || ERROR_MESSAGES.SERVER_ERROR
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
  validateObjectId('id'),
  validateBody(preparationSchemas.complete),
  async (req, res) => {
    try {
      const { notes } = req.body;
      const preparationId = req.params.id;
      const userId = req.user.userId;

      // Récupérer la préparation
      const preparation = await Preparation.findById(preparationId)
        .populate('agency', 'name code');

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.PREPARATION_NOT_FOUND
        });
      }

      // Vérifier que c'est bien l'utilisateur qui a démarré cette préparation
      if (preparation.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }

      // Vérifier que la préparation est en cours
      if (preparation.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: ERROR_MESSAGES.PREPARATION_ALREADY_COMPLETED
        });
      }

      // Terminer la préparation
      preparation.complete(notes);
      await preparation.save();

      // Mettre à jour les statistiques de l'utilisateur
      const user = await require('../../models/User').findById(userId);
      await user.updateStats();

      res.json({
        success: true,
        message: SUCCESS_MESSAGES.PREPARATION_COMPLETED,
        data: {
          preparation: {
            id: preparation._id,
            vehicle: {
              licensePlate: preparation.vehicle.licensePlate,
              brand: preparation.vehicle.brand,
              model: preparation.vehicle.model,
              fullName: preparation.vehicleFullName
            },
            agency: preparation.agency,
            startTime: preparation.startTime,
            endTime: preparation.endTime,
            totalMinutes: preparation.totalMinutes,
            isOnTime: preparation.isOnTime,
            status: preparation.status,
            notes: preparation.notes,
            progress: preparation.progress,
            summary: preparation.summary,
            completedSteps: preparation.steps.filter(step => step.completed).map(step => ({
              type: step.type,
              label: STEP_LABELS[step.type],
              completedAt: step.completedAt,
              photoUrl: step.photoUrl,
              notes: step.notes
            }))
          }
        }
      });

    } catch (error) {
      console.error('Erreur finalisation préparation:', error);
      res.status(500).json({
        success: false,
        message: error.message || ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
);

/**
 * @route   POST /api/preparations/:id/issue
 * @desc    Signaler un problème avec photo
 * @access  Preparateur
 */
router.post('/:id/issue',
  validateObjectId('id'),
  ...uploadIncidentPhoto,
  validateBody(preparationSchemas.addIssue),
  async (req, res) => {
    try {
      const { type, description } = req.body;
      const preparationId = req.params.id;
      const userId = req.user.userId;

      // Récupérer la préparation
      const preparation = await Preparation.findById(preparationId);

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: ERROR_MESSAGES.PREPARATION_NOT_FOUND
        });
      }

      // Vérifier que c'est bien l'utilisateur qui a démarré cette préparation
      if (preparation.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }

      // Ajouter le problème
      preparation.addIssue(
        type,
        description,
        req.uploadedFile?.url,
        req.uploadedFile?.publicId
      );

      await preparation.save();

      res.json({
        success: true,
        message: 'Problème signalé avec succès',
        data: {
          issue: preparation.issues[preparation.issues.length - 1]
        }
      });

    } catch (error) {
      console.error('Erreur signalement problème:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
);

/**
 * @route   GET /api/preparations/current
 * @desc    Obtenir la préparation en cours de l'utilisateur
 * @access  Preparateur
 */
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.userId;

    const preparation = await Preparation.findOne({
      user: userId,
      status: 'in_progress'
    })
    .populate('agency', 'name code client');

    if (!preparation) {
      return res.json({
        success: true,
        data: {
          preparation: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id,
          vehicle: {
            licensePlate: preparation.vehicle.licensePlate,
            brand: preparation.vehicle.brand,
            model: preparation.vehicle.model,
            fullName: preparation.vehicleFullName,
            condition: preparation.vehicle.condition,
            color: preparation.vehicle.color,
            year: preparation.vehicle.year,
            fuelType: preparation.vehicle.fuelType,
            notes: preparation.vehicle.notes
          },
          agency: preparation.agency,
          startTime: preparation.startTime,
          status: preparation.status,
          notes: preparation.notes,
          currentDuration: preparation.currentDuration,
          progress: preparation.progress,
          steps: preparation.steps.map(step => ({
            type: step.type,
            label: STEP_LABELS[step.type],
            completed: step.completed,
            completedAt: step.completedAt,
            photoUrl: step.photoUrl,
            notes: step.notes
          })),
          issues: preparation.issues
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération préparation courante:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/preparations/history
 * @desc    Obtenir l'historique des préparations de l'utilisateur
 * @access  Preparateur
 */
router.get('/history', validateQuery(querySchemas.pagination.concat(querySchemas.dateRange)), async (req, res) => {
  try {
    const { page, limit, startDate, endDate, agencyId, search } = req.query;
    const userId = req.user.userId;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Construire la requête
    const query = {
      user: userId,
      status: { $in: ['completed', 'cancelled'] },
      createdAt: { $gte: defaultStartDate, $lte: defaultEndDate }
    };

    if (agencyId) {
      // Vérifier l'accès à l'agence
      const hasAccess = req.user.agencies.some(
        agency => agency._id.toString() === agencyId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }

      query.agency = agencyId;
    }

    // Recherche par plaque d'immatriculation
    if (search) {
      query['vehicle.licensePlate'] = { $regex: search.toUpperCase(), $options: 'i' };
    }

    // Exécuter la requête avec pagination
    const skip = (page - 1) * limit;
    
    const [preparations, totalCount] = await Promise.all([
      Preparation.find(query)
        .populate('agency', 'name code client')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      
      Preparation.countDocuments(query)
    ]);

    // Calculs de pagination
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        preparations: preparations.map(prep => ({
          id: prep._id,
          vehicle: {
            licensePlate: prep.vehicle.licensePlate,
            brand: prep.vehicle.brand,
            model: prep.vehicle.model,
            fullName: prep.vehicleFullName,
            condition: prep.vehicle.condition
          },
          agency: prep.agency,
          startTime: prep.startTime,
          endTime: prep.endTime,
          totalMinutes: prep.totalMinutes,
          isOnTime: prep.isOnTime,
          status: prep.status,
          progress: prep.progress,
          completedStepsCount: prep.steps.filter(s => s.completed).length,
          totalStepsCount: prep.steps.length,
          issuesCount: prep.issues.length,
          summary: prep.summary,
          createdAt: prep.createdAt
        })),
        filters: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
          agencyId,
          search
        },
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erreur historique préparations:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/preparations/vehicle-history/:licensePlate
 * @desc    Historique des préparations d'un véhicule par plaque
 * @access  Preparateur
 */
router.get('/vehicle-history/:licensePlate', async (req, res) => {
  try {
    const { licensePlate } = req.params;
    const userId = req.user.userId;

    // Récupérer l'historique des préparations pour cette plaque
    const preparations = await Preparation.findByLicensePlate(licensePlate)
      .populate('user', 'firstName lastName')
      .populate('agency', 'name code');

    // Filtrer par agences accessibles au préparateur (sécurité)
    const accessibleAgencies = req.user.agencies.map(a => a._id.toString());
    const filteredPreparations = preparations.filter(prep => 
      accessibleAgencies.includes(prep.agency._id.toString())
    );

    res.json({
      success: true,
      data: {
        licensePlate: licensePlate.toUpperCase(),
        preparations: filteredPreparations.map(prep => ({
          id: prep._id,
          vehicle: prep.vehicle,
          user: prep.user,
          agency: prep.agency,
          startTime: prep.startTime,
          endTime: prep.endTime,
          totalMinutes: prep.totalMinutes,
          isOnTime: prep.isOnTime,
          status: prep.status,
          progress: prep.progress,
          issuesCount: prep.issues.length,
          createdAt: prep.createdAt
        })),
        summary: {
          totalPreparations: filteredPreparations.length,
          lastPreparation: filteredPreparations[0]?.createdAt,
          averageTime: filteredPreparations.length > 0 ? 
            Math.round(filteredPreparations.reduce((sum, p) => sum + (p.totalMinutes || 0), 0) / filteredPreparations.length) : 0,
          lastVehicleInfo: filteredPreparations[0]?.vehicle
        }
      }
    });

  } catch (error) {
    console.error('Erreur historique véhicule:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/preparations/my-stats
 * @desc    Obtenir les statistiques personnelles de l'utilisateur
 * @access  Preparateur
 */
router.get('/my-stats', validateQuery(querySchemas.dateRange), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.userId;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Obtenir les statistiques
    const stats = await Preparation.getStats({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      userId
    });

    // Statistiques par type de véhicule
    const vehicleStats = await Preparation.getVehicleStats({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      userId
    });

    // Obtenir les stats utilisateur actuelles
    const user = await require('../../models/User').findById(userId);

    res.json({
      success: true,
      data: {
        period: {
          startDate: defaultStartDate,
          endDate: defaultEndDate
        },
        periodStats: stats[0] || {
          totalPreparations: 0,
          averageTime: 0,
          onTimeRate: 0,
          minTime: 0,
          maxTime: 0,
          totalIssues: 0,
          issueRate: 0
        },
        overallStats: user.stats,
        topVehicles: vehicleStats.slice(0, 5) // Top 5 véhicules les plus préparés
      }
    });

  } catch (error) {
    console.error('Erreur statistiques utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/preparations/user-agencies
 * @desc    Obtenir les agences accessibles avec planning du jour
 * @access  Preparateur
 */
router.get('/user-agencies', async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Récupérer le planning du jour pour déterminer l'agence par défaut
    const Schedule = require('../../models/Schedule');
    const todaySchedule = await Schedule.findOne({
      user: userId,
      date: today,
      status: 'active'
    }).populate('agency', 'name code client');

    // Récupérer toutes les agences accessibles
    const Agency = require('../../models/Agency');
    const accessibleAgencies = await Agency.find({
      _id: { $in: req.user.agencies.map(a => a._id) },
      isActive: true
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: {
        agencies: accessibleAgencies.map(agency => ({
          id: agency._id,
          name: agency.name,
          code: agency.code,
          client: agency.client,
          isDefault: todaySchedule?.agency?._id?.toString() === agency._id.toString()
        })),
        defaultAgency: todaySchedule ? {
          id: todaySchedule.agency._id,
          name: todaySchedule.agency.name,
          code: todaySchedule.agency.code,
          client: todaySchedule.agency.client
        } : null,
        hasScheduleToday: !!todaySchedule
      }
    });

  } catch (error) {
    console.error('Erreur récupération agences utilisateur:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;