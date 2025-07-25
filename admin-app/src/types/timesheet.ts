// admin-app/src/types/timesheet.ts - TYPES COMPLETS TIMESHEETS
import { User } from './auth';
import { Agency } from './agency';
import { BaseFilters } from './api';

// ===== INTERFACES DE BASE =====

export interface Schedule {
  id: string;
  user: string;
  agency: string;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  status: 'active' | 'cancelled' | 'completed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetDelays {
  startDelay: number;
  endDelay: number;
  breakStartDelay: number;
  breakEndDelay: number;
}

export interface TimesheetAlertsSent {
  lateStart: boolean;
  lateEnd: boolean;
  longBreak: boolean;
  missingClockOut: boolean;
}

export interface Timesheet {
  id: string;
  user: User | string;
  agency: Agency | string;
  date: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  schedule?: Schedule | string;
  delays: TimesheetDelays;
  alertsSent: TimesheetAlertsSent;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  notes?: string;
  adminNotes?: string;
  status: 'incomplete' | 'complete' | 'validated' | 'disputed';
  validatedBy?: User | string;
  validatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== TYPES DE COMPARAISON =====

export interface PlannedSchedule {
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  totalMinutes: number;
}

export interface ActualTimesheet {
  id: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  totalWorkedMinutes: number;
  status: string;
}

export interface ComparisonAnalysis {
  status: 'on_time' | 'late' | 'slight_delay' | 'missing' | 'disputed' | 'early_leave' | 'no_schedule';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startVariance: number | null;
  endVariance: number | null;
  message: string;
  details?: {
    scheduledStart: string;
    actualStart: string | null;
    scheduledEnd: string;
    actualEnd: string | null;
  };
}

export interface TimesheetComparison {
  id: string;
  date: string;
  user: User;
  agency: Agency;
  plannedSchedule: PlannedSchedule | null;
  actualTimesheet: ActualTimesheet | null;
  analysis: ComparisonAnalysis;
}

// ===== TYPES DE FILTRES =====

export interface TimesheetFilters extends BaseFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  agencyId?: string;
  status?: 'all' | 'incomplete' | 'complete' | 'validated' | 'disputed';
  sort?: 'date' | 'user' | 'agency' | 'startTime' | 'delays.startDelay';
  order?: 'asc' | 'desc';
}

export interface ComparisonFilters {
  startDate: string;
  endDate: string;
  agencyId?: string;
  userId?: string;
  includeDetails?: boolean;
  anomaliesOnly?: boolean;
}

// ===== TYPES DE DONNÉES DE RÉPONSE =====

export interface TimesheetListData {
  timesheets: Timesheet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    search: string;
    startDate: string;
    endDate: string;
    userId: string | null;
    agencyId: string | null;
    status: string;
  };
  stats: {
    totalTimesheets: number;
    completeTimesheets: number;
    incompleteTimesheets: number;
    disputedTimesheets: number;
  };
}

export interface ComparisonSummary {
  total: number;
  onTimeCount: number;
  lateCount: number;
  missingCount: number;
  disputedCount: number;
  earlyLeaveCount: number;
  punctualityRate: number;
  averageDelay: number;
  orphanCount: number;
  breakdown: {
    on_time: { count: number; percentage: number };
    late: { count: number; percentage: number };
    missing: { count: number; percentage: number };
    disputed: { count: number; percentage: number };
    early_leave: { count: number; percentage: number };
  };
}

export interface ComparisonData {
  comparisons: TimesheetComparison[];
  summary: ComparisonSummary;
  filters: ComparisonFilters;
}

export interface MissingTimesheetData {
  missingTimesheets: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
    user: User;
    agency: Agency;
    urgency: 'high' | 'medium' | 'low';
  }>;
  count: number;
  filters: ComparisonFilters;
}

// ===== TYPES POUR FORMULAIRES =====

export interface TimesheetCreateData {
  userId: string;
  agencyId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  adminNotes?: string;
  status?: 'incomplete' | 'complete' | 'validated' | 'disputed';
}

export interface TimesheetUpdateData {
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  adminNotes?: string;
  status?: 'incomplete' | 'complete' | 'validated' | 'disputed';
}

export interface TimesheetUpdateData {
  startTime?: string;
  endTime?: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
  adminNotes?: string;
  status?: 'incomplete' | 'complete' | 'validated' | 'disputed';
}

// ===== TYPES POUR ACTIONS EN MASSE =====

export interface TimesheetBulkActionData {
  action: 'validate' | 'dispute' | 'delete' | 'export';
  timesheetIds: string[];
  params?: {
    format?: 'excel' | 'csv';
    notify?: boolean;
    adminNotes?: string;
  };
}

// ===== TYPES POUR STATISTIQUES =====

export interface TimesheetGlobalStats {
  totalTimesheets: number;
  completeTimesheets: number;
  incompleteTimesheets: number;
  disputedTimesheets: number;
  completionRate: number;
  averageWorkedHours: number;
  totalWorkedHours: number;
  punctualityRate: number;
  averageDelay: number;
  maxDelay: number;
}

export interface TimesheetTrend {
  period: string;
  totalTimesheets: number;
  punctualityRate: number;
  averageDelay: number;
  totalWorkedHours: number;
}

export interface TimesheetUserStat {
  user: User;
  totalTimesheets: number;
  punctualityRate: number;
  averageDelay: number;
  totalWorkedHours: number;
}

export interface TimesheetAgencyStat {
  agency: Agency;
  totalTimesheets: number;
  punctualityRate: number;
  averageDelay: number;
  totalWorkedHours: number;
}

export interface TimesheetAnomaly {
  type: 'consistent_delay' | 'round_times' | 'no_breaks' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user?: User;
  description: string;
  count: number;
  details?: any;
}

export interface TimesheetStatsData {
  globalStats: TimesheetGlobalStats;
  trends: TimesheetTrend[];
  userStats: {
    topPerformers: TimesheetUserStat[];
    needsImprovement: TimesheetUserStat[];
  };
  agencyStats: TimesheetAgencyStat[];
  anomalies: TimesheetAnomaly[];
  period: {
    type: string;
    start: string;
    end: string;
    groupBy: string;
  };
}

export interface PunctualityCategory {
  category: string;
  count: number;
  percentage: number;
  averageDelay: number;
  maxDelay: number;
  uniqueUsers: number;
  uniqueAgencies: number;
}

export interface PunctualityReportData {
  summary: {
    totalTimesheets: number;
    categories: PunctualityCategory[];
    overall: {
      punctualityRate: number;
      averageDelay: number;
    };
  };
  details: Array<{
    _id: string;
    count: number;
    averageDelay: number;
    maxDelay: number;
    users: User[];
    agencies: Agency[];
    details: Array<{
      date: string;
      user: User;
      agency: Agency;
      startDelay: number;
      endDelay: number;
    }>;
  }>;
  period: {
    start: string;
    end: string;
  };
}

// ===== TYPES UTILITAIRES =====

export interface TimesheetStatusBadgeProps {
  status: Timesheet['status'];
  className?: string;
}

export interface ComparisonStatusBadgeProps {
  status: ComparisonAnalysis['status'];
  variance?: number | null;
  className?: string;
}

export interface TimesheetTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
}

// ===== TYPE GUARDS =====

export function isValidTimesheet(data: any): data is Timesheet {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.date === 'string' &&
    typeof data.status === 'string' &&
    ['incomplete', 'complete', 'validated', 'disputed'].includes(data.status)
  );
}

export function isValidTimesheetComparison(data: any): data is TimesheetComparison {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.date === 'string' &&
    data.user &&
    data.agency &&
    data.analysis &&
    typeof data.analysis.status === 'string'
  );
}

export function isValidTimesheetListData(data: any): data is TimesheetListData {
  return (
    data &&
    Array.isArray(data.timesheets) &&
    data.pagination &&
    typeof data.pagination.page === 'number' &&
    typeof data.pagination.total === 'number' &&
    data.stats &&
    typeof data.stats.totalTimesheets === 'number'
  );
}

// ===== CONSTANTES POUR L'UI =====

export const TIMESHEET_STATUS_LABELS: Record<Timesheet['status'], string> = {
  incomplete: 'Incomplet',
  complete: 'Complet',
  validated: 'Validé',
  disputed: 'En litige'
};

export const TIMESHEET_STATUS_COLORS: Record<Timesheet['status'], string> = {
  incomplete: 'orange',
  complete: 'blue',
  validated: 'green',
  disputed: 'red'
};

export const COMPARISON_STATUS_LABELS: Record<ComparisonAnalysis['status'], string> = {
  on_time: 'Ponctuel',
  late: 'En retard',
  slight_delay: 'Léger retard',
  missing: 'Manquant',
  disputed: 'En litige',
  early_leave: 'Parti tôt',
  no_schedule: 'Sans planning'
};

export const COMPARISON_STATUS_COLORS: Record<ComparisonAnalysis['status'], string> = {
  on_time: 'green',
  late: 'red',
  slight_delay: 'orange',
  missing: 'gray',
  disputed: 'purple',
  early_leave: 'yellow',
  no_schedule: 'blue'
};