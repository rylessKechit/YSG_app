// ===== RAPPORT AUTOMATIQUE QUOTIDIEN - SERVICE COMPLET (Version BDD) =====
// backend/src/services/dailyReportService.js

const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const Agency = require('../models/Agency');
const Schedule = require('../models/Schedule');
const { createTransporter, getAdminEmails, getAdminDetails } = require('./emailService');

/**
 * Service principal pour générer et envoyer le rapport quotidien
 */
class DailyReportService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Initialiser le service email
   */
  async initialize() {
    try {
      this.transporter = createTransporter();
      await this.transporter.verify();
      
      // Vérifier qu'on a bien des admins en base
      const adminEmails = await getAdminEmails();
      if (adminEmails.length === 0) {
        console.warn('⚠️  Aucun administrateur trouvé en base de données');
        return false;
      }
      
      console.log('✅ Service de rapport quotidien initialisé');
      console.log(`📧 ${adminEmails.length} administrateur(s) trouvé(s): ${adminEmails.join(', ')}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation service rapport:', error.message);
      return false;
    }
  }

  /**
   * Récupérer toutes les données de pointage du jour
   */
  async getDailyData(date = new Date()) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      // 1. Tous les employés actifs avec leurs agences
      const employees = await User.find({ 
        role: 'preparateur',
        isActive: true 
      })
      .populate('agencies', 'name code client')
      .lean();

      // 2. Tous les plannings du jour
      const schedules = await Schedule.find({
        date: { $gte: dayStart, $lte: dayEnd },
        status: 'active'
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .lean();

      // 3. Tous les pointages du jour
      const timesheets = await Timesheet.find({
        date: { $gte: dayStart, $lte: dayEnd }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate('schedule')
      .lean();

      // 4. Combiner les données pour avoir une vue complète
      const reportData = this.combineData(employees, schedules, timesheets, date);

      return reportData;
    } catch (error) {
      console.error('❌ Erreur récupération données quotidiennes:', error);
      throw error;
    }
  }

  /**
   * Combiner toutes les données en un rapport structuré
   */
  combineData(employees, schedules, timesheets, date) {
    const reportDate = date.toLocaleDateString('fr-FR');
    const data = [];

    // Créer un map des timesheets par user/agency
    const timesheetMap = new Map();
    timesheets.forEach(ts => {
      const key = `${ts.user._id}_${ts.agency._id}`;
      timesheetMap.set(key, ts);
    });

    // Créer un map des schedules par user/agency
    const scheduleMap = new Map();
    schedules.forEach(schedule => {
      const key = `${schedule.user._id}_${schedule.agency._id}`;
      scheduleMap.set(key, schedule);
    });

    // Pour chaque planning, créer une ligne de rapport
    schedules.forEach(schedule => {
      const key = `${schedule.user._id}_${schedule.agency._id}`;
      const timesheet = timesheetMap.get(key);
      
      const row = {
        // Informations employé
        employeId: schedule.user._id,
        prenom: schedule.user.firstName,
        nom: schedule.user.lastName,
        email: schedule.user.email,
        
        // Informations agence
        agenceNom: schedule.agency.name,
        agenceCode: schedule.agency.code,
        agenceClient: schedule.agency.client,
        
        // Planning prévu
        heureDebutPrevue: schedule.startTime,
        heureFinPrevue: schedule.endTime,
        pauseDebutPrevue: schedule.breakStart || '-',
        pauseFinPrevue: schedule.breakEnd || '-',
        dureePreviewMinutes: schedule.workingDuration || 0,
        
        // Pointage réel
        heureDebutReelle: timesheet?.startTime ? 
          new Date(timesheet.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'NON POINTÉ',
        heureFinReelle: timesheet?.endTime ? 
          new Date(timesheet.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'NON POINTÉ',
        pauseDebutReelle: timesheet?.breakStart ? 
          new Date(timesheet.breakStart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
        pauseFinReelle: timesheet?.breakEnd ? 
          new Date(timesheet.breakEnd).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
        
        // Calculs et statuts
        retardMinutes: timesheet?.delays?.startDelay || 0,
        retardStatut: this.getDelayStatus(timesheet?.delays?.startDelay || 0),
        dureeTravilleeMinutes: timesheet?.totalWorkedMinutes || 0,
        dureeTravilleeFormatee: this.formatDuration(timesheet?.totalWorkedMinutes || 0),
        dureePauseMinutes: timesheet?.totalBreakMinutes || 0,
        
        // Statuts
        statutPointage: timesheet?.status || 'absent',
        present: timesheet ? 'OUI' : 'NON',
        ponctuel: (timesheet?.delays?.startDelay || 0) <= 5 ? 'OUI' : 'NON',
        
        // Problèmes identifiés
        problemes: this.getIssues(timesheet, schedule),
        
        // Métadonnées
        dateRapport: reportDate,
        horaireGeneration: new Date().toLocaleTimeString('fr-FR')
      };
      
      data.push(row);
    });

    return {
      date: reportDate,
      totalEmployes: schedules.length,
      presentsCount: timesheets.length,
      absentCount: schedules.length - timesheets.length,
      retardsCount: timesheets.filter(ts => (ts.delays?.startDelay || 0) > 5).length,
      ponctualiteRate: schedules.length > 0 ? 
        Math.round((timesheets.filter(ts => (ts.delays?.startDelay || 0) <= 5).length / schedules.length) * 100) : 0,
      presenceRate: schedules.length > 0 ? 
        Math.round((timesheets.length / schedules.length) * 100) : 0,
      data,
      generatedAt: new Date()
    };
  }

  /**
   * Déterminer le statut du retard
   */
  getDelayStatus(delayMinutes) {
    if (delayMinutes === 0) return 'À l\'heure';
    if (delayMinutes <= 5) return 'Retard léger';
    if (delayMinutes <= 15) return 'Retard modéré';
    return 'Retard important';
  }

  /**
   * Formater la durée en heures:minutes
   */
  formatDuration(minutes) {
    if (!minutes) return '0h00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Identifier les problèmes
   */
  getIssues(timesheet, schedule) {
    const issues = [];
    
    if (!timesheet) {
      issues.push('Absence non justifiée');
      return issues.join(', ');
    }
    
    if (!timesheet.startTime) issues.push('Pas de pointage d\'arrivée');
    if (!timesheet.endTime) issues.push('Pas de pointage de départ');
    if ((timesheet.delays?.startDelay || 0) > 15) issues.push('Retard significatif');
    if ((timesheet.totalBreakMinutes || 0) > 90) issues.push('Pause trop longue');
    
    return issues.length > 0 ? issues.join(', ') : 'Aucun';
  }

  /**
   * Créer le fichier Excel avec un design professionnel ET les heures de pause
   */
  async createExcelReport(reportData) {
    console.log('📊 Création du fichier Excel avec heures de pause...');
    
    const workbook = new ExcelJS.Workbook();
    
    // Métadonnées du fichier
    workbook.creator = 'Système de Gestion Véhicules';
    workbook.lastModifiedBy = 'Système Automatique';
    workbook.created = new Date();
    workbook.modified = new Date();

    // === FEUILLE 1: RÉSUMÉ ===
    const summarySheet = workbook.addWorksheet('Résumé', {
      pageSetup: { orientation: 'portrait', fitToPage: true }
    });

    // En-tête du résumé
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `📊 RAPPORT QUOTIDIEN - ${reportData.date}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Statistiques principales
    const stats = [
      ['📅 Date du rapport', reportData.date],
      ['👥 Employés prévus', reportData.totalEmployes],
      ['✅ Employés présents', reportData.presentsCount],
      ['❌ Employés absents', reportData.absentCount],
      ['⏰ Employés en retard', reportData.retardsCount],
      ['📈 Taux de présence', `${reportData.presenceRate}%`],
      ['⏱️ Taux de ponctualité', `${reportData.ponctualiteRate}%`],
      ['🕒 Généré à', reportData.generatedAt.toLocaleString('fr-FR')]
    ];

    stats.forEach((stat, index) => {
      const row = index + 3;
      summarySheet.getCell(`A${row}`).value = stat[0];
      summarySheet.getCell(`B${row}`).value = stat[1];
      
      // Style des cellules
      summarySheet.getCell(`A${row}`).font = { bold: true };
      summarySheet.getCell(`A${row}`).fill = { 
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } 
      };
    });

    // Ajuster les colonnes
    summarySheet.getColumn('A').width = 25;
    summarySheet.getColumn('B').width = 20;

    // === FEUILLE 2: DÉTAILS PAR EMPLOYÉ AVEC PAUSES ===
    const detailSheet = workbook.addWorksheet('Détails Pointages', {
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    // En-têtes des colonnes AVEC les heures de pause
    const headers = [
      'Prénom', 'Nom', 'Email', 'Agence', 'Code', 'Client',
      'Début Prévu', 'Fin Prévue', 'Pause Début Prévue', 'Pause Fin Prévue',
      'Début Réel', 'Fin Réelle', 'Pause Début Réelle', 'Pause Fin Réelle',
      'Retard (min)', 'Statut Retard', 'Durée Travaillée', 'Durée Pause', 'Présent', 'Ponctuel', 'Problèmes'
    ];

    console.log(`📋 Ajout de ${reportData.data.length} ligne(s) de données avec heures de pause...`);

    const headerRow = detailSheet.getRow(1);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    headerRow.height = 40;

    // Données des employés AVEC les heures de pause
    reportData.data.forEach((employee, index) => {
      const row = detailSheet.getRow(index + 2);
      const rowData = [
        employee.prenom,
        employee.nom,
        employee.email,
        employee.agenceNom,
        employee.agenceCode,
        employee.agenceClient,
        employee.heureDebutPrevue,
        employee.heureFinPrevue,
        employee.pauseDebutPrevue,    // NOUVEAU
        employee.pauseFinPrevue,      // NOUVEAU
        employee.heureDebutReelle,
        employee.heureFinReelle,
        employee.pauseDebutReelle,    // NOUVEAU
        employee.pauseFinReelle,      // NOUVEAU
        employee.retardMinutes,
        employee.retardStatut,
        employee.dureeTravilleeFormatee,
        this.formatDuration(employee.dureePauseMinutes), // NOUVEAU
        employee.present,
        employee.ponctuel,
        employee.problemes
      ];

      rowData.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };

        // Couleurs conditionnelles
        if (colIndex === 14) { // Retard (maintenant colonne 14)
          if (value > 15) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6' } };
          else if (value > 5) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
        }
        
        if (colIndex === 18 && value === 'NON') { // Présent (maintenant colonne 18)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6' } };
        }
        
        if (colIndex === 19 && value === 'NON') { // Ponctuel (maintenant colonne 19)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
        }

        // NOUVEAU: Colorer les pauses trop longues
        if (colIndex === 17) { // Durée pause
          const pauseMinutes = employee.dureePauseMinutes || 0;
          if (pauseMinutes > 90) { // Plus de 1h30 de pause
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6' } };
          }
        }
      });

      // Alternance des couleurs de lignes
      if (index % 2 === 0) {
        row.eachCell(cell => {
          if (!cell.fill || !cell.fill.fgColor) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
          }
        });
      }
    });

    // Ajuster automatiquement les largeurs des colonnes
    detailSheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const length = cell.value ? cell.value.toString().length : 10;
        if (length > maxLength) maxLength = length;
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 25);
    });

    console.log('✅ Fichier Excel créé avec succès avec heures de pause');
    return workbook;
  }

  /**
   * Générer et envoyer le rapport quotidien
   */
  async generateAndSendDailyReport(date = new Date()) {
    try {
      console.log(`📊 Génération du rapport quotidien pour le ${date.toLocaleDateString('fr-FR')}`);

      // 1. Vérifier la configuration email
      if (!this.transporter) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Service email non configuré ou aucun admin trouvé');
        }
      }

      // 2. Récupérer les emails des admins depuis la BDD
      const adminEmails = await getAdminEmails();
      if (adminEmails.length === 0) {
        throw new Error('Aucun administrateur actif trouvé en base de données');
      }

      // 3. Récupérer les données
      const reportData = await this.getDailyData(date);
      
      // 4. Créer le fichier Excel
      const workbook = await this.createExcelReport(reportData);
      
      // 5. Générer le buffer Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `rapport_pointages_${date.toISOString().split('T')[0]}.xlsx`;

      // 6. Composer l'email
      const emailHtml = this.createEmailTemplate(reportData);

      // 7. Envoyer l'email avec pièce jointe
      const result = await this.transporter.sendMail({
        from: `"Système de Gestion Véhicules" <${process.env.EMAIL_USER}>`,
        to: adminEmails,
        subject: `📊 Rapport Quotidien Pointages - ${reportData.date}`,
        html: emailHtml,
        attachments: [
          {
            filename,
            content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        ]
      });

      console.log(`✅ Rapport quotidien envoyé avec succès à ${adminEmails.length} administrateur(s)`);
      console.log(`📧 Destinataires: ${adminEmails.join(', ')}`);
      
      return {
        success: true,
        messageId: result.messageId,
        sentTo: adminEmails,
        filename,
        reportData: {
          date: reportData.date,
          totalEmployees: reportData.totalEmployes,
          presentCount: reportData.presentsCount,
          punctualityRate: reportData.ponctualiteRate
        }
      };

    } catch (error) {
      console.error('❌ Erreur génération rapport quotidien:', error);
      throw error;
    }
  }

  /**
   * Template HTML pour l'email
   */
  createEmailTemplate(reportData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport Quotidien</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        
        <!-- En-tête -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Rapport Quotidien</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${reportData.date}</p>
        </div>

        <!-- Statistiques principales -->
        <div style="background: #f8f9fa; padding: 25px; border-left: 4px solid #667eea;">
          <h2 style="margin: 0 0 20px 0; color: #333;">📈 Résumé de la journée</h2>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: #667eea;">${reportData.totalEmployes}</div>
              <div style="font-size: 14px; color: #666;">Employés prévus</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: ${reportData.presenceRate >= 90 ? '#28a745' : reportData.presenceRate >= 75 ? '#ffc107' : '#dc3545'};">${reportData.presenceRate}%</div>
              <div style="font-size: 14px; color: #666;">Taux de présence</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: ${reportData.ponctualiteRate >= 90 ? '#28a745' : reportData.ponctualiteRate >= 75 ? '#ffc107' : '#dc3545'};">${reportData.ponctualiteRate}%</div>
              <div style="font-size: 14px; color: #666;">Taux de ponctualité</div>
            </div>
          </div>

          <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>✅ Employés présents:</span>
              <span style="font-weight: bold; color: #28a745;">${reportData.presentsCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>❌ Employés absents:</span>
              <span style="font-weight: bold; color: #dc3545;">${reportData.absentCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>⏰ Employés en retard:</span>
              <span style="font-weight: bold; color: #ffc107;">${reportData.retardsCount}</span>
            </div>
          </div>
        </div>

        <!-- Pièce jointe -->
        <div style="background: white; padding: 25px; border: 2px dashed #667eea; margin: 20px 0; text-align: center; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #667eea;">📎 Rapport détaillé en pièce jointe</h3>
          <p style="margin: 0; color: #666;">
            Le fichier Excel en pièce jointe contient tous les détails des pointages, 
            avec les horaires prévus et réels, les retards, et l'identification des problèmes.
          </p>
        </div>

        <!-- Actions recommandées -->
        ${reportData.absentCount > 0 || reportData.retardsCount > 3 ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #856404;">⚠️ Actions recommandées</h3>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            ${reportData.absentCount > 0 ? `<li>Contacter les ${reportData.absentCount} employé(s) absent(s)</li>` : ''}
            ${reportData.retardsCount > 3 ? `<li>Analyser les causes des ${reportData.retardsCount} retards</li>` : ''}
            ${reportData.ponctualiteRate < 80 ? '<li>Planifier une réunion sur la ponctualité</li>' : ''}
          </ul>
        </div>
        ` : ''}

        <!-- Pied de page -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            Rapport généré automatiquement par le système de gestion des véhicules<br>
            📧 ${reportData.generatedAt.toLocaleString('fr-FR')}
          </p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * Tester le service (pour debug)
   */
  async testReport() {
    try {
      console.log('🧪 Test du service de rapport quotidien');
      
      // Vérifier la configuration
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Service non initialisé - vérifiez la configuration email et les admins en BDD');
      }
      
      // Tester avec des données réelles
      const result = await this.generateAndSendDailyReport();
      console.log('✅ Test réussi:', result);
      return result;
    } catch (error) {
      console.error('❌ Test échoué:', error);
      throw error;
    }
  }
}

module.exports = new DailyReportService();