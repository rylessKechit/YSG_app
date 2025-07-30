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
        priority
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
      const defaultSteps = assignedSteps || PREPARATION_STEPS;
      const steps = defaultSteps.map(stepType => ({
        step: stepType,
        completed: false,
        completedAt: null,
        notes: '',
        photos: []
      }));

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
        createdAt: new Date(),
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
        priority
      } = req.body;

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
          const steps = PREPARATION_STEPS.map(stepType => {
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
            createdAt: new Date(),
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
 * @desc    Récupérer les préparations avec filtres
 * @access  Admin
 */
router.get('/', validateQuery(preparationQuerySchema), async (req, res) => {
  try {
    console.log('📋 Requête préparations reçue:', req.query);

    const { page, limit, search, user, agency, status, startDate, endDate, sort, order } = req.query;

    // Construire les filtres MongoDB
    const filters = {};
    
    // Filtre de recherche textuelle
    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filters.$or = [
        { 'vehicle.licensePlate': searchRegex },
        { 'vehicle.model': searchRegex },
        { notes: searchRegex }
      ];
      console.log('🔍 Filtre de recherche appliqué:', search.trim());
    }
    
    // Filtre utilisateur - GÉRER LES DEUX CHAMPS
    if (user) {
      // Si on a déjà un $or pour la recherche, on l'étend
      if (filters.$or) {
        // Créer un $and pour combiner recherche textuelle ET filtre user
        const searchOr = filters.$or;
        delete filters.$or;
        filters.$and = [
          { $or: searchOr },
          { $or: [{ user: user }, { preparateur: user }] }
        ];
      } else {
        // Pas de recherche textuelle, simple $or pour user/preparateur
        filters.$or = [
          { user: user },
          { preparateur: user }
        ];
      }
      console.log('👤 Filtre user/preparateur appliqué:', user);
    }
    
    // Filtre agence
    if (agency) {
      filters.agency = agency;
      console.log('🏢 Filtre agency appliqué:', agency);
    }
    
    // Filtre statut
    if (status && status !== 'all') {
      filters.status = status;
      console.log('📊 Filtre status appliqué:', status);
    }
    
    // Filtre de dates
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.$gte = new Date(startDate);
        console.log('📅 Filtre startDate appliqué:', new Date(startDate));
      }
      if (endDate) {
        filters.createdAt.$lte = new Date(endDate);
        console.log('📅 Filtre endDate appliqué:', new Date(endDate));
      }
    }

    console.log('🎯 Filtres MongoDB pour préparations:', JSON.stringify(filters, null, 2));

    const skip = (page - 1) * limit;
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    const [preparations, total] = await Promise.all([
      Preparation.find(filters)
        .populate('user', 'firstName lastName email')
        .populate('agency', 'name code client')
        .populate('vehicle', 'licensePlate model brand')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      Preparation.countDocuments(filters)
    ]);

    console.log('📋 Préparations trouvées:', preparations.length, 'sur un total de', total);

    const formattedPreparations = preparations.map(prep => ({
      id: prep._id,
      vehicle: {
        id: prep.vehicle?._id,
        licensePlate: prep.vehicle?.licensePlate || 'N/A',
        model: prep.vehicle?.model || 'N/A',
        brand: prep.vehicle?.brand || 'N/A'
      },
      user: {
        id: prep.user._id,
        name: `${prep.user.firstName} ${prep.user.lastName}`,
        email: prep.user.email
      },
      agency: {
        id: prep.agency._id,
        name: prep.agency.name,
        code: prep.agency.code,
        client: prep.agency.client
      },
      status: prep.status,
      progress: prep.progress,
      duration: prep.currentDuration,
      totalTime: prep.totalTime,
      isOnTime: prep.isOnTime,
      startTime: prep.startTime,
      endTime: prep.endTime,
      steps: prep.steps.map(step => ({
        step: step.step,
        completed: step.completed,
        completedAt: step.completedAt,
        notes: step.notes,
        photosCount: step.photos ? step.photos.length : 0
      })),
      issues: prep.issues || [],
      notes: prep.notes,
      createdAt: prep.createdAt,
      updatedAt: prep.updatedAt
    }));

    // Calculer les stats avec les mêmes filtres
    const stats = {
      total,
      pending: await Preparation.countDocuments({ ...filters, status: PREPARATION_STATUS.PENDING }),
      inProgress: await Preparation.countDocuments({ ...filters, status: PREPARATION_STATUS.IN_PROGRESS }),
      completed: await Preparation.countDocuments({ ...filters, status: PREPARATION_STATUS.COMPLETED }),
      cancelled: await Preparation.countDocuments({ ...filters, status: PREPARATION_STATUS.CANCELLED })
    };

    console.log('📊 Stats par statut calculées:', stats);

    res.json({
      success: true,
      data: {
        preparations: formattedPreparations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: { search: search || '', user, agency, status, startDate, endDate, sort, order },
        stats
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération préparations complète:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: ERROR_MESSAGES.SERVER_ERROR,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/admin/preparations/:id
 * @desc    Récupérer le détail d'une préparation
 * @access  Admin
 */
router.get('/:id', validateObjectId(), async (req, res) => {
  try {
    const preparation = await Preparation.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address')
      .populate('vehicle', 'licensePlate model brand year color condition');

    if (!preparation) {
      return res.status(404).json({ success: false, message: 'Préparation non trouvée' });
    }

    const formattedPreparation = {
      id: preparation._id,
      vehicle: {
        id: preparation.vehicle?._id,
        licensePlate: preparation.vehicle?.licensePlate || 'N/A',
        model: preparation.vehicle?.model || 'N/A',
        brand: preparation.vehicle?.brand || 'N/A',
        year: preparation.vehicle?.year,
        color: preparation.vehicle?.color,
        condition: preparation.vehicle?.condition
      },
      user: {
        id: preparation.user._id,
        name: `${preparation.user.firstName} ${preparation.user.lastName}`,
        email: preparation.user.email,
        phone: preparation.user.phone
      },
      agency: {
        id: preparation.agency._id,
        name: preparation.agency.name,
        code: preparation.agency.code,
        client: preparation.agency.client,
        address: preparation.agency.address
      },
      status: preparation.status,
      progress: preparation.progress,
      duration: preparation.currentDuration,
      totalTime: preparation.totalTime,
      isOnTime: preparation.isOnTime,
      startTime: preparation.startTime,
      endTime: preparation.endTime,
      steps: preparation.steps.map(step => ({
        step: step.step,
        completed: step.completed,
        completedAt: step.completedAt,
        notes: step.notes,
        photos: step.photos || []
      })),
      issues: preparation.issues || [],
      notes: preparation.notes,
      agencyHistory: preparation.agencyHistory || [],
      createdAt: preparation.createdAt,
      updatedAt: preparation.updatedAt
    };

    res.json({ success: true, data: { preparation: formattedPreparation } });

  } catch (error) {
    console.error('❌ Erreur récupération détail:', error);
    res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR });
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