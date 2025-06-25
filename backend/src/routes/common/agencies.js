const express = require('express');
const Agency = require('../../models/Agency');
const Vehicle = require('../../models/Vehicle');
const { auth } = require('../../middleware/auth');
const { anyUserAuth } = require('../../middleware/adminAuth');
const { validateObjectId } = require('../../middleware/validation');
const { ERROR_MESSAGES } = require('../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification (admin ou préparateur)
router.use(auth, anyUserAuth);

/**
 * @route   GET /api/agencies
 * @desc    Obtenir les agences accessibles à l'utilisateur
 * @access  Private (Admin ou Preparateur)
 */
router.get('/', async (req, res) => {
  try {
    let agencies;

    if (req.user.role === 'admin') {
      // Les admins voient toutes les agences actives
      agencies = await Agency.findActive();
    } else {
      // Les préparateurs ne voient que leurs agences assignées
      agencies = await Agency.find({
        _id: { $in: req.user.agencies.map(a => a._id) },
        isActive: true
      }).sort({ name: 1 });
    }

    res.json({
      success: true,
      data: {
        agencies: agencies.map(agency => ({
          id: agency._id,
          name: agency.name,
          address: agency.address,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          workingDuration: agency.workingDuration,
          isActive: agency.isActive
        })),
        count: agencies.length
      }
    });

  } catch (error) {
    console.error('Erreur récupération agences:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/agencies/:id
 * @desc    Obtenir une agence spécifique
 * @access  Private (Admin ou Preparateur avec accès)
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const agencyId = req.params.id;

    // Vérifier l'accès pour les préparateurs
    if (req.user.role === 'preparateur') {
      const hasAccess = req.user.agencies.some(
        agency => agency._id.toString() === agencyId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }
    }

    const agency = await Agency.findById(agencyId);

    if (!agency || !agency.isActive) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.AGENCY_NOT_FOUND
      });
    }

    res.json({
      success: true,
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          address: agency.address,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          workingDuration: agency.workingDuration,
          contact: agency.contact,
          settings: agency.settings,
          isActive: agency.isActive,
          createdAt: agency.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/agencies/:id/vehicles
 * @desc    Obtenir les véhicules d'une agence
 * @access  Private (Admin ou Preparateur avec accès)
 */
router.get('/:id/vehicles', validateObjectId('id'), async (req, res) => {
  try {
    const agencyId = req.params.id;
    const { status, search } = req.query;

    // Vérifier l'accès pour les préparateurs
    if (req.user.role === 'preparateur') {
      const hasAccess = req.user.agencies.some(
        agency => agency._id.toString() === agencyId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }
    }

    // Vérifier que l'agence existe
    const agency = await Agency.findById(agencyId);
    if (!agency || !agency.isActive) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.AGENCY_NOT_FOUND
      });
    }

    // Construire les filtres
    const filters = { agency: agencyId };
    if (status) filters.status = status;
    if (search) filters.search = search;

    const vehicles = await Vehicle.findWithFilters(filters);

    res.json({
      success: true,
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          code: agency.code
        },
        vehicles: vehicles.map(vehicle => ({
          id: vehicle._id,
          licensePlate: vehicle.licensePlate,
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color,
          year: vehicle.year,
          fullName: vehicle.fullName,
          status: vehicle.status,
          specifications: vehicle.specifications,
          condition: vehicle.condition,
          requiresSpecialCare: vehicle.requiresSpecialCare,
          needsAttention: vehicle.needsAttention,
          stats: vehicle.stats,
          lastPreparation: vehicle.lastPreparation,
          createdAt: vehicle.createdAt
        })),
        count: vehicles.length,
        filters: { status, search }
      }
    });

  } catch (error) {
    console.error('Erreur récupération véhicules agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/agencies/:id/stats
 * @desc    Obtenir les statistiques d'une agence (version simplifiée pour préparateurs)
 * @access  Private (Admin ou Preparateur avec accès)
 */
router.get('/:id/stats', validateObjectId('id'), async (req, res) => {
  try {
    const agencyId = req.params.id;
    const { startDate, endDate } = req.query;

    // Vérifier l'accès pour les préparateurs
    if (req.user.role === 'preparateur') {
      const hasAccess = req.user.agencies.some(
        agency => agency._id.toString() === agencyId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }
    }

    const agency = await Agency.findById(agencyId);

    if (!agency || !agency.isActive) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.AGENCY_NOT_FOUND
      });
    }

    // Calculer les dates par défaut (30 derniers jours)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Obtenir les statistiques de l'agence
    const stats = await agency.getStats(start, end);

    // Statistiques des véhicules
    const vehicleStats = await Vehicle.getStats(agencyId);

    // Pour les préparateurs, limiter les informations sensibles
    let responseData = {
      agency: {
        id: agency._id,
        name: agency.name,
        code: agency.code
      },
      period: {
        startDate: start,
        endDate: end
      },
      vehicles: vehicleStats[0] || { statusCounts: [], total: 0 }
    };

    if (req.user.role === 'admin') {
      // Les admins voient toutes les statistiques
      responseData.stats = stats;
    } else {
      // Les préparateurs voient des statistiques limitées
      responseData.stats = {
        preparations: {
          total: stats?.preparations?.total || 0,
          averageTime: stats?.preparations?.averageTime || 0
        }
      };
    }

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Erreur statistiques agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/agencies/:id/activity
 * @desc    Obtenir l'activité récente d'une agence
 * @access  Private (Admin ou Preparateur avec accès)
 */
router.get('/:id/activity', validateObjectId('id'), async (req, res) => {
  try {
    const agencyId = req.params.id;
    const { limit = 20 } = req.query;

    // Vérifier l'accès pour les préparateurs
    if (req.user.role === 'preparateur') {
      const hasAccess = req.user.agencies.some(
        agency => agency._id.toString() === agencyId.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
        });
      }
    }

    const agency = await Agency.findById(agencyId);

    if (!agency || !agency.isActive) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.AGENCY_NOT_FOUND
      });
    }

    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Activité récente en parallèle
    const [
      recentPreparations,
      recentTimesheets,
      ongoingPreparations
    ] = await Promise.all([
      // Préparations récentes (dernières 24h)
      require('../../models/Preparation').find({
        agency: agencyId,
        createdAt: { $gte: yesterday },
        status: { $in: ['completed', 'cancelled'] }
      })
      .populate('user', 'firstName lastName')
      .populate('vehicle', 'licensePlate brand model')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) / 2),

      // Pointages récents
      require('../../models/Timesheet').find({
        agency: agencyId,
        date: { $gte: yesterday }
      })
      .populate('user', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit) / 2),

      // Préparations en cours
      require('../../models/Preparation').find({
        agency: agencyId,
        status: 'in_progress'
      })
      .populate('user', 'firstName lastName')
      .populate('vehicle', 'licensePlate brand model')
      .sort({ startTime: 1 })
    ]);

    // Formater l'activité
    const activity = [];

    // Ajouter les préparations terminées
    recentPreparations.forEach(prep => {
      activity.push({
        type: 'preparation_completed',
        timestamp: prep.endTime || prep.updatedAt,
        user: prep.user,
        vehicle: prep.vehicle,
        data: {
          duration: prep.totalMinutes,
          isOnTime: prep.isOnTime,
          status: prep.status
        }
      });
    });

    // Ajouter les pointages
    recentTimesheets.forEach(timesheet => {
      if (timesheet.startTime) {
        activity.push({
          type: 'clock_in',
          timestamp: timesheet.startTime,
          user: timesheet.user,
          data: {
            delay: timesheet.delays.startDelay
          }
        });
      }
      
      if (timesheet.endTime) {
        activity.push({
          type: 'clock_out',
          timestamp: timesheet.endTime,
          user: timesheet.user,
          data: {
            totalWorked: timesheet.totalWorkedMinutes
          }
        });
      }
    });

    // Trier par timestamp décroissant
    activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          code: agency.code
        },
        recentActivity: activity.slice(0, parseInt(limit)),
        ongoingPreparations: ongoingPreparations.map(prep => ({
          id: prep._id,
          user: prep.user,
          vehicle: prep.vehicle,
          startTime: prep.startTime,
          currentDuration: prep.currentDuration,
          progress: prep.progress
        }))
      }
    });

  } catch (error) {
    console.error('Erreur activité agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;