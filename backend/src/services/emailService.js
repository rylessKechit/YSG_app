const nodemailer = require('nodemailer');
const User = require('../models/User');
const { EMAIL_CONFIG } = require('../utils/constants');

/**
 * Configuration du transporteur email
 */
const createTransporter = () => {
  const config = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };

  // Configuration alternative pour d'autres services
  if (process.env.EMAIL_HOST) {
    config.host = process.env.EMAIL_HOST;
    config.port = process.env.EMAIL_PORT || 587;
    config.secure = process.env.EMAIL_SECURE === 'true';
    delete config.service;
  }

  return nodemailer.createTransport(config);
};

/**
 * Vérifier la configuration email
 */
const verifyEmailConfig = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️  Configuration email incomplète');
      return false;
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Configuration email vérifiée');
    return true;
  } catch (error) {
    console.error('❌ Erreur configuration email:', error.message);
    return false;
  }
};

/**
 * Obtenir la liste des emails administrateurs depuis la base de données
 */
const getAdminEmails = async () => {
  try {
    const admins = await User.find({ 
      role: 'admin', 
      isActive: true 
    }).select('email firstName lastName');
    
    if (admins.length === 0) {
      console.warn('⚠️  Aucun administrateur actif trouvé en base');
      return [];
    }

    const adminEmails = admins.map(admin => admin.email).filter(Boolean);
    console.log(`📧 ${adminEmails.length} email(s) administrateur(s) trouvé(s)`);
    
    return adminEmails;
  } catch (error) {
    console.error('❌ Erreur récupération emails admin:', error);
    return [];
  }
};

/**
 * Obtenir les détails complets des administrateurs
 */
const getAdminDetails = async () => {
  try {
    const admins = await User.find({ 
      role: 'admin', 
      isActive: true 
    }).select('email firstName lastName');
    
    return admins;
  } catch (error) {
    console.error('❌ Erreur récupération détails admin:', error);
    return [];
  }
};

/**
 * Templates d'emails
 */
const emailTemplates = {
  late_start: (data) => ({
    subject: `🚨 Retard de pointage - ${data.employee.firstName} ${data.employee.lastName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #721c24; margin: 0 0 15px 0;">🚨 Alerte de retard de pointage</h2>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px;">
          <h3>Détails de l'incident</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Employé:</td>
              <td style="padding: 8px 0;">${data.employee.firstName} ${data.employee.lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;">${data.employee.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Agence:</td>
              <td style="padding: 8px 0;">${data.agency.name} (${data.agency.code})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Date:</td>
              <td style="padding: 8px 0;">${data.date.toLocaleDateString('fr-FR')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Heure prévue:</td>
              <td style="padding: 8px 0;">${data.scheduledTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Heure réelle:</td>
              <td style="padding: 8px 0;">${data.actualTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Retard:</td>
              <td style="padding: 8px 0; color: #dc3545;"><strong>${data.delayMinutes} minutes</strong></td>
            </tr>
          </table>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
            <p style="margin: 0; color: #856404;">
              <strong>Action recommandée:</strong> Contacter l'employé pour comprendre la cause du retard.
            </p>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 12px;">
          <p>Email automatique envoyé par le système de gestion des véhicules</p>
          <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>
    `
  }),

  missing_clock_out: (data) => ({
    subject: `📤 Fin de service manquante - ${data.employee.firstName} ${data.employee.lastName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #d1ecf1; border: 1px solid #b8daff; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #0c5460; margin: 0 0 15px 0;">📤 Pointage de fin manquant</h2>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px;">
          <h3>Détails du pointage</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Employé:</td>
              <td style="padding: 8px 0;">${data.employee.firstName} ${data.employee.lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;">${data.employee.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Agence:</td>
              <td style="padding: 8px 0;">${data.agency.name} (${data.agency.code})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Date:</td>
              <td style="padding: 8px 0;">${data.date.toLocaleDateString('fr-FR')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Heure d'arrivée:</td>
              <td style="padding: 8px 0;">${data.clockInTime.toLocaleTimeString('fr-FR')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Heure de départ:</td>
              <td style="padding: 8px 0; color: #dc3545;">Non pointée</td>
            </tr>
          </table>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #6c757d;">
              <strong>Action requise:</strong> L'employé n'a pas pointé sa fin de service hier. 
              Veuillez régulariser la situation et mettre à jour manuellement si nécessaire.
            </p>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 12px;">
          <p>Email automatique envoyé par le système de gestion des véhicules</p>
          <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>
    `
  })
};

/**
 * Envoyer une alerte email
 */
const sendAlertEmail = async (alertData) => {
  try {
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      console.warn('⚠️  Aucun email admin disponible - alerte non envoyée');
      return { success: false, reason: 'No admin emails' };
    }

    const transporter = createTransporter();
    const template = emailTemplates[alertData.type];
    
    if (!template) {
      throw new Error(`Template d'email non trouvé: ${alertData.type}`);
    }

    const emailContent = template(alertData);

    const result = await transporter.sendMail({
      from: `"Système Véhicules - Alerte" <${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject: emailContent.subject,
      html: emailContent.html
    });

    console.log(`📧 Alerte ${alertData.type} envoyée à ${adminEmails.length} admin(s)`);
    return { success: true, messageId: result.messageId, sentTo: adminEmails };

  } catch (error) {
    console.error('❌ Erreur envoi alerte email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoyer un email de test
 */
const sendTestEmail = async () => {
  try {
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      return { success: false, reason: 'No admin emails configured' };
    }

    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: `"Système Véhicules - Test" <${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject: '🧪 Test Email - Configuration Rapports',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🧪 Test Email</h1>
            <p style="margin: 10px 0 0 0;">Configuration des rapports automatiques</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px;">
            <h2 style="color: #333;">✅ Configuration réussie !</h2>
            <p>Ce test confirme que :</p>
            <ul>
              <li>✅ Le service email fonctionne correctement</li>
              <li>✅ Les administrateurs sont bien configurés en base</li>
              <li>✅ Les rapports automatiques peuvent être envoyés</li>
            </ul>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <h3>Administrateurs configurés :</h3>
              <p>${adminEmails.join(', ')}</p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              Test envoyé le ${new Date().toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      `
    });

    return { success: true, messageId: result.messageId, sentTo: adminEmails };

  } catch (error) {
    console.error('❌ Erreur envoi email de test:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoyer un rapport quotidien (optionnel)
 */
const sendDailyReport = async (reportData) => {
  try {
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      return { success: false, reason: 'No admin emails configured' };
    }

    const transporter = createTransporter();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #e3f2fd; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #1976d2; margin: 0;">📊 Rapport quotidien</h2>
          <p style="margin: 5px 0 0 0;">Date: ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px;">
          <h3>Résumé de la journée</h3>
          <ul>
            <li>Employés prévus: ${reportData.scheduled}</li>
            <li>Employés présents: ${reportData.present}</li>
            <li>Retards: ${reportData.late}</li>
            <li>Préparations réalisées: ${reportData.preparations}</li>
            <li>Taux de ponctualité: ${reportData.punctualityRate}%</li>
          </ul>
          
          ${reportData.alerts?.length > 0 ? `
            <h3>Alertes de la journée</h3>
            <ul>
              ${reportData.alerts.map(alert => `<li>${alert}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
    `;

    const result = await transporter.sendMail({
      from: `"Système Véhicules" <${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject: `📊 Rapport quotidien - ${new Date().toLocaleDateString('fr-FR')}`,
      html
    });

    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Erreur envoi rapport quotidien:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAlertEmail,
  sendTestEmail,
  sendDailyReport,
  verifyEmailConfig,
  getAdminEmails,
  getAdminDetails,
  createTransporter
};