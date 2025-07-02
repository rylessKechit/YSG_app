export const APP_CONFIG = {
  name: 'Vehicle Prep Admin',
  company: 'SIXT',
  version: '1.0.0',
} as const;

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    profile: '/auth/me',
    refresh: '/auth/refresh',
  },
  admin: {
    users: '/admin/users',
    agencies: '/admin/agencies',
    schedules: '/admin/schedules',
    dashboard: '/admin/dashboard',
    reports: '/admin/reports',
  },
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  PREPARATEUR: 'preparateur',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

// ===== CONSTANTES TIMESHEETS =====

export const TIMESHEET_STATUS = {
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
  VALIDATED: 'validated',
  DISPUTED: 'disputed'
} as const;

export const COMPARISON_STATUS = {
  ON_TIME: 'on_time',
  LATE: 'late',
  SLIGHT_DELAY: 'slight_delay',
  MISSING: 'missing',
  DISPUTED: 'disputed',
  EARLY_LEAVE: 'early_leave',
  NO_SCHEDULE: 'no_schedule'
} as const;

export const TIMESHEET_FILTERS = {
  STATUS: {
    ALL: 'all',
    INCOMPLETE: 'incomplete',
    COMPLETE: 'complete',
    VALIDATED: 'validated',
    DISPUTED: 'disputed'
  },
  SORT: {
    DATE: 'date',
    USER: 'user',
    AGENCY: 'agency',
    START_TIME: 'startTime',
    DELAY: 'delays.startDelay'
  }
} as const;

export const BULK_ACTIONS = {
  VALIDATE: 'validate',
  DISPUTE: 'dispute',
  DELETE: 'delete',
  EXPORT: 'export'
} as const;

// ===== SEUILS ET LIMITES =====

export const PUNCTUALITY_THRESHOLDS = {
  ON_TIME_MAX: 5, // minutes
  SLIGHT_DELAY_MAX: 15, // minutes
  LATE_CRITICAL: 30 // minutes
} as const;

export const TIME_FORMATS = {
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATE: 'dd/MM/yyyy',
  DISPLAY_DATETIME: 'dd/MM/yyyy HH:mm',
  API_DATE: 'yyyy-MM-dd',
  API_DATETIME: "yyyy-MM-dd'T'HH:mm:ss"
} as const;

// ===== COULEURS POUR L'UI =====

export const STATUS_COLORS = {
  // Statuts timesheet
  incomplete: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200'
  },
  complete: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200'
  },
  validated: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200'
  },
  disputed: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  
  // Statuts comparaison
  on_time: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200'
  },
  late: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  slight_delay: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200'
  },
  missing: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-200'
  },
  early_leave: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200'
  },
  no_schedule: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200'
  }
} as const;

// ===== ICÔNES POUR LES STATUTS =====

export const STATUS_ICONS = {
  incomplete: 'Clock',
  complete: 'CheckCircle',
  validated: 'Shield',
  disputed: 'AlertTriangle',
  on_time: 'Check',
  late: 'AlertCircle',
  slight_delay: 'Clock',
  missing: 'X',
  early_leave: 'ArrowLeft',
  no_schedule: 'Calendar'
} as const;

// ===== LABELS POUR L'UI =====

export const STATUS_LABELS = {
  // Timesheets
  incomplete: 'Incomplet',
  complete: 'Complet',
  validated: 'Validé',
  disputed: 'En litige',
  
  // Comparaisons
  on_time: 'Ponctuel',
  late: 'En retard',
  slight_delay: 'Léger retard',
  missing: 'Manquant',
  early_leave: 'Parti tôt',
  no_schedule: 'Sans planning'
} as const;

// ===== COLONNES DE TABLE =====

export const TIMESHEET_TABLE_COLUMNS = [
  { key: 'user', label: 'Employé', sortable: true },
  { key: 'agency', label: 'Agence', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
  { key: 'schedule', label: 'Planning', sortable: false },
  { key: 'timesheet', label: 'Pointage', sortable: false },
  { key: 'variance', label: 'Écart', sortable: true },
  { key: 'status', label: 'Statut', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false }
] as const;

export const COMPARISON_TABLE_COLUMNS = [
  { key: 'employee', label: 'Employé', sortable: true },
  { key: 'plannedSchedule', label: 'Planning Prévu', sortable: false },
  { key: 'actualTimesheet', label: 'Pointage Réel', sortable: false },
  { key: 'variance', label: 'Écart', sortable: true },
  { key: 'status', label: 'Statut', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false }
] as const;

// ===== ROUTES API =====

export const TIMESHEET_API_ROUTES = {
  LIST: '/admin/timesheets',
  DETAIL: (id: string) => `/admin/timesheets/${id}`,
  CREATE: '/admin/timesheets',
  UPDATE: (id: string) => `/admin/timesheets/${id}`,
  DELETE: (id: string) => `/admin/timesheets/${id}`,
  BULK_ACTIONS: '/admin/timesheets/bulk-actions',
  
  // Comparaison
  COMPARE: '/admin/timesheets/compare',
  MISSING: '/admin/timesheets/compare/missing',
  
  // Stats
  STATS: '/admin/timesheets/stats',
  PUNCTUALITY: '/admin/timesheets/stats/punctuality'
} as const;

// ===== TYPE HELPERS =====

export type TimesheetStatusType = keyof typeof TIMESHEET_STATUS;
export type ComparisonStatusType = keyof typeof COMPARISON_STATUS;
export type BulkActionType = keyof typeof BULK_ACTIONS;