// admin-app/src/types/dashboard.ts - CORRECTION DES TYPES AVEC VRAIES PROPRIÉTÉS
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

// ✅ CORRECTION: Interface pour les tendances avec les VRAIES propriétés
export interface DashboardTrends {
  preparationsChange: number;    // Changement des préparations
  punctualityChange: number;     // Changement de ponctualité  
  attendanceChange: number;      // Changement de présence
  averageTimeChange?: number;    // Changement temps moyen (optionnel)
}

// ✅ CORRECTION: Interface pour la réponse overview complète
export interface DashboardOverviewResponse {
  timestamp: string;
  stats: DashboardOverviewStats;
  rates: {
    punctualityRate: number;
    attendanceRate: number;
    completionRate: number;
    averagePreparationTime: number;
  };
  trends: DashboardTrends;
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

// Type helper pour les périodes
export type DashboardPeriod = NonNullable<DashboardFilters['period']>;

// Type étendu pour les graphiques
export interface ChartFilters extends DashboardFilters {
  type?: 'all' | 'timeline' | 'ponctualite' | 'temps' | 'agencies';
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

// Type pour les valeurs de période avec valeur par défaut
export interface DashboardFiltersWithDefaults extends Required<DashboardFilters> {
  period: DashboardPeriod;
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

// Type pour les réponses d'API avec pagination
export interface DashboardApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

// Type pour les options de requête
export interface DashboardQueryOptions {
  useCache?: boolean;
  timeout?: number;
  retries?: number;
}