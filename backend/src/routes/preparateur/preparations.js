// backend/src/routes/preparateur/preparations.js
// ✅ VERSION COMPLÈTE AVEC MIDDLEWARE CLOUDINARY EXISTANT

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Models de base
const Preparation = require('../../models/Preparation');
const Vehicle = require('../../models/Vehicle');

// Middlewares de base
const { auth } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');

// ✅ IMPORT SIMPLIFIÉ POUR ÉVITER LES BLOCAGES
const { uploadSingle } = require('../../middleware/upload');

// ✅ CLOUDINARY DIRECT IMPORT (sans middleware)
let CloudinaryService;
try {
  CloudinaryService = require('../../services/cloudinaryService');
} catch (error) {
  console.warn('⚠️ CloudinaryService non disponible:', error.message);
  CloudinaryService = null;
}

// ===== MIDDLEWARES GLOBAUX =====
router.use(auth);
router.use(preparateurAuth);

/**
 * @route   GET /api/preparations/user-agencies
 * @desc    Obtenir les agences de l'utilisateur
 * @access  Preparateur
 */
router.get('/user-agencies', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('🏢 Récupération agences utilisateur:', userId);
    
    const User = require('../../models/User');
    
    const user = await User.findById(userId)
      .populate('agencies', 'name code client address isActive')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    const activeAgencies = (user.agencies || [])
      .filter(agency => agency.isActive !== false)
      .map(agency => ({
        id: agency._id.toString(),
        name: agency.name,
        code: agency.code,
        client: agency.client,
        address: agency.address
      }));
    
    console.log(`✅ ${activeAgencies.length} agences trouvées`);
    
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
 * @route   POST /api/preparations/start
 * @desc    Démarrer une nouvelle préparation
 * @access  Preparateur
 */
router.post('/start', async (req, res) => {
  try {
    const { agencyId, licensePlate, brand, model, vehicleType, year, fuelType, color, condition, notes } = req.body;
    const userId = req.user.userId;

    console.log('🚀 Démarrage préparation:', { 
      userId, 
      agencyId, 
      licensePlate: licensePlate?.toUpperCase() 
    });

    // ✅ VÉRIFICATION PRÉPARATION ACTIVE
    const existingPreparation = await Preparation.findOne({
      user: userId,
      status: 'in_progress'
    }, '_id vehicleData.licensePlate status').lean();

    if (existingPreparation) {
      console.log('⚠️ Préparation existante trouvée:', existingPreparation._id);
      
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

    console.log('✅ Aucune préparation en cours trouvée');

    // ✅ GESTION VÉHICULE OPTIMISÉE
    const normalizedPlate = licensePlate.toUpperCase().trim();
    
    const vehicle = await Vehicle.findOneAndUpdate(
      { licensePlate: normalizedPlate },
      {
        $setOnInsert: {
          licensePlate: normalizedPlate,
          brand: brand?.trim() || 'N/A',
          model: model.trim(),
          agency: new mongoose.Types.ObjectId(agencyId),
          status: 'available',
          isActive: true,
          createdAt: new Date()
        },
        $set: {
          updatedAt: new Date()
        }
      },
      { 
        upsert: true, 
        new: true,
        lean: true 
      }
    );

    console.log('🚗 Véhicule géré:', vehicle._id);

    // ✅ DONNÉES VÉHICULE UNIFIÉES
    const vehicleData = {
      licensePlate: normalizedPlate,
      brand: vehicle.brand || brand?.trim() || 'N/A',
      model: vehicle.model || model.trim(),
      vehicleType: vehicleType || 'particulier',
      year: year || null,
      fuelType: fuelType || 'essence',
      color: color?.trim() || '',
      condition: condition || 'good'
    };

    console.log('📋 Données véhicule préparées:', vehicleData);

    // ✅ ÉTAPES PAR DÉFAUT
    const defaultSteps = [
      { step: 'exterior', completed: false, completedAt: null, notes: '', photos: [] },
      { step: 'interior', completed: false, completedAt: null, notes: '', photos: [] },
      { step: 'fuel', completed: false, completedAt: null, notes: '', photos: [] },
      { step: 'special_wash', completed: false, completedAt: null, notes: '', photos: [] }
    ];

    // ✅ DONNÉES DE PRÉPARATION
    const preparationData = {
      user: new mongoose.Types.ObjectId(userId),
      preparateur: new mongoose.Types.ObjectId(userId),
      agency: new mongoose.Types.ObjectId(agencyId),
      vehicle: vehicle._id,
      vehicleData: vehicleData,
      status: 'in_progress',
      notes: notes?.trim() || '',
      startTime: new Date(),
      progress: 0,
      currentDuration: 0,
      steps: defaultSteps,
      issues: []
    };

    console.log('💾 Création de la préparation...');

    // ✅ INSERTION DIRECTE MONGODB POUR ÉVITER LES MIDDLEWARES
    const insertResult = await Preparation.collection.insertOne({
      ...preparationData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Préparation créée avec succès:', insertResult.insertedId);

    // ✅ RÉPONSE IMMÉDIATE
    const response = {
      success: true,
      message: 'Préparation démarrée avec succès',
      data: {
        preparation: {
          id: insertResult.insertedId.toString(),
          vehicle: {
            licensePlate: vehicleData.licensePlate,
            brand: vehicleData.brand,
            model: vehicleData.model,
            vehicleType: vehicleData.vehicleType,
            year: vehicleData.year,
            fuelType: vehicleData.fuelType,
            color: vehicleData.color,
            condition: vehicleData.condition
          },
          agency: {
            id: agencyId
          },
          status: 'in_progress',
          startTime: new Date(),
          steps: defaultSteps,
          progress: 0,
          currentDuration: 0,
          notes: preparationData.notes || ''
        }
      }
    };

    console.log('📤 Envoi de la réponse...');
    
    res.status(201).json(response);
    
    console.log('✅ Réponse envoyée avec succès');

  } catch (error) {
    console.error('❌ Erreur démarrage préparation:', error);
    console.error('Stack trace:', error.stack);
    
    // Gestion d'erreurs robuste
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: validationErrors
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Une préparation avec ces données existe déjà'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la préparation',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

/**
 * @route   GET /api/preparations/current
 * @desc    Obtenir la préparation en cours
 * @access  Preparateur
 */
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('🔍 Recherche préparation en cours pour:', userId);
    
    const preparation = await Preparation.findOne({
      user: userId,
      status: 'in_progress'
    })
    .populate('agency', 'name code client')
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
    
    console.log('✅ Préparation en cours trouvée:', preparation._id);
    
    // Calculer la durée actuelle
    const currentDuration = Math.floor((new Date() - preparation.startTime) / (1000 * 60));
    
    res.json({
      success: true,
      data: {
        preparation: {
          id: preparation._id.toString(),
          vehicle: {
            licensePlate: preparation.vehicleData?.licensePlate || 'N/A',
            brand: preparation.vehicleData?.brand || 'N/A',
            model: preparation.vehicleData?.model || 'Véhicule',
            vehicleType: preparation.vehicleData?.vehicleType || 'particulier',
            year: preparation.vehicleData?.year,
            fuelType: preparation.vehicleData?.fuelType || 'essence',
            color: preparation.vehicleData?.color || '',
            condition: preparation.vehicleData?.condition || 'good'
          },
          agency: preparation.agency ? {
            id: preparation.agency._id.toString(),
            name: preparation.agency.name,
            code: preparation.agency.code,
            client: preparation.agency.client
          } : null,
          status: preparation.status,
          startTime: preparation.startTime,
          steps: preparation.steps || [],
          progress: preparation.progress || 0,
          currentDuration: currentDuration,
          notes: preparation.notes || '',
          issues: preparation.issues || []
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération préparation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la préparation'
    });
  }
});

/**
 * @route   PUT /api/preparations/:id/step
 * @desc    Compléter une étape avec photo Cloudinary (VERSION DIRECTE)
 * @access  Preparateur
 */
router.put('/:id/step', uploadSingle('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { step, notes } = req.body;
    const userId = req.user.userId;
    
    console.log('📝 Completion étape:', { 
      id, 
      step, 
      hasFile: !!req.file,
      notes: notes?.substring(0, 50) 
    });
    
    // Validation de l'ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de préparation invalide'
      });
    }
    
    // Validation du type d'étape
    const validSteps = ['exterior', 'interior', 'fuel', 'special_wash'];
    if (!validSteps.includes(step)) {
      return res.status(400).json({
        success: false,
        message: `Type d'étape invalide: ${step}. Types autorisés: ${validSteps.join(', ')}`
      });
    }
    
    const preparation = await Preparation.findOne({
      _id: id,
      user: userId,
      status: 'in_progress'
    });
    
    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée ou non accessible'
      });
    }
    
    // Trouver l'étape à compléter
    const stepIndex = preparation.steps.findIndex(s => s.step === step);
    
    if (stepIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Étape non trouvée dans cette préparation'
      });
    }
    
    if (preparation.steps[stepIndex].completed) {
      return res.status(400).json({
        success: false,
        message: 'Cette étape est déjà complétée'
      });
    }
    
    // Mettre à jour l'étape
    preparation.steps[stepIndex].completed = true;
    preparation.steps[stepIndex].completedAt = new Date();
    preparation.steps[stepIndex].notes = notes?.trim() || '';
    
    let photoUrl = null;
    let uploadResult = null; // ✅ DÉCLARATION DANS LE BON SCOPE
    
    // ✅ UPLOAD CLOUDINARY DIRECT (sans middleware qui bloque)
    if (req.file && req.file.buffer && CloudinaryService) {
      try {
        console.log('📸 Upload Cloudinary direct...');
        
        const metadata = {
          userId: userId,
          preparationId: id,
          stepType: step,
          timestamp: Date.now()
        };
        
        uploadResult = await CloudinaryService.uploadPreparationPhoto(req.file.buffer, metadata);
        
        if (uploadResult && uploadResult.url) {
          photoUrl = uploadResult.url;
          console.log('✅ Photo Cloudinary uploadée:', uploadResult.url);
        }
        
      } catch (cloudinaryError) {
        console.error('❌ Erreur upload Cloudinary:', cloudinaryError);
        // Continue sans photo plutôt que de bloquer
      }
    }
    
    // Recalculer la progression
    const completedSteps = preparation.steps.filter(s => s.completed).length;
    const newProgress = Math.round((completedSteps / preparation.steps.length) * 100);
    const newDuration = Math.floor((new Date() - preparation.startTime) / (1000 * 60));
    
    // ✅ MISE À JOUR DIRECTE MONGODB SANS MIDDLEWARES MONGOOSE
    const updateData = {
      $set: {
        [`steps.${stepIndex}.completed`]: true,
        [`steps.${stepIndex}.completedAt`]: new Date(),
        [`steps.${stepIndex}.notes`]: notes?.trim() || '',
        progress: newProgress,
        currentDuration: newDuration,
        updatedAt: new Date()
      }
    };
    
    // Ajouter la photo si uploadée
    if (photoUrl) {
      updateData.$push = {
        [`steps.${stepIndex}.photos`]: {
          url: photoUrl,
          description: `Photo étape ${step}`,
          uploadedAt: new Date(),
          publicId: uploadResult?.publicId || null,
          size: uploadResult?.bytes || null
        }
      };
    }
    
    console.log('💾 Mise à jour directe MongoDB...');
    
    // ✅ UPDATE DIRECT SANS .save() QUI BLOQUE
    await Preparation.updateOne(
      { _id: id },
      updateData
    );
    
    console.log('✅ Mise à jour MongoDB réussie');
    
    // ✅ RÉPONSE IMMÉDIATE GARANTIE AVEC PRÉPARATION COMPLÈTE
    const updatedSteps = preparation.steps.map((s, index) => {
      if (index === stepIndex) {
        return {
          step: s.step,
          completed: true,
          completedAt: new Date(),
          notes: notes?.trim() || '',
          photos: photoUrl ? [...(s.photos || []), {
            url: photoUrl,
            description: `Photo étape ${step}`,
            uploadedAt: new Date(),
            publicId: uploadResult?.publicId || null,
            size: uploadResult?.bytes || null
          }] : s.photos || []
        };
      }
      return s;
    });
    
    const response = {
      success: true,
      message: `Étape ${step} complétée avec succès`,
      data: {
        preparation: {
          id: preparation._id.toString(),
          vehicle: {
            licensePlate: preparation.vehicleData?.licensePlate || 'N/A',
            brand: preparation.vehicleData?.brand || 'N/A',
            model: preparation.vehicleData?.model || 'Véhicule',
            vehicleType: preparation.vehicleData?.vehicleType || 'particulier',
            year: preparation.vehicleData?.year,
            fuelType: preparation.vehicleData?.fuelType || 'essence',
            color: preparation.vehicleData?.color || '',
            condition: preparation.vehicleData?.condition || 'good'
          },
          agency: preparation.agency ? {
            id: preparation.agency._id?.toString() || preparation.agency.toString(),
            name: preparation.agency.name || 'Agence',
            code: preparation.agency.code || 'N/A',
            client: preparation.agency.client || 'Client'
          } : {
            id: preparation.agency?.toString() || 'unknown',
            name: 'Agence',
            code: 'N/A',
            client: 'Client'
          },
          status: preparation.status,
          startTime: preparation.startTime,
          steps: updatedSteps,
          progress: newProgress,
          currentDuration: newDuration,
          notes: preparation.notes || '',
          issues: preparation.issues || []
        }
      }
    };
    
    console.log('📤 Envoi réponse étape...');
    res.json(response);
    console.log('✅ Réponse étape envoyée');
    
  } catch (error) {
    console.error('❌ Erreur completion étape:', error);
    
    try {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la completion de l\'étape',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } catch (responseError) {
      console.error('❌ Erreur envoi réponse d\'erreur:', responseError);
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
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.userId;
    
    console.log('🏁 Finalisation préparation:', { id, userId, hasNotes: !!notes });
    
    // Validation de l'ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de préparation invalide'
      });
    }
    
    // Récupérer la préparation avec populate
    const preparation = await Preparation.findOne({
      _id: id,
      user: userId,
      status: 'in_progress'
    })
    .populate('agency', 'name code client')
    .lean();
    
    if (!preparation) {
      return res.status(404).json({
        success: false,
        message: 'Préparation non trouvée, accès refusé ou déjà terminée'
      });
    }
    
    console.log('✅ Préparation trouvée, vérification des étapes...');
    
    // Vérifier qu'au moins une étape est complétée (optionnel - vous pouvez forcer toutes les étapes)
    const completedSteps = (preparation.steps || []).filter(s => s.completed);
    const hasCompletedSteps = completedSteps.length > 0;
    
    if (!hasCompletedSteps) {
      return res.status(400).json({
        success: false,
        message: 'Au moins une étape doit être complétée pour terminer la préparation'
      });
    }
    
    console.log(`✅ ${completedSteps.length} étapes complétées sur ${preparation.steps?.length || 0}`);
    
    // Calculer les données de finalisation
    const endTime = new Date();
    const totalTimeMinutes = Math.floor((endTime - preparation.startTime) / (1000 * 60));
    const isOnTime = totalTimeMinutes <= 30; // 30 minutes limite
    const finalProgress = 100; // Forcé à 100% à la finalisation
    
    // Combiner les notes existantes avec les notes finales
    const existingNotes = preparation.notes || '';
    const finalNotes = notes?.trim() || '';
    const combinedNotes = [existingNotes, finalNotes].filter(Boolean).join('\n\n');
    
    console.log('💾 Mise à jour finalisation...');
    
    // ✅ MISE À JOUR DIRECTE MONGODB SANS MIDDLEWARES
    await Preparation.updateOne(
      { _id: id },
      {
        $set: {
          status: 'completed',
          endTime: endTime,
          totalTime: totalTimeMinutes,
          isOnTime: isOnTime,
          progress: finalProgress,
          currentDuration: totalTimeMinutes,
          notes: combinedNotes,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('✅ Préparation finalisée avec succès:', {
      totalTime: totalTimeMinutes,
      isOnTime: isOnTime
    });
    
    // ✅ RÉPONSE COMPLÈTE POUR MISE À JOUR FRONTEND
    const response = {
      success: true,
      message: 'Préparation terminée avec succès',
      data: {
        preparation: {
          id: preparation._id.toString(),
          vehicle: {
            licensePlate: preparation.vehicleData?.licensePlate || 'N/A',
            brand: preparation.vehicleData?.brand || 'N/A',
            model: preparation.vehicleData?.model || 'Véhicule',
            vehicleType: preparation.vehicleData?.vehicleType || 'particulier',
            year: preparation.vehicleData?.year,
            fuelType: preparation.vehicleData?.fuelType || 'essence',
            color: preparation.vehicleData?.color || '',
            condition: preparation.vehicleData?.condition || 'good'
          },
          agency: preparation.agency ? {
            id: preparation.agency._id?.toString() || preparation.agency.toString(),
            name: preparation.agency.name || 'Agence',
            code: preparation.agency.code || 'N/A',
            client: preparation.agency.client || 'Client'
          } : {
            id: preparation.agency?.toString() || 'unknown',
            name: 'Agence',
            code: 'N/A',
            client: 'Client'
          },
          status: 'completed',
          startTime: preparation.startTime,
          endTime: endTime,
          totalTime: totalTimeMinutes,
          isOnTime: isOnTime,
          steps: preparation.steps || [],
          progress: finalProgress,
          currentDuration: totalTimeMinutes,
          notes: combinedNotes,
          issues: preparation.issues || []
        }
      }
    };
    
    console.log('📤 Envoi réponse finalisation...');
    res.json(response);
    console.log('✅ Réponse finalisation envoyée');
    
  } catch (error) {
    console.error('❌ Erreur finalisation préparation:', error);
    
    try {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la finalisation de la préparation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } catch (responseError) {
      console.error('❌ Erreur envoi réponse d\'erreur:', responseError);
    }
  }
});

/**
 * @route   GET /api/preparations/history
 * @desc    Préparations du jour avec pagination et filtres
 * @access  Preparateur
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 10, 
      status,
      search 
    } = req.query;
    
    console.log('📚 Récupération préparations du jour:', { 
      userId, 
      page, 
      limit, 
      status,
      search: search || 'none'
    });
    
    // ✅ TOUJOURS FILTRER SUR AUJOURD'HUI UNIQUEMENT
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Construction de la requête - TOUJOURS limitée à aujourd'hui
    const query = {
      user: userId,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    };
    
    // Filtre par statut spécifique (optionnel)
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filtre par recherche (plaque d'immatriculation)
    if (search && search.trim()) {
      query['vehicleData.licensePlate'] = { 
        $regex: search.trim().toUpperCase(), 
        $options: 'i' 
      };
    }
    
    // Calcul pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    
    console.log('🔍 Requête du jour:', { 
      dateRange: `${today.toISOString()} -> ${tomorrow.toISOString()}`,
      status: status || 'all',
      search: search || 'none'
    });
    
    // Exécution des requêtes en parallèle
    const [preparations, totalCount] = await Promise.all([
      Preparation.find(query)
        .populate('agency', 'name code client')
        .sort({ createdAt: -1 }) // Plus récentes en premier
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Preparation.countDocuments(query)
    ]);
    
    console.log(`✅ ${preparations.length} préparations du jour trouvées sur ${totalCount} total`);
    
    // Formatage des données pour le frontend
    const formattedPreparations = preparations.map(prep => {
      const totalTime = prep.totalTime || 0;
      const isOnTime = prep.isOnTime !== undefined ? prep.isOnTime : (totalTime <= 30);
      
      return {
        id: prep._id.toString(),
        vehicle: {
          licensePlate: prep.vehicleData?.licensePlate || 'N/A',
          brand: prep.vehicleData?.brand || 'N/A',
          model: prep.vehicleData?.model || 'Véhicule',
          vehicleType: prep.vehicleData?.vehicleType || 'particulier',
          year: prep.vehicleData?.year,
          fuelType: prep.vehicleData?.fuelType || 'essence',
          color: prep.vehicleData?.color || '',
          condition: prep.vehicleData?.condition || 'good'
        },
        agency: prep.agency ? {
          id: prep.agency._id.toString(),
          name: prep.agency.name,
          code: prep.agency.code,
          client: prep.agency.client
        } : null,
        status: prep.status,
        startTime: prep.startTime,
        endTime: prep.endTime,
        totalTime: totalTime,
        isOnTime: isOnTime,
        progress: prep.progress || 0,
        steps: prep.steps || [],
        issues: prep.issues || [],
        notes: prep.notes || '',
        createdAt: prep.createdAt,
        updatedAt: prep.updatedAt
      };
    });
    
    // Calcul des métadonnées de pagination
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // ✅ STATISTIQUES DU JOUR INCLUSES
    const allTodayPreps = await Preparation.find({
      user: userId,
      createdAt: { $gte: today, $lt: tomorrow }
    }).lean();
    
    const stats = {
      total: allTodayPreps.length,
      completed: allTodayPreps.filter(p => p.status === 'completed').length,
      inProgress: allTodayPreps.filter(p => p.status === 'in_progress').length,
      cancelled: allTodayPreps.filter(p => p.status === 'cancelled').length,
      averageTime: allTodayPreps.length > 0 
        ? Math.round(allTodayPreps.filter(p => p.totalTime).reduce((sum, p) => sum + (p.totalTime || 0), 0) / allTodayPreps.filter(p => p.totalTime).length) || 0
        : 0,
      onTimeRate: allTodayPreps.length > 0 
        ? Math.round((allTodayPreps.filter(p => p.isOnTime).length / allTodayPreps.length) * 100)
        : 0
    };
    
    const response = {
      success: true,
      data: {
        preparations: formattedPreparations,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        },
        filters: {
          status: status || 'all',
          search: search || null,
          date: today.toISOString().split('T')[0] // ✅ Date du jour
        },
        stats: stats // ✅ Statistiques du jour
      }
    };
    
    console.log('📤 Envoi préparations du jour, pagination:', response.data.pagination);
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erreur récupération préparations du jour:', error);
    
    try {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des préparations du jour',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } catch (responseError) {
      console.error('❌ Erreur envoi réponse d\'erreur:', responseError);
    }
  }
});

/**
 * @route   GET /api/preparations/today
 * @desc    Préparations du jour (toutes les préparations d'aujourd'hui)
 * @access  Preparateur
 */
router.get('/today', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📅 Récupération préparations du jour:', userId);
    
    // Définir la plage d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Requête pour toutes les préparations d'aujourd'hui (tous statuts)
    const preparations = await Preparation.find({
      user: userId,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('agency', 'name code client')
    .sort({ createdAt: -1 })
    .lean();
    
    console.log(`✅ ${preparations.length} préparations trouvées aujourd'hui`);
    
    // Formatage des données
    const formattedPreparations = preparations.map(prep => {
      const totalTime = prep.totalTime || 0;
      const isOnTime = prep.isOnTime !== undefined ? prep.isOnTime : (totalTime <= 30);
      
      return {
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
        startTime: prep.startTime,
        endTime: prep.endTime,
        totalTime: totalTime,
        isOnTime: isOnTime,
        progress: prep.progress || 0,
        createdAt: prep.createdAt
      };
    });
    
    // Statistiques du jour
    const stats = {
      total: preparations.length,
      completed: preparations.filter(p => p.status === 'completed').length,
      inProgress: preparations.filter(p => p.status === 'in_progress').length,
      cancelled: preparations.filter(p => p.status === 'cancelled').length,
      averageTime: preparations.length > 0 
        ? Math.round(preparations.filter(p => p.totalTime).reduce((sum, p) => sum + (p.totalTime || 0), 0) / preparations.filter(p => p.totalTime).length) || 0
        : 0,
      onTimeRate: preparations.length > 0 
        ? Math.round((preparations.filter(p => p.isOnTime).length / preparations.length) * 100)
        : 0
    };
    
    res.json({
      success: true,
      data: {
        preparations: formattedPreparations,
        stats: stats,
        date: today.toISOString().split('T')[0]
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération préparations du jour:', error);
    
    try {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des préparations du jour',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } catch (responseError) {
      console.error('❌ Erreur envoi réponse d\'erreur:', responseError);
    }
  }
});

/**
 * @route   GET /api/preparations/my-stats
 * @desc    Statistiques du préparateur (UNIQUEMENT du jour)
 * @access  Preparateur
 */
router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { agencyId } = req.query;
    
    console.log('📊 Calcul statistiques du JOUR pour:', { userId, agencyId });
    
    // ✅ TOUJOURS FILTRER SUR AUJOURD'HUI UNIQUEMENT
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('📅 Période fixe - aujourd hui:', {
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString()
    });
    
    // Construction de la requête - TOUJOURS aujourd'hui seulement
    const query = {
      user: userId,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    };
    
    // Filtre par agence si spécifié
    if (agencyId && agencyId !== 'all') {
      query.agency = new mongoose.Types.ObjectId(agencyId);
    }
    
    // Requête pour toutes les préparations DU JOUR
    const preparations = await Preparation.find(query).lean();
    
    console.log(`📈 ${preparations.length} préparations du JOUR trouvées`);
    console.log('🔍 Détail préparations:', preparations.map(p => ({
      id: p._id.toString().slice(-6),
      status: p.status,
      totalTime: p.totalTime,
      isOnTime: p.isOnTime,
      vehicleType: p.vehicleData?.vehicleType,
      stepsCount: p.steps?.length || 0
    })));
    
    // Si aucune préparation du jour, retourner des stats vides
    if (preparations.length === 0) {
      console.log('⚠️ Aucune préparation du jour - retour stats vides');
      return res.json({
        success: true,
        data: {
          totalPreparations: 0,
          averageTime: 0,
          onTimeRate: 0,
          bestTime: 0,
          worstTime: 0,
          vehicleTypeStats: {
            particulier: { count: 0, averageTime: 0, onTimeRate: 0 },
            utilitaire: { count: 0, averageTime: 0, onTimeRate: 0 }
          },
          stepStats: [
            { step: 'exterior', stepLabel: 'Extérieur', icon: '🚗', completionRate: 0, averageTime: 0 },
            { step: 'interior', stepLabel: 'Intérieur', icon: '🧽', completionRate: 0, averageTime: 0 },
            { step: 'fuel', stepLabel: 'Carburant', icon: '⛽', completionRate: 0, averageTime: 0 },
            { step: 'special_wash', stepLabel: 'Lavage Spécial', icon: '✨', completionRate: 0, averageTime: 0 }
          ],
          weeklyStats: []
        }
      });
    }
    
    // ✅ CALCULS CORRIGES - Statistiques principales
    const total = preparations.length;
    const completed = preparations.filter(p => p.status === 'completed').length;
    const inProgress = preparations.filter(p => p.status === 'in_progress').length;
    
    console.log(`📊 États: ${total} total, ${completed} complétées, ${inProgress} en cours`);
    
    // ✅ CALCUL DU TEMPS MOYEN - Inclure TOUTES les préparations avec temps
    const prepsWithTime = preparations.filter(p => p.totalTime && p.totalTime > 0);
    const averageTime = prepsWithTime.length > 0 
      ? Math.round(prepsWithTime.reduce((sum, p) => sum + p.totalTime, 0) / prepsWithTime.length)
      : 0;
    
    console.log(`⏱️ Temps: ${prepsWithTime.length} preps avec temps, moyenne ${averageTime}min`);
    
    // ✅ CALCUL DU TAUX DE PONCTUALITÉ CORRIGÉ - Préparations ≤ 30min
    // Seulement sur les préparations complétées ET avec un temps défini
    const completedPreps = preparations.filter(p => p.status === 'completed');
    const completedWithTime = completedPreps.filter(p => p.totalTime && p.totalTime > 0);
    
    // Calculer isOnTime basé sur totalTime ≤ 30min (et non sur le champ isOnTime qui peut être incorrect)
    const onTimePreps = completedWithTime.filter(p => p.totalTime <= 30);
    const onTimeRate = completedWithTime.length > 0 
      ? Math.round((onTimePreps.length / completedWithTime.length) * 100) 
      : 0;
    
    console.log(`🎯 Ponctualité CORRIGÉE: ${onTimePreps.length}/${completedWithTime.length} ≤30min = ${onTimeRate}%`);
    console.log(`📋 Détail temps:`, completedWithTime.map(p => `${p.totalTime}min ${p.totalTime <= 30 ? '✅' : '❌'}`));
    
    // ✅ CALCUL DES TEMPS MIN/MAX - Sur toutes les préparations avec temps
    const allTimes = prepsWithTime.map(p => p.totalTime);
    const bestTime = allTimes.length > 0 ? Math.min(...allTimes) : 0;
    const worstTime = allTimes.length > 0 ? Math.max(...allTimes) : 0;
    
    console.log(`📈 Temps extrêmes: meilleur ${bestTime}min, pire ${worstTime}min`);
    
    // ✅ STATISTIQUES PAR TYPE DE VÉHICULE - Corrigées
    const particulierPreps = preparations.filter(p => 
      !p.vehicleData?.vehicleType || p.vehicleData?.vehicleType === 'particulier'
    );
    const utilitairePreps = preparations.filter(p => 
      p.vehicleData?.vehicleType === 'utilitaire'
    );
    
    // Calculs pour véhicules particuliers
    const particulierWithTime = particulierPreps.filter(p => p.totalTime && p.totalTime > 0);
    const particulierCompleted = particulierPreps.filter(p => p.status === 'completed');
    const particulierOnTime = particulierCompleted.filter(p => p.isOnTime === true);
    
    // Calculs pour véhicules utilitaires
    const utilitaireWithTime = utilitairePreps.filter(p => p.totalTime && p.totalTime > 0);
    const utilitaireCompleted = utilitairePreps.filter(p => p.status === 'completed');
    const utilitaireOnTime = utilitaireCompleted.filter(p => p.isOnTime === true);
    
    const vehicleTypeStats = {
      particulier: {
        count: particulierPreps.length,
        averageTime: particulierWithTime.length > 0 
          ? Math.round(particulierWithTime.reduce((sum, p) => sum + p.totalTime, 0) / particulierWithTime.length)
          : 0,
        onTimeRate: particulierCompleted.length > 0 
          ? Math.round((particulierOnTime.length / particulierCompleted.length) * 100)
          : 0
      },
      utilitaire: {
        count: utilitairePreps.length,
        averageTime: utilitaireWithTime.length > 0 
          ? Math.round(utilitaireWithTime.reduce((sum, p) => sum + p.totalTime, 0) / utilitaireWithTime.length)
          : 0,
        onTimeRate: utilitaireCompleted.length > 0 
          ? Math.round((utilitaireOnTime.length / utilitaireCompleted.length) * 100)
          : 0
      }
    };
    
    console.log('🚗 Par type véhicule:', {
      particulier: `${vehicleTypeStats.particulier.count} (${vehicleTypeStats.particulier.averageTime}min moy.)`,
      utilitaire: `${vehicleTypeStats.utilitaire.count} (${vehicleTypeStats.utilitaire.averageTime}min moy.)`
    });
    
    // ✅ STATISTIQUES PAR ÉTAPE - Corrigées  
    const stepTypes = ['exterior', 'interior', 'fuel', 'special_wash'];
    const stepLabels = {
      exterior: 'Extérieur',
      interior: 'Intérieur', 
      fuel: 'Carburant',
      special_wash: 'Lavage Spécial'
    };
    const stepIcons = {
      exterior: '🚗',
      interior: '🧽',
      fuel: '⛽',
      special_wash: '✨'
    };
    
    const stepStats = stepTypes.map(stepType => {
      let totalSteps = 0;
      let completedSteps = 0;
      let totalStepTime = 0;
      let stepsWithTime = 0;
      
      preparations.forEach(prep => {
        if (prep.steps && prep.steps.length > 0) {
          const step = prep.steps.find(s => s.step === stepType);
          if (step) {
            totalSteps++;
            if (step.completed) {
              completedSteps++;
              // Calculer temps d'étape basé sur progression globale
              if (prep.totalTime && prep.totalTime > 0) {
                const stepTime = Math.round(prep.totalTime / 4); // Estimation 4 étapes
                totalStepTime += stepTime;
                stepsWithTime++;
              }
            }
          }
        }
      });
      
      const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      const averageTime = stepsWithTime > 0 ? Math.round(totalStepTime / stepsWithTime) : 0;
      
      return {
        step: stepType,
        stepLabel: stepLabels[stepType],
        icon: stepIcons[stepType],
        completionRate: completionRate,
        averageTime: averageTime
      };
    });
    
    console.log('📋 Stats étapes:', stepStats.map(s => `${s.stepLabel}: ${s.completionRate}%`));
    
    // ✅ PAS DE WEEKLY STATS - Seulement du jour
    const weeklyStats = [];
    
    // ✅ RÉPONSE FINALE
    const stats = {
      totalPreparations: total,
      averageTime: averageTime,
      onTimeRate: onTimeRate,
      bestTime: bestTime,
      worstTime: worstTime,
      vehicleTypeStats: vehicleTypeStats,
      stepStats: stepStats,
      weeklyStats: weeklyStats
    };
    
    console.log('✅ Statistiques finales du jour:', {
      total: stats.totalPreparations,
      averageTime: stats.averageTime,
      onTimeRate: stats.onTimeRate,
      bestTime: stats.bestTime,
      worstTime: stats.worstTime
    });
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Erreur calcul statistiques du jour:', error);
    
    try {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul des statistiques du jour',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } catch (responseError) {
      console.error('❌ Erreur envoi réponse d\'erreur:', responseError);
    }
  }
});

// Fonction utilitaire pour les labels de période
function getPeriodLabel(period) {
  const labels = {
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année"
  };
  return labels[period] || "Période inconnue";
}

module.exports = router;