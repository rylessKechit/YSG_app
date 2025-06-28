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