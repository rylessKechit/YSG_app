// backend/src/routes/admin/preparations/export.js - NOUVELLE ROUTE SPÉCIALISÉE

const express = require('express');
const router = express.Router();
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, USER_ROLES } = require('../../../utils/constants');

/**
 * @route   GET /api/admin/preparations/export
 * @desc    Export simple des préparations (méthode GET avec query params)
 * @access  Admin
 */
router.get('/', 
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 1000, // Limite élevée pour export
        search = '',
        status = 'all',
        user,
        agency,
        startDate,
        endDate,
        sort = 'createdAt',
        order = 'desc',
        format = 'excel'
      } = req.query;

      console.log('📤 Export préparations - Paramètres reçus:', req.query);

      // Construire les filtres pour la base de données
      const filters = {};
      
      if (search) {
        filters.$or = [
          { 'vehicle.brand': { $regex: search, $options: 'i' } },
          { 'vehicle.model': { $regex: search, $options: 'i' } },
          { 'vehicle.licensePlate': { $regex: search, $options: 'i' } },
          { 'user.name': { $regex: search, $options: 'i' } },
          { 'agency.name': { $regex: search, $options: 'i' } }
        ];
      }

      if (status && status !== 'all') {
        filters.status = status;
      }

      if (user) {
        filters['user.id'] = user;
      }

      if (agency) {
        filters['agency.id'] = agency;
      }

      // Filtres de date
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) {
          filters.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999); // Inclure toute la journée
          filters.createdAt.$lte = endDateObj;
        }
      }

      // Simuler la récupération des données (à remplacer par votre logique DB)
      const mockPreparations = generateMockPreparations(filters, parseInt(limit));

      // Générer le fichier selon le format demandé
      let fileBuffer;
      let mimeType;
      let fileExtension;

      if (format === 'csv') {
        fileBuffer = generateCSV(mockPreparations);
        mimeType = 'text/csv';
        fileExtension = 'csv';
      } else if (format === 'pdf') {
        fileBuffer = generatePDF(mockPreparations);
        mimeType = 'application/pdf';
        fileExtension = 'pdf';
      } else {
        // Excel par défaut
        fileBuffer = generateExcel(mockPreparations);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
      }

      const today = new Date().toISOString().split('T')[0];
      const filename = `preparations_export_${today}.${fileExtension}`;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      console.log('✅ Export généré:', filename, 'Taille:', fileBuffer.length, 'bytes');

      res.send(fileBuffer);

    } catch (error) {
      console.error('❌ Erreur export préparations:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
);

/**
 * @route   POST /api/admin/preparations/export-advanced
 * @desc    Export avancé avec options détaillées
 * @access  Admin
 */
router.post('/export-advanced',
  auth,
  adminAuth,
  async (req, res) => {
    try {
      const {
        filters = {},
        format = 'excel',
        options = {}
      } = req.body;

      console.log('📤 Export avancé - Configuration reçue:', req.body);

      const {
        includePhotos = false,
        includeDetails = true,
        includeStats = true,
        customFields = []
      } = options;

      // Validation du format
      const validFormats = ['excel', 'csv', 'pdf'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Format invalide. Formats supportés: excel, csv, pdf'
        });
      }

      // Récupération des données avec filtres avancés
      const preparations = await getPreparationsForExport(filters, options);

      // Génération du fichier
      let fileBuffer;
      let mimeType;
      let fileExtension;

      switch (format) {
        case 'csv':
          fileBuffer = generateAdvancedCSV(preparations, options);
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'pdf':
          fileBuffer = generateAdvancedPDF(preparations, options);
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
          break;
        default:
          fileBuffer = generateAdvancedExcel(preparations, options);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
      }

      const today = new Date().toISOString().split('T')[0];
      const filename = `preparations_advanced_${today}.${fileExtension}`;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      console.log('✅ Export avancé généré:', filename);

      res.send(fileBuffer);

    } catch (error) {
      console.error('❌ Erreur export avancé:', error);
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
  }
);

// ================================
// FONCTIONS UTILITAIRES D'EXPORT
// ================================

function generateMockPreparations(filters, limit) {
  // Simulation de données - à remplacer par votre logique DB
  const statuses = ['completed', 'in_progress', 'pending', 'cancelled'];
  const agencies = ['Paris Centre', 'Paris Nord', 'Lyon Part-Dieu', 'Marseille'];
  const users = ['Jean Dupont', 'Marie Martin', 'Pierre Durand', 'Sophie Bernard'];
  
  const preparations = [];
  
  for (let i = 0; i < Math.min(limit, 50); i++) {
    preparations.push({
      id: `prep_${i + 1}`,
      vehicle: {
        brand: 'Peugeot',
        model: '208',
        licensePlate: `AB-${String(i + 1).padStart(3, '0')}-CD`,
        year: 2020 + (i % 4)
      },
      user: {
        id: `user_${i % 4 + 1}`,
        name: users[i % 4],
        email: `${users[i % 4].toLowerCase().replace(' ', '.')}@example.com`
      },
      agency: {
        id: `agency_${i % 4 + 1}`,
        name: agencies[i % 4],
        code: `AG${i % 4 + 1}`,
        client: 'SIXT'
      },
      status: statuses[i % 4],
      progress: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 60) + 15, // 15-75 minutes
      startTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(),
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    });
  }
  
  return preparations;
}

function generateExcel(preparations) {
  // Simulation de génération Excel - utilisez une vraie librairie comme xlsx
  const csvContent = generateCSVContent(preparations);
  return Buffer.from(csvContent, 'utf8');
}

function generateCSV(preparations) {
  const csvContent = generateCSVContent(preparations);
  return Buffer.from(csvContent, 'utf8');
}

function generateCSVContent(preparations) {
  const headers = [
    'ID',
    'Véhicule',
    'Plaque',
    'Préparateur',
    'Agence',
    'Statut',
    'Progression (%)',
    'Durée (min)',
    'Date de création'
  ].join(',');

  const rows = preparations.map(prep => [
    prep.id,
    `${prep.vehicle.brand} ${prep.vehicle.model}`,
    prep.vehicle.licensePlate,
    prep.user.name,
    prep.agency.name,
    prep.status,
    prep.progress,
    prep.duration,
    prep.createdAt.toLocaleDateString('fr-FR')
  ].join(','));

  return [headers, ...rows].join('\n');
}

function generatePDF(preparations) {
  // Simulation PDF - utilisez une vraie librairie comme pdfkit
  const content = `Rapport des Préparations\n\nNombre total: ${preparations.length}\n\nGénéré le: ${new Date().toLocaleDateString('fr-FR')}`;
  return Buffer.from(content, 'utf8');
}

async function getPreparationsForExport(filters, options) {
  // À implémenter avec votre logique de base de données
  return generateMockPreparations(filters, 1000);
}

function generateAdvancedExcel(preparations, options) {
  return generateExcel(preparations);
}

function generateAdvancedCSV(preparations, options) {
  return generateCSV(preparations);
}

function generateAdvancedPDF(preparations, options) {
  return generatePDF(preparations);
}

module.exports = router;