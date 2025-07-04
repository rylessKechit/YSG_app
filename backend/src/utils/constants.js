// backend/src/utils/constants.js
// ✅ Constantes complètes et corrigées

/**
 * Limites de temps (en minutes)
 */
const TIME_LIMITS = {
  PREPARATION_TIME: 30,        // Temps maximum pour une préparation
  BREAK_TIME: 60,              // Temps maximum de pause
  LATE_THRESHOLD: 15,          // Seuil de retard en minutes
  SESSION_TIMEOUT: 480,        // Timeout session (8h)
  TOKEN_EXPIRE: 10080          // Expiration token (7 jours en minutes)
};

/**
 * Limites de fichiers pour les uploads
 */
const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024,   // 5MB
  MAX_FILES: 10,               // Maximum 10 fichiers par upload
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ]
};

/**
 * Messages d'erreur standardisés
 */
const ERROR_MESSAGES = {
  // Authentification
  TOKEN_REQUIRED: 'Token d\'authentification requis',
  TOKEN_INVALID: 'Token invalide',
  TOKEN_EXPIRED: 'Token expiré',
  CREDENTIALS_INVALID: 'Identifiants invalides',
  USER_NOT_FOUND: 'Utilisateur non trouvé',
  ACCOUNT_DISABLED: 'Compte désactivé',
  ACCESS_DENIED: 'Accès refusé',
  ADMIN_REQUIRED: 'Droits administrateur requis',
  
  // Validation
  VALIDATION_ERROR: 'Erreur de validation',
  REQUIRED_FIELD: 'Champ requis',
  INVALID_FORMAT: 'Format invalide',
  INVALID_EMAIL: 'Format d\'email invalide',
  PASSWORD_TOO_SHORT: 'Mot de passe trop court (minimum 6 caractères)',
  
  // Ressources
  RESOURCE_NOT_FOUND: 'Ressource non trouvée',
  DUPLICATE_ENTRY: 'Entrée déjà existante',
  REFERENCE_ERROR: 'Référence invalide',
  
  // Préparations
  PREPARATION_NOT_FOUND: 'Préparation non trouvée',
  PREPARATION_ALREADY_EXISTS: 'Une préparation est déjà en cours',
  PREPARATION_COMPLETED: 'Préparation déjà terminée',
  INVALID_PREPARATION_STATUS: 'Statut de préparation invalide',
  INVALID_PREPARATION_STEP: 'Étape de préparation invalide',
  STEP_ALREADY_COMPLETED: 'Cette étape est déjà complétée',
  STEP_NOT_AVAILABLE: 'Cette étape n\'est pas encore disponible',
  
  // Véhicules
  VEHICLE_NOT_FOUND: 'Véhicule non trouvé',
  VEHICLE_IN_USE: 'Véhicule en cours d\'utilisation',
  INVALID_LICENSE_PLATE: 'Plaque d\'immatriculation invalide',
  
  // Agences
  AGENCY_NOT_FOUND: 'Agence non trouvée',
  AGENCY_ACCESS_DENIED: 'Accès à cette agence non autorisé',
  INVALID_AGENCY: 'Agence invalide',
  
  // Pointage
  ALREADY_CLOCKED_IN: 'Vous êtes déjà pointé',
  NOT_CLOCKED_IN: 'Vous n\'êtes pas pointé',
  ALREADY_ON_BREAK: 'Vous êtes déjà en pause',
  NOT_ON_BREAK: 'Vous n\'êtes pas en pause',
  INVALID_TIMESHEET: 'Feuille de temps invalide',
  
  // Upload
  UPLOAD_FAILED: 'Échec de l\'upload du fichier',
  FILE_TOO_LARGE: 'Fichier trop volumineux',
  INVALID_FILE_TYPE: 'Type de fichier non autorisé',
  PHOTO_REQUIRED: 'Photo requise',
  
  // Serveur
  SERVER_ERROR: 'Erreur serveur interne',
  DATABASE_ERROR: 'Erreur de base de données',
  EXTERNAL_API_ERROR: 'Erreur API externe'
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
  PASSWORD_CHANGED: 'Mot de passe modifié avec succès',
  
  // Agences
  AGENCY_CREATED: 'Agence créée avec succès',
  AGENCY_UPDATED: 'Agence modifiée avec succès',
  AGENCY_DELETED: 'Agence supprimée avec succès',
  
  // Plannings
  SCHEDULE_CREATED: 'Planning créé avec succès',
  SCHEDULE_UPDATED: 'Planning modifié avec succès',
  SCHEDULE_DELETED: 'Planning supprimé avec succès',
  
  // Préparations
  PREPARATION_STARTED: 'Préparation démarrée avec succès',
  PREPARATION_COMPLETED: 'Préparation terminée avec succès',
  STEP_COMPLETED: 'Étape complétée avec succès',
  ISSUE_REPORTED: 'Incident signalé avec succès',
  
  // Pointage
  CLOCK_IN_SUCCESS: 'Pointage d\'arrivée enregistré',
  CLOCK_OUT_SUCCESS: 'Pointage de départ enregistré',
  BREAK_START_SUCCESS: 'Début de pause enregistré',
  BREAK_END_SUCCESS: 'Fin de pause enregistrée',
  
  // Upload
  UPLOAD_SUCCESS: 'Fichier uploadé avec succès',
  PHOTO_UPLOADED: 'Photo uploadée avec succès'
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
  ARRIVAL: 'arrival',           // Préparation d'arrivée
  DEPARTURE: 'departure',       // Préparation de départ
  MAINTENANCE: 'maintenance',   // Maintenance
  CLEANING: 'cleaning'          // Nettoyage seul
};

/**
 * ✅ Étapes de préparation (CORRIGÉ pour correspondre au modèle)
 */
const PREPARATION_STEPS = {
  EXTERIOR: 'exterior',
  INTERIOR: 'interior', 
  FUEL: 'fuel',
  TIRES_FLUIDS: 'tires_fluids',
  SPECIAL_WASH: 'special_wash',
  PARKING: 'parking'
};

/**
 * Labels des étapes de préparation
 */
const STEP_LABELS = {
  [PREPARATION_STEPS.EXTERIOR]: 'Préparation extérieure',
  [PREPARATION_STEPS.INTERIOR]: 'Préparation intérieure', 
  [PREPARATION_STEPS.FUEL]: 'Mise à niveau carburant',
  [PREPARATION_STEPS.TIRES_FLUIDS]: 'Pression pneus & fluides',
  [PREPARATION_STEPS.SPECIAL_WASH]: 'Lavage spécial',
  [PREPARATION_STEPS.PARKING]: 'Stationnement final'
};

/**
 * Statuts des véhicules
 */
const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  IN_PREPARATION: 'in_preparation',
  READY: 'ready',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
};

/**
 * Types de carburant
 */
const FUEL_TYPES = {
  ESSENCE: 'essence',
  DIESEL: 'diesel',
  ELECTRIQUE: 'electrique',
  HYBRIDE: 'hybride',
  GAZ: 'gaz'
};

/**
 * États des véhicules
 */
const VEHICLE_CONDITIONS = {
  EXCELLENT: 'excellent',
  BON: 'bon',
  CORRECT: 'correct',
  MEDIOCRE: 'mediocre',
  MAUVAIS: 'mauvais'
};

/**
 * Statuts des pointages
 */
const TIMESHEET_STATUS = {
  CLOCKED_IN: 'clocked_in',
  CLOCKED_OUT: 'clocked_out',
  ON_BREAK: 'on_break',
  NOT_WORKING: 'not_working'
};

/**
 * Types d'incidents
 */
const ISSUE_TYPES = {
  DAMAGE: 'damage',                // Dommage
  MISSING_ITEM: 'missing_item',    // Élément manquant
  CLEANLINESS: 'cleanliness',      // Propreté
  MECHANICAL: 'mechanical',        // Mécanique
  ELECTRICAL: 'electrical',        // Électrique
  OTHER: 'other'                   // Autre
};

/**
 * Niveaux de gravité des incidents
 */
const ISSUE_SEVERITY = {
  LOW: 'low',      // Faible
  MEDIUM: 'medium', // Moyen
  HIGH: 'high'     // Élevé
};

/**
 * Périodes pour les statistiques
 */
const STATS_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year'
};

/**
 * Types de notifications
 */
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Formats de date
 */
const DATE_FORMATS = {
  DATE_ONLY: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME_ONLY: 'HH:mm',
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm'
};

/**
 * Configurations par défaut
 */
const DEFAULT_CONFIG = {
  PAGINATION_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
  DEFAULT_SORT: 'createdAt',
  DEFAULT_ORDER: 'desc',
  SESSION_DURATION: 8, // heures
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 // minutes
};

/**
 * Expressions régulières utiles
 */
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  LICENSE_PLATE: /^[A-Z0-9\-\s]{2,15}$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  AGENCY_CODE: /^[A-Z0-9]{2,10}$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/
};

/**
 * URLs et endpoints externes
 */
const EXTERNAL_APIS = {
  CLOUDINARY_BASE: 'https://api.cloudinary.com/v1_1',
  MAPS_API: process.env.MAPS_API_URL,
  WEATHER_API: process.env.WEATHER_API_URL
};

/**
 * Configurations Cloudinary
 */
const CLOUDINARY_CONFIG = {
  FOLDER_PREPARATIONS: 'preparations',
  FOLDER_INCIDENTS: 'incidents',
  FOLDER_PROFILES: 'profiles',
  MAX_FILE_SIZE: FILE_LIMITS.MAX_SIZE,
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  QUALITY: 'auto:good',
  FETCH_FORMAT: 'auto'
};

module.exports = {
  // Limites
  TIME_LIMITS,
  FILE_LIMITS,
  
  // Messages
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  
  // Enums principaux
  USER_ROLES,
  PREPARATION_STATUS,
  PREPARATION_TYPES,
  PREPARATION_STEPS,
  STEP_LABELS,
  VEHICLE_STATUS,
  FUEL_TYPES,
  VEHICLE_CONDITIONS,
  TIMESHEET_STATUS,
  ISSUE_TYPES,
  ISSUE_SEVERITY,
  STATS_PERIODS,
  NOTIFICATION_TYPES,
  
  // Configuration
  DATE_FORMATS,
  DEFAULT_CONFIG,
  REGEX_PATTERNS,
  EXTERNAL_APIS,
  CLOUDINARY_CONFIG
};