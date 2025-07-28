// admin-app/src/types/dashboard.ts - TYPES CORRIGÉS

export interface DashboardStats {
  preparateurs: {
    total: number;
    active: number;
    present: number;
    late: number;
  };
  ponctualite: {
    global: number;
    parAgence: AgencyPunctuality[];
  };
  preparations: {
    aujourdhui: number;
    tempsMoyen: number;
    enRetard: number;
    terminees: number;
  };
  objectifs: {
    preparationsJour: number;
    ponctualiteMin: number;
    tempsMoyenMax: number;
  };
  timestamp: string;
}

export interface AgencyPunctuality {
  agencyId: string;
  name: string;
  rate: number;
  total?: number;
  onTime?: number;
}

export interface DashboardOverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalAgencies: number;
  totalVehicles: number;
  todaySchedules: number;
  todayPresent: number;
  todayLate: number;
  todayPreparations: number;
  ongoingPreparations: number;
}

export interface DashboardAlert {
  id: string;
  type: 'late_start' | 'missing_clock_out' | 'long_preparation' | 'system_error' | 'retard' | 'absence' | 'incident';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  userId?: string;
  userName?: string;
  agencyId?: string;
  agencyName?: string;
  timestamp: string;
  isRead: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}

export interface TimelineData {
  date: string;
  preparations: number;
  ponctualite: number;
  presents: number;
  retards: number;
}

export interface ChartDataResponse {
  timeline: TimelineData[];
  ponctualiteParAgence: AgencyPunctuality[];
  distributionTemps: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

// TYPE PRINCIPAL CORRIGÉ - Inclut toutes les périodes possibles
export interface DashboardFilters {
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  agencies?: string[];
  startDate?: string;
  endDate?: string;
}

// Type étendu pour les graphiques - CORRIGÉ
export interface ChartFilters extends DashboardFilters {
  type?: 'all' | 'timeline' | 'ponctualite' | 'temps' | 'agencies';
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface LateEmployee {
  userId: string;
  userName: string;
  agencyId: string;
  agencyName: string;
  delayMinutes: number;
  scheduledTime: string;
  currentTime: string;
}

export interface PreparationInProgress {
  id: string;
  userId: string;
  userName: string;
  vehicleLicensePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  agencyName: string;
  startTime: string;
  estimatedEndTime: string;
  progress: number;
  status: 'in_progress' | 'delayed' | 'nearly_complete';
}