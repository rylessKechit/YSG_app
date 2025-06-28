// src/lib/api/index.ts
export * from './client';
export * from './auth';
export * from './dashboard';
export * from './users';
export * from './agencies';

// Export centralisé de tous les services API
export { authApi } from './auth';
export { dashboardApi } from './dashboard';
export { usersApi } from './users';
export { agenciesApi } from './agencies';