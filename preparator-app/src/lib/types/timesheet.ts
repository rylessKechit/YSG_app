// Types pour les agences
export interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  address?: string;
  phone?: string;
  email?: string;
  workingHours?: {
    start: string;
    end: string;
  };
  isDefault?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Types pour les plannings
export interface Schedule {
  id: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  workingDuration: number;
  notes?: string;
  status: 'active' | 'cancelled' | 'completed';
  createdAt: string;
}

// Types pour les entrées de timesheet
export interface TimesheetEntry {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  totalWorkedMinutes: number;
  breakDurationMinutes?: number;
  status: 'incomplete' | 'complete' | 'validated' | 'disputed';
  agency?: {
    id: string;
    name: string;
    code: string;
  };
  notes?: string;
  adminNotes?: string;
  summary?: string;
  delays?: {
    startDelay?: number;
    endDelay?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Types pour le statut de pointage actuel
export interface TimesheetStatus {
  timesheet: {
    id?: string;
    agency: {
      id: string;
      name: string;
      code: string;
    } | null;
    date: string;
    startTime: string | null;
    endTime: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    totalWorkedMinutes: number;
    status: string;
    delays?: {
      startDelay: number;
    };
  } | null;
  
  // Statuts calculés
  isNotStarted: boolean;
  isClockedIn: boolean;
  isClockedOut: boolean;
  isOnBreak: boolean;
  currentWorkedMinutes: number;
  currentWorkedTime: string | null;
}

// Types pour les paramètres d'historique
export interface TimesheetHistoryParams {
  startDate?: string;
  endDate?: string;
  agency?: string;
  status?: 'incomplete' | 'complete' | 'validated' | 'disputed';
  page?: number;
  limit?: number;
}

// Types pour les données d'entrée
export interface ClockInData {
  timestamp?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
}

export interface ClockOutData {
  timestamp?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  notes?: string;
}

export interface BreakData {
  timestamp?: string;
  reason?: string;
  type?: 'start' | 'end';
}

// Types pour l'utilisateur
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'preparateur';
  isActive: boolean;
  agencies: Array<{
    id: string;
    name: string;
    code: string;
    client: string;
    isDefault?: boolean;
    role?: string;
    permissions?: string[];
  }>;
  profile?: {
    phone?: string;
    address?: string;
    birthDate?: string;
  };
  stats?: {
    totalPreparations: number;
    onTimeRate: number;
    averageTime: number;
    lastCalculated: string | null;
  };
  createdAt: string;
  lastLogin?: string;
}

// Types pour les statistiques
export interface TimesheetStats {
  totalHours: number;
  totalDays: number;
  averageHoursPerDay: number;
  punctualityRate: number;
  absenceRate: number;
  overtimeHours: number;
  thisWeek: {
    totalHours: number;
    daysWorked: number;
    averageHours: number;
  };
  thisMonth: {
    totalHours: number;
    daysWorked: number;
    expectedHours: number;
    completion: number;
  };
}

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Types pour les erreurs API
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Types pour les notifications
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

// Types pour les actions de pointage
export type TimesheetAction = 'clock-in' | 'clock-out' | 'break-start' | 'break-end';

// Types pour les statuts possibles
export type TimesheetStatusType = 'not_started' | 'working' | 'on_break' | 'finished';

// Types pour les validations
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Types pour les permissions utilisateur
export interface UserPermissions {
  canClockIn: boolean;
  canClockOut: boolean;
  canTakeBreak: boolean;
  canViewHistory: boolean;
  canEditTimesheet: boolean;
  agencies: string[]; // IDs des agences accessibles
}

// Types pour les configurations d'agence
export interface AgencySettings {
  allowLateClockIn: boolean;
  maxLateMinutes: number;
  requireLocation: boolean;
  allowBreakOverrun: boolean;
  maxBreakMinutes: number;
  autoClockOut: boolean;
  autoClockOutHour: string;
  notificationSettings: {
    lateArrival: boolean;
    missedClockOut: boolean;
    breakOverrun: boolean;
  };
}

// Types pour les données dashboard
export interface DashboardData {
  user: User;
  today: {
    schedule: Schedule | null;
    timesheet: TimesheetEntry | null;
    currentPreparation: any | null;
    currentStatus: string;
  };
  weekStats: {
    period: {
      start: Date;
      end: Date;
    };
    preparations: number;
    onTimePreparations: number;
    punctualDays: number;
    onTimeRate: number;
    punctualityRate: number;
  };
  recentActivity: Array<{
    id: string;
    vehicle: any;
    agency: any;
    date: Date;
    duration: number;
    isOnTime: boolean;
    status: string;
    completedSteps: number;
    totalSteps: number;
  }>;
}

// Types pour les filtres de recherche
export interface SearchFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  agency?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Types pour les réponses paginées
export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    filters: SearchFilters;
    stats?: any;
  };
}