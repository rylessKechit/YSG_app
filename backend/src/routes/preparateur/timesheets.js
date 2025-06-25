const express = require('express');
const Timesheet = require('../../models/Timesheet');
const Schedule = require('../../models/Schedule');
const { auth, checkAgencyAccess } = require('../../middleware/auth');
const { preparateurAuth } = require('../../middleware/adminAuth');
const { validateBody, validateQuery } = require('../../middleware/validation');
const { timesheetSchemas, querySchemas } = require('../../middleware/validation');
const { SUCCESS_MESSAGES, ERROR_MESSAGES, TIME_LIMITS } = require('../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification préparateur
router.use(auth, preparateurAuth);

/**
 * @route   POST /api/timesheets/clock-in
 * @desc    Pointer le début de service
 * @access  Preparateur
 */
router.post('/clock-in', validateBody(timesheetSchemas.clockIn), checkAgencyAccess, async (req, res) => {
  try {
    const { agencyId } = req.body;
    const userId = req.user.userId;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Vérifier s'il y a déjà un pointage aujourd'hui pour cette agence
    let timesheet = await Timesheet.findOne({
      user: userId,
      agency: agencyId,
      date: today
    });
    
    if (timesheet && timesheet.startTime) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.ALREADY_CLOCKED_IN
      });
    }

    // Récupérer le planning prévu pour calculer le retard
    const schedule = await Schedule.findOne({
      user: userId,
      agency: agencyId,
      date: today,
      status: 'active'
    });

    const clockInTime = new Date();
    let startDelay = 0;

    if (schedule) {
      const [hours, minutes] = schedule.startTime.split(':');
      const scheduledStart = new Date(today);
      scheduledStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Calculer le retard (en minutes, minimum 0)
      startDelay = Math.max(0, Math.floor((clockInTime - scheduledStart) / (1000 * 60)));
    }

    if (timesheet) {
      // Mettre à jour le timesheet existant
      timesheet.startTime = clockInTime;
      timesheet.schedule = schedule?._id;
      timesheet.delays.startDelay = startDelay;
    } else {
      // Créer un nouveau timesheet
      timesheet = new Timesheet({
        user: userId,
        agency: agencyId,
        date: today,
        startTime: clockInTime,
        schedule: schedule?._id,
        delays: { startDelay }
      });
    }

    await timesheet.save();

    // Charger les relations pour la réponse
    await timesheet.populate('agency', 'name code client');

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.CLOCK_IN_SUCCESS,
      data: {
        timesheet: {
          id: timesheet._id,
          agency: timesheet.agency,
          date: timesheet.date,
          startTime: timesheet.startTime,
          delay: startDelay > 0 ? startDelay : null,
          delayMessage: startDelay > 0 ? `${startDelay} minutes de retard` : null,
          status: timesheet.status
        }
      }
    });

  } catch (error) {
    console.error('Erreur pointage début:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/timesheets/clock-out
 * @desc    Pointer la fin de service
 * @access  Preparateur
 */
router.post('/clock-out', validateBody(timesheetSchemas.clockOut), checkAgencyAccess, async (req, res) => {
  try {
    const { agencyId, notes } = req.body;
    const userId = req.user.userId;
    
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
        message: ERROR_MESSAGES.NOT_CLOCKED_IN
      });
    }
    
    if (timesheet.endTime) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.ALREADY_CLOCKED_OUT
      });
    }

    const clockOutTime = new Date();
    timesheet.endTime = clockOutTime;
    if (notes) timesheet.notes = notes;

    await timesheet.save();

    // Charger les relations pour la réponse
    await timesheet.populate('agency', 'name code client');

    const totalHours = Math.floor(timesheet.totalWorkedMinutes / 60);
    const totalMinutes = timesheet.totalWorkedMinutes % 60;

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.CLOCK_OUT_SUCCESS,
      data: {
        timesheet: {
          id: timesheet._id,
          agency: timesheet.agency,
          date: timesheet.date,
          startTime: timesheet.startTime,
          endTime: timesheet.endTime,
          totalWorkedTime: `${totalHours}h${totalMinutes.toString().padStart(2, '0')}`,
          totalWorkedMinutes: timesheet.totalWorkedMinutes,
          status: timesheet.status,
          summary: timesheet.summary
        }
      }
    });

  } catch (error) {
    console.error('Erreur pointage fin:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
    const { agencyId } = req.body;
    const userId = req.user.userId;
    
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
        message: ERROR_MESSAGES.NOT_CLOCKED_IN
      });
    }
    
    if (timesheet.breakStart) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.BREAK_ALREADY_STARTED
      });
    }

    timesheet.breakStart = new Date();
    await timesheet.save();

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.BREAK_START_SUCCESS,
      data: {
        breakStart: timesheet.breakStart
      }
    });

  } catch (error) {
    console.error('Erreur début pause:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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
        message: ERROR_MESSAGES.BREAK_NOT_STARTED
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

    const breakDuration = Math.floor((timesheet.breakEnd - timesheet.breakStart) / (1000 * 60));

    res.json({
      success: true,
      message: SUCCESS_MESSAGES.BREAK_END_SUCCESS,
      data: {
        breakEnd: timesheet.breakEnd,
        breakDuration: `${breakDuration} minutes`,
        breakDurationMinutes: breakDuration
      }
    });

  } catch (error) {
    console.error('Erreur fin pause:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
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

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED
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
          currentWorkedMinutes,
          currentWorkedTime: currentWorkedMinutes > 0 ? 
            `${Math.floor(currentWorkedMinutes / 60)}h${(currentWorkedMinutes % 60).toString().padStart(2, '0')}` : null
        }
      }
    });

  } catch (error) {
    console.error('Erreur statut jour:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/timesheets/history
 * @desc    Obtenir l'historique des pointages
 * @access  Preparateur
 */
router.get('/history', validateQuery(querySchemas.pagination.concat(querySchemas.dateRange)), async (req, res) => {
  try {
    const { page, limit, startDate, endDate, agencyId } = req.query;
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

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: ERROR_MESSAGES.ACCESS_DENIED
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
    console.error('Erreur historique pointages:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;