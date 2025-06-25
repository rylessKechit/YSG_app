const express = require('express');
const Agency = require('../../models/Agency');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateBody, validateObjectId, validateQuery } = require('../../middleware/validation');
const { agencySchemas, querySchemas } = require('../../middleware/validation');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../../utils/constants');

const router = express.Router();

// Toutes les routes nécessitent une authentification admin
router.use(auth, adminAuth);

/**
 * @route   POST /api/admin/agencies
 * @desc    Créer une nouvelle agence
 * @access  Admin
 */
router.post('/', validateBody(agencySchemas.create), async (req, res) => {
  try {
    const { name, address, code, client, workingHours, contact } = req.body;

    // Vérifier que le code n'existe pas déjà
    const existingAgency = await Agency.findOne({ code: code.toUpperCase() });
    if (existingAgency) {
      return res.status(400).json({
        success: false,
        message: 'Ce code d\'agence existe déjà'
      });
    }

    // Créer la nouvelle agence
    const agencyData = {
      name,
      address,
      code: code.toUpperCase(),
      client,
      workingHours: workingHours || { start: '08:00', end: '18:00' },
      contact: contact || {},
      createdBy: req.user.userId
    };

    const agency = new Agency(agencyData);
    await agency.save();

    res.status(201).json({
      success: true,
      message: 'Agence créée avec succès',
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          address: agency.address,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          contact: agency.contact,
          isActive: agency.isActive,
          workingDuration: agency.workingDuration,
          createdAt: agency.createdAt
        }
      }
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
 * @route   GET /api/admin/agencies/stats/overview
 * @desc    Obtenir les statistiques générales des agences
 * @access  Admin
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalAgencies,
      activeAgencies,
      agencyStats
    ] = await Promise.all([
      Agency.countDocuments({}),
      Agency.countDocuments({ isActive: true }),
      Agency.getStats()
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalAgencies,
          active: activeAgencies,
          inactive: totalAgencies - activeAgencies
        },
        stats: agencyStats
      }
    });

  } catch (error) {
    console.error('Erreur statistiques agences:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/agencies
 * @desc    Obtenir la liste des agences
 * @access  Admin
 */
router.get('/', validateQuery(querySchemas.pagination.concat(querySchemas.search)), async (req, res) => {
  try {
    const { page, limit, q: search, sort = 'name', order = 'asc' } = req.query;

    // Construire les filtres
    const filters = {};
    if (search) filters.search = search;

    // Rechercher les agences
    let query = Agency.findWithFilters(filters);

    // Appliquer le tri
    const sortObject = {};
    sortObject[sort] = order === 'asc' ? 1 : -1;
    query = query.sort(sortObject);

    // Appliquer la pagination
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(parseInt(limit));

    // Exécuter la requête
    const [agencies, totalCount] = await Promise.all([
      query.exec(),
      Agency.countDocuments(search ? {
        isActive: true,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { client: { $regex: search, $options: 'i' } }
        ]
      } : { isActive: true })
    ]);

    // Calculs de pagination
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

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
          contact: agency.contact,
          isActive: agency.isActive,
          workingDuration: agency.workingDuration,
          createdAt: agency.createdAt
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
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
 * @route   GET /api/admin/agencies/:id
 * @desc    Obtenir une agence spécifique
 * @access  Admin
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id)
      .populate('createdBy', 'firstName lastName');

    if (!agency) {
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
          contact: agency.contact,
          settings: agency.settings,
          isActive: agency.isActive,
          workingDuration: agency.workingDuration,
          createdBy: agency.createdBy,
          createdAt: agency.createdAt,
          updatedAt: agency.updatedAt
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
 * @route   PUT /api/admin/agencies/:id
 * @desc    Modifier une agence
 * @access  Admin
 */
router.put('/:id', validateObjectId('id'), validateBody(agencySchemas.update), async (req, res) => {
  try {
    const { name, address, client, workingHours, contact, isActive } = req.body;

    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.AGENCY_NOT_FOUND
      });
    }

    // Mettre à jour les champs modifiés
    if (name !== undefined) agency.name = name;
    if (address !== undefined) agency.address = address;
    if (client !== undefined) agency.client = client;
    if (workingHours !== undefined) agency.workingHours = workingHours;
    if (contact !== undefined) agency.contact = { ...agency.contact, ...contact };
    if (isActive !== undefined) agency.isActive = isActive;

    await agency.save();

    res.json({
      success: true,
      message: 'Agence modifiée avec succès',
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          address: agency.address,
          code: agency.code,
          client: agency.client,
          workingHours: agency.workingHours,
          contact: agency.contact,
          isActive: agency.isActive,
          workingDuration: agency.workingDuration,
          updatedAt: agency.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Erreur modification agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/admin/agencies/:id
 * @desc    Désactiver une agence (soft delete)
 * @access  Admin
 */
router.delete('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.AGENCY_NOT_FOUND
      });
    }

    // Vérifier s'il y a des utilisateurs assignés à cette agence
    const User = require('../../models/User');
    const assignedUsers = await User.countDocuments({ 
      agencies: agency._id, 
      isActive: true 
    });

    if (assignedUsers > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer l'agence. ${assignedUsers} utilisateur(s) y sont encore assignés.`
      });
    }

    // Soft delete - désactiver au lieu de supprimer
    agency.isActive = false;
    await agency.save();

    res.json({
      success: true,
      message: 'Agence désactivée avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   GET /api/admin/agencies/:id/stats
 * @desc    Obtenir les statistiques d'une agence
 * @access  Admin
 */
router.get('/:id/stats', validateObjectId('id'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const agency = await Agency.findById(req.params.id);

    if (!agency) {
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

    res.json({
      success: true,
      data: {
        agency: {
          id: agency._id,
          name: agency.name,
          code: agency.code
        },
        period: {
          startDate: start,
          endDate: end
        },
        stats
      }
    });

  } catch (error) {
    console.error('Erreur création agence:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;