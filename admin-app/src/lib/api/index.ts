// admin-app/src/lib/api/index.ts - VERSION CORRIGÉE SANS CONFLITS

import { ApiResponse } from './client';

// ===== EXPORTS DE BASE =====
export * from './client';
export * from './auth';
export * from './dashboard';

// ===== EXPORTS SPÉCIFIQUES POUR ÉVITER LES CONFLITS =====

// Types communs réexportés depuis client
export type { ApiResponse } from './client';

// Users - avec renommage pour éviter les conflits
export { usersApi } from './users';
export type { 
  UserFilters,
  UserCreateData,
  UserUpdateData,
  UserStats,
  UserListData,
  BulkActionData as UserBulkActionData // ✅ Renommé pour éviter conflit
} from './users';

// Import explicit for UserBulkActionData to use in this file
import type { BulkActionData as UserBulkActionData } from './users';
// Import explicit for AgencyBulkActionData to use in this file
import type { BulkActionData as AgencyBulkActionData } from './agencies';
// Import explicit for TimesheetBulkActionData to use in this file
import type { BulkActionData as TimesheetBulkActionData } from './timesheets';

// Helpers Users avec renommage
export { 
  isValidUserListData,
  normalizePagination as normalizeUserPagination // ✅ Renommé pour éviter conflit
} from './users';

// Agencies - avec renommage pour éviter les conflits
export { agenciesApi } from './agencies';
export type {
  BulkActionData as AgencyBulkActionData // ✅ Renommé pour éviter conflit
} from './agencies';

// Helpers Agencies avec renommage
export {
  isValidAgencyListData,
  normalizePagination as normalizeAgencyPagination, // ✅ Renommé pour éviter conflit
  cleanFilters as cleanAgencyFilters // ✅ Renommé pour éviter conflit
} from './agencies';

// Timesheets - avec renommage pour éviter les conflits
export { timesheetsApi } from './timesheets';
export type {
  BulkActionData as TimesheetBulkActionData,
} from './timesheets';

// Helpers Timesheets avec renommage
export {
  isValidTimesheetListData,
  isValidComparisonData,
  isValidStatsData,
  cleanTimesheetFilters,
  normalizePagination as normalizeTimesheetPagination // ✅ Renommé pour éviter conflit
} from './timesheets';

// ===== EXPORT GLOBAL DE TOUS LES SERVICES API =====
export const apiServices = {
  auth: () => import('./auth').then(m => m.authApi),
  dashboard: () => import('./dashboard').then(m => m.dashboardApi),
  users: () => import('./users').then(m => m.usersApi),
  agencies: () => import('./agencies').then(m => m.agenciesApi),
  timesheets: () => import('./timesheets').then(m => m.timesheetsApi),
} as const;

// ===== TYPES UTILITAIRES =====
export type ApiServiceType = keyof typeof apiServices;

// ===== HELPERS GLOBAUX =====

/**
 * Helper pour normaliser la pagination selon le contexte
 */
export function normalizePagination(pagination: any, context: 'users' | 'agencies' | 'timesheets' = 'users') {
  const normalized = {
    ...pagination,
    pages: pagination.pages || pagination.totalPages || 1,
    totalPages: pagination.totalPages || pagination.pages || 1,
    hasNext: pagination.hasNext ?? (pagination.page < (pagination.pages || pagination.totalPages || 1)),
    hasPrev: pagination.hasPrev ?? (pagination.page > 1),
  };

  // Log pour debug si nécessaire
  if (process.env.NODE_ENV === 'development') {
    console.log(`📄 [${context}] Pagination normalisée:`, { original: pagination, normalized });
  }

  return normalized;
}

/**
 * Type guard générique pour ApiResponse
 */
export function isValidApiResponse<T>(data: any): data is ApiResponse<T> {
  return (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    'data' in data &&
    typeof data.success === 'boolean'
  );
}

/**
 * Helper pour créer des BulkActionData selon le type
 */
export function createBulkActionData<T extends 'users' | 'agencies' | 'timesheets'>(
  type: T,
  action: string,
  ids: string[],
  params?: any
): T extends 'users' ? UserBulkActionData : 
   T extends 'agencies' ? AgencyBulkActionData : 
   TimesheetBulkActionData {
  
  const baseData = {
    action,
    [`${type.slice(0, -1)}Ids`]: ids, // userIds, agencyIds, timesheetIds
    params
  };

  return baseData as any;
}

// ===== CONSTANTES =====
export const API_ENDPOINTS = {
  AUTH: '/auth',
  DASHBOARD: '/admin/dashboard',
  USERS: '/admin/users',
  AGENCIES: '/admin/agencies',
  TIMESHEETS: '/admin/timesheets',
} as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  sort: 'createdAt',
  order: 'desc' as const,
} as const;

export const BULK_ACTIONS = {
  USERS: ['activate', 'deactivate', 'change_agency', 'export'] as const,
  AGENCIES: ['activate', 'deactivate', 'export'] as const,
  TIMESHEETS: ['validate', 'dispute', 'delete', 'export'] as const,
} as const;