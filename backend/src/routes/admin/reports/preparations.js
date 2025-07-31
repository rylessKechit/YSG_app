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
      const getVehicleInfo = (prep) => {
        // Priorité : vehicleData > vehicleInfo > vehicle populate > fallback
        if (prep.vehicleData && prep.vehicleData.licensePlate) {
          const { brand, model, licensePlate } = prep.vehicleData;
          return `${brand && brand !== 'N/A' ? brand + ' ' : ''}${model || 'Véhicule'} (${licensePlate})`;
        } else if (prep.vehicleInfo && prep.vehicleInfo.licensePlate) {
          const { brand, model, licensePlate } = prep.vehicleInfo;
          return `${brand && brand !== 'N/A' ? brand + ' ' : ''}${model || 'Véhicule'} (${licensePlate})`;
        } else if (prep.vehicle && mongoose.Types.ObjectId.isValid(prep.vehicle)) {
          const vehicle = vehiclesMap[prep.vehicle.toString()];
          if (vehicle) {
            return `${vehicle.brand || ''} ${vehicle.model || 'Véhicule'} (${vehicle.licensePlate || 'N/A'})`;
          }
        }
        return 'Véhicule inconnu';
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
        vehicule: getVehicleInfo(prep),
        preparateur: getUserInfo(prep),
        dateCreation: prep.createdAt,
        dateCompletion: prep.completedAt,
        statut: prep.status,
        hasExterior,
        hasInterior,
        hasFuel,
        hasSpecialWash,
        exteriorOrInterior: hasExterior || hasInterior,
        etapesTotal: steps.length,
        etapesCompletees: steps.filter(s => s.completed === true).length
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
  const workbook = new ExcelJS.Workbook();
  
  // Métadonnées
  workbook.creator = 'Système de Gestion Véhicules';
  workbook.created = new Date();
  workbook.title = `Rapport Préparations - ${reportData.agence.nom}`;

  // ===== ONGLET 1: RÉSUMÉ =====
  const summarySheet = workbook.addWorksheet('📊 Résumé');

  // En-tête principal
  summarySheet.mergeCells('A1:D1');
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
  summarySheet.addRow(['👤 GÉNÉRÉ PAR', reportData.generePar]);

  // Métriques principales
  summarySheet.addRow([]);
  summarySheet.addRow(['📈 MÉTRIQUES (ÉTAPES TERMINÉES UNIQUEMENT)']);
  
  const metricsStartRow = summarySheet.rowCount + 1;
  summarySheet.addRow(['📊 Total préparations', reportData.metriques.totalPreparations]);
  summarySheet.addRow(['🚗 Nettoyage terminé (exterior/interior)', reportData.metriques.exteriorOrInterior]);
  summarySheet.addRow(['⛽ Carburant terminé (fuel)', reportData.metriques.fuel]);
  summarySheet.addRow(['✨ Lavage spécial terminé (special_wash)', reportData.metriques.specialWash]);

  // Style des métriques
  for (let i = metricsStartRow; i <= summarySheet.rowCount; i++) {
    summarySheet.getCell(`A${i}`).font = { bold: true };
    summarySheet.getCell(`B${i}`).font = { bold: true, color: { argb: '0066CC' } };
  }

  // Pourcentages
  summarySheet.addRow([]);
  summarySheet.addRow(['📊 POURCENTAGES (ÉTAPES TERMINÉES)']);
  const total = reportData.metriques.totalPreparations;
  if (total > 0) {
    summarySheet.addRow(['🚗 % Nettoyage terminé', `${Math.round((reportData.metriques.exteriorOrInterior / total) * 100)}%`]);
    summarySheet.addRow(['⛽ % Carburant terminé', `${Math.round((reportData.metriques.fuel / total) * 100)}%`]);
    summarySheet.addRow(['✨ % Lavage spécial terminé', `${Math.round((reportData.metriques.specialWash / total) * 100)}%`]);
  }

  // Ajuster les colonnes
  summarySheet.getColumn('A').width = 30;
  summarySheet.getColumn('B').width = 25;

  // ===== ONGLET 2: DÉTAILS =====
  const detailsSheet = workbook.addWorksheet('📋 Détails');

  // En-têtes du tableau
  const headers = [
    'ID Préparation',
    'Véhicule',
    'Préparateur', 
    'Date Création',
    'Date Completion',
    'Statut',
    'Exterior',
    'Interior',
    'Fuel',
    'Special Wash',
    'Nettoyage (E/I)',
    'Étapes Total',
    'Étapes Complétées'
  ];

  detailsSheet.addRow(headers);
  
  // Style en-têtes
  const headerRow = detailsSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
  headerRow.alignment = { horizontal: 'center' };
  headerRow.height = 25;

  // Données détaillées
  reportData.metriques.details.forEach(detail => {
    detailsSheet.addRow([
      detail.id,
      detail.vehicule,
      detail.preparateur,
      detail.dateCreation ? new Date(detail.dateCreation).toLocaleDateString('fr-FR') : 'N/A',
      detail.dateCompletion ? new Date(detail.dateCompletion).toLocaleDateString('fr-FR') : 'N/A',
      detail.statut,
      detail.hasExterior ? '✅' : '❌',
      detail.hasInterior ? '✅' : '❌', 
      detail.hasFuel ? '✅' : '❌',
      detail.hasSpecialWash ? '✅' : '❌',
      detail.exteriorOrInterior ? '✅' : '❌',
      detail.etapesTotal,
      detail.etapesCompletees
    ]);
  });

  // Ajuster les colonnes
  detailsSheet.columns.forEach(column => {
    column.width = 15;
  });
  detailsSheet.getColumn('B').width = 25; // Véhicule
  detailsSheet.getColumn('C').width = 20; // Préparateur

  // Générer le buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = router;