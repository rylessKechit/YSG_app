// ===== CORRECTION COMPLÈTE - backend/src/routes/preparateur/timesheets.js =====
const express = require('express');
const Timesheet = require('../../models/Timesheet');
const Schedule = require('../../models/Schedule');
const { auth } = require('../../middleware/auth');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, USER_ROLES } = require('../../utils/constants');
const Joi = require('joi');
const mongoose = require('mongoose');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION INTÉGRÉS =====
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId validation').messages({
  'any.invalid': 'ID invalide'
});

const timesheetSchemas = {
  clockIn: Joi.object({
    agencyId: objectId.required()
  }),

  clockOut: Joi.object({
    agencyId: objectId.required()
  }),

  breakAction: Joi.object({
    agencyId: objectId.required()
  })
};

// ===== MIDDLEWARE INTÉGRÉS =====

// Middleware d'authentification pour toutes les routes
router.use(auth);

// Middleware de validation du body
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Données invalides',
          errors: errorMessages
        });
      }

      req.body = value;
      next();

    } catch (validationError) {
      console.error('Erreur validation:', validationError);
      res.status(500).json({
        success: false,
        message: 'Erreur de validation'
      });
    }
  };
};

// Middleware de vérification d'accès à l'agence
const checkAgencyAccess = (req, res, next) => {
  try {
    const agencyId = req.params.agencyId || req.body.agencyId || req.query.agencyId;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'agence requis'
      });
    }

    // Les admins ont accès à toutes les agences
    if (req.user.role === 'admin') {
      return next();
    }

    // Vérifier que le préparateur a accès à cette agence
    const hasAccess = req.user.agencies.some(
      agency => agency._id.toString() === agencyId.toString()
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette agence'
      });
    }

    next();

  } catch (error) {
    console.error('Erreur vérification agence:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur de vérification d\'accès'
    });
  }
};

// ===== ROUTES =====

/**
 * @route   POST /api/timesheets/clock-in
 * @desc    Pointer l'arrivée
 * @access  Preparateur
 */
router.post('/clock-in', validateBody(timesheetSchemas.clockIn), checkAgencyAccess, async (req, res) => {
  try {
    const { agencyId } = req.body;
    const userId = req.user.userId;
    
    console.log('🔄 Clock-in pour user:', userId, 'agence:', agencyId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Vérifier s'il y a déjà un pointage aujourd'hui
    const existingTimesheet = await Timesheet.findOne({
      user: userId,
      agency: agencyId,
      date: today
    });
    
    if (existingTimesheet && existingTimesheet.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà pointé votre arrivée aujourd\'hui'
      });
    }

    const clockInTime = new Date();
    
    let timesheet;
    if (existingTimesheet) {
      // Mettre à jour le timesheet existant
      existingTimesheet.startTime = clockInTime;
      timesheet = await existingTimesheet.save();
    } else {
      // Créer un nouveau timesheet
      timesheet = new Timesheet({
        user: userId,
        agency: agencyId,
        date: today,
        startTime: clockInTime
      });
      await timesheet.save();
    }

    // Charger les relations pour la réponse
    await timesheet.populate('agency', 'name code client');

    res.json({
      success: true,
      message: 'Arrivée pointée avec succès',
      data: {
        timesheet: {
          id: timesheet._id,
          agency: timesheet.agency,
          date: timesheet.date,
          startTime: timesheet.startTime,
          status: timesheet.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur clock-in:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du pointage d\'arrivée',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/timesheets/clock-out
 * @desc    Pointer le départ
 * @access  Preparateur
 */
router.post('/clock-out', validateBody(timesheetSchemas.clockOut), checkAgencyAccess, async (req, res) => {
  try {
    const { agencyId, notes } = req.body;
    const userId = req.user.userId;
    
    console.log('🔄 Clock-out pour user:', userId, 'agence:', agencyId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timesheet = await Timesheet.findOne({
      user: userId,
      agency: agencyId,
      date: today
    });
    
    if (!timesheet || !timesheet.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez d\'abord pointer votre arrivée'
      });
    }
    
    if (timesheet.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà pointé votre départ aujourd\'hui'
      });
    }

    const clockOutTime = new Date();
    timesheet.endTime = clockOutTime;
    if (notes) timesheet.notes = notes;

    await timesheet.save();

    // Charger les relations pour la réponse
    await timesheet.populate('agency', 'name code client');

    res.json({
      success: true,
      message: 'Départ pointé avec succès',
      data: {
        timesheet: {
          id: timesheet._id,
          agency: timesheet.agency,
          date: timesheet.date,
          startTime: timesheet.startTime,
          endTime: timesheet.endTime,
          status: timesheet.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur clock-out:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du pointage de départ',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/timesheets/break-start
 * @desc    Pointer le début de pause
 * @access  Preparateur
 */
router.post('/break-start', validateBody(timesheetSchemas.breakAction), checkAgencyAccess, async (req, res) => {
  try {
    const { agencyId, reason } = req.body;
    const userId = req.user.userId;
    
    console.log('🔄 Break-start pour user:', userId, 'agence:', agencyId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timesheet = await Timesheet.findOne({
      user: userId,
      agency: agencyId,
      date: today
    });
    
    if (!timesheet || !timesheet.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez d\'abord pointer votre arrivée'
      });
    }
    
    if (timesheet.breakStart && !timesheet.breakEnd) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà en pause'
      });
    }

    if (timesheet.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de prendre une pause après avoir pointé le départ'
      });
    }

    timesheet.breakStart = new Date();
    await timesheet.save();

    // Charger les relations pour la réponse
    await timesheet.populate('agency', 'name code client');

    res.json({
      success: true,
      message: 'Pause commencée avec succès',
      data: {
        timesheet: {
          id: timesheet._id,
          agency: timesheet.agency,
          breakStart: timesheet.breakStart,
          reason: reason || 'lunch'
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur break-start:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du début de pause',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/timesheets/break-end
 * @desc    Pointer la fin de pause
 * @access  Preparateur
 */
router.post('/break-end', validateBody(timesheetSchemas.breakAction), checkAgencyAccess, async (req, res) => {
  try {
    const { agencyId } = req.body;
    const userId = req.user.userId;
    
    console.log('🔄 Break-end pour user:', userId, 'agence:', agencyId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timesheet = await Timesheet.findOne({
      user: userId,
      agency: agencyId,
      date: today
    });
    
    if (!timesheet || !timesheet.breakStart) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez d\'abord commencer une pause'
      });
    }
    
    if (timesheet.breakEnd) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà terminé votre pause'
      });
    }

    timesheet.breakEnd = new Date();
    await timesheet.save();

    // Calculer la durée de pause
    const breakDuration = Math.floor((timesheet.breakEnd - timesheet.breakStart) / (1000 * 60));

    // Charger les relations pour la réponse
    await timesheet.populate('agency', 'name code client');

    res.json({
      success: true,
      message: 'Pause terminée avec succès',
      data: {
        timesheet: {
          id: timesheet._id,
          agency: timesheet.agency,
          breakStart: timesheet.breakStart,
          breakEnd: timesheet.breakEnd,
          breakDuration: `${breakDuration} minutes`
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur break-end:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la fin de pause',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/timesheets/today-status
 * @desc    Obtenir le statut de pointage du jour
 * @access  Preparateur
 */
router.get('/today-status', async (req, res) => {
  try {
    const { agencyId } = req.query;
    const userId = req.user.userId;
    
    console.log('🔄 Today-status pour user:', userId, 'agence:', agencyId);
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'agence requis'
      });
    }

    // Vérifier l'accès à l'agence
    const hasAccess = req.user.agencies.some(
      agency => agency._id.toString() === agencyId.toString()
    );

    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé à cette agence'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [timesheet, schedule] = await Promise.all([
      Timesheet.findOne({
        user: userId,
        agency: agencyId,
        date: today
      }).populate('agency', 'name code client'),
      
      Schedule.findOne({
        user: userId,
        agency: agencyId,
        date: today,
        status: 'active'
      })
    ]);

    const currentTime = new Date();
    
    // Calculer la durée actuelle si en cours
    let currentWorkedMinutes = 0;
    if (timesheet?.startTime && !timesheet.endTime) {
      let workedTime = currentTime - timesheet.startTime;
      
      // Soustraire la pause en cours
      if (timesheet.breakStart && !timesheet.breakEnd) {
        workedTime -= (currentTime - timesheet.breakStart);
      }
      // Soustraire les pauses terminées
      else if (timesheet.breakStart && timesheet.breakEnd) {
        workedTime -= (timesheet.breakEnd - timesheet.breakStart);
      }
      
      currentWorkedMinutes = Math.max(0, Math.floor(workedTime / (1000 * 60)));
    }

    res.json({
      success: true,
      data: {
        date: today,
        agency: timesheet?.agency || null,
        schedule: schedule ? {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          workingDuration: schedule.workingDuration
        } : null,
        timesheet: timesheet ? {
          id: timesheet._id,
          startTime: timesheet.startTime,
          endTime: timesheet.endTime,
          breakStart: timesheet.breakStart,
          breakEnd: timesheet.breakEnd,
          delays: timesheet.delays,
          status: timesheet.status,
          totalWorkedMinutes: timesheet.totalWorkedMinutes,
          summary: timesheet.summary
        } : null,
        currentStatus: {
          isClockedIn: !!timesheet?.startTime && !timesheet?.endTime,
          isClockedOut: !!timesheet?.endTime,
          isOnBreak: !!timesheet?.breakStart && !timesheet?.breakEnd,
          isNotStarted: !timesheet?.startTime,
          currentWorkedMinutes,
          currentWorkedTime: currentWorkedMinutes > 0 ? 
            `${Math.floor(currentWorkedMinutes / 60)}h${(currentWorkedMinutes % 60).toString().padStart(2, '0')}` : null
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur today-status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/timesheets/history
 * @desc    Obtenir l'historique des pointages
 * @access  Preparateur
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, agencyId } = req.query;
    const userId = req.user.userId;

    // Dates par défaut (30 derniers jours)
    const defaultEndDate = endDate ? new Date(endDate) : new Date();
    const defaultStartDate = startDate ? new Date(startDate) : 
      new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Construire la requête
    const query = {
      user: userId,
      date: { $gte: defaultStartDate, $lte: defaultEndDate }
    };

    if (agencyId) {
      // Vérifier l'accès à l'agence
      const hasAccess = req.user.agencies.some(
        agency => agency._id.toString() === agencyId.toString()
      );

      if (!hasAccess && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé à cette agence'
        });
      }

      query.agency = agencyId;
    }

    // Exécuter la requête avec pagination
    const skip = (page - 1) * limit;
    
    const [timesheets, totalCount] = await Promise.all([
      Timesheet.find(query)
        .populate('agency', 'name code client')
        .populate('schedule', 'startTime endTime')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      
      Timesheet.countDocuments(query)
    ]);

    // Calculs de pagination
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        timesheets: timesheets.map(timesheet => ({
          id: timesheet._id,
          agency: timesheet.agency,
          date: timesheet.date,
          startTime: timesheet.startTime,
          endTime: timesheet.endTime,
          breakStart: timesheet.breakStart,
          breakEnd: timesheet.breakEnd,
          totalWorkedMinutes: timesheet.totalWorkedMinutes,
          delays: timesheet.delays,
          status: timesheet.status,
          notes: timesheet.notes,
          summary: timesheet.summary,
          schedule: timesheet.schedule
        })),
        filters: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
          agencyId
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur history:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;