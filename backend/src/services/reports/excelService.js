// ===== SERVICE EXCEL POUR RAPPORTS =====
// backend/src/services/reports/excelService.js

const ExcelJS = require('exceljs');

/**
 * Service pour créer les fichiers Excel des rapports
 */
class ExcelService {

  /**
   * ✅ Créer le fichier Excel quotidien amélioré
   */
  async createDailyExcelReport(reportData) {
    const workbook = new ExcelJS.Workbook();
    
    // Métadonnées
    workbook.creator = 'Système de Gestion Véhicules';
    workbook.created = new Date();
    workbook.title = `Rapport Quotidien Complet - ${reportData.date}`;

    // ===== ONGLET 1: RÉSUMÉ =====
    const summarySheet = workbook.addWorksheet('📊 Résumé');
    
    // En-tête principal
    summarySheet.mergeCells('A1:F1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `📊 Rapport Quotidien Complet - ${reportData.date}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 35;

    // Statistiques pointages
    summarySheet.addRow([]);
    summarySheet.addRow(['📋 POINTAGES']);
    summarySheet.addRow(['Employés prévus', reportData.stats.totalEmployes]);
    summarySheet.addRow(['Employés présents', reportData.stats.presentsCount]);
    summarySheet.addRow(['Taux de présence', `${reportData.stats.presenceRate}%`]);
    summarySheet.addRow(['Taux de ponctualité', `${reportData.stats.ponctualiteRate}%`]);
    summarySheet.addRow(['Retards', reportData.stats.retardsCount]);
    
    // Statistiques préparations
    summarySheet.addRow([]);
    summarySheet.addRow(['🚗 PRÉPARATIONS VÉHICULES']);
    summarySheet.addRow(['Total préparations', reportData.stats.totalPreparations]);
    summarySheet.addRow(['Préparations terminées', reportData.stats.preparationsCompleted]);
    summarySheet.addRow(['Préparations en cours', reportData.stats.preparationsInProgress]);
    summarySheet.addRow(['Agences actives', reportData.stats.preparationsByAgencyCount]);
    summarySheet.addRow(['Temps moyen (min)', reportData.stats.averagePreparationTime || 'N/A']);

    // Style
    summarySheet.getColumn('A').width = 25;
    summarySheet.getColumn('B').width = 15;

    // ===== ONGLET 2: POINTAGES =====
    const timesheetSheet = workbook.addWorksheet('⏰ Pointages');
    
    // En-têtes
    timesheetSheet.addRow([
      'Employé', 'Agence', 'Prévu Début', 'Réel Début', 'Prévu Fin', 'Réel Fin', 
      'Retard (min)', 'Statut'
    ]);

    // Données pointages
    reportData.schedules.forEach(schedule => {
      const timesheet = reportData.timesheets.find(ts => 
        ts.user._id.toString() === schedule.user._id.toString() &&
        ts.agency._id.toString() === schedule.agency._id.toString()
      );

      let delay = 0;
      let status = 'Absent';
      
      if (timesheet && timesheet.startTime) {
        status = 'Présent';
        const [schedHour, schedMin] = schedule.startTime.split(':').map(Number);
        const scheduledTime = new Date(schedule.date);
        scheduledTime.setHours(schedHour, schedMin, 0, 0);
        
        delay = Math.max(0, Math.round((new Date(timesheet.startTime) - scheduledTime) / (1000 * 60)));
        
        if (delay > 15) {
          status = 'En retard';
        } else if (delay <= 5) {
          status = 'Ponctuel';
        }
      }

      timesheetSheet.addRow([
        `${schedule.user.firstName} ${schedule.user.lastName}`,
        schedule.agency.name,
        schedule.startTime,
        timesheet?.startTime ? new Date(timesheet.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
        schedule.endTime,
        timesheet?.endTime ? new Date(timesheet.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
        delay > 0 ? delay : '-',
        status
      ]);
    });

    // ===== ONGLET 3: VÉHICULES PAR AGENCE =====
    const vehicleSheet = workbook.addWorksheet('🚗 Véhicules par Agence');
    
    vehicleSheet.addRow([
      'Agence', 'Client', 'Véhicule', 'Marque/Modèle', 'Préparateur', 
      'Début', 'Fin', 'Durée (min)', 'Statut', 'Étapes'
    ]);

    Object.values(reportData.preparationsByAgency).forEach(agencyData => {
      // Ligne de séparation par agence
      vehicleSheet.addRow([`=== ${agencyData.agencyInfo.name} (${agencyData.agencyInfo.code}) - ${agencyData.agencyInfo.client} ===`]);
      
      if (agencyData.preparations.length === 0) {
        vehicleSheet.addRow(['', '', 'Aucune préparation', '', '', '', '', '', '', '']);
      } else {
        agencyData.preparations.forEach(prep => {
          vehicleSheet.addRow([
            agencyData.agencyInfo.name,
            agencyData.agencyInfo.client,
            prep.vehicle.licensePlate || 'N/A',
            `${prep.vehicle.brand || ''} ${prep.vehicle.model || ''}`.trim() || 'N/A',
            prep.user ? `${prep.user.firstName} ${prep.user.lastName}` : 'N/A',
            prep.startTime ? new Date(prep.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
            prep.endTime ? new Date(prep.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'En cours',
            prep.duration || 'En cours',
            prep.status === 'completed' ? 'Terminé' : prep.status === 'in_progress' ? 'En cours' : prep.status,
            `${prep.stepsCompleted}/${prep.totalSteps}`
          ]);
        });
      }
      
      vehicleSheet.addRow([]); // Ligne vide entre agences
    });

    // Ajuster les colonnes
    [summarySheet, timesheetSheet, vehicleSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        column.width = 15;
      });
    });

    return workbook;
  }

  /**
   * ✅ Créer le fichier Excel hebdomadaire avec design interactif
   */
  async createWeeklyExcelReport(reportData) {
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'Système de Gestion Véhicules';
    workbook.created = new Date();
    workbook.title = `Rapport Hebdomadaire - ${reportData.startDate} au ${reportData.endDate}`;

    // ===== ONGLET 1: RÉSUMÉ INTERACTIF =====
    const summarySheet = workbook.addWorksheet('📊 Résumé', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    
    // Titre principal avec style
    summarySheet.mergeCells('A1:H1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `📊 Rapport Hebdomadaire - ${reportData.startDate} au ${reportData.endDate}`;
    titleCell.font = { size: 18, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E7D32' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thick', color: { argb: '1B5E20' } },
      bottom: { style: 'thick', color: { argb: '1B5E20' } }
    };
    summarySheet.getRow(1).height = 40;

    // Section statistiques générales avec couleurs
    summarySheet.addRow([]);
    summarySheet.mergeCells('A3:H3');
    const statsHeader = summarySheet.getCell('A3');
    statsHeader.value = '📈 STATISTIQUES GÉNÉRALES';
    statsHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
    statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1976D2' } };
    statsHeader.alignment = { horizontal: 'center' };

    // Données avec style alternant
    const statsData = [
      ['Total préparations', reportData.stats.totalPreparations, '🚗'],
      ['Préparations terminées', reportData.stats.completedPreparations, '✅'],
      ['Temps moyen (min)', reportData.stats.averagePreparationTime || 'N/A', '⏱️'],
      ['Agences actives', reportData.stats.agenciesCount, '🏢'],
      ['Employés avec préparations', reportData.stats.employeesWithPreparationsCount, '👨‍🔧']
    ];

    statsData.forEach((data, index) => {
      const row = summarySheet.addRow([data[2], data[0], data[1]]);
      
      // Style alternant
      const bgColor = index % 2 === 0 ? 'F5F5F5' : 'FFFFFF';
      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'E0E0E0' } }
        };
        
        if (colNumber === 1) cell.font = { size: 14 }; // Emoji plus grand
        if (colNumber === 2) cell.font = { bold: true };
        if (colNumber === 3) {
          cell.font = { bold: true, color: { argb: '1976D2' } };
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    // Ajuster automatiquement les colonnes
    summarySheet.getColumn('A').width = 5;  // Emoji
    summarySheet.getColumn('B').width = 30; // Description
    summarySheet.getColumn('C').width = 15; // Valeur

    // ===== ONGLET 2: STATISTIQUES DÉTAILLÉES PAR AGENCE =====
    const agencyStatsSheet = workbook.addWorksheet('🏢 Stats par Agence');
    
    // En-tête avec style
    agencyStatsSheet.mergeCells('A1:M1');
    const agencyTitle = agencyStatsSheet.getCell('A1');
    agencyTitle.value = '🏢 STATISTIQUES DÉTAILLÉES PAR AGENCE';
    agencyTitle.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    agencyTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6F00' } };
    agencyTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    agencyStatsSheet.getRow(1).height = 35;

    // En-têtes des colonnes avec style
    const headers = [
      'Agence', 'Code', 'Client', 'Total', 'Terminées', 'Moy.(min)',
      '🏠 Intérieur', '🚗 Extérieur', '⛽ Carburant', '✨ Spécial',
      '🚙 Particulier', '🚛 Utilitaire', 'Taux (%)'
    ];

    agencyStatsSheet.addRow([]);
    const headerRow = agencyStatsSheet.addRow(headers);
    
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '424242' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: '212121' } },
        bottom: { style: 'medium', color: { argb: '212121' } },
        left: { style: 'thin', color: { argb: '212121' } },
        right: { style: 'thin', color: { argb: '212121' } }
      };
    });
    agencyStatsSheet.getRow(3).height = 30;

    // Données des agences avec style interactif
    Object.values(reportData.preparationsByAgency)
      .sort((a, b) => b.totalPreparations - a.totalPreparations)
      .forEach((agencyData, index) => {
        const completionRate = agencyData.totalPreparations > 0 ? 
          Math.round((agencyData.completedPreparations / agencyData.totalPreparations) * 100) : 0;

        const rowData = [
          agencyData.agencyInfo.name,
          agencyData.agencyInfo.code,
          agencyData.agencyInfo.client,
          agencyData.totalPreparations,
          agencyData.completedPreparations,
          agencyData.averageDuration || 'N/A',
          agencyData.stepStats ? agencyData.stepStats.interior || 0 : 0,
          agencyData.stepStats ? agencyData.stepStats.exterior || 0 : 0,
          agencyData.stepStats ? agencyData.stepStats.fuel || 0 : 0,
          agencyData.stepStats ? agencyData.stepStats.special_wash || 0 : 0,
          agencyData.vehicleStats ? agencyData.vehicleStats.particulier || 0 : 0,
          agencyData.vehicleStats ? agencyData.vehicleStats.utilitaire || 0 : 0,
          `${completionRate}%`
        ];

        const row = agencyStatsSheet.addRow(rowData);
        
        // Style alternant avec code couleur pour les performances
        const bgColor = index % 2 === 0 ? 'F8F9FA' : 'FFFFFF';
        
        row.eachCell((cell, colNumber) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
            left: { style: 'thin', color: { argb: 'E0E0E0' } },
            right: { style: 'thin', color: { argb: 'E0E0E0' } }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Couleurs spéciales pour certaines colonnes
          if (colNumber === 1) { // Nom agence
            cell.font = { bold: true };
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
          if (colNumber === 4 || colNumber === 5) { // Totaux
            cell.font = { bold: true, color: { argb: '1976D2' } };
          }
          if (colNumber === 13) { // Taux de completion
            if (completionRate >= 90) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C8E6C9' } };
              cell.font = { bold: true, color: { argb: '2E7D32' } };
            } else if (completionRate >= 70) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E0' } };
              cell.font = { bold: true, color: { argb: 'F57C00' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
              cell.font = { bold: true, color: { argb: 'D32F2F' } };
            }
          }
          if (colNumber >= 7 && colNumber <= 12) { // Stats étapes et véhicules
            if (cell.value > 0) {
              cell.font = { bold: true, color: { argb: '4CAF50' } };
            }
          }
        });
      });

    // ===== ONGLET 3: PRÉPARATIONS PAR AGENCE AVEC AUTO-RESIZE =====
    const agencySheet = workbook.addWorksheet('🏢 Détail par Agence');
    
    agencySheet.mergeCells('A1:L1');
    const detailTitle = agencySheet.getCell('A1');
    detailTitle.value = '🏢 DÉTAIL DES PRÉPARATIONS PAR AGENCE';
    detailTitle.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    detailTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8E24AA' } };
    detailTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    agencySheet.getRow(1).height = 35;

    const detailHeaders = [
      'Agence', 'Code', 'Client', 'Date', 'Véhicule', 'Type Véh.', 'Marque/Modèle', 
      'Préparateur', 'Début', 'Fin', 'Durée (min)', 'Statut'
    ];

    agencySheet.addRow([]);
    const detailHeaderRow = agencySheet.addRow(detailHeaders);
    
    detailHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '424242' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: '212121' } },
        bottom: { style: 'medium', color: { argb: '212121' } },
        left: { style: 'thin', color: { argb: '212121' } },
        right: { style: 'thin', color: { argb: '212121' } }
      };
    });

    Object.values(reportData.preparationsByAgency).forEach((agencyData, agencyIndex) => {
      // Ligne séparateur d'agence
      agencySheet.addRow([]);
      agencySheet.mergeCells(`A${agencySheet.lastRow.number}:L${agencySheet.lastRow.number}`);
      const agencySeparator = agencySheet.getCell(`A${agencySheet.lastRow.number}`);
      agencySeparator.value = `🏢 ${agencyData.agencyInfo.name} (${agencyData.agencyInfo.code}) - ${agencyData.agencyInfo.client}`;
      agencySeparator.font = { size: 12, bold: true, color: { argb: 'FFFFFF' } };
      agencySeparator.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8E24AA' } };
      agencySeparator.alignment = { horizontal: 'center', vertical: 'middle' };
      
      if (agencyData.preparations.length === 0) {
        const emptyRow = agencySheet.addRow(['', '', '', 'Aucune préparation cette semaine', '', '', '', '', '', '', '', '']);
        emptyRow.getCell(4).font = { italic: true, color: { argb: '757575' } };
        emptyRow.getCell(4).alignment = { horizontal: 'center' };
      } else {
        agencyData.preparations.forEach((prep, index) => {
          const rowData = [
            index === 0 ? agencyData.agencyInfo.name : '', // Nom agence seulement sur première ligne
            index === 0 ? agencyData.agencyInfo.code : '',
            index === 0 ? agencyData.agencyInfo.client : '',
            prep.date,
            prep.vehicle.licensePlate || 'N/A',
            prep.vehicleType === 'particulier' ? '🚙 Particulier' : '🚛 Utilitaire',
            `${prep.vehicle.brand || ''} ${prep.vehicle.model || ''}`.trim() || 'N/A',
            prep.user ? `${prep.user.firstName} ${prep.user.lastName}` : 'N/A',
            prep.startTime,
            prep.endTime,
            prep.duration || 'En cours',
            prep.status === 'completed' ? '✅ Terminé' : prep.status === 'in_progress' ? '🔄 En cours' : prep.status
          ];

          const row = agencySheet.addRow(rowData);
          
          // Style alternant par préparation
          const bgColor = index % 2 === 0 ? 'F3E5F5' : 'FFFFFF';
          
          row.eachCell((cell, colNumber) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'E0E0E0' } },
              bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
              left: { style: 'thin', color: { argb: 'E0E0E0' } },
              right: { style: 'thin', color: { argb: 'E0E0E0' } }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            // Styles spéciaux
            if (colNumber === 1 && cell.value) { // Nom agence
              cell.font = { bold: true };
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
            if (colNumber === 6) { // Type véhicule
              if (prep.vehicleType === 'utilitaire') {
                cell.font = { bold: true, color: { argb: 'FF6F00' } };
              } else {
                cell.font = { bold: true, color: { argb: '1976D2' } };
              }
            }
            if (colNumber === 11 && prep.duration) { // Durée
              if (prep.duration > 45) {
                cell.font = { bold: true, color: { argb: 'D32F2F' } };
              } else if (prep.duration < 20) {
                cell.font = { bold: true, color: { argb: '4CAF50' } };
              }
            }
            if (colNumber === 12) { // Statut
              if (prep.status === 'completed') {
                cell.font = { bold: true, color: { argb: '4CAF50' } };
              } else if (prep.status === 'in_progress') {
                cell.font = { bold: true, color: { argb: 'FF9800' } };
              }
            }
          });
        });
      }
    });

    // ===== ONGLET 4: TOP EMPLOYÉS AVEC STATS DÉTAILLÉES =====
    const employeeSheet = workbook.addWorksheet('👥 TOP Employés');
    
    employeeSheet.mergeCells('A1:N1');
    const empTitle = employeeSheet.getCell('A1');
    empTitle.value = '👥 TOP EMPLOYÉS - STATISTIQUES COMPLÈTES';
    empTitle.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    empTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E91E63' } };
    empTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    employeeSheet.getRow(1).height = 35;

    const empHeaders = [
      'Rang', 'Employé', 'Email', 'Total', 'Terminées', 'Moy.(min)',
      '🏠 Intérieur', '🚗 Extérieur', '⛽ Carburant', '✨ Spécial',
      '🚙 Particulier', '🚛 Utilitaire', 'Agences', 'Efficacité'
    ];

    employeeSheet.addRow([]);
    const empHeaderRow = employeeSheet.addRow(empHeaders);
    
    empHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '424242' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'medium', color: { argb: '212121' } },
        bottom: { style: 'medium', color: { argb: '212121' } },
        left: { style: 'thin', color: { argb: '212121' } },
        right: { style: 'thin', color: { argb: '212121' } }
      };
    });

    // Trier les employés par nombre de préparations (décroissant)
    const sortedEmployees = Object.values(reportData.preparationsByEmployee)
      .sort((a, b) => b.totalPreparations - a.totalPreparations);

    sortedEmployees.forEach((employeeData, index) => {
      const efficiency = employeeData.totalPreparations > 0 ? 
        Math.round((employeeData.completedPreparations / employeeData.totalPreparations) * 100) : 0;

      // Emoji médaille pour le top 3
      let rankDisplay = index + 1;
      if (index === 0) rankDisplay = '🥇 1';
      else if (index === 1) rankDisplay = '🥈 2';
      else if (index === 2) rankDisplay = '🥉 3';

      const rowData = [
        rankDisplay,
        `${employeeData.userInfo.firstName} ${employeeData.userInfo.lastName}`,
        employeeData.userInfo.email,
        employeeData.totalPreparations,
        employeeData.completedPreparations,
        employeeData.averageDuration || 'N/A',
        employeeData.stepStats.interior,
        employeeData.stepStats.exterior,
        employeeData.stepStats.fuel,
        employeeData.stepStats.special_wash,
        employeeData.vehicleStats.particulier,
        employeeData.vehicleStats.utilitaire,
        employeeData.agenciesWorked.join(', '),
        `${efficiency}%`
      ];

      const row = employeeSheet.addRow(rowData);
      
      // Style spécial pour le top 3
      let bgColor = index % 2 === 0 ? 'F8F9FA' : 'FFFFFF';
      if (index < 3) {
        bgColor = index === 0 ? 'FFF3E0' : index === 1 ? 'F3E5F5' : 'E8F5E8';
      }
      
      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
          left: { style: 'thin', color: { argb: 'E0E0E0' } },
          right: { style: 'thin', color: { argb: 'E0E0E0' } }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        // Styles spéciaux
        if (colNumber === 1) { // Rang
          cell.font = { bold: true, size: 12 };
          if (index < 3) cell.font.color = { argb: 'FF6F00' };
        }
        if (colNumber === 2) { // Nom employé
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        if (colNumber === 4 || colNumber === 5) { // Totaux
          cell.font = { bold: true, color: { argb: '1976D2' } };
        }
        if (colNumber === 14) { // Efficacité
          if (efficiency >= 90) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C8E6C9' } };
            cell.font = { bold: true, color: { argb: '2E7D32' } };
          } else if (efficiency >= 70) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E0' } };
            cell.font = { bold: true, color: { argb: 'F57C00' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEE' } };
            cell.font = { bold: true, color: { argb: 'D32F2F' } };
          }
        }
        if (colNumber >= 7 && colNumber <= 12) { // Stats étapes et véhicules
          if (cell.value > 0) {
            cell.font = { bold: true, color: { argb: '4CAF50' } };
          }
        }
      });
    });

    // ===== AUTO-RESIZE TOUTES LES COLONNES =====
    [summarySheet, agencyStatsSheet, agencySheet, employeeSheet].forEach(sheet => {
      sheet.columns.forEach((column, index) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        // Largeur minimale de 12, maximale de 50 pour éviter les colonnes trop larges
        column.width = Math.min(Math.max(maxLength + 3, 12), 50);
      });

      // Activer le filtre automatique sur les feuilles de données
      if (sheet.name !== '📊 Résumé') {
        sheet.autoFilter = {
          from: { row: 3, column: 1 },
          to: { row: sheet.lastRow.number, column: sheet.columnCount }
        };
      }

      // Figer les volets (en-têtes)
      sheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 3 }
      ];
    });

    return workbook;
  }
}

module.exports = new ExcelService();