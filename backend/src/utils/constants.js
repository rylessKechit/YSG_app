// ===== backend/src/utils/constants.js - VERSION CORRIGÉE =====

/**
 * Messages d'erreur standardisés
 */
const ERROR_MESSAGES = {
  // Erreurs générales
  SERVER_ERROR: 'Erreur interne du serveur',
  INVALID_REQUEST: 'Requête invalide',
  VALIDATION_ERROR: 'Erreur de validation des données',
  
  // Authentification
  TOKEN_REQUIRED: 'Token d\'authentification requis',
  TOKEN_INVALID: 'Token d\'authentification invalide',
  TOKEN_EXPIRED: 'Token d\'authentification expiré',
  INVALID_CREDENTIALS: 'Identifiants invalides',
  ACCESS_DENIED: 'Accès refusé',
  ADMIN_REQUIRED: 'Droits administrateur requis',
  
  // Utilisateurs
  USER_NOT_FOUND: 'Utilisateur non trouvé',
  EMAIL_ALREADY_EXISTS: 'Un utilisateur avec cet email existe déjà',
  INVALID_EMAIL: 'Format d\'email invalide',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins 6 caractères',
  CANNOT_DELETE_LAST_ADMIN: 'Impossible de supprimer le dernier administrateur',
  
  // Agences
  AGENCY_NOT_FOUND: 'Agence non trouvée',
  AGENCY_CODE_EXISTS: 'Une agence avec ce code existe déjà',
  INVALID_WORKING_HOURS: 'Horaires de travail invalides',
  
  // Plannings
  SCHEDULE_NOT_FOUND: 'Planning non trouvé',
  SCHEDULE_CONFLICT: 'Conflit de planning détecté',
  INVALID_TIME_RANGE: 'Plage horaire invalide',
  
  // Véhicules
  VEHICLE_NOT_FOUND: 'Véhicule non trouvé',
  LICENSE_PLATE_EXISTS: 'Un véhicule avec cette plaque d\'immatriculation existe déjà',
  INVALID_LICENSE_PLATE: 'Format de plaque d\'immatriculation invalide',
  
  // Préparations
  PREPARATION_NOT_FOUND: 'Préparation non trouvée',
  PREPARATION_ALREADY_STARTED: 'Une préparation est déjà en cours pour ce véhicule',
  PREPARATION_NOT_STARTED: 'Aucune préparation en cours pour ce véhicule',
  INVALID_PREPARATION_STEP: 'Étape de préparation invalide',
  
  // Pointage
  ALREADY_CLOCKED_IN: 'Vous êtes déjà pointé',
  NOT_CLOCKED_IN: 'Vous n\'êtes pas pointé',
  ALREADY_ON_BREAK: 'Vous êtes déjà en pause',
  NOT_ON_BREAK: 'Vous n\'êtes pas en pause',
  
  // Upload
  UPLOAD_FAILED: 'Échec de l\'upload du fichier',
  FILE_TOO_LARGE: 'Fichier trop volumineux',
  INVALID_FILE_TYPE: 'Type de fichier non autorisé'
};

/**
 * Messages de succès standardisés
 */
const SUCCESS_MESSAGES = {
  // Utilisateurs
  USER_CREATED: 'Utilisateur créé avec succès',
  USER_UPDATED: 'Utilisateur modifié avec succès',
  USER_DELETED: 'Utilisateur supprimé avec succès',
  
  // Authentification
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  
  // Agences
  AGENCY_CREATED: 'Agence créée avec succès',
  AGENCY_UPDATED: 'Agence modifiée avec succès',
  
  // Plannings
  SCHEDULE_CREATED: 'Planning créé avec succès',
  SCHEDULE_UPDATED: 'Planning modifié avec succès',
  
  // Préparations
  PREPARATION_STARTED: 'Préparation démarrée avec succès',
  PREPARATION_COMPLETED: 'Préparation terminée avec succès',
  
  // Pointage
  CLOCK_IN_SUCCESS: 'Pointage d\'arrivée enregistré',
  CLOCK_OUT_SUCCESS: 'Pointage de départ enregistré'
};

/**
 * Rôles utilisateurs
 */
const USER_ROLES = {
  ADMIN: 'admin',
  PREPARATEUR: 'preparateur'
};

/**
 * Statuts des préparations
 */
const PREPARATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Types de préparations
 */
const PREPARATION_TYPES = {
  ARRIVAL: 'arrival',
  DEPARTURE: 'departure',
  MAINTENANCE: 'maintenance'
};

/**
 * Étapes de préparation
 */
const PREPARATION_STEPS = {
  EXTERIOR_CHECK: 'exterior_check',
  INTERIOR_CHECK: 'interior_check',
  FUEL_CHECK: 'fuel_check',
  DOCUMENTS_CHECK: 'documents_check',
  CLEANING: 'cleaning',
  PHOTOS: 'photos',
  FINAL_CHECK: 'final_check'
};

/**
 * Statuts des pointages
 */
const TIMESHEET_STATUS = {
  CLOCKED_OUT: 'clocked_out',
  CLOCKED_IN: 'clocked_in',
  ON_BREAK: 'on_break'
};

/**
 * Types de pauses
 */
const BREAK_TYPES = {
  LUNCH: 'lunch',
  COFFEE: 'coffee',
  PERSONAL: 'personal',
  TECHNICAL: 'technical'
};

/**
 * Catégories de véhicules
 */
const VEHICLE_CATEGORIES = {
  ECONOMY: 'economy',
  COMPACT: 'compact',
  INTERMEDIATE: 'intermediate',
  STANDARD: 'standard',
  FULLSIZE: 'fullsize',
  PREMIUM: 'premium',
  LUXURY: 'luxury',
  SUV: 'suv',
  VAN: 'van'
};

/**
 * Statuts des véhicules
 */
const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  RENTED: 'rented',
  IN_PREPARATION: 'in_preparation',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
};

/**
 * Types d'incidents
 */
const INCIDENT_TYPES = {
  DAMAGE: 'damage',
  MISSING_KEY: 'missing_key',
  FUEL_PROBLEM: 'fuel_problem',
  CLEANLINESS: 'cleanliness',
  MECHANICAL: 'mechanical',
  OTHER: 'other'
};

/**
 * Statuts des plannings
 */
const SCHEDULE_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

/**
 * Limites de temps (en minutes)
 */
const TIME_LIMITS = {
  MAX_PREPARATION_TIME: 120, // 2 heures
  MAX_BREAK_TIME: 60, // 1 heure
  MIN_SHIFT_DURATION: 240, // 4 heures
  MAX_SHIFT_DURATION: 600, // 10 heures
  LATE_THRESHOLD: 15 // 15 minutes de retard
};

/**
 * Limites pour les fichiers
 */
const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ],
  MAX_FILES_PER_UPLOAD: 5
};

/**
 * Configuration de la pagination
 */
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

/**
 * Formats de date
 */
const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm',
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm'
};

/**
 * Configuration email
 */
const EMAIL_CONFIG = {
  TEMPLATES: {
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password_reset',
    NOTIFICATION: 'notification'
  },
  PRIORITIES: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high'
  }
};

/**
 * Événements du système
 */
const SYSTEM_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  PREPARATION_STARTED: 'preparation.started',
  PREPARATION_COMPLETED: 'preparation.completed',
  CLOCK_IN: 'timesheet.clock_in',
  CLOCK_OUT: 'timesheet.clock_out'
};

/**
 * Niveaux de log
 */
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Configuration cache
 */
const CACHE_CONFIG = {
  TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 3600, // 1 heure
    LONG: 86400 // 24 heures
  },
  KEYS: {
    USER_STATS: 'user_stats',
    AGENCY_LIST: 'agency_list',
    DASHBOARD_DATA: 'dashboard_data'
  }
};

module.exports = {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  USER_ROLES,
  PREPARATION_STATUS,
  PREPARATION_TYPES,
  PREPARATION_STEPS,
  TIMESHEET_STATUS,
  BREAK_TYPES,
  VEHICLE_CATEGORIES,
  VEHICLE_STATUS,
  INCIDENT_TYPES,
  SCHEDULE_STATUS,
  TIME_LIMITS,
  FILE_LIMITS,
  PAGINATION,
  DATE_FORMATS,
  EMAIL_CONFIG,
  SYSTEM_EVENTS,
  LOG_LEVELS,
  CACHE_CONFIG
};