// backend/src/utils/constants.js
// ✅ Fichier de constantes harmonisé avec le frontend

/**
 * Limites de temps (en minutes)
 */
const TIME_LIMITS = {
  PREPARATION_TIME: 30,           // Temps max pour une préparation
  BREAK_MIN_DURATION: 15,         // Pause minimum 15min
  BREAK_MAX_DURATION: 90,         // Pause maximum 1h30
  SHIFT_MIN_DURATION: 240,        // Service minimum 4h
  SHIFT_MAX_DURATION: 600,        // Service maximum 10h
  LATE_THRESHOLD: 15,             // Retard considéré à partir de 15min
  OVERTIME_THRESHOLD: 480         // Heures sup à partir de 8h
};

/**
 * Limites de fichiers
 */
const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024,      // 5MB
  MAX_FILES: 5,                   // 5 fichiers max
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp']
};

/**
 * Messages d'erreur standardisés
 */
const ERROR_MESSAGES = {
  // Authentification
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  TOKEN_EXPIRED: 'Session expirée, veuillez vous reconnecter',
  ACCESS_DENIED: 'Accès refusé',
  USER_NOT_FOUND: 'Utilisateur non trouvé',
  
  // Validation
  INVALID_DATA: 'Données invalides',
  MISSING_REQUIRED_FIELD: 'Champ requis manquant',
  INVALID_EMAIL: 'Format d\'email invalide',
  INVALID_PASSWORD: 'Mot de passe trop faible',
  
  // Préparations
  PREPARATION_NOT_FOUND: 'Préparation non trouvée',
  PREPARATION_ALREADY_COMPLETED: 'Préparation déjà terminée',
  STEP_ALREADY_COMPLETED: 'Étape déjà complétée',
  PHOTO_REQUIRED: 'Photo requise pour compléter l\'étape',
  
  // Véhicules
  VEHICLE_NOT_FOUND: 'Véhicule non trouvé',
  VEHICLE_ALREADY_IN_USE: 'Véhicule déjà en cours de préparation',
  LICENSE_PLATE_EXISTS: 'Cette plaque d\'immatriculation existe déjà',
  
  // Pointage
  ALREADY_CLOCKED_IN: 'Déjà pointé',
  NOT_CLOCKED_IN: 'Pas encore pointé',
  ALREADY_ON_BREAK: 'Déjà en pause',
  NOT_ON_BREAK: 'Pas en pause actuellement',
  
  // Système
  SERVER_ERROR: 'Erreur interne du serveur',
  DATABASE_ERROR: 'Erreur de base de données',
  UPLOAD_FAILED: 'Échec de l\'upload du fichier'
};

/**
 * Messages de succès
 */
const SUCCESS_MESSAGES = {
  USER_CREATED: 'Utilisateur créé avec succès',
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  PREPARATION_STARTED: 'Préparation démarrée avec succès',
  PREPARATION_COMPLETED: 'Préparation terminée avec succès',
  STEP_COMPLETED: 'Étape complétée avec succès',
  PHOTO_UPLOADED: 'Photo uploadée avec succès',
  CLOCK_IN_SUCCESS: 'Pointage d\'arrivée enregistré',
  CLOCK_OUT_SUCCESS: 'Pointage de départ enregistré',
  BREAK_START_SUCCESS: 'Début de pause enregistré',
  BREAK_END_SUCCESS: 'Fin de pause enregistrée'
};

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
 * ✅ ÉTAPES DE PRÉPARATION - HARMONISÉES AVEC LE FRONTEND
 * Ces valeurs correspondent exactement à celles utilisées dans le frontend
 */
const PREPARATION_STEPS = {
  EXTERIOR: 'exterior',
  INTERIOR: 'interior', 
  FUEL: 'fuel',
  SPECIAL_WASH: 'special_wash',
};

const DEFAULT_STEPS = [
  'exterior',
  'interior',
  'fuel',
  'special_wash',
];

/**
 * ✅ LISTE ORDONNÉE DES ÉTAPES (pour validation et initialisation)
 */
const PREPARATION_STEPS_ORDER = [
  PREPARATION_STEPS.EXTERIOR,      // 'exterior'
  PREPARATION_STEPS.INTERIOR,      // 'interior'
  PREPARATION_STEPS.FUEL,          // 'fuel'
  PREPARATION_STEPS.TIRES_FLUIDS,  // 'tires_fluids'
  PREPARATION_STEPS.SPECIAL_WASH,  // 'special_wash'
  PREPARATION_STEPS.PARKING        // 'parking'
];

/**
 * ✅ LABELS DES ÉTAPES EN FRANÇAIS (harmonisés avec le frontend)
 */
const STEP_LABELS = {
  [PREPARATION_STEPS.EXTERIOR]: 'Extérieur',
  [PREPARATION_STEPS.INTERIOR]: 'Intérieur',
  [PREPARATION_STEPS.FUEL]: 'Carburant',
  [PREPARATION_STEPS.TIRES_FLUIDS]: 'Pneus & Fluides',
  [PREPARATION_STEPS.SPECIAL_WASH]: 'Lavage Spécial',
  [PREPARATION_STEPS.PARKING]: 'Stationnement'
};

/**
 * ✅ DESCRIPTIONS DES ÉTAPES (harmonisées avec le frontend)
 */
const STEP_DESCRIPTIONS = {
  [PREPARATION_STEPS.EXTERIOR]: 'Nettoyage carrosserie, vitres, jantes',
  [PREPARATION_STEPS.INTERIOR]: 'Aspirateur, nettoyage surfaces, désinfection',
  [PREPARATION_STEPS.FUEL]: 'Vérification niveau, ajout si nécessaire',
  [PREPARATION_STEPS.TIRES_FLUIDS]: 'Pression pneus, niveaux huile/liquides',
  [PREPARATION_STEPS.SPECIAL_WASH]: 'Traitement anti-bactérien, parfums',
  [PREPARATION_STEPS.PARKING]: 'Positionnement final, vérification clés'
};

/**
 * ✅ ICÔNES DES ÉTAPES (harmonisées avec le frontend)
 */
const STEP_ICONS = {
  [PREPARATION_STEPS.EXTERIOR]: '🚗',
  [PREPARATION_STEPS.INTERIOR]: '🧽',
  [PREPARATION_STEPS.FUEL]: '⛽',
  [PREPARATION_STEPS.TIRES_FLUIDS]: '🔧',
  [PREPARATION_STEPS.SPECIAL_WASH]: '✨',
  [PREPARATION_STEPS.PARKING]: '🅿️'
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
  ESSENCE: 'essence',
  DIESEL: 'diesel',
  ELECTRIQUE: 'electrique',
  HYBRIDE: 'hybride'
};

/**
 * Conditions des véhicules
 */
const VEHICLE_CONDITIONS = {
  EXCELLENT: 'excellent',
  BON: 'bon',
  CORRECT: 'correct',
  MEDIOCRE: 'mediocre'
};

/**
 * Statuts des pointages
 */
const TIMESHEET_STATUS = {
  WORKING: 'working',
  ON_BREAK: 'on_break',
  FINISHED: 'finished',
  ABSENT: 'absent'
};

/**
 * Types d'incidents
 */
const ISSUE_TYPES = {
  DAMAGE: 'damage',              // Dommage
  MISSING_ITEM: 'missing_item',  // Objet manquant
  MALFUNCTION: 'malfunction',    // Dysfonctionnement
  CLEANLINESS: 'cleanliness',    // Propreté insuffisante
  FUEL: 'fuel',                  // Problème carburant
  OTHER: 'other'                 // Autre
};

/**
 * Niveaux de gravité des incidents
 */
const ISSUE_SEVERITY = {
  LOW: 'low',        // Faible
  MEDIUM: 'medium',  // Moyen
  HIGH: 'high'       // Élevé
};

/**
 * Périodes pour les statistiques
 */
const STATS_PERIODS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year'
};

/**
 * Types de notifications
 */
const NOTIFICATION_TYPES = {
  LATE_ARRIVAL: 'late_arrival',
  LATE_DEPARTURE: 'late_departure',
  PREPARATION_DELAY: 'preparation_delay',
  ISSUE_REPORTED: 'issue_reported',
  SYSTEM_ALERT: 'system_alert'
};

/**
 * Formats de date
 */
const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATETIME: 'DD/MM/YYYY à HH:mm'
};

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG = {
  PREPARATION_TIMEOUT: 30,        // 30 minutes max
  BREAK_REMINDER: 4 * 60,         // Rappel pause après 4h
  LATE_ALERT_DELAY: 15,           // Alerte retard après 15min
  PAGINATION_LIMIT: 20,           // 20 éléments par page
  MAX_PREPARATION_HISTORY: 100    // 100 préparations max dans l'historique
};

/**
 * Expressions régulières de validation
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
  FOLDERS: {
    PREPARATIONS: 'vehicle-prep/preparations',
    INCIDENTS: 'vehicle-prep/incidents',
    PROFILES: 'vehicle-prep/profiles'
  },
  MAX_FILE_SIZE: FILE_LIMITS.MAX_SIZE,
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  QUALITY: 'auto:good',
  FETCH_FORMAT: 'auto'
};

/**
 * ✅ FONCTION UTILITAIRE : Obtenir les étapes par défaut pour une nouvelle préparation
 */
const getDefaultPreparationSteps = () => {
  return PREPARATION_STEPS_ORDER.map(step => ({
    step,
    completed: false,
    notes: '',
    photos: []
  }));
};

/**
 * ✅ FONCTION UTILITAIRE : Valider qu'une étape est valide
 */
const isValidPreparationStep = (stepName) => {
  return PREPARATION_STEPS_ORDER.includes(stepName);
};

/**
 * ✅ FONCTION UTILITAIRE : Obtenir les informations d'une étape
 */
const getStepInfo = (stepName) => {
  if (!isValidPreparationStep(stepName)) {
    return null;
  }
  
  return {
    step: stepName,
    label: STEP_LABELS[stepName],
    description: STEP_DESCRIPTIONS[stepName],
    icon: STEP_ICONS[stepName]
  };
};

// ===== EXPORTS =====

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
  
  // ✅ Étapes harmonisées avec le frontend
  PREPARATION_STEPS,
  DEFAULT_STEPS,
  PREPARATION_STEPS_ORDER,
  STEP_LABELS,
  STEP_DESCRIPTIONS,
  STEP_ICONS,
  
  // Autres enums
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
  CLOUDINARY_CONFIG,
  
  // ✅ Fonctions utilitaires
  getDefaultPreparationSteps,
  isValidPreparationStep,
  getStepInfo
};