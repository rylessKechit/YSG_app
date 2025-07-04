// backend/src/routes/preparateur/preparations.js
const express = require('express');
const mongoose = require('mongoose');
const Preparation = require('../../models/Preparation');
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery, preparationSchemas, querySchemas } = require('../../middleware/validation');
const { uploadPreparationPhoto, uploadIncidentPhoto, requirePhoto, validatePreparationUpload } = require('../../middleware/upload');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, PREPARATION_STEPS, STEP_LABELS } = require('../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification préparateur
router.use(auth, preparateurAuth);

/**
 * @route   GET /api/preparations/user-agencies
 * @desc    Obtenir les agences de l'utilisateur connecté
 * @access  Preparateur
 */
router.get('/user-agencies', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Les agences sont déjà dans req.user.agencies grâce au middleware auth
    const agencies = req.user.agencies || [];
    
    console.log(`✅ Agences utilisateur ${userId}:`, agencies.length);
    
    res.json({
      success: true,
      data: {
        agencies: agencies.map(agency => ({
          id: agency._id.toString(),
          name: agency.name,
          code: agency.code,
          client: agency.client,
          isDefault: agency.isDefault || false
        }))
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération agences:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

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
    .populate('agency', 'name code client')
    .populate('user', 'firstName lastName');

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
    console.error('❌ Erreur récupération préparation courante:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

/**
 * @route   POST /api/preparations/start
 * @desc    Démarrer une préparation avec informations véhicule
 * @access  Preparateur
 */
router.post('/start', validateBody(preparationSchemas.startWithVehicle), async (req, res) => {
  try {
    const { agencyId, licensePlate, brand, model, color, year, fuelType, condition, notes } = req.body;
    const userId = req.user.userId;

    console.log('🚀 Démarrage préparation:', { agencyId, licensePlate, brand, model });

    // Vérifier l'accès à l'agence
    const userAgencies = req.user.agencies || [];
    const hasAccess = userAgencies.some(
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
        licensePlate: licensePlate.toUpperCase(),
        brand: brand,
        model: model,
        color: color || '',
        year: year || null,
        fuelType: fuelType || 'essence',
        condition: condition || 'bon',
        notes: ''
      },
      user: userId,
      agency: agencyId,
      notes: notes || '',
      startTime: new Date()
    });

    await preparation.save();

    // Charger les relations pour la réponse
    await preparation.populate('agency', 'name code client');

    console.log('✅ Préparation créée:', preparation._id);

    res.status(201).json({
      success: true,
      message: 'Préparation démarrée avec succès',
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
    console.error('❌ Erreur démarrage préparation:', error);
    
    // Gestion spécifique des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation des données',
        errors
      });
    }

    // Gestion des erreurs de cast (ObjectId invalide)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `ID invalide pour le champ ${error.path}`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la préparation'
    });
  }
});

/**
 * @route   GET /api/preparations/history
 * @desc    Obtenir l'historique des préparations de l'utilisateur
 * @access  Preparateur
 */
router.get('/history', validateQuery(querySchemas.preparationHistory), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, search, page, limit } = req.query;
    const userId = req.user.userId;

    console.log('📋 Historique préparations:', { page, limit, search });

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
          message: 'Accès refusé à cette agence'
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
            fullName: `${prep.vehicle.brand} ${prep.vehicle.model}`,
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
    console.error('❌ Erreur historique préparations:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
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
    const preparations = await Preparation.find({
      'vehicle.licensePlate': licensePlate.toUpperCase(),
      user: userId // Sécurité : seulement ses propres préparations
    })
      .populate('user', 'firstName lastName')
      .populate('agency', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        licensePlate: licensePlate.toUpperCase(),
        preparations: preparations.map(prep => ({
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
          totalPreparations: preparations.length,
          lastPreparation: preparations[0]?.createdAt,
          averageTime: preparations.length > 0 ? 
            Math.round(preparations.reduce((sum, p) => sum + (p.totalMinutes || 0), 0) / preparations.length) : 0,
          lastVehicleInfo: preparations[0]?.vehicle
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur historique véhicule:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
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
    const { startDate, endDate, agencyId } = req.query;
    const userId = req.user.userId;

    console.log('📊 Statistiques utilisateur:', userId);

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Construire la requête
    const query = {
      user: userId,
      status: 'completed',
      createdAt: { $gte: defaultStartDate, $lte: defaultEndDate }
    };

    if (agencyId) {
      query.agency = agencyId;
    }

    // Récupérer toutes les préparations complétées
    const preparations = await Preparation.find(query);

    // Calculer les statistiques
    const totalPreparations = preparations.length;
    const onTimePreparations = preparations.filter(p => p.isOnTime).length;
    const totalMinutes = preparations.reduce((sum, p) => sum + (p.totalMinutes || 0), 0);

    const stats = {
      totalPreparations,
      averageTime: totalPreparations > 0 ? Math.round(totalMinutes / totalPreparations) : 0,
      onTimeRate: totalPreparations > 0 ? Math.round((onTimePreparations / totalPreparations) * 100) : 0,
      completionRate: 100, // Puisqu'on ne prend que les complétées
      bestTime: totalPreparations > 0 ? Math.min(...preparations.map(p => p.totalMinutes || 30)) : 0,
      worstTime: totalPreparations > 0 ? Math.max(...preparations.map(p => p.totalMinutes || 30)) : 0,
      weeklyStats: [], // À implémenter si nécessaire
      stepStats: [] // À implémenter si nécessaire
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

/**
 * @route   GET /api/preparations/:id
 * @desc    Obtenir une préparation par ID
 * @access  Preparateur
 */
router.get('/:id', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const preparation = await Preparation.findOne({
      _id: id,
      user: userId // Sécurité : seulement ses propres préparations
    })
    .populate('agency', 'name code client')
    .populate('user', 'firstName lastName');

    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée'
      });
    }

    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id,
          vehicle: preparation.vehicle,
          agency: preparation.agency,
          user: preparation.user,
          startTime: preparation.startTime,
          endTime: preparation.endTime,
          status: preparation.status,
          steps: preparation.steps,
          progress: preparation.progress,
          currentDuration: preparation.currentDuration,
          totalMinutes: preparation.totalMinutes,
          isOnTime: preparation.isOnTime,
          issues: preparation.issues || [],
          notes: preparation.notes,
          summary: preparation.summary
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération préparation:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

/**
 * @route   PUT /api/preparations/:id/step
 * @desc    Compléter une étape avec photo
 * @access  Preparateur
 */
router.put('/:id/step', 
  validateObjectId(),
  uploadPreparationPhoto,
  requirePhoto,
  validatePreparationUpload,
  validateBody(preparationSchemas.completeStep),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { stepType, notes } = req.body;
      const userId = req.user.userId;
      const photoUrl = req.cloudinaryUrl;

      console.log('📸 Complétion étape:', { id, stepType, photoUrl });

      // Récupérer la préparation
      const preparation = await Preparation.findOne({
        _id: id,
        user: userId,
        status: 'in_progress'
      });

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée ou déjà terminée'
        });
      }

      // Trouver l'étape à compléter
      const step = preparation.steps.find(s => s.type === stepType);
      if (!step) {
        return res.status(400).json({
          success: false,
          message: 'Type d\'étape invalide'
        });
      }

      if (step.completed) {
        return res.status(400).json({
          success: false,
          message: 'Cette étape est déjà complétée'
        });
      }

      // Marquer l'étape comme complétée
      step.completed = true;
      step.completedAt = new Date();
      step.photoUrl = photoUrl;
      step.notes = notes || '';

      // Recalculer la progression
      preparation.calculateProgress();

      await preparation.save();

      // Recharger avec les relations
      await preparation.populate('agency', 'name code client');

      console.log('✅ Étape complétée:', stepType, `(${preparation.progress}%)`);

      res.json({
        success: true,
        message: `Étape "${step.label}" complétée avec succès`,
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
        message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de la complétion de l\'étape'
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
        status: 'in_progress'
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
          message: 'Toutes les étapes doivent être complétées avant de terminer la préparation',
          data: {
            incompleteSteps: incompleteSteps.map(step => step.type)
          }
        });
      }

      // Finaliser la préparation
      preparation.status = 'completed';
      preparation.endTime = new Date();
      preparation.notes = notes || preparation.notes || '';
      
      // Recalculer les métriques finales
      preparation.calculateDuration();
      preparation.generateSummary();

      await preparation.save();

      // Recharger avec les relations
      await preparation.populate('agency', 'name code client');

      console.log('✅ Préparation terminée:', preparation.vehicle.licensePlate, 
                  `${preparation.totalMinutes}min`, preparation.isOnTime ? '(À temps)' : '(En retard)');

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
            totalMinutes: preparation.totalMinutes,
            isOnTime: preparation.isOnTime,
            issues: preparation.issues || [],
            notes: preparation.notes,
            summary: preparation.summary
          }
        }
      });

    } catch (error) {
      console.error('❌ Erreur finalisation préparation:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de la finalisation'
      });
    }
  }
);

/**
 * @route   POST /api/preparations/:id/issue
 * @desc    Signaler un incident
 * @access  Preparateur
 */
router.post('/:id/issue',
  validateObjectId(),
  uploadIncidentPhoto,
  validateBody(preparationSchemas.reportIssue),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { type, description, severity } = req.body;
      const userId = req.user.userId;
      const photoUrl = req.cloudinaryUrl || null;

      console.log('⚠️ Signalement incident:', { id, type, severity });

      // Récupérer la préparation
      const preparation = await Preparation.findOne({
        _id: id,
        user: userId
      });

      if (!preparation) {
        return res.status(404).json({
          success: false,
          message: 'Préparation non trouvée'
        });
      }

      // Ajouter l'incident
      const issue = {
        type,
        description,
        severity: severity || 'medium',
        photoUrl,
        reportedAt: new Date(),
        reportedBy: userId
      };

      preparation.issues.push(issue);
      await preparation.save();

      console.log('✅ Incident signalé:', type);

      res.status(201).json({
        success: true,
        message: 'Incident signalé avec succès',
        data: {
          issue: {
            ...issue,
            id: preparation.issues[preparation.issues.length - 1]._id
          }
        }
      });

    } catch (error) {
      console.error('❌ Erreur signalement incident:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors du signalement'
      });
    }
  }
);

/**
 * @route   POST /api/preparations/:id/cancel
 * @desc    Annuler une préparation
 * @access  Preparateur
 */
router.post('/:id/cancel', validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    console.log('🚫 Annulation préparation:', id);

    // Récupérer la préparation
    const preparation = await Preparation.findOne({
      _id: id,
      user: userId,
      status: 'in_progress'
    });

    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée ou déjà terminée'
      });
    }

    // Annuler la préparation
    preparation.status = 'cancelled';
    preparation.endTime = new Date();
    preparation.notes = `Annulée: ${reason || 'Aucune raison spécifiée'}`;
    
    await preparation.save();

    console.log('✅ Préparation annulée:', preparation.vehicle.licensePlate);

    res.json({
      success: true,
      message: 'Préparation annulée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur annulation préparation:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur lors de l\'annulation'
    });
  }
});

/**
 * @route   GET /api/preparations/history
 * @desc    Obtenir l'historique des préparations de l'utilisateur
 * @access  Preparateur
 */
router.get('/history', validateQuery(querySchemas.preparationHistory), async (req, res) => {
  try {
    const { startDate, endDate, agencyId, search, page, limit } = req.query;
    const userId = req.user.userId;

    console.log('📋 Historique préparations:', { page, limit, search });

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
          message: 'Accès refusé à cette agence'
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
            fullName: `${prep.vehicle.brand} ${prep.vehicle.model}`,
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
    console.error('❌ Erreur historique préparations:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
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
    const preparations = await Preparation.find({
      'vehicle.licensePlate': licensePlate.toUpperCase(),
      user: userId // Sécurité : seulement ses propres préparations
    })
      .populate('user', 'firstName lastName')
      .populate('agency', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        licensePlate: licensePlate.toUpperCase(),
        preparations: preparations.map(prep => ({
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
          totalPreparations: preparations.length,
          lastPreparation: preparations[0]?.createdAt,
          averageTime: preparations.length > 0 ? 
            Math.round(preparations.reduce((sum, p) => sum + (p.totalMinutes || 0), 0) / preparations.length) : 0,
          lastVehicleInfo: preparations[0]?.vehicle
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur historique véhicule:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
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
    const { startDate, endDate, agencyId } = req.query;
    const userId = req.user.userId;

    console.log('📊 Statistiques utilisateur:', userId);

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Construire la requête
    const query = {
      user: userId,
      status: 'completed',
      createdAt: { $gte: defaultStartDate, $lte: defaultEndDate }
    };

    if (agencyId) {
      query.agency = agencyId;
    }

    // Récupérer toutes les préparations complétées
    const preparations = await Preparation.find(query);

    // Calculer les statistiques
    const totalPreparations = preparations.length;
    const onTimePreparations = preparations.filter(p => p.isOnTime).length;
    const totalMinutes = preparations.reduce((sum, p) => sum + (p.totalMinutes || 0), 0);

    const stats = {
      totalPreparations,
      averageTime: totalPreparations > 0 ? Math.round(totalMinutes / totalPreparations) : 0,
      onTimeRate: totalPreparations > 0 ? Math.round((onTimePreparations / totalPreparations) * 100) : 0,
      completionRate: 100, // Puisqu'on ne prend que les complétées
      bestTime: totalPreparations > 0 ? Math.min(...preparations.map(p => p.totalMinutes || 30)) : 0,
      worstTime: totalPreparations > 0 ? Math.max(...preparations.map(p => p.totalMinutes || 30)) : 0,
      weeklyStats: [], // À implémenter si nécessaire
      stepStats: [] // À implémenter si nécessaire
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR || 'Erreur serveur'
    });
  }
});

module.exports = router;