// Rôles utilisateurs
const USER_ROLES = {
  ADMIN: 'admin',
  PREPARATEUR: 'preparateur'
};

// Statuts des véhicules
const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  IN_PREPARATION: 'in_preparation',
  READY: 'ready',
  RENTED: 'rented'
};

// Statuts des préparations
const PREPARATION_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Types d'étapes de préparation
const PREPARATION_STEPS = {
  EXTERIOR: 'exterior',
  INTERIOR: 'interior',
  FUEL: 'fuel',
  TIRES_FLUIDS: 'tires_fluids',
  SPECIAL_WASH: 'special_wash',
  PARKING: 'parking'
};

// Labels des étapes pour l'affichage
const STEP_LABELS = {
  [PREPARATION_STEPS.EXTERIOR]: 'Préparation extérieure',
  [PREPARATION_STEPS.INTERIOR]: 'Préparation intérieure',
  [PREPARATION_STEPS.FUEL]: 'Mise à niveau essence',
  [PREPARATION_STEPS.TIRES_FLUIDS]: 'Pression pneus + lave-glace',
  [PREPARATION_STEPS.SPECIAL_WASH]: 'Lavage spécial',
  [PREPARATION_STEPS.PARKING]: 'Stationnement'
};

// Limites de temps
const TIME_LIMITS = {
  PREPARATION_MAX_MINUTES: 30, // Temps maximum pour une préparation
  LATE_THRESHOLD_MINUTES: 15,  // Seuil de retard pour les alertes
  BREAK_MAX_MINUTES: 60        // Pause maximum autorisée
};

// Tailles de fichiers
const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png']
};

// Formats de date/heure
const DATE_FORMATS = {
  TIME: 'HH:mm',           // Format heure (08:30)
  DATE: 'YYYY-MM-DD',      // Format date (2024-01-15)
  DATETIME: 'YYYY-MM-DD HH:mm:ss', // Format datetime complet
  DISPLAY_DATE: 'DD/MM/YYYY',      // Format affichage français
  DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm' // Format affichage français avec heure
};

// Messages d'erreur communs
const ERROR_MESSAGES = {
  // Authentification
  INVALID_CREDENTIALS: 'Identifiants invalides',
  TOKEN_REQUIRED: 'Token d\'authentification requis',
  TOKEN_INVALID: 'Token invalide',
  TOKEN_EXPIRED: 'Token expiré',
  ACCESS_DENIED: 'Accès refusé',
  ADMIN_REQUIRED: 'Droits administrateur requis',

  // Utilisateurs
  USER_NOT_FOUND: 'Utilisateur non trouvé',
  USER_ALREADY_EXISTS: 'Cet utilisateur existe déjà',
  USER_INACTIVE: 'Compte utilisateur désactivé',

  // Agences
  AGENCY_NOT_FOUND: 'Agence non trouvée',
  AGENCY_CODE_EXISTS: 'Ce code d\'agence existe déjà',

  // Pointages
  ALREADY_CLOCKED_IN: 'Vous avez déjà pointé votre arrivée',
  ALREADY_CLOCKED_OUT: 'Vous avez déjà pointé votre départ',
  NOT_CLOCKED_IN: 'Vous devez d\'abord pointer votre arrivée',
  BREAK_ALREADY_STARTED: 'Vous avez déjà commencé votre pause',
  BREAK_NOT_STARTED: 'Vous devez d\'abord commencer votre pause',

  // Préparations
  VEHICLE_NOT_FOUND: 'Véhicule non trouvé',
  VEHICLE_NOT_AVAILABLE: 'Véhicule non disponible',
  PREPARATION_NOT_FOUND: 'Préparation non trouvée',
  PREPARATION_ALREADY_COMPLETED: 'Préparation déjà terminée',
  NO_STEPS_COMPLETED: 'Au moins une étape doit être complétée',

  // Fichiers
  FILE_TOO_LARGE: 'Fichier trop volumineux',
  INVALID_FILE_TYPE: 'Type de fichier non autorisé',
  UPLOAD_FAILED: 'Échec de l\'upload',

  // Général
  VALIDATION_ERROR: 'Erreur de validation',
  SERVER_ERROR: 'Erreur interne du serveur',
  NOT_FOUND: 'Ressource non trouvée'
};

// Messages de succès
const SUCCESS_MESSAGES = {
  // Authentification
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT_SUCCESS: 'Déconnexion réussie',

  // Utilisateurs
  USER_CREATED: 'Utilisateur créé avec succès',
  USER_UPDATED: 'Utilisateur modifié avec succès',
  USER_DELETED: 'Utilisateur supprimé avec succès',

  // Pointages
  CLOCK_IN_SUCCESS: 'Début de service pointé',
  CLOCK_OUT_SUCCESS: 'Fin de service pointée',
  BREAK_START_SUCCESS: 'Début de pause pointé',
  BREAK_END_SUCCESS: 'Fin de pause pointée',

  // Préparations
  PREPARATION_STARTED: 'Préparation démarrée',
  PREPARATION_COMPLETED: 'Préparation terminée',
  STEP_COMPLETED: 'Étape terminée',

  // Général
  OPERATION_SUCCESS: 'Opération réussie'
};

// Configuration email
const EMAIL_CONFIG = {
  TEMPLATES: {
    LATE_ALERT: 'late_alert',
    ABSENCE_ALERT: 'absence_alert',
    OVERTIME_ALERT: 'overtime_alert'
  }
};

// Configuration Cloudinary
const CLOUDINARY_CONFIG = {
  FOLDERS: {
    PREPARATIONS: 'vehicle-preparations',
    AVATARS: 'user-avatars',
    TEMP: 'temp'
  },
  TRANSFORMATIONS: {
    THUMBNAIL: 'w_300,h_300,c_fill,q_auto',
    MEDIUM: 'w_800,h_600,c_fit,q_auto',
    COMPRESS: 'q_auto:good,f_auto'
  }
};

module.exports = {
  USER_ROLES,
  VEHICLE_STATUS,
  PREPARATION_STATUS,
  PREPARATION_STEPS,
  STEP_LABELS,
  TIME_LIMITS,
  FILE_LIMITS,
  DATE_FORMATS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  EMAIL_CONFIG,
  CLOUDINARY_CONFIG
};