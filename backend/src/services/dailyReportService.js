// ===== SERVICE DE RAPPORT AMÉLIORÉ AVEC VÉHICULES ET PRÉPARATIONS =====
// backend/src/services/dailyReportService.js - VERSION AMÉLIORÉE

const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const Agency = require('../models/Agency');
const Schedule = require('../models/Schedule');
const Preparation = require('../models/Preparation'); // ✅ AJOUT
const Vehicle = require('../models/Vehicle'); // ✅ AJOUT
const { createTransporter, getAdminEmails, getAdminDetails } = require('./emailService');

/**
 * Service principal pour générer et envoyer le rapport quotidien avec véhicules
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
   * ✅ NOUVEAU : Récupérer les préparations du jour par agence
   */
  async getDailyPreparations(date = new Date()) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      // Récupérer toutes les préparations du jour avec relations complètes
      const preparations = await Preparation.find({
        startTime: { $gte: dayStart, $lte: dayEnd }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate({
        path: 'vehicle',
        select: 'licensePlate brand model'
      })
      .lean();

      console.log(`🚗 ${preparations.length} préparation(s) trouvée(s) pour le ${date.toLocaleDateString('fr-FR')}`);

      // Grouper par agence
      const preparationsByAgency = {};
      
      preparations.forEach(prep => {
        // Gestion du véhicule (ObjectId ou objet intégré)
        let vehicleInfo = {};
        if (prep.vehicle) {
          if (typeof prep.vehicle === 'object' && prep.vehicle.licensePlate) {
            // Véhicule populé
            vehicleInfo = {
              licensePlate: prep.vehicle.licensePlate,
              brand: prep.vehicle.brand,
              model: prep.vehicle.model
            };
          } else if (prep.vehicleInfo) {
            // Utiliser vehicleInfo si vehicle est un ObjectId
            vehicleInfo = {
              licensePlate: prep.vehicleInfo.licensePlate,
              brand: prep.vehicleInfo.brand,
              model: prep.vehicleInfo.model
            };
          }
        }

        const agencyKey = prep.agency ? prep.agency._id.toString() : 'unknown';
        const agencyName = prep.agency ? prep.agency.name : 'Agence inconnue';
        
        if (!preparationsByAgency[agencyKey]) {
          preparationsByAgency[agencyKey] = {
            agencyInfo: prep.agency || { name: 'Agence inconnue', code: 'N/A', client: 'N/A' },
            preparations: [],
            totalPreparations: 0,
            completedPreparations: 0,
            inProgressPreparations: 0
          };
        }

        const prepData = {
          id: prep._id,
          vehicle: vehicleInfo,
          user: prep.user ? {
            firstName: prep.user.firstName,
            lastName: prep.user.lastName,
            email: prep.user.email
          } : null,
          startTime: prep.startTime,
          endTime: prep.endTime,
          status: prep.status,
          duration: prep.endTime && prep.startTime ? 
            Math.round((new Date(prep.endTime) - new Date(prep.startTime)) / (1000 * 60)) : null,
          stepsCompleted: prep.steps ? prep.steps.filter(s => s.completed).length : 0,
          totalSteps: prep.steps ? prep.steps.length : 0
        };

        preparationsByAgency[agencyKey].preparations.push(prepData);
        preparationsByAgency[agencyKey].totalPreparations++;
        
        if (prep.status === 'completed') {
          preparationsByAgency[agencyKey].completedPreparations++;
        } else if (prep.status === 'in_progress') {
          preparationsByAgency[agencyKey].inProgressPreparations++;
        }
      });

      return preparationsByAgency;
    } catch (error) {
      console.error('❌ Erreur récupération préparations quotidiennes:', error);
      return {};
    }
  }

  /**
   * ✅ NOUVEAU : Récupérer les préparations hebdomadaires par agence et employé
   */
  async getWeeklyPreparations(startDate, endDate) {
    try {
      console.log(`🗓️ Récupération préparations semaine: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`);

      const preparations = await Preparation.find({
        startTime: { $gte: startDate, $lte: endDate }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .populate({
        path: 'vehicle',
        select: 'licensePlate brand model'
      })
      .lean();

      console.log(`🚗 ${preparations.length} préparation(s) trouvée(s) pour la semaine`);

      // Grouper par agence
      const preparationsByAgency = {};
      // Grouper par employé
      const preparationsByEmployee = {};

      preparations.forEach(prep => {
        // Gestion véhicule
        let vehicleInfo = {};
        if (prep.vehicle) {
          if (typeof prep.vehicle === 'object' && prep.vehicle.licensePlate) {
            vehicleInfo = {
              licensePlate: prep.vehicle.licensePlate,
              brand: prep.vehicle.brand,
              model: prep.vehicle.model
            };
          } else if (prep.vehicleInfo) {
            vehicleInfo = {
              licensePlate: prep.vehicleInfo.licensePlate,
              brand: prep.vehicleInfo.brand,
              model: prep.vehicleInfo.model
            };
          }
        }

        const prepData = {
          id: prep._id,
          date: prep.startTime.toLocaleDateString('fr-FR'),
          vehicle: vehicleInfo,
          agency: prep.agency ? {
            name: prep.agency.name,
            code: prep.agency.code,
            client: prep.agency.client
          } : null,
          user: prep.user ? {
            firstName: prep.user.firstName,
            lastName: prep.user.lastName,
            email: prep.user.email
          } : null,
          startTime: prep.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          endTime: prep.endTime ? prep.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'En cours',
          status: prep.status,
          duration: prep.endTime && prep.startTime ? 
            Math.round((new Date(prep.endTime) - new Date(prep.startTime)) / (1000 * 60)) : null,
          stepsCompleted: prep.steps ? prep.steps.filter(s => s.completed).length : 0,
          totalSteps: prep.steps ? prep.steps.length : 0
        };

        // Groupement par agence
        const agencyKey = prep.agency ? prep.agency._id.toString() : 'unknown';
        if (!preparationsByAgency[agencyKey]) {
          preparationsByAgency[agencyKey] = {
            agencyInfo: prep.agency || { name: 'Agence inconnue', code: 'N/A', client: 'N/A' },
            preparations: [],
            totalPreparations: 0,
            completedPreparations: 0,
            averageDuration: 0,
            totalDuration: 0
          };
        }
        preparationsByAgency[agencyKey].preparations.push(prepData);
        preparationsByAgency[agencyKey].totalPreparations++;
        
        if (prep.status === 'completed') {
          preparationsByAgency[agencyKey].completedPreparations++;
        }
        
        if (prepData.duration) {
          preparationsByAgency[agencyKey].totalDuration += prepData.duration;
        }

        // Groupement par employé (seulement ceux qui ont fait au moins une préparation)
        const userKey = prep.user ? prep.user._id.toString() : 'unknown';
        if (prep.user) {
          if (!preparationsByEmployee[userKey]) {
            preparationsByEmployee[userKey] = {
              userInfo: {
                firstName: prep.user.firstName,
                lastName: prep.user.lastName,
                email: prep.user.email
              },
              preparations: [],
              totalPreparations: 0,
              completedPreparations: 0,
              averageDuration: 0,
              totalDuration: 0,
              agenciesWorked: new Set()
            };
          }
          
          preparationsByEmployee[userKey].preparations.push(prepData);
          preparationsByEmployee[userKey].totalPreparations++;
          
          if (prep.status === 'completed') {
            preparationsByEmployee[userKey].completedPreparations++;
          }
          
          if (prepData.duration) {
            preparationsByEmployee[userKey].totalDuration += prepData.duration;
          }
          
          if (prep.agency) {
            preparationsByEmployee[userKey].agenciesWorked.add(prep.agency.name);
          }
        }
      });

      // Calculer les moyennes
      Object.values(preparationsByAgency).forEach(agency => {
        if (agency.completedPreparations > 0) {
          agency.averageDuration = Math.round(agency.totalDuration / agency.completedPreparations);
        }
      });

      Object.values(preparationsByEmployee).forEach(employee => {
        if (employee.completedPreparations > 0) {
          employee.averageDuration = Math.round(employee.totalDuration / employee.completedPreparations);
        }
        // Convertir Set en Array pour l'export
        employee.agenciesWorked = Array.from(employee.agenciesWorked);
      });

      return {
        byAgency: preparationsByAgency,
        byEmployee: preparationsByEmployee
      };
    } catch (error) {
      console.error('❌ Erreur récupération préparations hebdomadaires:', error);
      return { byAgency: {}, byEmployee: {} };
    }
  }

  /**
   * ✅ MODIFIÉ : Récupérer toutes les données du jour avec préparations
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
        date: { $gte: dayStart, $lte: dayEnd }
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

      // ✅ 4. NOUVEAU : Récupérer les préparations du jour
      const preparationsByAgency = await this.getDailyPreparations(date);

      // 5. Calculer les statistiques
      const stats = this.calculateDailyStats(schedules, timesheets, employees, preparationsByAgency);

      return {
        date: date.toLocaleDateString('fr-FR'),
        employees,
        schedules,
        timesheets,
        preparationsByAgency, // ✅ NOUVEAU
        stats
      };
    } catch (error) {
      console.error('❌ Erreur récupération données quotidiennes:', error);
      throw error;
    }
  }

  /**
   * ✅ MODIFIÉ : Calcul des statistiques quotidiennes avec préparations
   */
  calculateDailyStats(schedules, timesheets, employees, preparationsByAgency) {
    const stats = {
      totalEmployes: schedules.length,
      presentsCount: timesheets.filter(ts => ts.startTime).length,
      absentCount: 0,
      retardsCount: 0,
      ponctualiteRate: 0,
      presenceRate: 0,
      heuresMoyennes: 0,
      
      // ✅ NOUVEAU : Statistiques préparations
      totalPreparations: 0,
      preparationsCompleted: 0,
      preparationsInProgress: 0,
      preparationsByAgencyCount: Object.keys(preparationsByAgency).length,
      averagePreparationTime: 0
    };

    // Calculs existants...
    stats.absentCount = stats.totalEmployes - stats.presentsCount;
    stats.presenceRate = stats.totalEmployes > 0 ? 
      Math.round((stats.presentsCount / stats.totalEmployes) * 100) : 0;

    // Calcul retards et ponctualité
    let punctualCount = 0;
    schedules.forEach(schedule => {
      const timesheet = timesheets.find(ts => 
        ts.user._id.toString() === schedule.user._id.toString() &&
        ts.agency._id.toString() === schedule.agency._id.toString()
      );

      if (timesheet && timesheet.startTime && schedule.startTime) {
        const [schedHour, schedMin] = schedule.startTime.split(':').map(Number);
        const scheduledTime = new Date(schedule.date);
        scheduledTime.setHours(schedHour, schedMin, 0, 0);

        const actualTime = new Date(timesheet.startTime);
        const delayMinutes = Math.max(0, (actualTime - scheduledTime) / (1000 * 60));

        if (delayMinutes > 15) {
          stats.retardsCount++;
        } else {
          punctualCount++;
        }
      }
    });

    stats.ponctualiteRate = stats.presentsCount > 0 ? 
      Math.round((punctualCount / stats.presentsCount) * 100) : 0;

    // ✅ NOUVEAU : Calculs préparations
    Object.values(preparationsByAgency).forEach(agency => {
      stats.totalPreparations += agency.totalPreparations;
      stats.preparationsCompleted += agency.completedPreparations;
      stats.preparationsInProgress += agency.inProgressPreparations;
    });

    // Calcul temps moyen préparations
    const completedPreps = [];
    Object.values(preparationsByAgency).forEach(agency => {
      agency.preparations.forEach(prep => {
        if (prep.duration && prep.status === 'completed') {
          completedPreps.push(prep.duration);
        }
      });
    });

    if (completedPreps.length > 0) {
      stats.averagePreparationTime = Math.round(
        completedPreps.reduce((sum, duration) => sum + duration, 0) / completedPreps.length
      );
    }

    return stats;
  }

  /**
   * ✅ MODIFIÉ : Générer et envoyer le rapport quotidien avec véhicules
   */
  async generateAndSendDailyReport(date = new Date()) {
    try {
      console.log(`📊 Génération rapport quotidien avec véhicules pour: ${date.toLocaleDateString('fr-FR')}`);

      // 1. Récupérer les emails des admins
      const adminEmails = await getAdminEmails();
      if (adminEmails.length === 0) {
        throw new Error('Aucun administrateur actif trouvé en base de données');
      }

      // 2. Récupérer toutes les données avec préparations
      const reportData = await this.getDailyData(date);
      reportData.generatedAt = new Date();

      console.log(`📋 Données récupérées:`, {
        employes: reportData.stats.totalEmployes,
        presents: reportData.stats.presentsCount,
        preparations: reportData.stats.totalPreparations,
        agences: reportData.stats.preparationsByAgencyCount
      });

      // 3. Créer le fichier Excel avec préparations
      const workbook = await this.createEnhancedExcelReport(reportData);
      
      // 4. Générer le buffer Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `rapport_quotidien_complet_${date.toISOString().split('T')[0]}.xlsx`;

      // 5. Composer l'email avec nouvelles données
      const emailHtml = this.createEnhancedEmailTemplate(reportData);

      // 6. Envoyer l'email avec pièce jointe
      const result = await this.transporter.sendMail({
        from: `"Système de Gestion Véhicules" <${process.env.EMAIL_USER}>`,
        to: adminEmails,
        subject: `📊 Rapport Quotidien Complet (Pointages + Véhicules) - ${reportData.date}`,
        html: emailHtml,
        attachments: [
          {
            filename,
            content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        ]
      });

      console.log(`✅ Rapport quotidien complet envoyé à ${adminEmails.length} administrateur(s)`);
      
      return {
        success: true,
        messageId: result.messageId,
        sentTo: adminEmails,
        filename,
        reportData: {
          date: reportData.date,
          totalEmployees: reportData.stats.totalEmployes,
          presentCount: reportData.stats.presentsCount,
          punctualityRate: reportData.stats.ponctualiteRate,
          totalPreparations: reportData.stats.totalPreparations, // ✅ NOUVEAU
          preparationsByAgency: reportData.stats.preparationsByAgencyCount // ✅ NOUVEAU
        }
      };

    } catch (error) {
      console.error('❌ Erreur génération rapport quotidien complet:', error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Créer le fichier Excel amélioré avec onglet véhicules
   */
  async createEnhancedExcelReport(reportData) {
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

    // Statistiques pointages
    summarySheet.addRow([]);
    summarySheet.addRow(['📋 POINTAGES']);
    summarySheet.addRow(['Employés prévus', reportData.stats.totalEmployes]);
    summarySheet.addRow(['Employés présents', reportData.stats.presentsCount]);
    summarySheet.addRow(['Taux de présence', `${reportData.stats.presenceRate}%`]);
    summarySheet.addRow(['Taux de ponctualité', `${reportData.stats.ponctualiteRate}%`]);
    summarySheet.addRow(['Retards', reportData.stats.retardsCount]);
    
    // ✅ NOUVEAU : Statistiques préparations
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

    // ===== ONGLET 2: POINTAGES (existant) =====
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

    // ✅ ONGLET 3: NOUVEAU - VÉHICULES PAR AGENCE
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
    vehicleSheet.columns.forEach(column => {
      column.width = 15;
    });

    return workbook;
  }

  /**
   * ✅ NOUVEAU : Template email amélioré avec préparations
   */
  createEnhancedEmailTemplate(reportData) {
    // Calcul des alertes
    const hasIssues = reportData.stats.retardsCount > 3 || 
                     reportData.stats.ponctualiteRate < 80 || 
                     reportData.stats.preparationsInProgress > 5;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport Quotidien Complet</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto;">
        
        <!-- En-tête -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Rapport Quotidien Complet</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${reportData.date}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Pointages + Préparations Véhicules</p>
        </div>

        <!-- Statistiques principales -->
        <div style="display: flex; margin: 20px 0;">
          <!-- Colonne Pointages -->
          <div style="flex: 1; background: #f8f9fa; padding: 20px; margin-right: 10px; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #333; text-align: center;">⏰ POINTAGES</h3>
            
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 28px; font-weight: bold; color: #667eea;">${reportData.stats.totalEmployes}</div>
              <div style="font-size: 14px; color: #666;">Employés prévus</div>
            </div>
            
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 28px; font-weight: bold; color: ${reportData.stats.presenceRate >= 90 ? '#28a745' : reportData.stats.presenceRate >= 75 ? '#ffc107' : '#dc3545'};">${reportData.stats.presentsCount}</div>
              <div style="font-size: 14px; color: #666;">Présents (${reportData.stats.presenceRate}%)</div>
            </div>
            
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: ${reportData.stats.ponctualiteRate >= 85 ? '#28a745' : reportData.stats.ponctualiteRate >= 70 ? '#ffc107' : '#dc3545'};">${reportData.stats.ponctualiteRate}%</div>
              <div style="font-size: 14px; color: #666;">Ponctualité</div>
            </div>
          </div>

          <!-- Colonne Véhicules -->
          <div style="flex: 1; background: #f8f9fa; padding: 20px; margin-left: 10px; border-radius: 8px;">
            <h3 style="margin: 0 0 15px 0; color: #333; text-align: center;">🚗 VÉHICULES</h3>
            
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 28px; font-weight: bold; color: #17a2b8;">${reportData.stats.totalPreparations}</div>
              <div style="font-size: 14px; color: #666;">Total préparations</div>
            </div>
            
            <div style="text-align: center; margin-bottom: 15px;">
              <div style="font-size: 28px; font-weight: bold; color: #28a745;">${reportData.stats.preparationsCompleted}</div>
              <div style="font-size: 14px; color: #666;">Terminées</div>
            </div>
            
            <div style="text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #ffc107;">${reportData.stats.preparationsInProgress}</div>
              <div style="font-size: 14px; color: #666;">En cours</div>
            </div>
          </div>
        </div>

        <!-- Résumé par agence -->
        <div style="background: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">🏢 Activité par Agence</h3>
          
          ${Object.values(reportData.preparationsByAgency).map(agency => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0;">
              <div>
                <strong>${agency.agencyInfo.name}</strong> (${agency.agencyInfo.code})<br>
                <small style="color: #666;">${agency.agencyInfo.client}</small>
              </div>
              <div style="text-align: right;">
                <span style="background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px;">
                  ${agency.totalPreparations} total
                </span>
                <span style="background: #e8f5e8; color: #2e7d32; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                  ${agency.completedPreparations} terminées
                </span>
              </div>
            </div>
          `).join('')}
          
          ${Object.keys(reportData.preparationsByAgency).length === 0 ? 
            '<p style="text-align: center; color: #666; margin: 20px 0;">Aucune préparation véhicule aujourd\'hui</p>' : 
            ''
          }
        </div>

        <!-- Détails performance -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📈 Performance</h3>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Retards détectés:</span>
            <span style="color: ${reportData.stats.retardsCount > 3 ? '#dc3545' : '#28a745'}; font-weight: bold;">
              ${reportData.stats.retardsCount}
            </span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Agences actives:</span>
            <span style="font-weight: bold;">${reportData.stats.preparationsByAgencyCount}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span>Temps moyen préparation:</span>
            <span style="font-weight: bold;">
              ${reportData.stats.averagePreparationTime ? reportData.stats.averagePreparationTime + ' min' : 'N/A'}
            </span>
          </div>
        </div>

        ${hasIssues ? `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #856404;">⚠️ Points d'attention</h3>
          <ul style="margin: 0; padding-left: 20px; color: #856404;">
            ${reportData.stats.retardsCount > 3 ? `<li>Nombre élevé de retards (${reportData.stats.retardsCount})</li>` : ''}
            ${reportData.stats.ponctualiteRate < 80 ? `<li>Taux de ponctualité faible (${reportData.stats.ponctualiteRate}%)</li>` : ''}
            ${reportData.stats.preparationsInProgress > 5 ? `<li>Beaucoup de préparations en cours (${reportData.stats.preparationsInProgress})</li>` : ''}
          </ul>
        </div>
        ` : ''}

        <!-- Pied de page -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            Rapport généré automatiquement par le système de gestion des véhicules<br>
            📧 ${reportData.generatedAt.toLocaleString('fr-FR')}<br>
            📎 Fichier Excel joint avec détails complets
          </p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * ✅ NOUVEAU : Générer le rapport hebdomadaire avec préparations par agence et employé
   */
  async generateAndSendWeeklyReport(startDate, endDate) {
    try {
      console.log(`📊 Génération rapport hebdomadaire complet: ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`);

      // 1. Récupérer les emails des admins
      const adminEmails = await getAdminEmails();
      if (adminEmails.length === 0) {
        throw new Error('Aucun administrateur actif trouvé en base de données');
      }

      // 2. Récupérer toutes les données de la semaine
      const weeklyPreparations = await this.getWeeklyPreparations(startDate, endDate);
      
      // 3. Récupérer les données de pointage pour comparaison
      const timesheets = await Timesheet.find({
        date: { $gte: startDate, $lte: endDate }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .lean();

      const schedules = await Schedule.find({
        date: { $gte: startDate, $lte: endDate }
      })
      .populate('user', 'firstName lastName email')
      .populate('agency', 'name code client')
      .lean();

      // 4. Calculer les statistiques hebdomadaires
      const weeklyStats = this.calculateWeeklyStats(schedules, timesheets, weeklyPreparations);

      const reportData = {
        startDate: startDate.toLocaleDateString('fr-FR'),
        endDate: endDate.toLocaleDateString('fr-FR'),
        preparationsByAgency: weeklyPreparations.byAgency,
        preparationsByEmployee: weeklyPreparations.byEmployee,
        stats: weeklyStats,
        generatedAt: new Date()
      };

      console.log(`📋 Données hebdomadaires:`, {
        agences: Object.keys(weeklyPreparations.byAgency).length,
        employes: Object.keys(weeklyPreparations.byEmployee).length,
        totalPreparations: weeklyStats.totalPreparations
      });

      // 5. Créer le fichier Excel
      const workbook = await this.createWeeklyExcelReport(reportData);
      
      // 6. Générer le buffer Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `rapport_hebdomadaire_complet_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.xlsx`;

      // 7. Composer l'email
      const emailHtml = this.createWeeklyEmailTemplate(reportData);

      // 8. Envoyer l'email avec pièce jointe
      const result = await this.transporter.sendMail({
        from: `"Système de Gestion Véhicules" <${process.env.EMAIL_USER}>`,
        to: adminEmails,
        subject: `📊 Rapport Hebdomadaire Complet - Semaine du ${reportData.startDate}`,
        html: emailHtml,
        attachments: [
          {
            filename,
            content: buffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        ]
      });

      console.log(`✅ Rapport hebdomadaire complet envoyé à ${adminEmails.length} administrateur(s)`);
      
      return {
        success: true,
        messageId: result.messageId,
        sentTo: adminEmails,
        filename,
        reportData: {
          period: `${reportData.startDate} - ${reportData.endDate}`,
          totalPreparations: weeklyStats.totalPreparations,
          agenciesActive: Object.keys(weeklyPreparations.byAgency).length,
          employeesActive: Object.keys(weeklyPreparations.byEmployee).length
        }
      };

    } catch (error) {
      console.error('❌ Erreur génération rapport hebdomadaire complet:', error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Calculer les statistiques hebdomadaires
   */
  calculateWeeklyStats(schedules, timesheets, weeklyPreparations) {
    const stats = {
      totalSchedules: schedules.length,
      totalTimesheets: timesheets.length,
      totalPreparations: 0,
      completedPreparations: 0,
      averagePreparationTime: 0,
      agenciesCount: Object.keys(weeklyPreparations.byAgency).length,
      employeesWithPreparationsCount: Object.keys(weeklyPreparations.byEmployee).length
    };

    // Calculs préparations
    Object.values(weeklyPreparations.byAgency).forEach(agency => {
      stats.totalPreparations += agency.totalPreparations;
      stats.completedPreparations += agency.completedPreparations;
    });

    // Calcul temps moyen
    const allDurations = [];
    Object.values(weeklyPreparations.byEmployee).forEach(employee => {
      employee.preparations.forEach(prep => {
        if (prep.duration && prep.status === 'completed') {
          allDurations.push(prep.duration);
        }
      });
    });

    if (allDurations.length > 0) {
      stats.averagePreparationTime = Math.round(
        allDurations.reduce((sum, duration) => sum + duration, 0) / allDurations.length
      );
    }

    return stats;
  }

  /**
   * ✅ NOUVEAU : Créer le fichier Excel hebdomadaire
   */
  async createWeeklyExcelReport(reportData) {
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'Système de Gestion Véhicules';
    workbook.created = new Date();
    workbook.title = `Rapport Hebdomadaire - ${reportData.startDate} au ${reportData.endDate}`;

    // ===== ONGLET 1: RÉSUMÉ =====
    const summarySheet = workbook.addWorksheet('📊 Résumé');
    
    summarySheet.mergeCells('A1:F1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `📊 Rapport Hebdomadaire - ${reportData.startDate} au ${reportData.endDate}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    summarySheet.addRow([]);
    summarySheet.addRow(['📈 STATISTIQUES GÉNÉRALES']);
    summarySheet.addRow(['Total préparations', reportData.stats.totalPreparations]);
    summarySheet.addRow(['Préparations terminées', reportData.stats.completedPreparations]);
    summarySheet.addRow(['Temps moyen (min)', reportData.stats.averagePreparationTime || 'N/A']);
    summarySheet.addRow(['Agences actives', reportData.stats.agenciesCount]);
    summarySheet.addRow(['Employés avec préparations', reportData.stats.employeesWithPreparationsCount]);

    summarySheet.getColumn('A').width = 25;
    summarySheet.getColumn('B').width = 15;

    // ===== ONGLET 2: PRÉPARATIONS PAR AGENCE =====
    const agencySheet = workbook.addWorksheet('🏢 Par Agence');
    
    agencySheet.addRow([
      'Agence', 'Code', 'Client', 'Date', 'Véhicule', 'Marque/Modèle', 
      'Préparateur', 'Début', 'Fin', 'Durée (min)', 'Statut', 'Étapes'
    ]);

    Object.values(reportData.preparationsByAgency).forEach(agencyData => {
      if (agencyData.preparations.length === 0) {
        agencySheet.addRow([
          agencyData.agencyInfo.name,
          agencyData.agencyInfo.code,
          agencyData.agencyInfo.client,
          'Aucune préparation cette semaine',
          '', '', '', '', '', '', '', ''
        ]);
      } else {
        agencyData.preparations.forEach((prep, index) => {
          agencySheet.addRow([
            index === 0 ? agencyData.agencyInfo.name : '', // Nom agence seulement sur première ligne
            index === 0 ? agencyData.agencyInfo.code : '',
            index === 0 ? agencyData.agencyInfo.client : '',
            prep.date,
            prep.vehicle.licensePlate || 'N/A',
            `${prep.vehicle.brand || ''} ${prep.vehicle.model || ''}`.trim() || 'N/A',
            prep.user ? `${prep.user.firstName} ${prep.user.lastName}` : 'N/A',
            prep.startTime,
            prep.endTime,
            prep.duration || 'En cours',
            prep.status === 'completed' ? 'Terminé' : prep.status === 'in_progress' ? 'En cours' : prep.status,
            `${prep.stepsCompleted}/${prep.totalSteps}`
          ]);
        });
      }
      agencySheet.addRow([]); // Ligne vide entre agences
    });

    // ===== ONGLET 3: PRÉPARATIONS PAR EMPLOYÉ =====
    const employeeSheet = workbook.addWorksheet('👥 Par Employé');
    
    employeeSheet.addRow([
      'Employé', 'Email', 'Total', 'Terminées', 'Temps Moy. (min)', 
      'Agences Travaillées', 'Dernière Préparation'
    ]);

    // Trier les employés par nombre de préparations (décroissant)
    const sortedEmployees = Object.values(reportData.preparationsByEmployee)
      .sort((a, b) => b.totalPreparations - a.totalPreparations);

    sortedEmployees.forEach(employeeData => {
      const lastPrep = employeeData.preparations[employeeData.preparations.length - 1];
      
      employeeSheet.addRow([
        `${employeeData.userInfo.firstName} ${employeeData.userInfo.lastName}`,
        employeeData.userInfo.email,
        employeeData.totalPreparations,
        employeeData.completedPreparations,
        employeeData.averageDuration || 'N/A',
        employeeData.agenciesWorked.join(', '),
        lastPrep ? `${lastPrep.date} - ${lastPrep.vehicle.licensePlate}` : 'N/A'
      ]);
    });

    // ===== ONGLET 4: DÉTAIL PAR EMPLOYÉ =====
    const detailSheet = workbook.addWorksheet('📋 Détail Employés');
    
    detailSheet.addRow([
      'Employé', 'Date', 'Agence', 'Véhicule', 'Marque/Modèle', 
      'Début', 'Fin', 'Durée (min)', 'Statut', 'Étapes'
    ]);

    sortedEmployees.forEach(employeeData => {
      employeeData.preparations.forEach((prep, index) => {
        detailSheet.addRow([
          index === 0 ? `${employeeData.userInfo.firstName} ${employeeData.userInfo.lastName}` : '',
          prep.date,
          prep.agency ? prep.agency.name : 'N/A',
          prep.vehicle.licensePlate || 'N/A',
          `${prep.vehicle.brand || ''} ${prep.vehicle.model || ''}`.trim() || 'N/A',
          prep.startTime,
          prep.endTime,
          prep.duration || 'En cours',
          prep.status === 'completed' ? 'Terminé' : prep.status === 'in_progress' ? 'En cours' : prep.status,
          `${prep.stepsCompleted}/${prep.totalSteps}`
        ]);
      });
      detailSheet.addRow([]); // Ligne vide entre employés
    });

    // Ajuster toutes les colonnes
    [summarySheet, agencySheet, employeeSheet, detailSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        column.width = 15;
      });
    });

    return workbook;
  }

  /**
   * ✅ NOUVEAU : Template email hebdomadaire
   */
  createWeeklyEmailTemplate(reportData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport Hebdomadaire Complet</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto;">
        
        <!-- En-tête -->
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Rapport Hebdomadaire Complet</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Semaine du ${reportData.startDate} au ${reportData.endDate}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Préparations véhicules par agence et employé</p>
        </div>

        <!-- Statistiques principales -->
        <div style="background: #f8f9fa; padding: 25px; border-left: 4px solid #28a745;">
          <h2 style="margin: 0 0 20px 0; color: #333;">📈 Résumé de la semaine</h2>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: #28a745;">${reportData.stats.totalPreparations}</div>
              <div style="font-size: 14px; color: #666;">Total préparations</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: #17a2b8;">${reportData.stats.completedPreparations}</div>
              <div style="font-size: 14px; color: #666;">Terminées</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: #6f42c1;">${reportData.stats.agenciesCount}</div>
              <div style="font-size: 14px; color: #666;">Agences actives</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: #fd7e14;">${reportData.stats.employeesWithPreparationsCount}</div>
              <div style="font-size: 14px; color: #666;">Employés actifs</div>
            </div>
          </div>
        </div>

        <!-- TOP Agences -->
        <div style="background: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">🏆 TOP Agences</h3>
          
          ${Object.values(reportData.preparationsByAgency)
            .sort((a, b) => b.totalPreparations - a.totalPreparations)
            .slice(0, 5)
            .map((agency, index) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0;">
                <div style="display: flex; align-items: center;">
                  <span style="background: #007bff; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">
                    ${index + 1}
                  </span>
                  <div>
                    <strong>${agency.agencyInfo.name}</strong><br>
                    <small style="color: #666;">${agency.agencyInfo.client}</small>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 18px; font-weight: bold; color: #28a745;">${agency.totalPreparations}</div>
                  <div style="font-size: 12px; color: #666;">${agency.completedPreparations} terminées</div>
                </div>
              </div>
            `).join('')}
        </div>

        <!-- TOP Employés -->
        <div style="background: #fff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">🏆 TOP Employés</h3>
          
          ${Object.values(reportData.preparationsByEmployee)
            .sort((a, b) => b.totalPreparations - a.totalPreparations)
            .slice(0, 5)
            .map((employee, index) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f0f0f0;">
                <div style="display: flex; align-items: center;">
                  <span style="background: #fd7e14; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-right: 10px;">
                    ${index + 1}
                  </span>
                  <div>
                    <strong>${employee.userInfo.firstName} ${employee.userInfo.lastName}</strong><br>
                    <small style="color: #666;">${employee.agenciesWorked.join(', ')}</small>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 18px; font-weight: bold; color: #fd7e14;">${employee.totalPreparations}</div>
                  <div style="font-size: 12px; color: #666;">${employee.averageDuration || 'N/A'} min moy.</div>
                </div>
              </div>
            `).join('')}
        </div>

        <!-- Performance -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">⚡ Performance Globale</h3>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Taux de completion:</span>
            <span style="font-weight: bold; color: #28a745;">
              ${reportData.stats.totalPreparations > 0 ? 
                Math.round((reportData.stats.completedPreparations / reportData.stats.totalPreparations) * 100) : 0}%
            </span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Temps moyen par préparation:</span>
            <span style="font-weight: bold;">${reportData.stats.averagePreparationTime || 'N/A'} min</span>
          </div>
          
          <div style="display: flex; justify-content: space-between;">
            <span>Préparations par employé actif:</span>
            <span style="font-weight: bold;">
              ${reportData.stats.employeesWithPreparationsCount > 0 ? 
                Math.round(reportData.stats.totalPreparations / reportData.stats.employeesWithPreparationsCount) : 0}
            </span>
          </div>
        </div>

        <!-- Pied de page -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; font-size: 12px; color: #6c757d;">
            Rapport généré automatiquement par le système de gestion des véhicules<br>
            📧 ${reportData.generatedAt.toLocaleString('fr-FR')}<br>
            📎 Fichier Excel joint avec tous les détails par agence et employé
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
      console.log('🧪 Test du service de rapport quotidien complet');
      
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Service non initialisé - vérifiez la configuration email et les admins en BDD');
      }
      
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