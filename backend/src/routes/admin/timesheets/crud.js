// backend/src/routes/admin/timesheets/crud.js - CRUD COMPLET
const express = require('express');
const Joi = require('joi');
const Timesheet = require('../../../models/Timesheet');
const Schedule = require('../../../models/Schedule');
const User = require('../../../models/User');
const Agency = require('../../../models/Agency');
const { validateBody, validateQuery, objectId } = require('../../../middleware/validation');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../../../utils/constants');

const router = express.Router();

// ===== SCHÉMAS DE VALIDATION =====
const timesheetFiltersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional().allow(''),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  userId: objectId.optional(),
  agencyId: objectId.optional(),
  status: Joi.string().valid('all', 'incomplete', 'complete', 'validated', 'disputed').default('all'),
  sort: Joi.string().valid('date', 'user', 'agency', 'startTime', 'delays.startDelay').default('date'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

const createTimesheetSchema = Joi.object({
  userId: objectId.required(),
  agencyId: objectId.required(),
  date: Joi.date().required(),
  startTime: Joi.date().optional(),
  endTime: Joi.date().optional(),
  breakStart: Joi.date().optional(),
  breakEnd: Joi.date().optional(),
  notes: Joi.string().max(500).optional().allow(''),
  adminNotes: Joi.string().max(500).optional().allow('')
});

const updateTimesheetSchema = Joi.object({
  startTime: Joi.date().optional(),
  endTime: Joi.date().optional(),
  breakStart: Joi.date().optional(),
  breakEnd: Joi.date().optional(),
  notes: Joi.string().max(500).optional().allow(''),
  adminNotes: Joi.string().max(500).optional().allow(''),
  status: Joi.string().valid('incomplete', 'complete', 'validated', 'disputed').optional()
});

const bulkActionSchema = Joi.object({
  action: Joi.string().valid('validate', 'dispute', 'delete', 'export').required(),
  timesheetIds: Joi.array().items(objectId).min(1).required(),
  params: Joi.object({
    format: Joi.string().valid('excel', 'csv').optional(),
    notify: Joi.boolean().default(false),
    adminNotes: Joi.string().max(500).optional()
  }).optional()
});

/**
 * @route   GET /api/admin/timesheets
 * @desc    Liste des timesheets avec filtres (pattern identique à users)
 * @access  Admin
 */
router.get('/', validateQuery(timesheetFiltersSchema), async (req, res) => {
  try {
    const { 
      page, limit, search, startDate, endDate, 
      userId, agencyId, status, sort, order 
    } = req.query;

    console.log('📋 Récupération timesheets:', { page, limit, status, sort });

    // Construction des filtres (pattern identique à users.js)
    const filters = {};
    
    if (startDate && endDate) {
      filters.date = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    if (userId) filters.user = userId;
    if (agencyId) filters.agency = agencyId;
    if (status !== 'all') filters.status = status;

    // Recherche textuelle sur utilisateur/agence
    if (search) {
      // Recherche par nom d'utilisateur ou agence (via lookup)
      filters.$or = [
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Compter le total
    const total = await Timesheet.countDocuments(filters);

    // Récupérer les timesheets avec pagination
    const timesheets = await Timesheet.find(filters)
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate('schedule', 'startTime endTime breakStart breakEnd')
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log('✅ Timesheets récupérés:', timesheets.length);

    // Calcul pagination
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Statistiques globales
    const stats = {
      totalTimesheets: total,
      completeTimesheets: await Timesheet.countDocuments({ ...filters, status: 'complete' }),
      incompleteTimesheets: await Timesheet.countDocuments({ ...filters, status: 'incomplete' }),
      disputedTimesheets: await Timesheet.countDocuments({ ...filters, status: 'disputed' })
    };

    // Réponse structurée (pattern users.js)
    res.json({
      success: true,
      data: {
        timesheets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages,
          totalPages,
          hasNext,
          hasPrev
        },
        filters: {
          search: search || '',
          startDate: startDate || '',
          endDate: endDate || '',
          userId: userId || null,
          agencyId: agencyId || null,
          status: status || 'all'
        },
        stats
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération timesheets:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des pointages',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/admin/timesheets/:id
 * @desc    Détail d'un timesheet
 * @access  Admin
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findById(id)
      .populate('user', 'firstName lastName email phone')
      .populate('agency', 'name code client address')
      .populate('schedule', 'startTime endTime breakStart breakEnd notes')
      .populate('validatedBy', 'firstName lastName');

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: 'Pointage non trouvé'
      });
    }

    res.json({
      success: true,
      data: { timesheet }
    });

  } catch (error) {
    console.error('❌ Erreur récupération timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du pointage'
    });
  }
});

/**
 * @route   POST /api/admin/timesheets
 * @desc    Créer un pointage manuellement
 * @access  Admin
 */
router.post('/', validateBody(createTimesheetSchema), async (req, res) => {
  try {
    const { userId, agencyId, date, startTime, endTime, breakStart, breakEnd, notes, adminNotes } = req.body;
    const adminId = req.user.userId;

    console.log('🆕 Création timesheet:', { userId, agencyId, date });

    // Vérifier que l'utilisateur et l'agence existent
    const [user, agency] = await Promise.all([
      User.findById(userId),
      Agency.findById(agencyId)
    ]);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (!agency) {
      return res.status(400).json({
        success: false,
        message: 'Agence non trouvée'
      });
    }

    // Vérifier qu'il n'existe pas déjà un timesheet pour cette date
    const existingTimesheet = await Timesheet.findOne({
      user: userId,
      agency: agencyId,
      date: new Date(date)
    });

    if (existingTimesheet) {
      return res.status(409).json({
        success: false,
        message: 'Un pointage existe déjà pour cette date et cette agence'
      });
    }

    // Récupérer le planning correspondant pour calculer les retards
    const schedule = await Schedule.findOne({
      user: userId,
      agency: agencyId,
      date: new Date(date),
      status: 'active'
    });

    // Créer le timesheet
    const timesheet = new Timesheet({
      user: userId,
      agency: agencyId,
      date: new Date(date),
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      breakStart: breakStart ? new Date(breakStart) : undefined,
      breakEnd: breakEnd ? new Date(breakEnd) : undefined,
      notes,
      adminNotes: adminNotes || `Créé manuellement par admin le ${new Date().toLocaleDateString()}`,
      schedule: schedule?._id,
      status: (startTime && endTime) ? 'complete' : 'incomplete'
    });

    await timesheet.save();

    // Charger les relations pour la réponse
    await timesheet.populate('user', 'firstName lastName email');
    await timesheet.populate('agency', 'name code client');
    if (schedule) {
      await timesheet.populate('schedule', 'startTime endTime breakStart breakEnd');
    }

    console.log('✅ Timesheet créé:', timesheet._id);

    res.status(201).json({
      success: true,
      message: 'Pointage créé avec succès',
      data: { timesheet }
    });

  } catch (error) {
    console.error('❌ Erreur création timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du pointage'
    });
  }
});

/**
 * @route   PUT /api/admin/timesheets/:id
 * @desc    Modifier un timesheet
 * @access  Admin
 */
router.put('/:id', validateBody(updateTimesheetSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, breakStart, breakEnd, notes, adminNotes, status } = req.body;
    const adminId = req.user.userId;

    console.log('📝 Modification timesheet:', id);

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: 'Pointage non trouvé'
      });
    }

    // Sauvegarder l'ancien état pour traçabilité
    const oldData = {
      startTime: timesheet.startTime,
      endTime: timesheet.endTime,
      breakStart: timesheet.breakStart,
      breakEnd: timesheet.breakEnd,
      status: timesheet.status
    };

    // Appliquer les modifications
    if (startTime !== undefined) timesheet.startTime = startTime ? new Date(startTime) : null;
    if (endTime !== undefined) timesheet.endTime = endTime ? new Date(endTime) : null;
    if (breakStart !== undefined) timesheet.breakStart = breakStart ? new Date(breakStart) : null;
    if (breakEnd !== undefined) timesheet.breakEnd = breakEnd ? new Date(breakEnd) : null;
    if (notes !== undefined) timesheet.notes = notes;
    if (status !== undefined) timesheet.status = status;

    // Ajouter note de modification admin
    const modificationNote = `Modifié par admin le ${new Date().toLocaleDateString()}`;
    timesheet.adminNotes = adminNotes ? 
      `${adminNotes}\n${modificationNote}` : 
      `${timesheet.adminNotes || ''}\n${modificationNote}`;

    // Déterminer le nouveau statut si non fourni
    if (status === undefined) {
      if (timesheet.startTime && timesheet.endTime) {
        timesheet.status = 'complete';
      } else {
        timesheet.status = 'incomplete';
      }
    }

    await timesheet.save();

    // Charger les relations pour la réponse
    await timesheet.populate('user', 'firstName lastName email');
    await timesheet.populate('agency', 'name code client');
    await timesheet.populate('schedule', 'startTime endTime breakStart breakEnd');

    console.log('✅ Timesheet modifié:', id);

    res.json({
      success: true,
      message: 'Pointage modifié avec succès',
      data: { 
        timesheet,
        changes: {
          from: oldData,
          to: {
            startTime: timesheet.startTime,
            endTime: timesheet.endTime,
            breakStart: timesheet.breakStart,
            breakEnd: timesheet.breakEnd,
            status: timesheet.status
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur modification timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du pointage'
    });
  }
});

/**
 * @route   DELETE /api/admin/timesheets/:id
 * @desc    Supprimer un timesheet
 * @access  Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: 'Pointage non trouvé'
      });
    }

    await Timesheet.findByIdAndDelete(id);

    console.log('🗑️ Timesheet supprimé:', id);

    res.json({
      success: true,
      message: 'Pointage supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du pointage'
    });
  }
});

/**
 * @route   POST /api/admin/timesheets/bulk-actions
 * @desc    Actions en masse sur les timesheets
 * @access  Admin
 */
router.post('/bulk-actions', validateBody(bulkActionSchema), async (req, res) => {
  try {
    const { action, timesheetIds, params = {} } = req.body;
    const adminId = req.user.userId;

    console.log('🔄 Action en masse:', { action, count: timesheetIds.length });

    let result = {};

    switch (action) {
      case 'validate':
        result = await Timesheet.updateMany(
          { _id: { $in: timesheetIds } },
          { 
            status: 'validated',
            validatedBy: adminId,
            validatedAt: new Date(),
            $push: { 
              adminNotes: `Validé en masse le ${new Date().toLocaleDateString()}`
            }
          }
        );
        break;

      case 'dispute':
        result = await Timesheet.updateMany(
          { _id: { $in: timesheetIds } },
          { 
            status: 'disputed',
            $push: { 
              adminNotes: `Marqué en litige le ${new Date().toLocaleDateString()}: ${params.adminNotes || 'Aucune raison spécifiée'}`
            }
          }
        );
        break;

      case 'delete':
        result = await Timesheet.deleteMany({ _id: { $in: timesheetIds } });
        break;

      case 'export':
        // TODO: Implémenter export Excel/CSV
        result = { message: 'Export en cours de développement' };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Action non supportée'
        });
    }

    res.json({
      success: true,
      message: `Action "${action}" exécutée avec succès`,
      data: { 
        affectedCount: result.modifiedCount || result.deletedCount || timesheetIds.length,
        result 
      }
    });

  } catch (error) {
    console.error('❌ Erreur action en masse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'exécution de l\'action'
    });
  }
});

module.exports = router;