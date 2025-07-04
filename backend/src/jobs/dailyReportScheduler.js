// ===== PLANIFICATEUR CRON - VERSION CORRIGÉE =====
// backend/src/jobs/dailyReportScheduler.js

const cron = require('node-cron');
const dailyReportService = require('../services/dailyReportService');

/**
 * Planificateur de tâches CRON pour les rapports automatiques
 */
class DailyReportScheduler {
  constructor() {
    this.isInitialized = false;
    this.jobs = new Map();
  }

  /**
   * Initialiser le planificateur
   */
  async initialize() {
    try {
      console.log('📅 Initialisation du planificateur de rapports...');
      
      // Vérifier la configuration
      if (!process.env.ENABLE_DAILY_REPORTS) {
        console.log('ℹ️  Rapports automatiques désactivés (ENABLE_DAILY_REPORTS=false)');
        return false;
      }

      // Initialiser le service de rapport
      const serviceInitialized = await dailyReportService.initialize();
      if (!serviceInitialized) {
        console.warn('⚠️  Service de rapport non initialisé - tâches CRON désactivées');
        return false;
      }

      // Planifier les tâches
      this.scheduleDailyReport();
      this.scheduleWeeklyReport();
      this.scheduleTestJobs();

      this.isInitialized = true;
      console.log('✅ Planificateur de rapports initialisé avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur initialisation planificateur:', error);
      return false;
    }
  }

  /**
   * Planifier le rapport quotidien à 20h00
   */
  scheduleDailyReport() {
    // CRON: Tous les jours à 20h00
    const dailyTask = cron.schedule('0 20 * * *', async () => {
      console.log('🕒 20h00 - Déclenchement du rapport quotidien automatique');
      
      try {
        const result = await dailyReportService.generateAndSendDailyReport();
        console.log('✅ Rapport quotidien envoyé avec succès:', {
          messageId: result.messageId,
          recipients: result.sentTo.length,
          employees: result.reportData.totalEmployees,
          punctuality: result.reportData.punctualityRate + '%'
        });
        
      } catch (error) {
        console.error('❌ Erreur envoi rapport quotidien automatique:', error);
        
        // Tenter d'envoyer une alerte aux admins
        try {
          await this.sendErrorAlert('Rapport quotidien', error.message);
        } catch (alertError) {
          console.error('❌ Impossible d\'envoyer l\'alerte d\'erreur:', alertError);
        }
      }
    }, {
      scheduled: false, // Ne pas démarrer automatiquement
      timezone: "Europe/Paris"
    });

    this.jobs.set('dailyReport', dailyTask);
    console.log('📋 Tâche quotidienne programmée: tous les jours à 20h00');
  }

  /**
   * Planifier un rapport hebdomadaire le dimanche à 18h00
   */
  scheduleWeeklyReport() {
    const weeklyTask = cron.schedule('0 18 * * 0', async () => {
      console.log('🕕 18h00 Dimanche - Déclenchement du rapport hebdomadaire');
      
      try {
        // Générer rapport pour la semaine écoulée
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        const weeklyData = await this.generateWeeklyReport(startDate, endDate);
        console.log('✅ Rapport hebdomadaire généré et envoyé');
        
      } catch (error) {
        console.error('❌ Erreur rapport hebdomadaire:', error);
        await this.sendErrorAlert('Rapport hebdomadaire', error.message);
      }
    }, {
      scheduled: false,
      timezone: "Europe/Paris"
    });

    this.jobs.set('weeklyReport', weeklyTask);
    console.log('📋 Tâche hebdomadaire programmée: dimanche à 18h00');
  }

  /**
   * Planifier des tâches de test (dev uniquement)
   */
  scheduleTestJobs() {
    if (process.env.NODE_ENV !== 'development') return;

    // Test toutes les 2 minutes en développement (désactivé par défaut)
    if (process.env.ENABLE_TEST_REPORTS === 'true') {
      const testTask = cron.schedule('*/2 * * * *', async () => {
        console.log('🧪 Test automatique du rapport quotidien');
        try {
          await dailyReportService.testReport();
          console.log('✅ Test automatique réussi');
        } catch (error) {
          console.error('❌ Test automatique échoué:', error.message);
        }
      }, {
        scheduled: false,
        timezone: "Europe/Paris"
      });

      this.jobs.set('testReport', testTask);
      console.log('🧪 Tâche de test programmée: toutes les 2 minutes (dev)');
    }
  }

  /**
   * Générer un rapport hebdomadaire avec comparatif complet
   */
  async generateWeeklyReport(startDate, endDate) {
    const ExcelJS = require('exceljs');
    const { createTransporter, getAdminEmails } = require('../services/emailService');
    const Timesheet = require('../models/Timesheet');
    const Schedule = require('../models/Schedule');

    try {
      console.log(`📈 Génération rapport hebdomadaire détaillé: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`);

      // Récupérer les emails depuis la BDD
      const adminEmails = await getAdminEmails();
      if (adminEmails.length === 0) {
        throw new Error('Aucun administrateur actif trouvé en base de données');
      }

      console.log(`📧 Envoi prévu à: ${adminEmails.join(', ')}`);

      // 1. Récupérer tous les plannings de la semaine
      const schedules = await Schedule.find({
        date: { $gte: startDate, $lte: endDate },
        status: 'active'
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .lean();

      console.log(`📅 ${schedules.length} planning(s) trouvé(s) pour la période`);

      // 2. Récupérer tous les pointages de la semaine
      const timesheets = await Timesheet.find({
        date: { $gte: startDate, $lte: endDate }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate('schedule')
      .lean();

      console.log(`📊 ${timesheets.length} pointage(s) trouvé(s) pour la période`);

      // 3. Calculer les statistiques hebdomadaires avec comparatif
      const stats = this.calculateWeeklyStatsDetailed(schedules, timesheets, startDate, endDate);
      
      // 4. Créer le fichier Excel avec comparatif
      const workbook = await this.createWeeklyExcelDetailed(stats, startDate, endDate);
      
      // 5. Envoyer par email
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `rapport_hebdomadaire_detaille_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.xlsx`;
      
      const transporter = createTransporter();
      
      const result = await transporter.sendMail({
        from: `"Système de Gestion Véhicules" <${process.env.EMAIL_USER}>`,
        to: adminEmails,
        subject: `📊 Rapport Hebdomadaire Détaillé - Semaine du ${startDate.toLocaleDateString('fr-FR')}`,
        html: this.createWeeklyEmailTemplateDetailed(stats, startDate, endDate),
        attachments: [{
          filename,
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }]
      });

      console.log(`✅ Rapport hebdomadaire détaillé envoyé avec succès à ${adminEmails.length} admin(s)`);
      return stats;
    } catch (error) {
      console.error('❌ Erreur génération rapport hebdomadaire détaillé:', error);
      throw error;
    }
  }

  /**
   * Calculer les statistiques hebdomadaires détaillées avec comparatif - VERSION CORRIGÉE
   */
  calculateWeeklyStatsDetailed(schedules, timesheets, startDate, endDate) {
    console.log('🔍 Calcul des statistiques détaillées...');
    
    const dailyStats = {};
    const employeeStats = {};
    const detailedData = [];

    // Créer un map des timesheets pour faciliter la recherche
    const timesheetMap = new Map();
    timesheets.forEach(ts => {
      const key = `${ts.user._id}_${ts.agency._id}_${ts.date.toISOString().split('T')[0]}`;
      timesheetMap.set(key, ts);
    });

    // Traiter chaque planning pour créer les données détaillées
    schedules.forEach(schedule => {
      const dateKey = schedule.date.toISOString().split('T')[0];
      const mapKey = `${schedule.user._id}_${schedule.agency._id}_${dateKey}`;
      const timesheet = timesheetMap.get(mapKey);
      
      // Créer une ligne détaillée pour chaque planning
      const detailRow = {
        date: schedule.date.toLocaleDateString('fr-FR'),
        dateIso: dateKey,
        employeId: schedule.user._id,
        prenom: schedule.user.firstName,
        nom: schedule.user.lastName,
        email: schedule.user.email,
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
        
        // Écarts et calculs
        retardMinutes: timesheet?.delays?.startDelay || 0,
        retardStatut: this.getDelayStatus(timesheet?.delays?.startDelay || 0),
        dureeTravilleeMinutes: timesheet?.totalWorkedMinutes || 0,
        dureeTravilleeFormatee: this.formatDuration(timesheet?.totalWorkedMinutes || 0),
        dureePauseMinutes: timesheet?.totalBreakMinutes || 0,
        dureePauseFormatee: this.formatDuration(timesheet?.totalBreakMinutes || 0),
        
        // Écarts par rapport au planning
        ecartDebut: this.calculateTimeGap(schedule.startTime, timesheet?.startTime, schedule.date),
        ecartFin: this.calculateTimeGap(schedule.endTime, timesheet?.endTime, schedule.date),
        ecartDuree: (timesheet?.totalWorkedMinutes || 0) - (schedule.workingDuration || 0),
        
        // Statuts
        present: timesheet ? 'OUI' : 'NON',
        ponctuel: (timesheet?.delays?.startDelay || 0) <= 5 ? 'OUI' : 'NON',
        problemes: this.getIssues(timesheet, schedule)
      };
      
      detailedData.push(detailRow);

      // Stats par jour
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          dateFormatted: schedule.date.toLocaleDateString('fr-FR'),
          totalScheduled: 0,
          totalPresent: 0,
          totalLate: 0,
          totalOnTime: 0,
          punctualityRate: 0,
          avgDelay: 0,
          totalDelays: 0
        };
      }
      
      const dayStats = dailyStats[dateKey];
      dayStats.totalScheduled++;
      
      if (timesheet) {
        dayStats.totalPresent++;
        const delay = timesheet.delays?.startDelay || 0;
        dayStats.totalDelays += delay;
        
        if (delay <= 5) {
          dayStats.totalOnTime++;
        } else {
          dayStats.totalLate++;
        }
      }

      // Stats par employé
      const employeeId = schedule.user._id.toString();
      if (!employeeStats[employeeId]) {
        employeeStats[employeeId] = {
          employee: schedule.user,
          totalScheduled: 0,
          totalPresent: 0,
          totalLate: 0,
          totalOnTime: 0,
          totalHours: 0,
          totalDelays: 0,
          avgDelay: 0,
          punctualityRate: 0,
          presenceRate: 0,
          agencies: new Set()
        };
      }
      
      const empStats = employeeStats[employeeId];
      empStats.totalScheduled++;
      empStats.agencies.add(schedule.agency.name);
      
      if (timesheet) {
        empStats.totalPresent++;
        empStats.totalHours += (timesheet.totalWorkedMinutes || 0) / 60;
        const delay = timesheet.delays?.startDelay || 0;
        empStats.totalDelays += delay;
        
        if (delay <= 5) {
          empStats.totalOnTime++;
        } else {
          empStats.totalLate++;
        }
      }
    });

    // Calculer les moyennes finales
    Object.values(dailyStats).forEach(day => {
      day.punctualityRate = day.totalScheduled > 0 ? 
        Math.round((day.totalOnTime / day.totalScheduled) * 100) : 0;
      day.avgDelay = day.totalPresent > 0 ? 
        Math.round(day.totalDelays / day.totalPresent) : 0;
    });

    Object.values(employeeStats).forEach(emp => {
      emp.punctualityRate = emp.totalScheduled > 0 ? 
        Math.round((emp.totalOnTime / emp.totalScheduled) * 100) : 0;
      emp.presenceRate = emp.totalScheduled > 0 ? 
        Math.round((emp.totalPresent / emp.totalScheduled) * 100) : 0;
      emp.avgDelay = emp.totalPresent > 0 ? 
        Math.round(emp.totalDelays / emp.totalPresent) : 0;
      emp.agencies = Array.from(emp.agencies);
    });

    // ===== CORRECTION: Bien définir toutes les propriétés globalStats =====
    const globalStats = {
      totalScheduled: schedules.length,
      totalPresent: timesheets.length,
      totalAbsent: schedules.length - timesheets.length,
      totalLate: timesheets.filter(ts => (ts.delays?.startDelay || 0) > 5).length,
      globalPunctualityRate: schedules.length > 0 ? 
        Math.round((timesheets.filter(ts => (ts.delays?.startDelay || 0) <= 5).length / schedules.length) * 100) : 0,
      globalPresenceRate: schedules.length > 0 ? 
        Math.round((timesheets.length / schedules.length) * 100) : 0,
      // ===== CORRECTION: Ajouter totalDays =====
      totalDays: Object.keys(dailyStats).length,
      totalEmployees: Object.keys(employeeStats).length,
      avgPunctualityRate: Object.keys(dailyStats).length > 0 ?
        Math.round(Object.values(dailyStats).reduce((sum, day) => sum + day.punctualityRate, 0) / Object.keys(dailyStats).length) : 0,
      totalHoursWorked: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalHours, 0)
    };

    console.log(`📈 Statistiques calculées:`);
    console.log(`   - Plannings: ${globalStats.totalScheduled}`);
    console.log(`   - Présents: ${globalStats.totalPresent}`);
    console.log(`   - Jours uniques: ${globalStats.totalDays}`); // NOUVEAU LOG
    console.log(`   - Employés uniques: ${globalStats.totalEmployees}`); // NOUVEAU LOG
    console.log(`   - Ponctualité globale: ${globalStats.globalPunctualityRate}%`);

    return {
      period: {
        start: startDate.toLocaleDateString('fr-FR'),
        end: endDate.toLocaleDateString('fr-FR')
      },
      globalStats, // Maintenant toutes les propriétés sont définies
      dailyStats: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
      employeeStats: Object.values(employeeStats).sort((a, b) => b.punctualityRate - a.punctualityRate),
      detailedData: detailedData.sort((a, b) => {
        if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
        return `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`);
      })
    };
  }

  /**
   * Calculer l'écart entre heure prévue et réelle
   */
  calculateTimeGap(scheduledTime, actualTime, scheduleDate) {
    if (!scheduledTime || !actualTime) return 'N/A';
    
    try {
      const [schedHours, schedMinutes] = scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(scheduleDate);
      scheduledDateTime.setHours(schedHours, schedMinutes, 0, 0);
      
      const actualDateTime = new Date(actualTime);
      const diffMinutes = Math.round((actualDateTime - scheduledDateTime) / (1000 * 60));
      
      if (diffMinutes === 0) return '0 min';
      if (diffMinutes > 0) return `+${diffMinutes} min`;
      return `${diffMinutes} min`;
    } catch (error) {
      return 'Erreur';
    }
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
      issues.push('Absence');
      return issues.join(', ');
    }
    
    if (!timesheet.startTime) issues.push('Pas de pointage début');
    if (!timesheet.endTime) issues.push('Pas de pointage fin');
    if ((timesheet.delays?.startDelay || 0) > 15) issues.push('Retard significatif');
    if ((timesheet.totalBreakMinutes || 0) > 90) issues.push('Pause longue');
    
    return issues.length > 0 ? issues.join(', ') : 'Aucun';
  }

  /**
   * Créer le fichier Excel hebdomadaire détaillé avec comparatif et couleurs
   */
  async createWeeklyExcelDetailed(stats, startDate, endDate) {
    console.log('📊 Création du fichier Excel hebdomadaire détaillé...');
    
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // === FEUILLE 1: RÉSUMÉ GLOBAL ===
    const summarySheet = workbook.addWorksheet('Résumé Global');
    
    // En-tête
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `📊 RAPPORT HEBDOMADAIRE DÉTAILLÉ - ${stats.period.start} au ${stats.period.end}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Statistiques générales
    const summaryData = [
      ['📅 Période', `${stats.period.start} - ${stats.period.end}`],
      ['👥 Total plannings', stats.globalStats.totalScheduled],
      ['✅ Total présents', stats.globalStats.totalPresent],
      ['❌ Total absents', stats.globalStats.totalAbsent],
      ['⏰ Total retards', stats.globalStats.totalLate],
      ['📈 Taux présence global', `${stats.globalStats.globalPresenceRate}%`],
      ['⏱️ Taux ponctualité global', `${stats.globalStats.globalPunctualityRate}%`],
      ['🕒 Généré le', new Date().toLocaleString('fr-FR')]
    ];

    summaryData.forEach((row, index) => {
      const rowNum = index + 3;
      summarySheet.getCell(`A${rowNum}`).value = row[0];
      summarySheet.getCell(`B${rowNum}`).value = row[1];
      summarySheet.getCell(`A${rowNum}`).font = { bold: true };
      summarySheet.getCell(`A${rowNum}`).fill = { 
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } 
      };
    });

    summarySheet.getColumn('A').width = 25;
    summarySheet.getColumn('B').width = 20;

    // === FEUILLE 2: COMPARATIF DÉTAILLÉ QUOTIDIEN ===
    const detailSheet = workbook.addWorksheet('Comparatif Détaillé');

    // En-têtes avec comparatif prévu/réel
    const detailHeaders = [
      'Date', 'Prénom', 'Nom', 'Agence',
      '🕐 Début Prévu', '🕐 Début Réel', '📊 Écart Début',
      '🕕 Fin Prévue', '🕕 Fin Réelle', '📊 Écart Fin',
      '☕ Pause Début P.', '☕ Pause Début R.',
      '☕ Pause Fin P.', '☕ Pause Fin R.',
      '⏱️ Durée Prévue', '⏱️ Durée Réelle', '📊 Écart Durée',
      '⏰ Retard (min)', '✅ Présent', '🎯 Ponctuel', '⚠️ Problèmes'
    ];

    const detailHeaderRow = detailSheet.getRow(1);
    detailHeaders.forEach((header, index) => {
      const cell = detailHeaderRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    detailHeaderRow.height = 50;

    // Données détaillées avec couleurs
    stats.detailedData.forEach((row, index) => {
      const excelRow = detailSheet.getRow(index + 2);
      
      const rowData = [
        row.date,
        row.prenom,
        row.nom,
        row.agenceNom,
        row.heureDebutPrevue,
        row.heureDebutReelle,
        row.ecartDebut,
        row.heureFinPrevue,
        row.heureFinReelle,
        row.ecartFin,
        row.pauseDebutPrevue,
        row.pauseDebutReelle,
        row.pauseFinPrevue,
        row.pauseFinReelle,
        this.formatDuration(row.dureePreviewMinutes),
        row.dureeTravilleeFormatee,
        row.ecartDuree > 0 ? `+${row.ecartDuree} min` : row.ecartDuree < 0 ? `${row.ecartDuree} min` : '0 min',
        row.retardMinutes,
        row.present,
        row.ponctuel,
        row.problemes
      ];

      rowData.forEach((value, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };

        // === COULEURS CONDITIONNELLES ===
        
        // Colonnes d'écart (6, 9, 16)
        if ([6, 9, 16].includes(colIndex)) {
          if (typeof value === 'string' && value.includes('+')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6' } }; // Rouge pour retard
          } else if (typeof value === 'string' && value.includes('-')) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F3FF' } }; // Bleu pour avance
          } else if (value === '0 min' || value === 'N/A') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F7E6' } }; // Vert pour exact
          }
        }

        // Retard (colonne 17)
        if (colIndex === 17) {
          if (value > 15) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4444' } }; // Rouge foncé
            cell.font = { color: { argb: 'FFFFFF' }, bold: true };
          } else if (value > 5) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA500' } }; // Orange
          } else if (value === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '90EE90' } }; // Vert clair
          }
        }

        // Présent (colonne 18)
        if (colIndex === 18) {
          if (value === 'NON') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6' } };
            cell.font = { color: { argb: 'CC0000' }, bold: true };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F7E6' } };
            cell.font = { color: { argb: '006600' }, bold: true };
          }
        }

        // Ponctuel (colonne 19)
        if (colIndex === 19) {
          if (value === 'NON') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
            cell.font = { color: { argb: 'B8860B' }, bold: true };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E6F7E6' } };
            cell.font = { color: { argb: '006600' }, bold: true };
          }
        }

        // Problèmes (colonne 20)
        if (colIndex === 20 && value !== 'Aucun') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6' } };
          cell.font = { color: { argb: 'CC0000' } };
        }
      });

      // Alternance de couleurs de fond
      if (index % 2 === 0) {
        excelRow.eachCell(cell => {
          if (!cell.fill || !cell.fill.fgColor || cell.fill.fgColor.argb === 'F8F9FA') {
            const currentFill = cell.fill;
            if (!currentFill || currentFill.fgColor.argb === '00000000') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
            }
          }
        });
      }
    });

    // === FEUILLE 3: STATISTIQUES PAR JOUR ===
    const dailySheet = workbook.addWorksheet('Statistiques par Jour');
    
    const dailyHeaders = ['📅 Date', '👥 Prévus', '✅ Présents', '❌ Absents', '⏰ Retards', '📈 Présence %', '⏱️ Ponctualité %', '📊 Retard Moyen'];
    
    dailyHeaders.forEach((header, index) => {
      const cell = dailySheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    stats.dailyStats.forEach((day, index) => {
      const row = index + 2;
      const presenceRate = day.totalScheduled > 0 ? Math.round((day.totalPresent / day.totalScheduled) * 100) : 0;
      
      dailySheet.getCell(row, 1).value = day.dateFormatted;
      dailySheet.getCell(row, 2).value = day.totalScheduled;
      dailySheet.getCell(row, 3).value = day.totalPresent;
      dailySheet.getCell(row, 4).value = day.totalScheduled - day.totalPresent;
      dailySheet.getCell(row, 5).value = day.totalLate;
      dailySheet.getCell(row, 6).value = `${presenceRate}%`;
      dailySheet.getCell(row, 7).value = `${day.punctualityRate}%`;
      dailySheet.getCell(row, 8).value = `${day.avgDelay} min`;

      // Couleurs conditionnelles pour les taux
      const presenceCell = dailySheet.getCell(row, 6);
      const punctualityCell = dailySheet.getCell(row, 7);
      
      if (presenceRate >= 95) {
        presenceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
      } else if (presenceRate < 80) {
        presenceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
      }
      
      if (day.punctualityRate >= 90) {
        punctualityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
      } else if (day.punctualityRate < 75) {
        punctualityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
      }
    });

    // === FEUILLE 4: PERFORMANCE EMPLOYÉS ===
    const employeeSheet = workbook.addWorksheet('Performance Employés');
    
    const empHeaders = ['👤 Prénom', '👤 Nom', '📅 Jours Prévus', '✅ Jours Présents', '📈 Présence %', '⏱️ Ponctualité %', '📊 Retard Moyen', '🏢 Agences'];
    
    empHeaders.forEach((header, index) => {
      const cell = employeeSheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    stats.employeeStats.forEach((emp, index) => {
      const row = index + 2;
      
      employeeSheet.getCell(row, 1).value = emp.employee.firstName;
      employeeSheet.getCell(row, 2).value = emp.employee.lastName;
      employeeSheet.getCell(row, 3).value = emp.totalScheduled;
      employeeSheet.getCell(row, 4).value = emp.totalPresent;
      employeeSheet.getCell(row, 5).value = `${emp.presenceRate}%`;
      employeeSheet.getCell(row, 6).value = `${emp.punctualityRate}%`;
      employeeSheet.getCell(row, 7).value = `${emp.avgDelay} min`;
      employeeSheet.getCell(row, 8).value = emp.agencies.join(', ');
      
      // Couleurs conditionnelles
      const presenceCell = employeeSheet.getCell(row, 5);
      const punctualityCell = employeeSheet.getCell(row, 6);
      
      if (emp.presenceRate >= 95) {
        presenceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
      } else if (emp.presenceRate < 80) {
        presenceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
      }
      
      if (emp.punctualityRate >= 95) {
        punctualityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
      } else if (emp.punctualityRate < 80) {
        punctualityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
      }
    });

    // Ajuster les largeurs de colonnes pour tous les onglets
    [summarySheet, detailSheet, dailySheet, employeeSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 30);
      });
    });

    console.log('✅ Fichier Excel hebdomadaire détaillé créé avec succès');
    return workbook;
  }

  /**
   * Template email hebdomadaire détaillé - VERSION CORRIGÉE
   */
  createWeeklyEmailTemplateDetailed(stats, startDate, endDate) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Rapport Hebdomadaire Détaillé</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Semaine du ${stats.period.start} au ${stats.period.end}</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px;">
          <h2 style="margin: 0 0 20px 0; color: #333;">📈 Résumé global de la semaine</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">${stats.globalStats.totalScheduled}</div>
              <div style="font-size: 14px; color: #666;">Plannings prévus</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: ${stats.globalStats.globalPresenceRate >= 90 ? '#28a745' : stats.globalStats.globalPresenceRate >= 75 ? '#ffc107' : '#dc3545'};">
                ${stats.globalStats.globalPresenceRate}%
              </div>
              <div style="font-size: 14px; color: #666;">Taux de présence</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: ${stats.globalStats.globalPunctualityRate >= 90 ? '#28a745' : stats.globalStats.globalPunctualityRate >= 75 ? '#ffc107' : '#dc3545'};">
                ${stats.globalStats.globalPunctualityRate}%
              </div>
              <div style="font-size: 14px; color: #666;">Taux de ponctualité</div>
            </div>
          </div>

          <div style="background: white; padding: 15px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>✅ Employés présents:</span>
              <span style="font-weight: bold; color: #28a745;">${stats.globalStats.totalPresent}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>❌ Employés absents:</span>
              <span style="font-weight: bold; color: #dc3545;">${stats.globalStats.totalAbsent}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>⏰ Employés en retard:</span>
              <span style="font-weight: bold; color: #ffc107;">${stats.globalStats.totalLate}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>📅 Jours travaillés:</span>
              <span style="font-weight: bold; color: #667eea;">${stats.globalStats.totalDays}</span>
            </div>
          </div>
        </div>

        <div style="background: #e3f2fd; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #1976d2;">🎯 Nouvelles fonctionnalités du rapport</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333;">
            <li><strong>Comparatif détaillé</strong> : Horaires prévus vs réels avec écarts calculés</li>
            <li><strong>Couleurs conditionnelles</strong> : Identification visuelle rapide des problèmes</li>
            <li><strong>4 onglets spécialisés</strong> : Résumé, comparatif, stats par jour, performance employés</li>
            <li><strong>Heures de pause</strong> : Suivi complet des pauses prévues et réelles</li>
            <li><strong>Écarts temporels</strong> : Calcul automatique des retards/avances</li>
          </ul>
        </div>

        <div style="background: white; padding: 25px; border: 2px dashed #667eea; margin: 20px 0; text-align: center; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #667eea;">📎 Rapport détaillé en pièce jointe</h3>
          <p style="margin: 0; color: #666;">
            Le fichier Excel contient un comparatif complet entre les horaires prévus et réels, 
            avec des couleurs pour identifier rapidement les écarts et problèmes.
          </p>
        </div>

        ${stats.globalStats.globalPunctualityRate < 80 || stats.globalStats.totalAbsent > 5 ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #856404;">⚠️ Points d'attention</h3>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            ${stats.globalStats.globalPunctualityRate < 80 ? `<li>Taux de ponctualité faible (${stats.globalStats.globalPunctualityRate}%) - Actions correctives recommandées</li>` : ''}
            ${stats.globalStats.totalAbsent > 5 ? `<li>${stats.globalStats.totalAbsent} absences cette semaine - Vérifier les justifications</li>` : ''}
            ${stats.globalStats.totalLate > 10 ? `<li>${stats.globalStats.totalLate} retards cette semaine - Analyser les causes récurrentes</li>` : ''}
          </ul>
        </div>
        ` : ''}

        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #155724;">📊 Statistiques de la semaine</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            <div>👥 Employés uniques: <strong>${stats.globalStats.totalEmployees}</strong></div>
            <div>📅 Jours avec activité: <strong>${stats.globalStats.totalDays}</strong></div>
            <div>⏰ Heures travaillées: <strong>${Math.round(stats.globalStats.totalHoursWorked)}h</strong></div>
            <div>📈 Ponctualité moyenne: <strong>${stats.globalStats.avgPunctualityRate}%</strong></div>
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            Rapport hebdomadaire détaillé généré automatiquement<br>
            📧 ${new Date().toLocaleString('fr-FR')}
          </p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * Calculer les statistiques hebdomadaires
   */
  calculateWeeklyStats(timesheets, startDate, endDate) {
    const dailyStats = {};
    const employeeStats = {};

    // Organiser par jour et par employé
    timesheets.forEach(ts => {
      const day = ts.date.toISOString().split('T')[0];
      const employeeId = ts.user._id.toString();

      // Stats par jour
      if (!dailyStats[day]) {
        dailyStats[day] = {
          date: day,
          total: 0,
          present: 0,
          late: 0,
          punctualityRate: 0
        };
      }
      dailyStats[day].total++;
      if (ts.startTime) dailyStats[day].present++;
      if ((ts.delays?.startDelay || 0) > 5) dailyStats[day].late++;

      // Stats par employé
      if (!employeeStats[employeeId]) {
        employeeStats[employeeId] = {
          employee: ts.user,
          daysWorked: 0,
          totalHours: 0,
          totalDelays: 0,
          avgDelay: 0,
          punctualDays: 0,
          agencies: new Set()
        };
      }
      
      const empStat = employeeStats[employeeId];
      empStat.daysWorked++;
      empStat.totalHours += (ts.totalWorkedMinutes || 0) / 60;
      empStat.totalDelays += (ts.delays?.startDelay || 0);
      if ((ts.delays?.startDelay || 0) <= 5) empStat.punctualDays++;
      empStat.agencies.add(ts.agency.name);
    });

    // Calculer les moyennes
    Object.values(employeeStats).forEach(emp => {
      emp.avgDelay = emp.daysWorked > 0 ? emp.totalDelays / emp.daysWorked : 0;
      emp.avgHours = emp.daysWorked > 0 ? emp.totalHours / emp.daysWorked : 0;
      emp.punctualityRate = emp.daysWorked > 0 ? (emp.punctualDays / emp.daysWorked) * 100 : 0;
      emp.agencies = Array.from(emp.agencies);
    });

    // Calculer les taux de ponctualité par jour
    Object.values(dailyStats).forEach(day => {
      day.punctualityRate = day.total > 0 ? ((day.total - day.late) / day.total) * 100 : 0;
    });

    return {
      period: {
        start: startDate.toLocaleDateString('fr-FR'),
        end: endDate.toLocaleDateString('fr-FR')
      },
      summary: {
        totalDays: Object.keys(dailyStats).length,
        totalTimesheets: timesheets.length,
        uniqueEmployees: Object.keys(employeeStats).length,
        avgPunctualityRate: Object.values(dailyStats).reduce((sum, day) => sum + day.punctualityRate, 0) / Object.keys(dailyStats).length || 0,
        totalHoursWorked: Object.values(employeeStats).reduce((sum, emp) => sum + emp.totalHours, 0)
      },
      dailyStats: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
      employeeStats: Object.values(employeeStats).sort((a, b) => b.punctualityRate - a.punctualityRate)
    };
  }

  /**
   * Créer le fichier Excel hebdomadaire avec heures de pause
   */
  async createWeeklyExcel(stats, startDate, endDate) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Feuille résumé
    const summarySheet = workbook.addWorksheet('Résumé Hebdomadaire');
    
    // En-tête
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `📊 RAPPORT HEBDOMADAIRE - ${stats.period.start} au ${stats.period.end}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E75B6' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Statistiques générales
    const summaryData = [
      ['Période', `${stats.period.start} - ${stats.period.end}`],
      ['Jours travaillés', stats.summary.totalDays],
      ['Total pointages', stats.summary.totalTimesheets],
      ['Employés uniques', stats.summary.uniqueEmployees],
      ['Taux ponctualité moyen', `${Math.round(stats.summary.avgPunctualityRate)}%`],
      ['Total heures travaillées', `${Math.round(stats.summary.totalHoursWorked)}h`]
    ];

    summaryData.forEach((row, index) => {
      const rowNum = index + 3;
      summarySheet.getCell(`A${rowNum}`).value = row[0];
      summarySheet.getCell(`B${rowNum}`).value = row[1];
      summarySheet.getCell(`A${rowNum}`).font = { bold: true };
    });

    // Feuille détails par jour
    const dailySheet = workbook.addWorksheet('Détails par Jour');
    const dailyHeaders = ['Date', 'Total Prévu', 'Présents', 'Retards', 'Taux Ponctualité'];
    
    dailyHeaders.forEach((header, index) => {
      const cell = dailySheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    });

    stats.dailyStats.forEach((day, index) => {
      const row = index + 2;
      dailySheet.getCell(row, 1).value = day.date;
      dailySheet.getCell(row, 2).value = day.total;
      dailySheet.getCell(row, 3).value = day.present;
      dailySheet.getCell(row, 4).value = day.late;
      dailySheet.getCell(row, 5).value = `${Math.round(day.punctualityRate)}%`;
    });

    // Feuille performance employés
    const employeeSheet = workbook.addWorksheet('Performance Employés');
    const empHeaders = ['Prénom', 'Nom', 'Jours Travaillés', 'Heures Totales', 'Retard Moyen', 'Taux Ponctualité', 'Agences'];
    
    empHeaders.forEach((header, index) => {
      const cell = employeeSheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    });

    stats.employeeStats.forEach((emp, index) => {
      const row = index + 2;
      employeeSheet.getCell(row, 1).value = emp.employee.firstName;
      employeeSheet.getCell(row, 2).value = emp.employee.lastName;
      employeeSheet.getCell(row, 3).value = emp.daysWorked;
      employeeSheet.getCell(row, 4).value = `${Math.round(emp.totalHours)}h`;
      employeeSheet.getCell(row, 5).value = `${Math.round(emp.avgDelay)} min`;
      employeeSheet.getCell(row, 6).value = `${Math.round(emp.punctualityRate)}%`;
      employeeSheet.getCell(row, 7).value = emp.agencies.join(', ');
      
      // Coloration conditionnelle pour la ponctualité
      const punctualityCell = employeeSheet.getCell(row, 6);
      if (emp.punctualityRate >= 95) {
        punctualityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
      } else if (emp.punctualityRate < 80) {
        punctualityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7CE' } };
      }
    });

    // Ajuster les largeurs
    [summarySheet, dailySheet, employeeSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 30);
      });
    });

    return workbook;
  }

  /**
   * Template email hebdomadaire
   */
  createWeeklyEmailTemplate(stats, startDate, endDate) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Rapport Hebdomadaire</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Semaine du ${stats.period.start} au ${stats.period.end}</p>
        </div>

        <div style="background: #f8f9fa; padding: 25px;">
          <h2 style="margin: 0 0 20px 0; color: #333;">📈 Résumé de la semaine</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">${stats.summary.totalTimesheets}</div>
              <div style="font-size: 14px; color: #666;">Total pointages</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: ${stats.summary.avgPunctualityRate >= 90 ? '#28a745' : stats.summary.avgPunctualityRate >= 75 ? '#ffc107' : '#dc3545'};">
                ${Math.round(stats.summary.avgPunctualityRate)}%
              </div>
              <div style="font-size: 14px; color: #666;">Ponctualité moyenne</div>
            </div>
          </div>

          <div style="background: white; padding: 15px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>👥 Employés actifs:</span>
              <span style="font-weight: bold;">${stats.summary.uniqueEmployees}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>📅 Jours travaillés:</span>
              <span style="font-weight: bold;">${stats.summary.totalDays}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>⏰ Total heures:</span>
              <span style="font-weight: bold;">${Math.round(stats.summary.totalHoursWorked)}h</span>
            </div>
          </div>
        </div>

        <div style="background: white; padding: 25px; border: 2px dashed #667eea; margin: 20px 0; text-align: center; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #667eea;">📎 Rapport détaillé en pièce jointe</h3>
          <p style="margin: 0; color: #666;">
            Le fichier Excel contient les détails jour par jour et la performance individuelle de chaque employé.
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            Rapport hebdomadaire généré automatiquement<br>
            📧 ${new Date().toLocaleString('fr-FR')}
          </p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * Envoyer une alerte d'erreur aux admins
   */
  async sendErrorAlert(taskName, errorMessage) {
    try {
      const { createTransporter, getAdminEmails } = require('../services/emailService');
      const transporter = createTransporter();
      const adminEmails = await getAdminEmails();

      if (adminEmails.length === 0) return;

      await transporter.sendMail({
        from: `"Système Véhicules - Alerte" <${process.env.EMAIL_USER}>`,
        to: adminEmails,
        subject: `🚨 Erreur ${taskName} - Action requise`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px;">
              <h2 style="color: #721c24; margin: 0;">🚨 Erreur Système</h2>
              <p><strong>Tâche:</strong> ${taskName}</p>
              <p><strong>Erreur:</strong> ${errorMessage}</p>
              <p><strong>Heure:</strong> ${new Date().toLocaleString('fr-FR')}</p>
              <p style="margin-top: 20px; color: #856404;">
                Veuillez vérifier la configuration du système et contacter l'équipe technique si nécessaire.
              </p>
            </div>
          </div>
        `
      });

      console.log('📧 Alerte d\'erreur envoyée aux administrateurs');
    } catch (alertError) {
      console.error('❌ Impossible d\'envoyer l\'alerte d\'erreur:', alertError);
    }
  }

  /**
   * Démarrer toutes les tâches planifiées
   */
  start() {
    if (!this.isInitialized) {
      console.warn('⚠️  Planificateur non initialisé');
      return false;
    }

    let started = 0;
    this.jobs.forEach((job, name) => {
      try {
        job.start();
        console.log(`✅ Tâche "${name}" démarrée`);
        started++;
      } catch (error) {
        console.error(`❌ Erreur démarrage tâche "${name}":`, error);
      }
    });

    console.log(`🚀 ${started}/${this.jobs.size} tâche(s) planifiée(s) démarrée(s)`);
    return started > 0;
  }

  /**
   * Arrêter toutes les tâches
   */
  stop() {
    let stopped = 0;
    this.jobs.forEach((job, name) => {
      try {
        job.stop();
        console.log(`⏹️  Tâche "${name}" arrêtée`);
        stopped++;
      } catch (error) {
        console.error(`❌ Erreur arrêt tâche "${name}":`, error);
      }
    });

    console.log(`⏹️  ${stopped}/${this.jobs.size} tâche(s) arrêtée(s)`);
    return stopped;
  }

  /**
   * Obtenir le statut des tâches
   */
  getStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false,
        options: job.options || {}
      };
    });
    return status;
  }

  /**
   * Exécuter manuellement une tâche (pour tests)
   */
  async runManually(taskName) {
    console.log(`🔧 Exécution manuelle de la tâche: ${taskName}`);
    
    try {
      switch (taskName) {
        case 'dailyReport':
          return await dailyReportService.generateAndSendDailyReport();
        
        case 'weeklyReport':
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 7);
          return await this.generateWeeklyReport(startDate, endDate);
        
        case 'test':
          return await dailyReportService.testReport();
        
        default:
          throw new Error(`Tâche inconnue: ${taskName}`);
      }
    } catch (error) {
      console.error(`❌ Erreur exécution manuelle "${taskName}":`, error);
      throw error;
    }
  }
}

module.exports = new DailyReportScheduler();