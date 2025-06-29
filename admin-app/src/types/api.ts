// Types pour les API

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  timestamp?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginatedResponse<T> extends ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {}

export interface ApiError {
  success: false;
  message: string;
  statusCode?: number;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Types spécifiques pour les endpoints
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: import('./auth').User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
}

// Types pour les filtres et requêtes
export interface BaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// Types pour les réponses de dashboard
export interface DashboardKPIs {
  totalPreparateurs: number;
  activePreparateurs: number;
  totalAgencies: number;
  preparationsToday: number;
  preparationsThisWeek: number;
  averageTimeToday: number;
  punctualityRate: number;
}

export interface AgencyStats {
  _id: string;
  name: string;
  totalPreparations: number;
  completedPreparations: number;
  averageTime: number;
  completionRate: number;
}

export interface DashboardResponse {
  timestamp: string;
  period: string;
  kpis: DashboardKPIs;
  agencyStats: AgencyStats[];
  chartData?: any;
  comparison?: any;
  alerts?: any[];
}