// admin-app/src/types/agency.ts - TYPES AGENCES COMPLETS
export interface Agency {
  id: string;
  _id?: string; // Support du format MongoDB
  name: string;
  code: string;
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgencyFilters {
  page?: number;
  limit?: number;
  search?: string;
  client?: string;
  status?: 'all' | 'active' | 'inactive';
  sort?: string;
  order?: 'asc' | 'desc';
  ids?: string[]; // Pour les actions en masse
}

export interface AgencyCreateData {
  name: string;
  code: string;
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface AgencyUpdateData {
  name?: string;
  code?: string;
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface AgencyListData {
  agencies: Agency[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  filters?: {
    search?: string;
    client?: string;
    status?: string;
  };
  stats?: {
    totalAgencies: number;
    activeAgencies: number;
    inactiveAgencies: number;
  };
}

export interface AgencyStats {
  id: string;
  name: string;
  totalUsers: number;
  activeUsers: number;
  totalSchedules: number;
  totalPreparations: number;
  averageTime: number;
  completionRate: number;
}

// Types pour les validations
export interface AgencyValidation {
  name: {
    min: number;
    max: number;
  };
  code: {
    min: number;
    max: number;
    pattern: RegExp;
  };
  phone: {
    pattern: RegExp;
  };
  email: {
    pattern: RegExp;
  };
}

// Constantes de validation
export const AGENCY_VALIDATION: AgencyValidation = {
  name: {
    min: 2,
    max: 100,
  },
  code: {
    min: 2,
    max: 20,
    pattern: /^[A-Z0-9_-]+$/,
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
  },
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  },
};

// Types pour les sélecteurs de clients
export interface ClientOption {
  value: string;
  label: string;
  color?: string;
}

export const CLIENT_OPTIONS: ClientOption[] = [
  { value: 'SIXT', label: 'SIXT', color: 'orange' },
  { value: 'Europcar', label: 'Europcar', color: 'green' },
  { value: 'Hertz', label: 'Hertz', color: 'yellow' },
  { value: 'Avis', label: 'Avis', color: 'red' },
  { value: 'Budget', label: 'Budget', color: 'blue' },
  { value: 'Enterprise', label: 'Enterprise', color: 'purple' },
];

// Type guards
export function isValidAgency(obj: any): obj is Agency {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.code === 'string' &&
    (obj.isActive === undefined || typeof obj.isActive === 'boolean')
  );
}

export function isValidAgencyArray(arr: any): arr is Agency[] {
  return Array.isArray(arr) && arr.every(isValidAgency);
}

// Utilitaires
export function getAgencyDisplayName(agency: Agency): string {
  return agency.client ? `${agency.name} (${agency.client})` : agency.name;
}

export function getAgencyStatusColor(isActive?: boolean): string {
  return isActive ? 'green' : 'red';
}

export function formatAgencyCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

// Types pour les erreurs de validation spécifiques
export interface AgencyValidationError {
  field: keyof AgencyCreateData | keyof AgencyUpdateData;
  message: string;
  code?: string;
}

export interface AgencyFormErrors {
  name?: string;
  code?: string;
  client?: string;
  address?: string;
  phone?: string;
  email?: string;
  general?: string;
}

// Types pour les réponses API spécifiques aux agences
export interface AgencyResponse {
  success: boolean;
  data: {
    agency: Agency;
  };
  message: string;
}

export interface AgencyListResponse {
  success: boolean;
  data: AgencyListData;
  message: string;
}

export interface AgencyStatsResponse {
  success: boolean;
  data: {
    stats: AgencyStats;
  };
  message: string;
}

export interface AgencyUsersResponse {
  success: boolean;
  data: {
    users: any[]; // Type User à importer si nécessaire
  };
  message: string;
}

export interface AgencyCodeCheckResponse {
  success: boolean;
  data: {
    available: boolean;
  };
  message: string;
}

// Types pour les actions en masse
export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    id: string;
    message: string;
  }>;
}

export interface BulkActionResponse {
  success: boolean;
  data: BulkActionResult;
  message: string;
}