// Types pour le système de pointage

export interface TimesheetStatus {
  // Statut actuel
  currentStatus: 'not_started' | 'working' | 'on_break' | 'finished';
  
  // Horaires du jour
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  
  // Temps calculés
  totalWorkedMinutes: number;
  breakDurationMinutes: number;
  
  // Métadonnées
  date: string;
  agency?: {
    id: string;
    name: string;
    code: string;
  };
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

// Types pour les actions API - CORRIGÉ: ajout agencyId
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