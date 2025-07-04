// ===== NOUVELLES ROUTES ADMIN POUR GÉRER LES RAPPORTS =====
// backend/src/routes/admin/reports.js - Routes de gestion des rapports

const express = require('express');
const router = express.Router();
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const dailyReportService = require('../../services/dailyReportService');
const dailyReportScheduler = require('../../jobs/dailyReportScheduler');
const { getAdminEmails, getAdminDetails } = require('../../services/emailService');

// Middleware
router.use(auth, adminAuth);

/**
 * @route   GET /api/admin/reports/status
 * @desc    Obtenir le statut des rapports automatiques
 * @access  Admin
 */
router.get('/status', async (req, res) => {
  try {
    // Récupérer les admins depuis la BDD
    const adminEmails = await getAdminEmails();
    const adminDetails = await getAdminDetails();
    
    const status = {
      emailConfigured: process.env.EMAIL_USER && process.env.EMAIL_PASS,
      adminCount: adminEmails.length,
      adminEmails: adminEmails,
      adminDetails: adminDetails.map(admin => ({
        id: admin._id,
        email: admin.email,
        name: `${admin.firstName} ${admin.lastName}`
      })),
      enabledInConfig: process.env.ENABLE_DAILY_REPORTS !== 'false',
      schedulerInitialized: dailyReportScheduler.isInitialized,
      tasks: dailyReportScheduler.getStatus(),
      lastExecution: {
        // Ces informations seraient stockées en base dans un vrai système
        dailyReport: null,
        weeklyReport: null
      }
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ Erreur statut rapports:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut'
    });
  }
});

/**
 * @route   POST /api/admin/reports/manual/:type
 * @desc    Exécuter manuellement un rapport
 * @access  Admin
 */
router.post('/manual/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { date } = req.body;

    let result;
    let reportDate = date ? new Date(date) : new Date();

    console.log(`🔧 Exécution manuelle du rapport ${type} demandée par ${req.user.email}`);

    // Vérifier qu'on a des admins en base
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun administrateur actif trouvé en base de données. Veuillez créer au moins un utilisateur avec le rôle "admin".'
      });
    }

    switch (type) {
      case 'daily':
        result = await dailyReportService.generateAndSendDailyReport(reportDate);
        break;
      
      case 'weekly':
        result = await dailyReportScheduler.runManually('weeklyReport');
        break;
      
      case 'test':
        result = await dailyReportService.testReport();
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Type de rapport invalide. Types disponibles: daily, weekly, test'
        });
    }

    res.json({
      success: true,
      message: `Rapport ${type} généré et envoyé avec succès`,
      data: {
        executedAt: new Date(),
        executedBy: req.user.email,
        sentTo: result.sentTo || adminEmails,
        result
      }
    });

  } catch (error) {
    console.error('❌ Erreur exécution manuelle rapport:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'exécution du rapport',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/admin/reports/schedule/toggle
 * @desc    Activer/désactiver les rapports automatiques
 * @access  Admin
 */
router.post('/schedule/toggle', async (req, res) => {
  try {
    const { action } = req.body; // 'start' ou 'stop'

    if (!['start', 'stop'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action invalide. Utilisez "start" ou "stop"'
      });
    }

    // Vérifier la configuration avant de démarrer
    if (action === 'start') {
      const adminEmails = await getAdminEmails();
      if (adminEmails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de démarrer les rapports automatiques: aucun administrateur actif en base de données'
        });
      }
    }

    let result;
    if (action === 'start') {
      if (!dailyReportScheduler.isInitialized) {
        await dailyReportScheduler.initialize();
      }
      result = dailyReportScheduler.start();
    } else {
      result = dailyReportScheduler.stop();
    }

    res.json({
      success: true,
      message: `Tâches planifiées ${action === 'start' ? 'démarrées' : 'arrêtées'}`,
      data: {
        action,
        affected: result,
        status: dailyReportScheduler.getStatus(),
        executedBy: req.user.email,
        executedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Erreur toggle planificateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du planificateur'
    });
  }
});

/**
 * @route   GET /api/admin/reports/history
 * @desc    Historique des rapports envoyés (placeholder)
 * @access  Admin
 */
router.get('/history', async (req, res) => {
  try {
    const adminEmails = await getAdminEmails();
    
    // Dans un vrai système, ceci viendrait d'une collection MongoDB
    const mockHistory = [
      {
        id: '1',
        type: 'daily',
        date: new Date().toISOString().split('T')[0],
        sentAt: new Date(),
        recipients: adminEmails.length,
        recipientEmails: adminEmails,
        status: 'sent',
        stats: {
          totalEmployees: 12,
          presentCount: 10,
          punctualityRate: 85
        }
      }
    ];

    res.json({
      success: true,
      data: {
        reports: mockHistory,
        total: mockHistory.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur historique rapports:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
});

/**
 * @route   GET /api/admin/reports/config
 * @desc    Configuration actuelle des rapports
 * @access  Admin
 */
router.get('/config', async (req, res) => {
  try {
    const adminEmails = await getAdminEmails();
    const adminDetails = await getAdminDetails();
    
    const config = {
      email: {
        configured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS),
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, '$1***$2') : null
      },
      administrators: {
        count: adminEmails.length,
        list: adminDetails.map(admin => ({
          id: admin._id,
          name: `${admin.firstName} ${admin.lastName}`,
          email: admin.email
        }))
      },
      scheduling: {
        enabled: process.env.ENABLE_DAILY_REPORTS !== 'false',
        dailyTime: '20:00',
        weeklyTime: 'Dimanche 18:00',
        timezone: 'Europe/Paris'
      },
      status: {
        initialized: dailyReportScheduler.isInitialized,
        running: dailyReportScheduler.isInitialized ? 
          Object.values(dailyReportScheduler.getStatus()).some(task => task.running) : false
      }
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('❌ Erreur configuration rapports:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration'
    });
  }
});

module.exports = router;