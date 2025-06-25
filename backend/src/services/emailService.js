const nodemailer = require('nodemailer');
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

  return nodemailer.createTransporter(config);
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
 * Obtenir la liste des emails administrateurs
 */
const getAdminEmails = () => {
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) {
    console.warn('⚠️  Aucun email admin configuré');
    return [];
  }
  return adminEmails.split(',').map(email => email.trim()).filter(Boolean);
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
              <td style="padding: 8px 0; font-weight: bold;">Heure prévue:</td>
              <td style="padding: 8px 0;">${data.scheduledTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Retard:</td>
              <td style="padding: 8px 0; color: #dc3545; font-weight: bold;">${data.delayMinutes} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Heure actuelle:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleTimeString('fr-FR')}</td>
            </tr>
          </table>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #6c757d;">
              <strong>Action requise:</strong> L'employé n'a toujours pas pointé son début de service. 
              Veuillez vérifier sa présence et prendre les mesures appropriées.
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

  overtime_preparation: (data) => ({
    subject: `⏰ Préparation longue - ${data.employee.firstName} ${data.employee.lastName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #856404; margin: 0 0 15px 0;">⏰ Alerte de préparation prolongée</h2>
        </div>
        
        <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 20px;">
          <h3>Détails de la préparation</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Employé:</td>
              <td style="padding: 8px 0;">${data.employee.firstName} ${data.employee.lastName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Véhicule:</td>
              <td style="padding: 8px 0;">${data.vehicle.licensePlate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Agence:</td>
              <td style="padding: 8px 0;">${data.agency.name} (${data.agency.code})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Durée actuelle:</td>
              <td style="padding: 8px 0; color: #fd7e14; font-weight: bold;">${data.duration} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Limite normale:</td>
              <td style="padding: 8px 0;">30 minutes</td>
            </tr>
          </table>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #6c757d;">
              <strong>Attention:</strong> Cette préparation dépasse significativement le temps alloué. 
              Veuillez vérifier s'il y a un problème particulier.
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
 * Envoyer un email d'alerte
 */
const sendAlertEmail = async (alertData) => {
  try {
    // Vérifier la configuration
    const adminEmails = getAdminEmails();
    if (adminEmails.length === 0) {
      console.warn('⚠️  Aucun email admin configuré, alerte non envoyée');
      return { success: false, reason: 'No admin emails configured' };
    }

    // Obtenir le template
    const template = emailTemplates[alertData.type];
    if (!template) {
      throw new Error(`Template email non trouvé pour le type: ${alertData.type}`);
    }

    const { subject, html } = template(alertData);

    // Créer le transporteur
    const transporter = createTransporter();

    // Envoyer l'email
    const result = await transporter.sendMail({
      from: `"Système Véhicules" <${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject,
      html,
      priority: 'high'
    });

    console.log(`📧 Email envoyé avec succès:`, result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoyer un email de test
 */
const sendTestEmail = async () => {
  try {
    const adminEmails = getAdminEmails();
    if (adminEmails.length === 0) {
      throw new Error('Aucun email admin configuré');
    }

    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: `"Système Véhicules" <${process.env.EMAIL_USER}>`,
      to: adminEmails,
      subject: '✅ Test de configuration email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px;">
            <h2 style="color: #155724; margin: 0 0 15px 0;">✅ Configuration email fonctionnelle</h2>
            <p>Ce message confirme que la configuration email du système de gestion des véhicules fonctionne correctement.</p>
            <p><strong>Date du test:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <p><strong>Emails destinataires:</strong> ${adminEmails.join(', ')}</p>
          </div>
        </div>
      `
    });

    console.log('✅ Email de test envoyé avec succès:', result.messageId);
    return { success: true, messageId: result.messageId };

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
    const adminEmails = getAdminEmails();
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
  getAdminEmails
};