// backend/src/utils/constants.js
// ✅ Fichier de constantes complet pour l'application

/**
 * Rôles utilisateurs
 */
const USER_ROLES = {
  ADMIN: 'admin',
  PREPARATEUR: 'preparateur',
  SUPERVISEUR: 'superviseur'
};

/**
 * Statuts des préparations
 */
const PREPARATION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold'
};

/**
 * Types de préparations
 */
const PREPARATION_TYPES = {
  STANDARD: 'standard',
  EXPRESS: 'express',
  DEEP_CLEAN: 'deep_clean',
  MAINTENANCE: 'maintenance'
};

/**
 * Étapes de préparation
 */
const PREPARATION_STEPS = {
  EXTERIOR_WASH: 'exterior_wash',
  INTERIOR_CLEAN: 'interior_clean',
  VACUUM: 'vacuum',
  WINDOWS: 'windows',
  TIRES: 'tires',
  FUEL_CHECK: 'fuel_check',
  FLUIDS_CHECK: 'fluids_check',
  LIGHTS_CHECK: 'lights_check',
  INSPECTION: 'inspection',
  FINAL_CHECK: 'final_check'
};

/**
 * Labels des étapes en français
 */
const STEP_LABELS = {
  [PREPARATION_STEPS.EXTERIOR_WASH]: 'Lavage extérieur',
  [PREPARATION_STEPS.INTERIOR_CLEAN]: 'Nettoyage intérieur',
  [PREPARATION_STEPS.VACUUM]: 'Aspirateur',
  [PREPARATION_STEPS.WINDOWS]: 'Vitres',
  [PREPARATION_STEPS.TIRES]: 'Pneus',
  [PREPARATION_STEPS.FUEL_CHECK]: 'Contrôle carburant',
  [PREPARATION_STEPS.FLUIDS_CHECK]: 'Contrôle fluides',
  [PREPARATION_STEPS.LIGHTS_CHECK]: 'Contrôle éclairage',
  [PREPARATION_STEPS.INSPECTION]: 'Inspection générale',
  [PREPARATION_STEPS.FINAL_CHECK]: 'Contrôle final'
};

/**
 * Statuts des véhicules
 */
const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
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
  PETROL: 'petrol',
  DIESEL: 'diesel',
  HYBRID: 'hybrid',
  ELECTRIC: 'electric',
  LPG: 'lpg'
};

/**
 * États des véhicules
 */
const VEHICLE_CONDITIONS = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  DAMAGED: 'damaged'
};

/**
 * Statuts des pointages
 */
const TIMESHEET_STATUS = {
  CLOCKED_OUT: 'clocked_out',
  CLOCKED_IN: 'clocked_in',
  ON_BREAK: 'on_break',
  FINISHED: 'finished'
};

/**
 * Types d'incidents
 */
const ISSUE_TYPES = {
  DAMAGE: 'damage',
  CLEANLINESS: 'cleanliness',
  MECHANICAL: 'mechanical',
  MISSING_ITEMS: 'missing_items',
  FUEL: 'fuel',
  OTHER: 'other'
};

/**
 * Niveaux de gravité des incidents
 */
const ISSUE_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Périodes pour les statistiques
 */
const STATS_PERIODS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
  CUSTOM: 'custom'
};

/**
 * Types de notifications
 */
const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  URGENT: 'urgent'
};

/**
 * Messages d'erreur standardisés
 */
const ERROR_MESSAGES = {
  // Authentification
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  TOKEN_EXPIRED: 'Session expirée, veuillez vous reconnecter',
  TOKEN_INVALID: 'Token invalide',
  ACCESS_DENIED: 'Accès refusé',
  UNAUTHORIZED: 'Non autorisé',
  
  // Utilisateurs
  USER_NOT_FOUND: 'Utilisateur non trouvé',
  USER_ALREADY_EXISTS: 'Un utilisateur avec cet email existe déjà',
  USER_INACTIVE: 'Compte utilisateur désactivé',
  
  // Agences
  AGENCY_NOT_FOUND: 'Agence non trouvée',
  AGENCY_ALREADY_EXISTS: 'Une agence avec ce code existe déjà',
  
  // Véhicules
  VEHICLE_NOT_FOUND: 'Véhicule non trouvé',
  VEHICLE_NOT_AVAILABLE: 'Véhicule non disponible',
  
  // Préparations
  PREPARATION_NOT_FOUND: 'Préparation non trouvée',
  PREPARATION_ALREADY_STARTED: 'Une préparation est déjà en cours',
  PREPARATION_COMPLETED: 'Préparation déjà terminée',
  
  // Pointages
  ALREADY_CLOCKED_IN: 'Déjà pointé',
  NOT_CLOCKED_IN: 'Pas encore pointé',
  ALREADY_ON_BREAK: 'Déjà en pause',
  NOT_ON_BREAK: 'Pas en pause',
  
  // Plannings
  SCHEDULE_NOT_FOUND: 'Planning non trouvé',
  SCHEDULE_CONFLICT: 'Conflit de planning détecté',
  
  // Validation
  INVALID_DATA: 'Données invalides',
  REQUIRED_FIELD: 'Champ requis',
  INVALID_FORMAT: 'Format invalide',
  INVALID_DATE: 'Date invalide',
  INVALID_TIME: 'Heure invalide',
  
  // Fichiers
  FILE_TOO_LARGE: 'Fichier trop volumineux',
  INVALID_FILE_TYPE: 'Type de fichier non autorisé',
  UPLOAD_FAILED: 'Échec du téléchargement',
  
  // Général
  SERVER_ERROR: 'Erreur interne du serveur',
  SERVICE_UNAVAILABLE: 'Service temporairement indisponible',
  MAINTENANCE_MODE: 'Application en maintenance',
  RATE_LIMIT: 'Trop de requêtes, veuillez patienter'
};

/**
 * Messages de succès standardisés
 */
const SUCCESS_MESSAGES = {
  // Authentification
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  
  // Utilisateurs
  USER_CREATED: 'Utilisateur créé avec succès',
  USER_UPDATED: 'Utilisateur modifié avec succès',
  USER_DELETED: 'Utilisateur supprimé avec succès',
  
  // Agences
  AGENCY_CREATED: 'Agence créée avec succès',
  AGENCY_UPDATED: 'Agence modifiée avec succès',
  AGENCY_DELETED: 'Agence supprimée avec succès',
  
  // Préparations
  PREPARATION_STARTED: 'Préparation démarrée avec succès',
  PREPARATION_COMPLETED: 'Préparation terminée avec succès',
  STEP_COMPLETED: 'Étape complétée avec succès',
  
  // Pointages
  CLOCK_IN_SUCCESS: 'Pointage d\'arrivée enregistré',
  CLOCK_OUT_SUCCESS: 'Pointage de départ enregistré',
  BREAK_START_SUCCESS: 'Début de pause enregistré',
  BREAK_END_SUCCESS: 'Fin de pause enregistrée',
  
  // Plannings
  SCHEDULE_CREATED: 'Planning créé avec succès',
  SCHEDULE_UPDATED: 'Planning modifié avec succès',
  SCHEDULE_DELETED: 'Planning supprimé avec succès',
  
  // Fichiers
  FILE_UPLOADED: 'Fichier téléchargé avec succès',
  
  // Général
  OPERATION_SUCCESS: 'Opération réussie',
  DATA_SAVED: 'Données sauvegardées avec succès'
};

/**
 * Limites temporelles
 */
const TIME_LIMITS = {
  MAX_PREPARATION_DURATION: 4 * 60, // 4 heures en minutes
  MAX_BREAK_DURATION: 2 * 60, // 2 heures en minutes
  MAX_SHIFT_DURATION: 12 * 60, // 12 heures en minutes
  MIN_BREAK_INTERVAL: 2 * 60, // 2 heures minimum entre pauses
  LATE_THRESHOLD: 15, // 15 minutes de retard toléré
  PUNCTUALITY_WINDOW: 5 // 5 minutes avant/après pour être à l'heure
};

/**
 * Limites de fichiers
 */
const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES_PER_UPLOAD: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

/**
 * Formats de date
 */
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  FRENCH: 'DD/MM/YYYY',
  TIME_24H: 'HH:mm',
  DATETIME_FR: 'DD/MM/YYYY HH:mm',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss.sssZ'
};

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG = {
  PAGINATION_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
  DEFAULT_SORT: 'createdAt',
  DEFAULT_ORDER: 'desc',
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24h en millisecondes
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d'
};

/**
 * Expressions régulières
 */
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  LICENSE_PLATE: /^[A-Z0-9\-\s]{2,15}$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  AGENCY_CODE: /^[A-Z0-9]{2,10}$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
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