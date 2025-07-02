// admin-app/src/lib/api/index.ts - MISE À JOUR AVEC TIMESHEETS

// ===== EXPORTS EXISTANTS =====
export * from './client';
export * from './auth';
export * from './dashboard';
export * from './users';
export * from './agencies';

// ===== NOUVEAU EXPORT TIMESHEETS =====
export * from './timesheets';

// ===== EXPORT CENTRALISÉ DE TOUS LES SERVICES API =====
export { authApi } from './auth';
export { dashboardApi } from './dashboard';
export { usersApi } from './users';
export { agenciesApi } from './agencies';
export { timesheetsApi } from './timesheets'; // NOUVEAU

// ===== RÉEXPORTS SPÉCIFIQUES POUR ÉVITER LES CONFLITS =====
export type {
  // API Client de base
  ApiResponse,
  ApiError,
  
  // Users API - Renommé pour éviter conflit
  BulkActionData as UserBulkActionData
} from './users';

export type {
  // Timesheets API - Renommé pour éviter conflit  
  BulkActionData as TimesheetBulkActionData
} from './timesheets';