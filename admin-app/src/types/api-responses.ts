// Types spécifiques pour les réponses backend
import { User } from './auth';
import { 
  Timesheet, 
  TimesheetListData, 
  ComparisonData, 
  MissingTimesheetData, 
  TimesheetStatsData,
  PunctualityReportData 
} from './timesheet';

// Structure exacte de réponse de votre backend pour /auth/me
export interface AuthProfileResponse {
  success: boolean;
  data: {
    user: User;
  };
  message?: string;
}

// Structure exacte de réponse de votre backend pour /auth/login
export interface AuthLoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
    refreshToken?: string;
  };
  message: string;
}

// Structure exacte de réponse de votre backend pour /auth/refresh
export interface AuthRefreshResponse {
  success: boolean;
  data: {
    token: string;
  };
  message: string;
}

// Structure exacte de réponse de votre backend pour /auth/verify
export interface AuthVerifyResponse {
  success: boolean;
  data: {
    valid: boolean;
    userId?: string;
    role?: string;
  };
  message: string;
}

// Type guard pour vérifier si une réponse est valide
export function isValidAuthResponse(response: any): response is AuthProfileResponse {
  return (
    response &&
    typeof response.success === 'boolean' &&
    response.data &&
    response.data.user &&
    typeof response.data.user === 'object'
  );
}

// Type guard pour vérifier si une réponse de login est valide
export function isValidLoginResponse(response: any): response is AuthLoginResponse {
  return (
    response &&
    typeof response.success === 'boolean' &&
    response.data &&
    typeof response.data.token === 'string' &&
    response.data.user &&
    typeof response.data.user === 'object'
  );
}

// ===== RÉPONSES API TIMESHEETS =====

export interface TimesheetListResponse {
  success: boolean;
  data: TimesheetListData;
  message?: string;
}

export interface TimesheetDetailResponse {
  success: boolean;
  data: {
    timesheet: Timesheet;
  };
  message?: string;
}

export interface TimesheetCreateResponse {
  success: boolean;
  data: {
    timesheet: Timesheet;
  };
  message: string;
}

export interface TimesheetUpdateResponse {
  success: boolean;
  data: {
    timesheet: Timesheet;
    changes: {
      from: Partial<Timesheet>;
      to: Partial<Timesheet>;
    };
  };
  message: string;
}

export interface TimesheetDeleteResponse {
  success: boolean;
  message: string;
}

export interface TimesheetBulkActionResponse {
  success: boolean;
  data: {
    affectedCount: number;
    result: any;
  };
  message: string;
}

// ===== RÉPONSES COMPARAISON =====

export interface TimesheetComparisonResponse {
  success: boolean;
  data: ComparisonData;
  message?: string;
}

export interface MissingTimesheetsResponse {
  success: boolean;
  data: MissingTimesheetData;
  message?: string;
}

// ===== RÉPONSES STATISTIQUES =====

export interface TimesheetStatsResponse {
  success: boolean;
  data: TimesheetStatsData;
  message?: string;
}

export interface PunctualityReportResponse {
  success: boolean;
  data: PunctualityReportData;
  message?: string;
}

// ===== TYPE GUARDS POUR RÉPONSES =====

export function isValidTimesheetListResponse(response: any): response is TimesheetListResponse {
  return (
    response &&
    typeof response.success === 'boolean' &&
    response.data &&
    Array.isArray(response.data.timesheets) &&
    response.data.pagination &&
    typeof response.data.pagination.page === 'number'
  );
}

export function isValidTimesheetDetailResponse(response: any): response is TimesheetDetailResponse {
  return (
    response &&
    typeof response.success === 'boolean' &&
    response.data &&
    response.data.timesheet &&
    typeof response.data.timesheet.id === 'string'
  );
}

export function isValidComparisonResponse(response: any): response is TimesheetComparisonResponse {
  return (
    response &&
    typeof response.success === 'boolean' &&
    response.data &&
    Array.isArray(response.data.comparisons) &&
    response.data.summary &&
    typeof response.data.summary.total === 'number'
  );
}