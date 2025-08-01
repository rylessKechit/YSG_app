// backend/src/routes/admin/reports/preparations.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // ✅ AJOUT : Import mongoose
const { auth } = require('../../../middleware/auth');
const { adminAuth } = require('../../../middleware/adminAuth');
const ExcelJS = require('exceljs');
const Preparation = require('../../../models/Preparation');
const Agency = require('../../../models/Agency');

// Middleware
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/reports/preparations-steps
 * @desc    Rapport des préparations par étapes pour une agence
 * @access  Admin
 */
router.get('/preparations-steps', async (req, res) => {
  try {
    const { agencyId, startDate, endDate, format = 'json' } = req.query;

    // Validation des paramètres requis
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de l\'agence est requis'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Les dates de début et fin sont requises'
      });
    }

    // Validation des dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Format de date invalide'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'La date de début doit être antérieure à la date de fin'
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

    // Ajuster les dates pour inclure toute la journée
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    console.log(`📊 Génération rapport préparations - Agence: ${agency.name}, Période: ${start.toDateString()} -> ${end.toDateString()}`);

    // ✅ Utiliser une requête MongoDB directe pour éviter les erreurs de cast
    const preparations = await mongoose.connection.db.collection('preparations').find({
      agency: new mongoose.Types.ObjectId(agencyId),
      createdAt: {
        $gte: start,
        $lte: end
      }
    }).toArray();

    console.log(`📋 ${preparations.length} préparations trouvées`);

    // ✅ Populate manuellement les références pour éviter les erreurs
    const User = require('../../../models/User'); // ✅ CORRECTION : Chemin correct
    const Vehicle = require('../../../models/Vehicle'); // ✅ CORRECTION : Chemin correct

    // Récupérer les utilisateurs
    const userIds = preparations
      .map(p => p.user)
      .filter(id => id && mongoose.Types.ObjectId.isValid(id));
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const usersMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    // Récupérer les véhicules
    const vehicleIds = preparations
      .map(p => p.vehicle)
      .filter(id => id && mongoose.Types.ObjectId.isValid(id));
    const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).lean();
    const vehiclesMap = vehicles.reduce((acc, vehicle) => {
      acc[vehicle._id.toString()] = vehicle;
      return acc;
    }, {});

    // Calculer les métriques
    const metrics = {
      totalPreparations: preparations.length,
      exteriorOrInterior: 0,
      fuel: 0,
      specialWash: 0,
      details: []
    };

    // Analyser chaque préparation
    preparations.forEach(prep => {
      const steps = prep.steps || [];
      
      // ✅ CORRECTION : Vérifier les étapes TERMINÉES seulement (completed: true)
      const hasExterior = steps.some(step => step.step === 'exterior' && step.completed === true);
      const hasInterior = steps.some(step => step.step === 'interior' && step.completed === true);
      const hasFuel = steps.some(step => step.step === 'fuel' && step.completed === true);
      const hasSpecialWash = steps.some(step => step.step === 'special_wash' && step.completed === true);

      // Compter les métriques
      if (hasExterior || hasInterior) {
        metrics.exteriorOrInterior++;
      }
      if (hasFuel) {
        metrics.fuel++;
      }
      if (hasSpecialWash) {
        metrics.specialWash++;
      }

      // Détails pour export Excel (compatible avec ancien et nouveau schéma)
      const getVehiclePlate = (prep) => {
        // Priorité : vehicleData > vehicleInfo > vehicle populate > fallback
        if (prep.vehicleData && prep.vehicleData.licensePlate) {
          return prep.vehicleData.licensePlate;
        } else if (prep.vehicleInfo && prep.vehicleInfo.licensePlate) {
          return prep.vehicleInfo.licensePlate;
        } else if (prep.vehicle && mongoose.Types.ObjectId.isValid(prep.vehicle)) {
          const vehicle = vehiclesMap[prep.vehicle.toString()];
          if (vehicle && vehicle.licensePlate) {
            return vehicle.licensePlate;
          }
        }
        return 'N/A';
      };

      const getUserInfo = (prep) => {
        if (prep.user && mongoose.Types.ObjectId.isValid(prep.user)) {
          const user = usersMap[prep.user.toString()];
          if (user && user.firstName) {
            return `${user.firstName} ${user.lastName || ''}`;
          }
        }
        return 'N/A';
      };

      metrics.details.push({
        id: prep._id,
        plaque: getVehiclePlate(prep), // ✅ Seulement la plaque
        preparateur: getUserInfo(prep),
        dateCreation: prep.createdAt,
        hasExterior,
        hasInterior,
        hasFuel,
        hasSpecialWash
      });
    });

    const reportData = {
      agence: {
        id: agency._id,
        nom: agency.name,
        code: agency.code
      },
      periode: {
        debut: startDate,
        fin: endDate,
        jours: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      },
      metriques: metrics,
      genereA: new Date(),
      generePar: req.user.email
    };

    // Format Excel demandé
    if (format === 'excel') {
      const buffer = await generateExcelReport(reportData);
      
      const filename = `rapport-preparations-${agency.code}-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.send(buffer);
    }

    // Format JSON par défaut
    res.json({
      success: true,
      data: reportData,
      message: 'Rapport généré avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur génération rapport préparations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Générer le fichier Excel du rapport
 */
async function generateExcelReport(reportData) {
  // ✅ Nouvelle approche : Créer un workbook avec seulement 2 colonnes dès le départ
  const workbook = new ExcelJS.Workbook();
  
  // Métadonnées
  workbook.creator = 'Système de Gestion Véhicules';
  workbook.created = new Date();
  workbook.title = `Rapport Préparations - ${reportData.agence.nom}`;

  // ===== ONGLET 1: RÉSUMÉ =====
  const summarySheet = workbook.addWorksheet('📊 Résumé', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printArea: 'A1:B30' // ✅ Zone encore plus stricte
    },
    properties: {
      defaultColWidth: 20
    },
    views: [
      {
        state: 'normal',
        rightToLeft: false,
        activeCell: 'A1',
        selection: [{ sq: 'A1:B30' }] // ✅ Sélection forcée sur A:B seulement
      }
    ]
  });

  // En-tête principal
  summarySheet.mergeCells('A1:B1'); // ✅ Seulement 2 colonnes maintenant
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `📊 Rapport Préparations - ${reportData.agence.nom}`;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 35;

  // Informations générales
  summarySheet.addRow([]);
  summarySheet.addRow(['📅 PÉRIODE', `${reportData.periode.debut} → ${reportData.periode.fin}`]);
  summarySheet.addRow(['🏢 AGENCE', `${reportData.agence.nom} (${reportData.agence.code})`]);
  summarySheet.addRow(['📊 GÉNÉRÉ LE', reportData.genereA.toLocaleString('fr-FR')]);

  // Métriques principales
  summarySheet.addRow([]);
  
  // ✅ Titre "MÉTRIQUES" sur 2 colonnes
  const metricsRowNum = summarySheet.rowCount + 1;
  summarySheet.addRow(['📈 MÉTRIQUES']);
  summarySheet.mergeCells(`A${metricsRowNum}:B${metricsRowNum}`);
  summarySheet.getRow(metricsRowNum).getCell(1).font = { bold: true, size: 12 };
  summarySheet.getRow(metricsRowNum).getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  
  const metricsStartRow = summarySheet.rowCount + 1;
  // ✅ SUPPRIMÉ : Total préparations
  summarySheet.addRow(['🚗 Nettoyage intérieur / extérieur', reportData.metriques.exteriorOrInterior]);
  summarySheet.addRow(['⛽ Carburant', reportData.metriques.fuel]);
  summarySheet.addRow(['✨ Lavage spécial', reportData.metriques.specialWash]);

  // Style des métriques
  for (let i = metricsStartRow; i <= summarySheet.rowCount; i++) {
    summarySheet.getCell(`A${i}`).font = { bold: true };
    summarySheet.getCell(`B${i}`).font = { bold: true, color: { argb: '0066CC' } };
  }

  // Pourcentages
  summarySheet.addRow([]);
  
  // ✅ Titre "POURCENTAGES" sur 2 colonnes
  const percentagesRowNum = summarySheet.rowCount + 1;
  summarySheet.addRow(['📊 POURCENTAGES']);
  summarySheet.mergeCells(`A${percentagesRowNum}:B${percentagesRowNum}`);
  summarySheet.getRow(percentagesRowNum).getCell(1).font = { bold: true, size: 12 };
  summarySheet.getRow(percentagesRowNum).getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  
  const total = reportData.metriques.totalPreparations;
  if (total > 0) {
    summarySheet.addRow(['🚗 % Nettoyage', `${Math.round((reportData.metriques.exteriorOrInterior / total) * 100)}%`]);
    summarySheet.addRow(['⛽ % Carburant', `${Math.round((reportData.metriques.fuel / total) * 100)}%`]);
    summarySheet.addRow(['✨ % Lavage spécial', `${Math.round((reportData.metriques.specialWash / total) * 100)}%`]);
  }

  // ✅ AMÉLIORATION : Cellules plus hautes et centrées
  summarySheet.eachRow((row, rowNumber) => {
    row.height = 25; // Hauteur augmentée
    row.eachCell((cell) => {
      cell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true 
      };
    });
  });

  // Ajuster les colonnes (seulement A et B) avec masquage des autres
  summarySheet.getColumn('A').width = 30;
  summarySheet.getColumn('B').width = 25;
  
  // ✅ MASQUER TOUTES les colonnes après B (C à ZZ pour être sûr)
  for (let col = 3; col <= 100; col++) { // Étendre jusqu'à 100 colonnes
    summarySheet.getColumn(col).hidden = true;
    summarySheet.getColumn(col).width = 0;
  }

  // ===== ONGLET 2: DÉTAILS =====
  const detailsSheet = workbook.addWorksheet('📋 Détails');

  // ✅ En-têtes simplifiées selon vos demandes (sans Status)
  const headers = [
    'Plaque',
    'Préparateur', 
    'Date Création',
    'Exterior',
    'Interior',
    'Fuel',
    'Special Wash'
  ];

  detailsSheet.addRow(headers);
  
  // Style en-têtes avec hauteur augmentée
  const headerRow = detailsSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 30; // ✅ Hauteur augmentée

  // ✅ Données détaillées simplifiées (sans Status)
  reportData.metriques.details.forEach(detail => {
    const row = detailsSheet.addRow([
      detail.plaque,
      detail.preparateur,
      detail.dateCreation ? new Date(detail.dateCreation).toLocaleDateString('fr-FR') : 'N/A',
      detail.hasExterior ? '✅' : '❌',
      detail.hasInterior ? '✅' : '❌', 
      detail.hasFuel ? '✅' : '❌',
      detail.hasSpecialWash ? '✅' : '❌'
    ]);
    
    // ✅ Hauteur et centrage pour chaque ligne
    row.height = 25;
    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  // ✅ Ajuster les colonnes avec centrage
  detailsSheet.columns.forEach((column, index) => {
    column.width = index === 0 ? 20 : 15; // Plaque plus large
    column.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  // Générer le buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = router;