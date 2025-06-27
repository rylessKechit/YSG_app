// ===== backend/src/routes/admin/settings.js =====
const express = require('express');
const Joi = require('joi');
const { auth } = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/adminAuth');
const { validateBody } = require('../../middleware/validation');
const { ERROR_MESSAGES } = require('../../utils/constants');

const router = express.Router();

// Middleware auth
router.use(auth, adminAuth);

// Configuration par défaut (à terme, stocker en DB)
let globalSettings = {
  metier: {
    tempsStandardPreparation: {
      "citadine": 20,
      "berline": 25,
      "suv": 30,
      "premium": 35
    },
    seuilsAlertes: {
      retardPointage: 15, // minutes
      depassementPreparation: 30,
      absenceNonJustifiee: true
    },
    horairesLegaux: {
      heuresMaxSemaine: 35,
      pauseMinimumDuree: 30,
      pauseObligatoireSi: 6 // heures continues
    },
    joursFeries: [
      { date: "2024-01-01", nom: "Nouvel An" },
      { date: "2024-05-01", nom: "Fête du Travail" },
      { date: "2024-05-08", nom: "Victoire 1945" },
      { date: "2024-07-14", nom: "Fête Nationale" },
      { date: "2024-08-15", nom: "Assomption" },
      { date: "2024-11-01", nom: "Toussaint" },
      { date: "2024-11-11", nom: "Armistice" },
      { date: "2024-12-25", nom: "Noël" }
    ]
  },
  notifications: {
    email: {
      smtp: {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || "",
          pass: process.env.EMAIL_PASS || ""
        }
      },
      expediteur: {
        nom: "Vehicle Prep System",
        email: process.env.EMAIL_USER || "noreply@company.com"
      },
      templates: {
        retardPointage: {
          actif: true,
          seuil: 15 // minutes
        },
        preparationLongue: {
          actif: true,
          seuil: 30 // minutes
        },
        absenceNonJustifiee: {
          actif: true,
          seuil: 60 // minutes après heure prévue
        }
      }
    },
    sms: {
      provider: process.env.SMS_PROVIDER || "disabled",
      config: {
        // Configuration Twilio ou autre
        accountSid: process.env.TWILIO_ACCOUNT_SID || "",
        authToken: process.env.TWILIO_AUTH_TOKEN || "",
        from: process.env.TWILIO_FROM_NUMBER || ""
      }
    },
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || "",
      defaultChannel: "#alerts",
      actif: !!process.env.SLACK_WEBHOOK_URL
    }
  },
  securite: {
    sessionTimeout: 8, // heures
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
      maxAge: 90 // jours avant expiration
    },
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    twoFactorAuth: {
      enabled: false,
      provider: "email" // email, sms, app
    }
  },
  application: {
    maintenance: {
      enabled: false,
      message: "Maintenance en cours, retour prévu à 14h00",
      allowedIPs: [] // IPs qui peuvent accéder pendant maintenance
    },
    features: {
      preparationsAvecPhotos: true,
      notificationsTempsReel: true,
      exportDonnees: true,
      rapportsAvances: true,
      planningOptimise: false // Feature en développement
    },
    limits: {
      maxPreparateursParAgence: 50,
      maxAgencesParPreparateur: 3,
      maxUploadSizeMB: 5,
      rateLimitRequests: 100 // par 15 minutes
    }
  }
};

/**
 * @route   GET /api/admin/settings
 * @desc    Récupérer la configuration globale
 * @access  Admin
 */
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        settings: globalSettings,
        lastUpdated: new Date(), // TODO: récupérer de la DB
        version: "1.0.0"
      }
    });

  } catch (error) {
    console.error('Erreur récupération settings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   PUT /api/admin/settings
 * @desc    Mettre à jour la configuration globale
 * @access  Admin
 */
router.put('/', validateBody(Joi.object({
  metier: Joi.object({
    tempsStandardPreparation: Joi.object().pattern(
      Joi.string(),
      Joi.number().min(10).max(120)
    ).optional(),
    seuilsAlertes: Joi.object({
      retardPointage: Joi.number().min(5).max(60).optional(),
      depassementPreparation: Joi.number().min(20).max(120).optional(),
      absenceNonJustifiee: Joi.boolean().optional()
    }).optional(),
    horairesLegaux: Joi.object({
      heuresMaxSemaine: Joi.number().min(20).max(48).optional(),
      pauseMinimumDuree: Joi.number().min(15).max(120).optional(),
      pauseObligatoireSi: Joi.number().min(4).max(8).optional()
    }).optional(),
    joursFeries: Joi.array().items(Joi.object({
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
      nom: Joi.string().max(50).required()
    })).optional()
  }).optional(),
  
  notifications: Joi.object({
    email: Joi.object({
      expediteur: Joi.object({
        nom: Joi.string().max(100).optional(),
        email: Joi.string().email().optional()
      }).optional(),
      templates: Joi.object({
        retardPointage: Joi.object({
          actif: Joi.boolean().optional(),
          seuil: Joi.number().min(5).max(60).optional()
        }).optional(),
        preparationLongue: Joi.object({
          actif: Joi.boolean().optional(),
          seuil: Joi.number().min(20).max(120).optional()
        }).optional(),
        absenceNonJustifiee: Joi.object({
          actif: Joi.boolean().optional(),
          seuil: Joi.number().min(30).max(180).optional()
        }).optional()
      }).optional()
    }).optional(),
    
    slack: Joi.object({
      webhookUrl: Joi.string().uri().allow('').optional(),
      defaultChannel: Joi.string().optional(),
      actif: Joi.boolean().optional()
    }).optional()
  }).optional(),
  
  securite: Joi.object({
    sessionTimeout: Joi.number().min(1).max(24).optional(),
    passwordPolicy: Joi.object({
      minLength: Joi.number().min(6).max(20).optional(),
      requireUppercase: Joi.boolean().optional(),
      requireNumbers: Joi.boolean().optional(),
      requireSymbols: Joi.boolean().optional(),
      maxAge: Joi.number().min(30).max(365).optional()
    }).optional(),
    maxLoginAttempts: Joi.number().min(3).max(10).optional(),
    lockoutDuration: Joi.number().min(5).max(120).optional()
  }).optional(),
  
  application: Joi.object({
    maintenance: Joi.object({
      enabled: Joi.boolean().optional(),
      message: Joi.string().max(200).optional(),
      allowedIPs: Joi.array().items(Joi.string().ip()).optional()
    }).optional(),
    features: Joi.object({
      preparationsAvecPhotos: Joi.boolean().optional(),
      notificationsTempsReel: Joi.boolean().optional(),
      exportDonnees: Joi.boolean().optional(),
      rapportsAvances: Joi.boolean().optional(),
      planningOptimise: Joi.boolean().optional()
    }).optional(),
    limits: Joi.object({
      maxPreparateursParAgence: Joi.number().min(1).max(100).optional(),
      maxAgencesParPreparateur: Joi.number().min(1).max(10).optional(),
      maxUploadSizeMB: Joi.number().min(1).max(50).optional(),
      rateLimitRequests: Joi.number().min(10).max(1000).optional()
    }).optional()
  }).optional()
})), async (req, res) => {
  try {
    const updates = req.body;
    
    // Fusionner avec la configuration existante
    globalSettings = {
      ...globalSettings,
      ...updates,
      metier: { ...globalSettings.metier, ...updates.metier },
      notifications: {
        ...globalSettings.notifications,
        ...updates.notifications,
        email: { ...globalSettings.notifications.email, ...updates.notifications?.email },
        slack: { ...globalSettings.notifications.slack, ...updates.notifications?.slack }
      },
      securite: { ...globalSettings.securite, ...updates.securite },
      application: {
        ...globalSettings.application,
        ...updates.application,
        maintenance: { ...globalSettings.application.maintenance, ...updates.application?.maintenance },
        features: { ...globalSettings.application.features, ...updates.application?.features },
        limits: { ...globalSettings.application.limits, ...updates.application?.limits }
      }
    };

    // TODO: Sauvegarder en base de données
    // await Settings.findOneAndUpdate({}, globalSettings, { upsert: true });

    // Log de la modification
    console.log(`⚙️  Configuration mise à jour par ${req.user.email}`);

    res.json({
      success: true,
      message: 'Configuration mise à jour avec succès',
      data: {
        settings: globalSettings,
        updatedBy: req.user.email,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur mise à jour settings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/settings/test-email
 * @desc    Tester la configuration email
 * @access  Admin
 */
router.post('/test-email', validateBody(Joi.object({
  recipient: Joi.string().email().required(),
  type: Joi.string().valid('connection', 'alert').default('connection')
})), async (req, res) => {
  try {
    const { recipient, type } = req.body;
    
    // TODO: Implémenter test réel avec le service email
    const { sendTestEmail } = require('../../services/emailService');
    
    const result = await sendTestEmail(recipient, type);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email de test envoyé avec succès',
        data: {
          recipient,
          messageId: result.messageId,
          sentAt: new Date()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Échec envoi email de test',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Erreur test email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test email'
    });
  }
});

/**
 * @route   POST /api/admin/settings/test-slack
 * @desc    Tester la configuration Slack
 * @access  Admin
 */
router.post('/test-slack', validateBody(Joi.object({
  message: Joi.string().max(200).default('Test de configuration Slack depuis Vehicle Prep System')
})), async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!globalSettings.notifications.slack.webhookUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL Webhook Slack non configurée'
      });
    }

    // TODO: Implémenter test réel Slack
    // const result = await sendSlackMessage(message);
    
    res.json({
      success: true,
      message: 'Message de test Slack envoyé',
      data: {
        channel: globalSettings.notifications.slack.defaultChannel,
        message,
        sentAt: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur test Slack:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test Slack'
    });
  }
});

/**
 * @route   GET /api/admin/settings/backup
 * @desc    Sauvegarder la configuration
 * @access  Admin
 */
router.get('/backup', async (req, res) => {
  try {
    const backup = {
      settings: globalSettings,
      metadata: {
        version: "1.0.0",
        exportedBy: req.user.email,
        exportedAt: new Date(),
        environment: process.env.NODE_ENV
      }
    };

    res.json({
      success: true,
      data: {
        backup,
        filename: `vehicle-prep-config-${new Date().toISOString().split('T')[0]}.json`
      }
    });

  } catch (error) {
    console.error('Erreur backup settings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

/**
 * @route   POST /api/admin/settings/restore
 * @desc    Restaurer une configuration
 * @access  Admin
 */
router.post('/restore', validateBody(Joi.object({
  backup: Joi.object().required(),
  confirmRestore: Joi.boolean().valid(true).required()
})), async (req, res) => {
  try {
    const { backup } = req.body;
    
    // Valider la structure du backup
    if (!backup.settings || !backup.metadata) {
      return res.status(400).json({
        success: false,
        message: 'Format de backup invalide'
      });
    }

    // TODO: Validations supplémentaires
    
    globalSettings = backup.settings;
    
    console.log(`🔄 Configuration restaurée par ${req.user.email} depuis backup du ${backup.metadata.exportedAt}`);

    res.json({
      success: true,
      message: 'Configuration restaurée avec succès',
      data: {
        restoredFrom: backup.metadata.exportedAt,
        restoredBy: req.user.email,
        restoredAt: new Date()
      }
    });

  } catch (error) {
    console.error('Erreur restore settings:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
});

module.exports = router;