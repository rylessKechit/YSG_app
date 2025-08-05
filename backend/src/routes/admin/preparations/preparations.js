// backend/src/routes/admin/preparations.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Models
const Preparation = require('../../../models/Preparation');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const Vehicle = require('../../../models/Vehicle');

// Middleware
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateQuery, validateBody, validateObjectId, createPreparation, createBulkPreparations } = require('../../../middleware/validation');

// Constants
const { 
  PREPARATION_STATUS, 
  PREPARATION_STEPS,
  DEFAULT_STEPS,
  STEP_LABELS,
  STEP_ICONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES 
} = require('../../../utils/constants');

// ===== SCHÉMAS DE VALIDATION =====

const preparationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
  user: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  agency: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  status: Joi.string().valid(...Object.values(PREPARATION_STATUS), 'all').default('all'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  sort: Joi.string().valid('createdAt', 'startTime', 'endTime', 'totalTime', 'user', 'agency', 'vehicle').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
}).unknown(true);

// ✅ AJOUT : Schéma de validation pour les statistiques
const statsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  agency: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  user: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional()  // ✅ AJOUTÉ
});

const updateAgencySchema = Joi.object({
  agencyId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  reason: Joi.string().max(500).optional()
});

const editStepsSchema = Joi.object({
  steps: Joi.array().items(
    Joi.object({
      step: Joi.string().valid(...Object.values(PREPARATION_STEPS)).required(),
      completed: Joi.boolean().default(false),
      notes: Joi.string().allow('').optional()
    })
  ).min(1).required(),
  adminNotes: Joi.string().max(500).optional()
});

// Middleware auth pour toutes les routes
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/preparations/new
 * @desc    Créer une nouvelle préparation depuis l'admin
 * @access  Admin
 */
router.post('/new', 
  validateBody(createPreparation), 
  async (req, res) => {
    try {
      const {
        userId,
        agencyId,
        vehicleData,
        notes,
        assignedSteps,
        priority,
        createdAt
      } = req.body;

      console.log('🚀 Création préparation admin:', { 
        userId, 
        agencyId, 
        vehicleData: vehicleData?.licensePlate 
      });

      // Vérifier que l'utilisateur existe et est un préparateur
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      if (user.role !== 'preparateur') {
        return res.status(400).json({
          success: false,
          message: 'L\'utilisateur doit être un préparateur'
        });
      }

      // Vérifier que l'agence existe
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({
          success: false,
          message: 'Agence non trouvée'
        });
      }

      // Vérifier qu'il n'y a pas déjà une préparation en cours pour cet utilisateur
      const existingPreparation = await Preparation.findOne({
        user: userId,
        status: PREPARATION_STATUS.IN_PROGRESS
      });

      if (existingPreparation) {
        return res.status(400).json({
          success: false,
          message: 'Cet utilisateur a déjà une préparation en cours'
        });
      }

      // Créer ou trouver le véhicule
      let vehicle = await Vehicle.findOne({ 
        licensePlate: vehicleData.licensePlate.toUpperCase() 
      });

      if (!vehicle) {
        vehicle = new Vehicle({
          licensePlate: vehicleData.licensePlate.toUpperCase(),
          brand: vehicleData.brand,
          model: vehicleData.model,
          vehicleType: vehicleData.vehicleType || 'particulier',
          year: vehicleData.year,
          fuelType: vehicleData.fuelType,
          color: vehicleData.color,
          condition: vehicleData.condition || 'good'
        });
        await vehicle.save();
      }

      // Initialiser les étapes
      const defaultSteps = assignedSteps || DEFAULT_STEPS;
      const steps = defaultSteps.map(stepType => ({
        step: stepType,
        completed: false,
        completedAt: null,
        notes: '',
        photos: []
      }));

      console.log(createdAt)

      // Créer la préparation
      const preparation = new Preparation({
        user: userId,
        agency: agencyId,
        vehicle: vehicle._id,
        vehicleData: {
          licensePlate: vehicleData.licensePlate.toUpperCase(),
          brand: vehicleData.brand,
          model: vehicleData.model,
          vehicleType: vehicleData.vehicleType || 'particulier',
          year: vehicleData.year,
          fuelType: vehicleData.fuelType,
          color: vehicleData.color,
          condition: vehicleData.condition || 'good'
        },
        status: PREPARATION_STATUS.PENDING, // ✅ PENDING pour admin (pas IN_PROGRESS)
        steps: steps,
        progress: 0,
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
        },
        createdAt: createdAt,
        updatedAt: new Date()
      });

      await preparation.save();

      // Populate pour la réponse
      await preparation.populate(['user', 'agency', 'vehicle']);

      console.log('✅ Préparation créée par admin:', preparation._id);

      res.status(201).json({
        success: true,
        message: 'Préparation créée avec succès',
        data: {
          preparation: {
            id: preparation._id,
            vehicle: {
              id: preparation.vehicle._id,
              licensePlate: preparation.vehicleData.licensePlate,
              brand: preparation.vehicleData.brand,
              model: preparation.vehicleData.model,
              vehicleType: preparation.vehicleData.vehicleType,
              year: preparation.vehicleData.year,
              color: preparation.vehicleData.color,
              condition: preparation.vehicleData.condition
            },
            user: {
              id: preparation.user._id,
              name: `${preparation.user.firstName} ${preparation.user.lastName}`,
              email: preparation.user.email
            },
            agency: {
              id: preparation.agency._id,
              name: preparation.agency.name,
              code: preparation.agency.code,
              client: preparation.agency.client
            },
            status: preparation.status,
            steps: preparation.steps,
            progress: preparation.progress,
            notes: preparation.notes,
            priority: preparation.priority,
            createdAt: preparation.createdAt,
            createdBy: preparation.createdBy
          }
        }
      });

    } catch (error) {
      console.error('❌ Erreur création préparation admin:', error);
      
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
        message: 'Erreur lors de la création de la préparation'
      });
    }
  }
);

/**
 * @route   POST /api/admin/preparations/bulk
 * @desc    Créer plusieurs préparations en une fois
 * @access  Admin
 */
router.post('/bulk', 
  validateBody(createBulkPreparations), 
  async (req, res) => {
    try {
      const {
        userId,
        agencyId,
        vehicles, // Array de véhicules simplifiés
        notes,
        priority,
        createdAt
      } = req.body;

      console.log('BBBBOOOOOOODDDDYYYYYY', req.body);

      console.log('🚀 Création en lot:', { 
        userId, 
        agencyId, 
        vehicleCount: vehicles.length 
      });

      // Vérifier que l'utilisateur existe et est un préparateur
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      if (user.role !== 'preparateur') {
        return res.status(400).json({
          success: false,
          message: 'L\'utilisateur doit être un préparateur'
        });
      }

      // Vérifier que l'agence existe
      const agency = await Agency.findById(agencyId);
      if (!agency) {
        return res.status(404).json({
          success: false,
          message: 'Agence non trouvée'
        });
      }

      // Créer les préparations en parallèle
      const createdPreparations = [];
      const errors = [];

      for (let i = 0; i < vehicles.length; i++) {
        const vehicleData = vehicles[i];
        
        try {
          // Créer ou trouver le véhicule
          let vehicle = await Vehicle.findOne({ 
            licensePlate: vehicleData.licensePlate.toUpperCase() 
          });

          if (!vehicle) {
            vehicle = new Vehicle({
              licensePlate: vehicleData.licensePlate.toUpperCase(),
              brand: '', // Pas de marque dans le formulaire simplifié
              model: vehicleData.model,
              vehicleType: vehicleData.vehicleType,
              agency: agencyId
            });
            await vehicle.save();
          }

          // Initialiser les étapes avec les étapes déjà complétées
          const steps = DEFAULT_STEPS.map(stepType => {
            const isCompleted = vehicleData.completedSteps?.includes(stepType) || false;
            return {
              step: stepType,
              completed: isCompleted,
              completedAt: isCompleted ? new Date() : null,
              notes: isCompleted ? 'Étape pré-complétée lors de la création' : '',
              photos: []
            };
          });

          // Calculer la progression initiale
          const completedCount = steps.filter(s => s.completed).length;
          const initialProgress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

          console.log('DDDDDDAAAAAATTTEEEEE ', createdAt);

          // Créer la préparation
          const preparation = new Preparation({
            user: userId,
            agency: agencyId,
            vehicle: vehicle._id,
            vehicleData: {
              licensePlate: vehicleData.licensePlate.toUpperCase(),
              brand: '', // Pas de marque
              model: vehicleData.model,
              vehicleType: vehicleData.vehicleType
            },
            status: PREPARATION_STATUS.PENDING,
            steps: steps,
            progress: initialProgress, // ✅ Progression calculée
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
            },
            createdAt: createdAt,
            updatedAt: new Date()
          });

          await preparation.save();
          
          // Populate pour la réponse
          await preparation.populate(['user', 'agency']);
          
          createdPreparations.push({
            id: preparation._id,
            vehicle: {
              licensePlate: preparation.vehicleData.licensePlate,
              model: preparation.vehicleData.model,
              vehicleType: preparation.vehicleData.vehicleType
            },
            status: preparation.status,
            priority: preparation.priority,
            progress: preparation.progress, // ✅ Inclure la progression
            completedSteps: vehicleData.completedSteps || [], // ✅ Inclure les étapes pré-complétées
            createdAt: preparation.createdAt
          });

        } catch (error) {
          console.error(`❌ Erreur création préparation ${i + 1}:`, error);
          errors.push({
            vehicleIndex: i + 1,
            licensePlate: vehicleData.licensePlate,
            error: error.message
          });
        }
      }

      console.log(`✅ ${createdPreparations.length}/${vehicles.length} préparations créées`);

      // Réponse
      if (createdPreparations.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucune préparation n\'a pu être créée',
          errors
        });
      } else if (errors.length > 0) {
        return res.status(207).json({ // 207 Multi-Status
          success: true,
          message: `${createdPreparations.length} préparation(s) créée(s), ${errors.length} erreur(s)`,
          data: {
            createdPreparations,
            errors,
            summary: {
              total: vehicles.length,
              created: createdPreparations.length,
              failed: errors.length
            }
          }
        });
      } else {
        return res.status(201).json({
          success: true,
          message: `${createdPreparations.length} préparation(s) créée(s) avec succès`,
          data: {
            createdPreparations,
            summary: {
              total: vehicles.length,
              created: createdPreparations.length,
              failed: 0
            }
          }
        });
      }

    } catch (error) {
      console.error('❌ Erreur création lot préparations:', error);
      
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
        message: 'Erreur lors de la création des préparations'
      });
    }
  }
);

/**
 * @route   GET /api/admin/preparations/stats
 * @desc    Statistiques globales des préparations - VERSION CORRIGÉE POUR USER
 * @access  Admin
 */
router.get('/stats', validateQuery(statsQuerySchema), async (req, res) => {
  try {
    console.log('📊 Requête stats reçue:', req.query);

    const { startDate, endDate, agency, user } = req.query;

    // ✅ CONSTRUCTION DES FILTRES AMÉLIORÉE
    const filters = {};
    
    // Filtre de dates - CONVERSION EXPLICITE
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        const startDateObj = new Date(startDate);
        filters.createdAt.$gte = startDateObj;
        console.log('📅 Filtre startDate appliqué (Date object):', startDateObj);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        filters.createdAt.$lte = endDateObj;
        console.log('📅 Filtre endDate appliqué (Date object):', endDateObj);
      }
    }
    
    // ✅ FILTRE AGENCE - CONVERSION EN OBJECTID
    if (agency) {
      const mongoose = require('mongoose');
      try {
        filters.agency = new mongoose.Types.ObjectId(agency);
        console.log('🏢 Filtre agency appliqué (ObjectId):', filters.agency);
      } catch (error) {
        filters.agency = agency; // Fallback en string
        console.log('🏢 Filtre agency appliqué (string):', agency);
      }
    }
    
    // ✅ FILTRE USER - GÉRER LES DEUX CHAMPS user ET preparateur
    if (user) {
      const mongoose = require('mongoose');
      try {
        const userObjectId = new mongoose.Types.ObjectId(user);
        // Chercher dans les deux champs user ET preparateur
        filters.$or = filters.$or || [];
        filters.$or.push(
          { user: userObjectId },
          { preparateur: userObjectId },
          { user: user }, // Fallback string
          { preparateur: user } // Fallback string
        );
        console.log('👤 Filtre user/preparateur appliqué (hybride):', user);
      } catch (error) {
        // Si ObjectId invalide, utiliser seulement string
        filters.$or = filters.$or || [];
        filters.$or.push(
          { user: user },
          { preparateur: user }
        );
        console.log('👤 Filtre user/preparateur appliqué (string):', user);
      }
    }

    console.log('🎯 Filtres MongoDB finaux:', JSON.stringify(filters, null, 2));

    // Compter d'abord combien de documents matchent
    const matchingCount = await Preparation.countDocuments(filters);
    console.log('📈 Préparations trouvées avec filtres:', matchingCount);

    // Si aucune préparation trouvée, retourner des stats vides
    if (matchingCount === 0) {
      console.log('⚠️ Aucune préparation trouvée, retour de stats vides');
      
      const emptyStats = {
        global: {
          totalPreparations: 0,
          averageTime: 0,
          onTimeRate: 0,
          completionRate: 0
        },
        byStatus: {}
      };

      return res.json({
        success: true,
        data: { 
          stats: emptyStats, 
          period: { 
            startDate: startDate ? new Date(startDate) : null, 
            endDate: endDate ? new Date(endDate) : null 
          } 
        }
      });
    }

    // 🧪 Debug des constantes
    console.log('🔧 PREPARATION_STATUS.COMPLETED:', PREPARATION_STATUS.COMPLETED);
    
    // Test simple de comptage par statut d'abord
    const statusCounts = await Preparation.aggregate([
      { $match: filters },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('📊 Statuts réels dans la base avec ces filtres:', statusCounts);

    // ✅ AGRÉGATIONS CORRIGÉES AVEC GESTION DES CHAMPS NULL
    const [globalStats, statusStats] = await Promise.all([
      Preparation.aggregate([
        { $match: filters },
        {
          $group: {
            _id: null,
            totalPreparations: { $sum: 1 },
            // ✅ Utiliser $ifNull pour gérer les totalTime null/undefined
            averageTime: { 
              $avg: { 
                $ifNull: ['$totalTime', 0] 
              } 
            },
            // ✅ Compter ceux avec totalTime <= 30 (en gérant les null)
            onTimeCount: { 
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $ne: ['$totalTime', null] },
                      { $lte: ['$totalTime', 30] }
                    ]
                  }, 
                  1, 
                  0
                ] 
              } 
            },
            // ✅ Utiliser la valeur littérale "completed"
            completedCount: { 
              $sum: { 
                $cond: [
                  { $eq: ['$status', 'completed'] },
                  1, 
                  0
                ] 
              } 
            },
            // 🧪 Debug : Compter les docs avec totalTime valide
            validTimeCount: {
              $sum: {
                $cond: [
                  { $ne: ['$totalTime', null] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      Preparation.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    console.log('📊 Stats globales brutes (corrigées):', globalStats);
    console.log('📊 Stats par statut brutes:', statusStats);

    const global = globalStats[0] || { 
      totalPreparations: 0, 
      averageTime: 0, 
      onTimeCount: 0, 
      completedCount: 0,
      validTimeCount: 0
    };

    const stats = {
      global: {
        totalPreparations: global.totalPreparations,
        averageTime: Math.round(global.averageTime || 0),
        onTimeRate: global.totalPreparations > 0 ? 
          Math.round((global.onTimeCount / global.totalPreparations) * 100) : 0,
        completionRate: global.totalPreparations > 0 ? 
          Math.round((global.completedCount / global.totalPreparations) * 100) : 0
      },
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      // 🧪 Debug info
      debug: {
        matchingCount,
        validTimeCount: global.validTimeCount,
        filters: filters
      }
    };

    console.log('✅ Stats finales calculées:', stats);

    res.json({
      success: true,
      data: { 
        stats, 
        period: { 
          startDate: startDate ? new Date(startDate) : null, 
          endDate: endDate ? new Date(endDate) : null 
        } 
      }
    });

  } catch (error) {
    console.error('❌ Erreur statistiques complète:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: ERROR_MESSAGES.SERVER_ERROR,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/admin/preparations
 * @desc    Liste toutes les préparations (CORRECTION ERREUR OBJECTID)
 * @access  Admin
 */
router.get('/', validateQuery(preparationQuerySchema), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all',
      agency,
      vehicleType,
      search,
      startDate, 
      endDate,
      user,
      priority,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    console.log('📊 Admin - Récupération préparations avec filtres:', {
      page, limit, status, agency, vehicleType, search, startDate, endDate, user, priority, sort, order
    });

    // ===== CONSTRUCTION DE LA QUERY SÉCURISÉE =====
    const query = {};
    const mongoose = require('mongoose');
    
    // ✅ CORRECTION CRITIQUE: Gérer status='all'
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // ✅ CORRECTION: Validation ObjectId pour agency
    if (agency) {
      try {
        // Vérifier si c'est un ObjectId valide
        if (mongoose.Types.ObjectId.isValid(agency) && agency.length === 24) {
          query.agency = new mongoose.Types.ObjectId(agency);
        } else {
          console.warn('⚠️ Agency ID invalide:', agency);
          // Ne pas ajouter le filtre si l'ID est invalide
        }
      } catch (error) {
        console.warn('⚠️ Erreur conversion agency ObjectId:', error.message);
      }
    }
    
    // ✅ CORRECTION: Validation ObjectId pour user
    if (user) {
      try {
        if (mongoose.Types.ObjectId.isValid(user) && user.length === 24) {
          const userObjectId = new mongoose.Types.ObjectId(user);
          query.$or = [
            { user: userObjectId },
            { preparateur: userObjectId }
          ];
        } else {
          console.warn('⚠️ User ID invalide:', user);
        }
      } catch (error) {
        console.warn('⚠️ Erreur conversion user ObjectId:', error.message);
      }
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    // ✅ FILTRE PAR TYPE VÉHICULE (UNIFIÉ - utilise vehicleData)
    if (vehicleType) {
      query['vehicleData.vehicleType'] = vehicleType;
    }
    
    // ✅ RECHERCHE TEXTUELLE (UNIFIÉE - recherche dans vehicleData)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'vehicleData.licensePlate': searchRegex },
        { 'vehicleData.model': searchRegex },
        { 'vehicleData.brand': searchRegex },
        { notes: searchRegex }
      ];
    }
    
    // Filtre par dates
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    console.log('🔍 Query MongoDB construite:', JSON.stringify(query, null, 2));

    // ===== TEST: Compter d'abord les documents =====
    const totalCount = await Preparation.countDocuments(query).maxTimeMS(10000);
    console.log(`📊 Nombre total de préparations trouvées: ${totalCount}`);

    if (totalCount === 0) {
      console.log('⚠️ Aucune préparation trouvée avec ces filtres');
      
      // Diagnostic: compter TOUTES les préparations
      const allCount = await Preparation.countDocuments({});
      console.log(`📊 Total de préparations dans la DB: ${allCount}`);
      
      // Test sans populate pour éviter les erreurs ObjectId
      const samples = await Preparation.find({}).limit(3).lean();
      console.log('📋 Échantillon préparations:', samples.map(s => ({
        id: s._id,
        status: s.status,
        hasVehicleData: !!s.vehicleData,
        licensePlate: s.vehicleData?.licensePlate || 'N/A',
        userId: s.user,
        agencyId: s.agency,
        vehicleId: s.vehicle // ✅ VOIR SI C'EST UN OBJECTID VALIDE
      })));
    }

    // ===== EXÉCUTION DE LA REQUÊTE SÉCURISÉE =====
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // ✅ SORT CONFIGURATION
    const sortConfig = {};
    sortConfig[sort] = order === 'desc' ? -1 : 1;
    
    // ✅ REQUÊTE SANS POPULATE D'ABORD (pour identifier le problème)
    console.log('🔍 Exécution requête sans populate...');
    const preparationsRaw = await Preparation.find(query)
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip(skip)
      .maxTimeMS(30000)
      .lean();

    console.log(`📈 ${preparationsRaw.length} préparations récupérées sans populate`);

    // ✅ DIAGNOSTIC: Vérifier les références vehicle
    if (preparationsRaw.length > 0) {
      const firstPrep = preparationsRaw[0];
      console.log('🔍 Première préparation - Références:', {
        id: firstPrep._id,
        userId: firstPrep.user,
        agencyId: firstPrep.agency,
        vehicleId: firstPrep.vehicle,
        vehicleIsValid: firstPrep.vehicle ? mongoose.Types.ObjectId.isValid(firstPrep.vehicle) : 'NULL',
        hasVehicleData: !!firstPrep.vehicleData
      });
    }

    // ✅ POPULATE SÉCURISÉ (seulement les champs valides)
    const preparations = [];
    
    for (const prep of preparationsRaw) {
      try {
        let populatedPrep = { ...prep };
        
        // Populate user seulement si valide
        if (prep.user && mongoose.Types.ObjectId.isValid(prep.user)) {
          try {
            const User = require('../../../models/User'); // Ajuster le chemin
            const user = await User.findById(prep.user, 'firstName lastName email phone').lean();
            populatedPrep.user = user;
          } catch (error) {
            console.warn(`⚠️ Impossible de populate user ${prep.user}:`, error.message);
            populatedPrep.user = null;
          }
        }
        
        // Populate agency seulement si valide
        if (prep.agency && mongoose.Types.ObjectId.isValid(prep.agency)) {
          try {
            const Agency = require('../../../models/Agency'); // Ajuster le chemin
            const agency = await Agency.findById(prep.agency, 'name code client address').lean();
            populatedPrep.agency = agency;
          } catch (error) {
            console.warn(`⚠️ Impossible de populate agency ${prep.agency}:`, error.message);
            populatedPrep.agency = null;
          }
        }
        
        // ✅ CORRECTION CRITIQUE: Populate vehicle seulement si c'est un ObjectId valide
        if (prep.vehicle && mongoose.Types.ObjectId.isValid(prep.vehicle)) {
          try {
            const Vehicle = require('../../../models/Vehicle'); // Ajuster le chemin
            const vehicle = await Vehicle.findById(prep.vehicle, 'licensePlate brand model vehicleType').lean();
            populatedPrep.vehicle = vehicle;
          } catch (error) {
            console.warn(`⚠️ Impossible de populate vehicle ${prep.vehicle}:`, error.message);
            populatedPrep.vehicle = null;
          }
        } else if (prep.vehicle) {
          console.warn(`⚠️ Vehicle ID invalide pour préparation ${prep._id}:`, prep.vehicle);
          populatedPrep.vehicle = null;
        }
        
        preparations.push(populatedPrep);
        
      } catch (error) {
        console.error(`❌ Erreur populate préparation ${prep._id}:`, error.message);
        // Garder la préparation sans populate
        preparations.push(prep);
      }
    }

    console.log(`📈 ${preparations.length} préparations avec populate réussi`);

    // ===== FORMATAGE UNIFIÉ DES RÉPONSES =====
    const formattedPreparations = preparations.map(prep => {
      try {
        // ✅ FORMATAGE COMPATIBLE AVEC SCHEMA UNIFIÉ
        return {
          id: prep._id,
          // ✅ VÉHICULE DEPUIS VEHICLEDATA (source unique de vérité)
          vehicle: {
            id: prep.vehicle?._id,
            licensePlate: prep.vehicleData?.licensePlate || prep.vehicleInfo?.licensePlate || 'N/A',
            brand: prep.vehicleData?.brand || prep.vehicleInfo?.brand || 'N/A',
            model: prep.vehicleData?.model || prep.vehicleInfo?.model || 'Véhicule',
            vehicleType: prep.vehicleData?.vehicleType || prep.vehicleInfo?.vehicleType || 'particulier',
            year: prep.vehicleData?.year || prep.vehicleInfo?.year,
            fuelType: prep.vehicleData?.fuelType || prep.vehicleInfo?.fuelType,
            color: prep.vehicleData?.color || prep.vehicleInfo?.color,
            condition: prep.vehicleData?.condition || prep.vehicleInfo?.condition
          },
          user: prep.user ? {
            id: prep.user._id,
            name: `${prep.user.firstName} ${prep.user.lastName}`,
            email: prep.user.email,
            phone: prep.user.phone
          } : null,
          agency: prep.agency ? {
            id: prep.agency._id,
            name: prep.agency.name,
            code: prep.agency.code,
            client: prep.agency.client,
            address: prep.agency.address
          } : null,
          status: prep.status,
          progress: prep.progress || 0,
          currentDuration: prep.currentDuration || 0,
          totalTime: prep.totalTime,
          isOnTime: prep.isOnTime,
          startTime: prep.startTime,
          endTime: prep.endTime,
          steps: (prep.steps || []).map(step => ({
            step: step.step,
            completed: step.completed,
            completedAt: step.completedAt,
            duration: step.duration,
            notes: step.notes || '',
            photos: step.photos || []
          })),
          issues: prep.issues || [],
          notes: prep.notes || '',
          priority: prep.priority || 'normal',
          createdBy: prep.createdBy,
          createdAt: prep.createdAt,
          updatedAt: prep.updatedAt
        };
      } catch (error) {
        console.error(`❌ Erreur formatage préparation ${prep._id}:`, error.message);
        return {
          id: prep._id,
          vehicle: {
            licensePlate: prep.vehicleData?.licensePlate || 'N/A',
            brand: prep.vehicleData?.brand || 'N/A',
            model: prep.vehicleData?.model || 'Véhicule',
            vehicleType: prep.vehicleData?.vehicleType || 'particulier'
          },
          status: prep.status || 'pending',
          progress: prep.progress || 0,
          createdAt: prep.createdAt,
          error: 'Données partielles'
        };
      }
    });

    // ===== PAGINATION =====
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      hasNextPage: parseInt(page) * parseInt(limit) < totalCount,
      hasPrevPage: parseInt(page) > 1
    };

    // ===== STATISTIQUES RAPIDES (SÉCURISÉES) =====
    const stats = {
      total: totalCount,
      byStatus: {},
      byVehicleType: {},
      byPriority: {}
    };

    // Calculer les stats par statut (seulement si on a des résultats)
    if (totalCount > 0) {
      try {
        const [statusStats, vehicleTypeStats, priorityStats] = await Promise.all([
          Preparation.aggregate([
            { $match: query },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ]).maxTimeMS(5000),
          
          Preparation.aggregate([
            { $match: query },
            { $group: { _id: '$vehicleData.vehicleType', count: { $sum: 1 } } }
          ]).maxTimeMS(5000),
          
          Preparation.aggregate([
            { $match: query },
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ]).maxTimeMS(5000)
        ]);
        
        statusStats.forEach(stat => {
          stats.byStatus[stat._id] = stat.count;
        });

        vehicleTypeStats.forEach(stat => {
          stats.byVehicleType[stat._id || 'non-défini'] = stat.count;
        });

        priorityStats.forEach(stat => {
          stats.byPriority[stat._id || 'normal'] = stat.count;
        });

      } catch (error) {
        console.warn('⚠️ Impossible de calculer les statistiques:', error.message);
      }
    }

    // ===== RÉPONSE FINALE =====
    console.log(`✅ Admin - Envoi de ${formattedPreparations.length} préparations formatées`);

    res.json({
      success: true,
      data: {
        preparations: formattedPreparations,
        pagination,
        stats,
        filters: {
          status,
          agency,
          vehicleType,
          search,
          startDate,
          endDate,
          user,
          priority,
          sort,
          order
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération préparations admin:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des préparations',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack?.split('\n')[0]
      } : undefined
    });
  }
});

/**
 * @route   GET /api/admin/preparations/:id
 * @desc    Récupérer le détail d'une préparation (COMPATIBLE SCHEMA UNIFIÉ)
 * @access  Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Admin - Récupération détail préparation: ${id}`);

    const preparation = await Preparation.findById(id)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address')
      .populate('vehicle', 'licensePlate brand model vehicleType')
      .maxTimeMS(15000);

    if (!preparation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Préparation non trouvée' 
      });
    }

    // ✅ FORMATAGE UNIFIÉ DU DÉTAIL
    const formattedPreparation = {
      id: preparation._id,
      // ✅ VÉHICULE DEPUIS VEHICLEDATA
      vehicle: {
        id: preparation.vehicle?._id,
        licensePlate: preparation.vehicleData?.licensePlate || 'N/A',
        brand: preparation.vehicleData?.brand || 'N/A',
        model: preparation.vehicleData?.model || 'Véhicule',
        vehicleType: preparation.vehicleData?.vehicleType || 'particulier',
        year: preparation.vehicleData?.year,
        fuelType: preparation.vehicleData?.fuelType,
        color: preparation.vehicleData?.color,
        condition: preparation.vehicleData?.condition
      },
      user: preparation.user ? {
        id: preparation.user._id,
        name: `${preparation.user.firstName} ${preparation.user.lastName}`,
        email: preparation.user.email,
        phone: preparation.user.phone
      } : null,
      agency: preparation.agency ? {
        id: preparation.agency._id,
        name: preparation.agency.name,
        code: preparation.agency.code,
        client: preparation.agency.client,
        address: preparation.agency.address
      } : null,
      status: preparation.status,
      progress: preparation.progress || 0,
      currentDuration: preparation.currentDuration || 0,
      totalTime: preparation.totalTime,
      isOnTime: preparation.isOnTime,
      startTime: preparation.startTime,
      endTime: preparation.endTime,
      steps: (preparation.steps || []).map(step => ({
        step: step.step,
        completed: step.completed,
        completedAt: step.completedAt,
        duration: step.duration,
        notes: step.notes || '',
        photos: step.photos || []
      })),
      issues: preparation.issues || [],
      notes: preparation.notes || '',
      priority: preparation.priority || 'normal',
      createdBy: preparation.createdBy,
      agencyHistory: preparation.agencyHistory || [],
      createdAt: preparation.createdAt,
      updatedAt: preparation.updatedAt
    };

    console.log(`✅ Admin - Détail préparation envoyé: ${formattedPreparation.vehicle.licensePlate}`);

    res.json({ 
      success: true, 
      data: { 
        preparation: formattedPreparation 
      } 
    });

  } catch (error) {
    console.error('❌ Erreur récupération détail préparation:', error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du détail de la préparation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/admin/preparations/:id/photos
 * @desc    Récupérer les photos d'une préparation
 * @access  Admin
 */
router.get('/:id/photos', validateObjectId(), async (req, res) => {
  try {
    const preparation = await Preparation.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('vehicle', 'licensePlate model brand');

    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Préparation non trouvée' });
    }

    const photos = [];
    preparation.steps.forEach(step => {
      if (step.photos && step.photos.length > 0) {
        step.photos.forEach((photo, index) => {
          // ✅ CORRECTION : Gérer les deux formats possibles
          let photoUrl;
          let description = '';
          let uploadedAt = step.completedAt;

          // Si c'est un objet avec url, description, etc.
          if (typeof photo === 'object' && photo !== null) {
            photoUrl = photo.url || photo.secure_url;
            description = photo.description || '';
            uploadedAt = photo.uploadedAt || step.completedAt;
          } 
          // Si c'est juste une string (ancien format)
          else if (typeof photo === 'string') {
            photoUrl = photo;
            description = `Photo étape ${step.step}`;
          }

          // Vérifier que nous avons une URL valide
          if (photoUrl && photoUrl.trim()) {
            photos.push({
              stepType: step.step,
              stepLabel: STEP_LABELS[step.step],
              stepIcon: STEP_ICONS[step.step],
              photoUrl: photoUrl.trim(), // ✅ S'assurer qu'il n'y a pas d'espaces
              photoIndex: index,
              completedAt: uploadedAt || step.completedAt,
              notes: step.notes || '',
              description: description
            });
          } else {
            console.warn(`⚠️ Photo invalide trouvée pour l'étape ${step.step}:`, photo);
          }
        });
      }
    });

    // ✅ AJOUT : Statistiques pour debug
    const totalSteps = preparation.steps.length;
    const completedSteps = preparation.steps.filter(step => step.completed).length;
    const stepsWithPhotos = preparation.steps.filter(step => step.photos && step.photos.length > 0).length;

    console.log(`✅ Photos récupérées pour préparation ${req.params.id}:`, {
      totalPhotos: photos.length,
      totalSteps,
      completedSteps,
      stepsWithPhotos
    });

    res.json({
      success: true,
      data: {
        photos,
        totalPhotos: photos.length,
        totalSteps,
        completedSteps,
        stepsWithPhotos,
        progress: Math.round((completedSteps / totalSteps) * 100)
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération photos:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

/**
 * @route   PUT /api/admin/preparations/:id/agency
 * @desc    Modifier l'agence d'une préparation
 * @access  Admin
 */
router.put('/:id/agency', validateObjectId(), validateBody(updateAgencySchema), async (req, res) => {
  try {
    const { agencyId, reason } = req.body;

    const preparation = await Preparation.findById(req.params.id);
    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Préparation non trouvée' });
    }

    const newAgency = await Agency.findById(agencyId);
    if (!newAgency) {
      return res.status(404).json({ success: false, message: 'Agence non trouvée' });
    }

    if (preparation.agency.toString() === agencyId) {
      return res.status(400).json({ success: false, message: 'La préparation est déjà assignée à cette agence' });
    }

    const oldAgency = await Agency.findById(preparation.agency);
    const agencyChange = {
      fromAgency: { id: oldAgency._id, name: oldAgency.name, code: oldAgency.code },
      toAgency: { id: newAgency._id, name: newAgency.name, code: newAgency.code },
      changedBy: {
        id: req.user.userId,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      reason: reason || 'Modification par admin',
      changedAt: new Date()
    };

    if (!preparation.agencyHistory) preparation.agencyHistory = [];
    preparation.agency = agencyId;
    preparation.agencyHistory.push(agencyChange);
    preparation.updatedAt = new Date();

    await preparation.save();

    const updatedPreparation = await Preparation.findById(req.params.id)
      .populate('agency', 'name code client');

    res.json({
      success: true,
      message: `Préparation transférée vers l'agence ${newAgency.name}`,
      data: {
        preparation: {
          id: updatedPreparation._id,
          agency: {
            id: updatedPreparation.agency._id,
            name: updatedPreparation.agency.name,
            code: updatedPreparation.agency.code,
            client: updatedPreparation.agency.client
          },
          agencyHistory: updatedPreparation.agencyHistory
        },
        change: agencyChange
      }
    });

  } catch (error) {
    console.error('❌ Erreur modification agence:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

/**
 * @route   PUT /api/admin/preparations/:id/steps
 * @desc    Modifier les étapes d'une préparation
 * @access  Admin
 */
router.put('/:id/steps', validateObjectId(), validateBody(editStepsSchema), async (req, res) => {
  try {
    const { steps, adminNotes } = req.body;

    const preparation = await Preparation.findById(req.params.id);
    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Préparation non trouvée' });
    }

    const previousSteps = preparation.steps.map(step => ({
      step: step.step,
      completed: step.completed,
      completedAt: step.completedAt,
      notes: step.notes,
      photos: step.photos || []
    }));

    const newSteps = steps.map(stepData => {
      const existingStep = preparation.steps.find(s => s.step === stepData.step);
      if (existingStep) {
        return {
          step: stepData.step,
          completed: stepData.completed,
          completedAt: existingStep.completedAt || (stepData.completed ? new Date() : null),
          notes: stepData.notes || existingStep.notes || '',
          photos: existingStep.photos || []
        };
      } else {
        return {
          step: stepData.step,
          completed: stepData.completed,
          completedAt: stepData.completed ? new Date() : null,
          notes: stepData.notes || '',
          photos: []
        };
      }
    });

    preparation.steps = newSteps;
    preparation.updatedAt = new Date();

    if (!preparation.adminModifications) preparation.adminModifications = [];
    preparation.adminModifications.push({
      modifiedBy: {
        id: req.user.userId,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email
      },
      modifiedAt: new Date(),
      type: 'steps_modification',
      previousSteps,
      newSteps: newSteps.map(step => ({
        step: step.step,
        completed: step.completed,
        notes: step.notes
      })),
      adminNotes: adminNotes || 'Modification des étapes par admin'
    });

    await preparation.save();

    res.json({
      success: true,
      message: 'Étapes modifiées avec succès',
      data: {
        preparation: {
          id: preparation._id,
          steps: preparation.steps,
          progress: preparation.progress,
          adminModifications: preparation.adminModifications
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur modification étapes:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
  }
});

module.exports = router;