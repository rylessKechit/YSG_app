const express = require('express');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery } = require('../../../middleware/validation');
const { scheduleSchemas, querySchemas } = require('../../../middleware/validation');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification admin
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/schedules
 * @desc    Créer ou modifier un planning
 * @access  Admin
 */
router.post('/', validateBody(scheduleSchemas.create), async (req, res) => {
  try {
    const { userId, agencyId, date, startTime, endTime, breakStart, breakEnd, notes } = req.body;

    // Vérifier que l'utilisateur existe et est actif
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé ou inactif'
      });
    }

    // Vérifier que l'agence existe et est active
    const agency = await Agency.findById(agencyId);
    if (!agency || !agency.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Agence non trouvée ou inactive'
      });
    }

    // Vérifier que l'utilisateur peut travailler dans cette agence
    if (!user.canAccessAgency(agencyId)) {
      return res.status(400).json({
        success: false,
        message: 'L\'utilisateur n\'est pas assigné à cette agence'
      });
    }

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    // Vérifier les conflits de planning
    const conflicts = await Schedule.findConflicts(userId, scheduleDate, startTime, endTime);
    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Conflit de planning détecté pour cet utilisateur à cette date'
      });
    }

    // Vérifier si un planning existe déjà pour cette date/utilisateur/agence
    let schedule = await Schedule.findOne({
      user: userId,
      agency: agencyId,
      date: scheduleDate
    });

    if (schedule) {
      // Mettre à jour le planning existant
      schedule.startTime = startTime;
      schedule.endTime = endTime;
      schedule.breakStart = breakStart;
      schedule.breakEnd = breakEnd;
      schedule.notes = notes;
      schedule.updatedAt = new Date();
    } else {
      // Créer un nouveau planning
      schedule = new Schedule({
        user: userId,
        agency: agencyId,
        date: scheduleDate,
        startTime,
        endTime,
        breakStart,
        breakEnd,
        notes,
        createdBy: req.user.userId
      });
    }

    await schedule.save();

    // Charger les relations pour la réponse
    await schedule.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'agency', select: 'name code client' }
    ]);

    res.status(schedule.isNew ? 201 : 200).json({
      success: true,
      message: schedule.isNew ? 'Planning créé avec succès' : 'Planning modifié avec succès',
      data: {
        schedule: {
          id: schedule._id,
          user: schedule.user,
          agency: schedule.agency,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          status: schedule.status,
          workingDuration: schedule.workingDuration,
          formatted: schedule.formatted,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur création/modification planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/admin/schedules
 * @desc    Obtenir les plannings avec filtres
 * @access  Admin
 */
router.get('/', validateQuery(querySchemas.pagination.concat(querySchemas.dateRange)), async (req, res) => {
  try {
    const { page, limit, startDate, endDate, agencyId, userId, sort = 'date', order = 'asc' } = req.query;

    // Construire les filtres
    const filters = {};
    if (agencyId) filters.agency = agencyId;
    if (userId) filters.user = userId;

    // Dates par défaut (semaine courante)
    const defaultStartDate = startDate ? new Date(startDate) : (() => {
      const date = new Date();
      date.setDate(date.getDate() - date.getDay()); // Début de semaine
      date.setHours(0, 0, 0, 0);
      return date;
    })();

    const defaultEndDate = endDate ? new Date(endDate) : (() => {
      const date = new Date(defaultStartDate);
      date.setDate(date.getDate() + 6); // Fin de semaine
      date.setHours(23, 59, 59, 999);
      return date;
    })();

    // Rechercher les plannings
    let query = Schedule.findByDateRange(defaultStartDate, defaultEndDate, filters);

    // Appliquer le tri
    const sortObject = {};
    sortObject[sort] = order === 'asc' ? 1 : -1;
    if (sort !== 'date') {
      sortObject.date = 1; // Tri secondaire par date
    }
    query = query.sort(sortObject);

    // Appliquer la pagination
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(parseInt(limit));

    // Exécuter la requête
    const [schedules, totalCount] = await Promise.all([
      query.exec(),
      Schedule.countDocuments({
        date: { $gte: defaultStartDate, $lte: defaultEndDate },
        status: 'active',
        ...filters
      })
    ]);

    // Calculs de pagination
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        schedules: schedules.map(schedule => ({
          id: schedule._id,
          user: schedule.user,
          agency: schedule.agency,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          status: schedule.status,
          workingDuration: schedule.workingDuration,
          formatted: schedule.formatted,
          createdAt: schedule.createdAt
        })),
        filters: {
          startDate: defaultStartDate,
          endDate: defaultEndDate,
          agencyId,
          userId
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
    console.error('Erreur récupération plannings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/schedules/:id
 * @desc    Obtenir un planning spécifique
 * @access  Admin
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address')
      .populate('createdBy', 'firstName lastName');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        schedule: {
          id: schedule._id,
          user: schedule.user,
          agency: schedule.agency,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          status: schedule.status,
          workingDuration: schedule.workingDuration,
          formatted: schedule.formatted,
          createdBy: schedule.createdBy,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   PUT /api/admin/schedules/:id
 * @desc    Modifier un planning
 * @access  Admin
 */
router.put('/:id', validateObjectId('id'), validateBody(scheduleSchemas.update), async (req, res) => {
  try {
    const { startTime, endTime, breakStart, breakEnd, notes, status } = req.body;

    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    // Si on modifie les heures, vérifier les conflits
    if (startTime || endTime) {
      const newStartTime = startTime || schedule.startTime;
      const newEndTime = endTime || schedule.endTime;

      const conflicts = await Schedule.findConflicts(
        schedule.user, 
        schedule.date, 
        newStartTime, 
        newEndTime, 
        schedule._id
      );

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Conflit de planning détecté'
        });
      }
    }

    // Mettre à jour les champs modifiés
    if (startTime !== undefined) schedule.startTime = startTime;
    if (endTime !== undefined) schedule.endTime = endTime;
    if (breakStart !== undefined) schedule.breakStart = breakStart;
    if (breakEnd !== undefined) schedule.breakEnd = breakEnd;
    if (notes !== undefined) schedule.notes = notes;
    if (status !== undefined) schedule.status = status;

    await schedule.save();

    // Charger les relations pour la réponse
    await schedule.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'agency', select: 'name code client' }
    ]);

    res.json({
      success: true,
      message: 'Planning modifié avec succès',
      data: {
        schedule: {
          id: schedule._id,
          user: schedule.user,
          agency: schedule.agency,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
          notes: schedule.notes,
          status: schedule.status,
          workingDuration: schedule.workingDuration,
          formatted: schedule.formatted,
          updatedAt: schedule.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur modification planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/admin/schedules/:id
 * @desc    Supprimer un planning
 * @access  Admin
 */
router.delete('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Planning non trouvé'
      });
    }

    // Vérifier s'il y a des pointages associés
    const Timesheet = require('../../../models/Timesheet');
    const timesheet = await Timesheet.findOne({ schedule: schedule._id });

    if (timesheet) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer un planning avec des pointages associés'
      });
    }

    await Schedule.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Planning supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression planning:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/schedules/week/:userId
 * @desc    Obtenir le planning d'une semaine pour un utilisateur
 * @access  Admin
 */
router.get('/week/:userId', validateObjectId('userId'), async (req, res) => {
  try {
    const { date } = req.query;

    // Date de début de semaine (par défaut semaine courante)
    const weekStart = date ? new Date(date) : new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Lundi
    weekStart.setHours(0, 0, 0, 0);

    const schedules = await Schedule.findUserWeekSchedule(req.params.userId, weekStart);

    // Organiser les plannings par jour de la semaine
    const weekSchedule = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      
      const daySchedule = schedules.find(schedule => 
        schedule.date.toDateString() === date.toDateString()
      );

      return {
        date: date,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
        schedule: daySchedule ? {
          id: daySchedule._id,
          agency: daySchedule.agency,
          startTime: daySchedule.startTime,
          endTime: daySchedule.endTime,
          breakStart: daySchedule.breakStart,
          breakEnd: daySchedule.breakEnd,
          notes: daySchedule.notes,
          workingDuration: daySchedule.workingDuration,
          formatted: daySchedule.formatted
        } : null
      };
    });

    res.json({
      success: true,
      data: {
        userId: req.params.userId,
        weekStart,
        weekSchedule
      }
    });

  } catch (error) {
    console.error('Erreur récupération planning semaine:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;