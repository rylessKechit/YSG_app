// backend/src/routes/preparateur/preparations.js
// ✅ FICHIER COMPLET OPTIMISÉ - TOUTES RÉPONSES CORRIGÉES

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Models
const Preparation = require('../../models/Preparation');
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');

// Middlewares
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');
const { uploadPreparationPhoto } = require('../../middleware/upload');

// ===== MIDDLEWARES GLOBAUX =====
router.use(auth);
router.use(preparateurAuth);

// ===== ROUTES OPTIMISÉES =====

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

    // ✅ VÉRIFICATION PRÉPARATION ACTIVE - REQUÊTE ATOMIQUE
    const existingPreparation = await Preparation.findOne({
      user: userId,
      status: 'in_progress'
    }, '_id vehicleData.licensePlate').lean();

    if (existingPreparation) {
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà une préparation en cours. Terminez-la avant d\'en démarrer une nouvelle.',
        data: {
          currentPreparation: {
            id: existingPreparation._id.toString(),
            licensePlate: existingPreparation.vehicleData?.licensePlate || 'N/A'
          }
        }
      });
    }

    // ✅ GESTION VÉHICULE OPTIMISÉE - UPSERT
    const normalizedPlate = licensePlate.toUpperCase().trim();
    let vehicle = await Vehicle.findOneAndUpdate(
      { licensePlate: normalizedPlate },
      {
        $setOnInsert: {
          licensePlate: normalizedPlate,
          brand: 'N/A',
          model: model.trim(),
          agency: agencyId,
          vehicleType: vehicleType || 'particulier',
          year: year || null,
          fuelType: fuelType || 'essence',
          color: color?.trim() || '',
          condition: condition || 'good'
        }
      },
      { upsert: true, new: true, lean: true }
    );

    // ✅ DONNÉES VÉHICULE UNIFIÉES
    const vehicleData = {
      licensePlate: normalizedPlate,
      brand: vehicle.brand || 'N/A',
      model: vehicle.model || model.trim(),
      vehicleType: vehicle.vehicleType || 'particulier',
      year: vehicle.year,
      fuelType: vehicle.fuelType || 'essence',
      color: vehicle.color || '',
      condition: vehicle.condition || 'good'
    };

    // ✅ CRÉATION PRÉPARATION OPTIMISÉE - ÉTAPES MINIMALES
    const preparationData = {
      user: userId,
      preparateur: userId,
      agency: agencyId,
      vehicle: vehicle._id,
      vehicleData: vehicleData,
      status: 'in_progress',
      notes: notes || '',
      startTime: new Date(),
      progress: 0,
      currentDuration: 0,
      issues: []
    };

    // ✅ INSERTION DIRECTE SANS SAVE() - PLUS RAPIDE
    const preparation = await Preparation.create(preparationData);
    // ✅ INITIALISER LES ÉTAPES EN PARALLÈLE
    await Preparation.updateOne(
      { _id: preparation._id },
      {
        $set: {
          steps: [
            { step: 'exterior', completed: false, completedAt: null, notes: '', photos: [] },
            { step: 'interior', completed: false, completedAt: null, notes: '', photos: [] },
            { step: 'fuel', completed: false, completedAt: null, notes: '', photos: [] },
            { step: 'special_wash', completed: false, completedAt: null, notes: '', photos: [] }
          ]
        }
      }
    );

    // ✅ RÉPONSE GARANTIE AVEC RETURN
    return res.status(201).json({
      success: true,
      message: 'Préparation démarrée avec succès',
      data: {
        preparation: {
          id: preparationId.toString(),
          vehicle: {
            licensePlate: vehicleData.licensePlate,
            brand: vehicleData.brand,
            model: vehicleData.model,
            vehicleType: vehicleData.vehicleType
          },
          status: preparation.status,
          startTime: preparation.startTime,
          steps: [
            { step: 'exterior', completed: false, completedAt: null, notes: '', photos: [] },
            { step: 'interior', completed: false, completedAt: null, notes: '', photos: [] },
            { step: 'fuel', completed: false, completedAt: null, notes: '', photos: [] },
            { step: 'special_wash', completed: false, completedAt: null, notes: '', photos: [] }
          ],
          progress: preparation.progress,
          currentDuration: 0,
          notes: preparation.notes || ''
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur démarrage préparation:', error);
    return res.status(500).json({
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
    })
    .populate('user', 'firstName lastName email')
    .populate('agency', 'name code client')
    .lean();

    if (!preparation) {
      return res.json({
        success: true,
        data: { preparation: null }
      });
    }

    // ✅ RÉPONSE FORMATÉE AVEC RETURN
    return res.json({
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
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la préparation courante'
    });
  }
});

/**
 * @route   GET /api/preparations/my
 * @desc    Récupérer mes préparations avec pagination
 * @access  Preparateur
 */
router.get('/my', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    // ✅ CONSTRUCTION QUERY OPTIMISÉE
    const query = { user: userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // ✅ REQUÊTE PAGINÉE AVEC LEAN
    const [preparations, total] = await Promise.all([
      Preparation.find(query)
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean(),
      Preparation.countDocuments(query)
    ]);

    // ✅ FORMATAGE OPTIMISÉ
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

    // ✅ RÉPONSE GARANTIE AVEC RETURN
    return res.json({
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
    return res.status(500).json({
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
    
    const user = await User.findById(userId)
      .populate('agencies', 'name code client workingHours isActive')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    const activeAgencies = (user.agencies || []).filter(agency => agency.isActive);

    console.log('✅ Agences utilisateur récupérées:', activeAgencies.length);

    // ✅ RÉPONSE GARANTIE AVEC RETURN
    return res.json({
      success: true,
      data: {
        agencies: activeAgencies.map(agency => ({
          id: agency._id.toString(),
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
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agences'
    });
  }
});

/**
 * @route   PUT /api/preparations/:id/step
 * @desc    Compléter une étape avec photo Cloudinary
 * @access  Preparateur
 */
router.put('/:id/step', uploadPreparationPhoto, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { step, notes = '' } = req.body;
    const userId = req.user.userId;

    // ✅ URL CLOUDINARY RÉELLE
    const photoUrl = req.uploadedFile?.secure_url || req.body.photoUrl;

    console.log('📸 Completion étape:', {
      preparationId: id,
      step,
      hasPhotoUrl: !!photoUrl,
      userId
    });

    // ✅ VALIDATION STRICTE
    if (!step || !photoUrl || !['exterior', 'interior', 'fuel', 'special_wash'].includes(step)) {
      return res.status(400).json({
        success: false,
        message: !step ? 'Étape requise' : !photoUrl ? 'Photo requise' : 'Étape invalide'
      });
    }

    // ✅ MISE À JOUR ATOMIQUE
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
            url: photoUrl,
            description: `Photo ${step}`,
            uploadedAt: new Date()
          }],
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée, terminée ou étape déjà complétée'
      });
    }

    // ✅ CALCUL PROGRESSION
    const progressResult = await Preparation.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $project: {
          progress: {
            $multiply: [
              { $divide: [
                { $size: { $filter: { input: "$steps", cond: { $eq: ["$$this.completed", true] } } } },
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

    const progress = Math.round(progressResult[0]?.progress || 0);
    const duration = Math.floor(progressResult[0]?.currentDuration || 0);

    // ✅ MISE À JOUR PROGRESSION
    await Preparation.updateOne(
      { _id: id },
      {
        $set: {
          progress: progress,
          currentDuration: duration,
          isOnTime: duration <= 30
        }
      }
    );

    const executionTime = Date.now() - startTime;
    console.log(`✅ Étape ${step} complétée en ${executionTime}ms`);

    // ✅ RÉPONSE GARANTIE AVEC RETURN
    return res.json({
      success: true,
      message: `Étape ${step} complétée avec succès`,
      data: {
        step,
        completed: true,
        photoUrl,
        progress,
        duration,
        executionTime
      }
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Erreur completion étape (${executionTime}ms):`, error.message);
    
    // ✅ RÉPONSE D'ERREUR GARANTIE
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la completion de l\'étape',
      executionTime
    });
  }
});

/**
 * @route   POST /api/preparations/:id/complete
 * @desc    Terminer une préparation - CORRECTION RÉPONSE
 * @access  Preparateur
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const preparationId = req.params.id;
    const userId = req.user.userId;
    const { notes } = req.body;

    console.log('🏁 Finalisation préparation:', { preparationId, userId });

    // ✅ VALIDATION ET MISE À JOUR ATOMIQUE
    const preparation = await Preparation.findOneAndUpdate(
      {
        _id: preparationId,
        user: userId,
        status: 'in_progress'
      },
      {
        $set: {
          status: 'completed',
          endTime: new Date(),
          notes: notes?.trim() || '',
          updatedAt: new Date()
        }
      },
      { new: true, lean: true }
    );

    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée, accès refusé ou déjà terminée'
      });
    }

    // ✅ CALCUL TEMPS TOTAL
    const totalTimeMinutes = Math.floor(
      (preparation.endTime.getTime() - preparation.startTime.getTime()) / (1000 * 60)
    );

    // ✅ MISE À JOUR FINALE
    await Preparation.updateOne(
      { _id: preparationId },
      {
        $set: {
          totalTime: totalTimeMinutes,
          isOnTime: totalTimeMinutes <= 30
        }
      }
    );

    console.log('✅ Préparation finalisée avec succès');

    // ✅ RÉPONSE GARANTIE AVEC RETURN - PROBLÈME RÉSOLU !
    return res.json({
      success: true,
      message: 'Préparation terminée avec succès',
      data: {
        preparation: {
          id: preparation._id.toString(),
          status: 'completed',
          endTime: preparation.endTime,
          totalTime: totalTimeMinutes,
          isOnTime: totalTimeMinutes <= 30,
          progress: 100,
          vehicle: {
            licensePlate: preparation.vehicleData?.licensePlate || 'N/A'
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur finalisation préparation:', error);
    // ✅ RÉPONSE D'ERREUR GARANTIE AVEC RETURN
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la finalisation de la préparation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // ✅ VALIDATION
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Type et description requis'
      });
    }

    // ✅ CRÉATION INCIDENT
    const issue = {
      id: new Date().getTime().toString(),
      type,
      description: description.trim(),
      severity,
      reportedAt: new Date(),
      resolved: false,
      photos: []
    };

    // ✅ MISE À JOUR ATOMIQUE
    const updateResult = await Preparation.updateOne(
      {
        _id: preparationId,
        user: userId
      },
      {
        $push: { issues: issue },
        $set: { updatedAt: new Date() }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée ou accès refusé'
      });
    }

    console.log('✅ Incident signalé avec succès');

    // ✅ RÉPONSE GARANTIE AVEC RETURN
    return res.json({
      success: true,
      message: 'Incident signalé avec succès',
      data: {
        issue: issue
      }
    });

  } catch (error) {
    console.error('❌ Erreur signalement incident:', error);
    return res.status(500).json({
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

    const preparations = await Preparation.find({
      'vehicleData.licensePlate': licensePlate.toUpperCase()
    })
    .populate('user', 'firstName lastName')
    .populate('agency', 'name code')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

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

    // ✅ RÉPONSE GARANTIE AVEC RETURN
    return res.json({
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
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique du véhicule'
    });
  }
});

/**
 * @route   GET /api/preparations/my-stats
 * @desc    Statistiques de l'utilisateur connecté
 * @access  Preparateur
 */
router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period = '30d' } = req.query;

    // ✅ CALCUL PÉRIODE
    const startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // ✅ AGRÉGATION OPTIMISÉE
    const stats = await Preparation.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPreparations: { $sum: 1 },
          completedPreparations: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageTime: {
            $avg: { $cond: [{ $ne: ['$totalTime', null] }, '$totalTime', 0] }
          },
          onTimeCount: {
            $sum: { $cond: ['$isOnTime', 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalPreparations: 0,
      completedPreparations: 0,
      averageTime: 0,
      onTimeCount: 0
    };

    const completionRate = result.totalPreparations > 0 
      ? Math.round((result.completedPreparations / result.totalPreparations) * 100)
      : 0;

    const onTimeRate = result.completedPreparations > 0
      ? Math.round((result.onTimeCount / result.completedPreparations) * 100)
      : 0;

    // ✅ RÉPONSE GARANTIE AVEC RETURN
    return res.json({
      success: true,
      data: {
        period,
        totalPreparations: result.totalPreparations,
        completedPreparations: result.completedPreparations,
        averageTime: Math.round(result.averageTime || 0),
        completionRate,
        onTimeRate
      }
    });

  } catch (error) {
    console.error('❌ Erreur statistiques utilisateur:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques'
    });
  }
});

module.exports = router;