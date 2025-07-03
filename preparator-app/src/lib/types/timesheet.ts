// Types pour le système de pointage - CORRIGÉ selon le vrai backend

export interface TimesheetStatus {
  // Structure VRAIE retournée par le backend
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
  
  // Statuts calculés par le backend
  isNotStarted: boolean;
  isClockedIn: boolean;
  isClockedOut: boolean;
  isOnBreak: boolean;
  currentWorkedMinutes: number;
  currentWorkedTime: string | null;
}

export interface TimesheetEntry {
  // Identifiant
  id: string;
  
  // Date
  date: string;
  
  // Horaires
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  
  // Temps calculés
  totalWorkedMinutes: number;
  breakDurationMinutes: number;
  
  // Statut
  status: 'incomplete' | 'complete' | 'pending';
  
  // Agence
  agency?: {
    id: string;
    name: string;
    code: string;
  };
  
  // Notes
  notes?: string;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
}

// Types pour les actions API
export interface ClockInData {
  agencyId?: string;
  timestamp?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ClockOutData {
  agencyId?: string;
  timestamp?: string;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface BreakData {
  agencyId?: string;
  timestamp?: string;
  type?: 'start' | 'end';
}

// Types pour les filtres d'historique
export interface TimesheetHistoryParams {
  startDate?: string;
  endDate?: string;
  agency?: string;
  status?: 'incomplete' | 'complete' | 'pending';
  page?: number;
  limit?: number;
}

// Types pour les réponses API
export interface TimesheetApiResponse {
  success: boolean;
  data: {
    timesheet: TimesheetEntry;
    status: TimesheetStatus;
  };
  message: string;
}

export interface TimesheetHistoryResponse {
  success: boolean;
  data: {
    timesheets: TimesheetEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Types pour les statistiques
export interface TimesheetStats {
  totalDaysWorked: number;
  averageHoursPerDay: number;
  totalHoursWorked: number;
  punctualityRate: number;
  lastWeekHours: number;
  thisMonthHours: number;
}