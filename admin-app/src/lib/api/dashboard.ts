// src/lib/api/dashboard.ts
import { apiClient, apiRequest, ApiResponse } from './client';

// Types pour le dashboard
export interface DashboardKPIs {
  preparateurs: {
    total: number;
    active: number;
    present: number;
    late: number;
  };
  ponctualite: {
    global: number;
    parAgence: Array<{
      agencyId: string;
      name: string;
      rate: number;
    }>;
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

export interface DashboardOverview {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalAgencies: number;
    totalVehicles: number;
    todaySchedules: number;
    todayPresent: number;
    todayLate: number;
    todayPreparations: number;
    ongoingPreparations: number;
  };
  rates: {
    presentRate: number;
    punctualityRate: number;
  };
  alerts: Array<{
    id: string;
    type: 'retard' | 'absence' | 'incident';
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    userId?: string;
    agencyId?: string;
    timestamp: string;
  }>;
}

export interface ChartData {
  timeline: Array<{
    date: string;
    preparations: number;
    ponctualite: number;
    presents: number;
    retards: number;
  }>;
  ponctualiteParAgence: Array<{
    agencyName: string;
    rate: number;
    total: number;
    onTime: number;
  }>;
  distributionTemps: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export interface DashboardAlert {
  id: string;
  type: 'late_start' | 'missing_clock_out' | 'long_preparation' | 'system_error';
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

// Paramètres pour les requêtes
export interface DashboardFilters {
  period?: 'today' | 'week' | 'month';
  agencies?: string[];
  startDate?: string;
  endDate?: string;
}

export interface ChartFilters extends DashboardFilters {
  type?: 'all' | 'timeline' | 'ponctualite' | 'temps';
  granularity?: 'hour' | 'day' | 'week';
}

// Service Dashboard
export const dashboardApi = {
  // KPIs temps réel
  async getKPIs(filters: DashboardFilters = {}): Promise<ApiResponse<DashboardKPIs>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<DashboardKPIs>>('/admin/dashboard/kpis', {
        params: filters
      }),
      { 
        showErrorToast: true,
        retryCount: 2 
      }
    );
  },

  // Vue d'ensemble
  async getOverview(): Promise<ApiResponse<DashboardOverview>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<DashboardOverview>>('/admin/dashboard/overview'),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  // Données pour graphiques
  async getChartsData(filters: ChartFilters = {}): Promise<ApiResponse<ChartData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<ChartData>>('/admin/dashboard/charts', {
        params: filters
      }),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  // Alertes système
  async getAlerts(filters: { 
    priority?: string; 
    limit?: number; 
    unreadOnly?: boolean;
  } = {}): Promise<ApiResponse<DashboardAlert[]>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<DashboardAlert[]>>('/admin/dashboard/alerts', {
        params: filters
      }),
      { 
        showErrorToast: false,
        retryCount: 1 
      }
    );
  },

  // Marquer une alerte comme lue
  async markAlertAsRead(alertId: string): Promise<ApiResponse<void>> {
    return apiRequest(
      () => apiClient.patch<ApiResponse<void>>(`/admin/dashboard/alerts/${alertId}/read`),
      { 
        showErrorToast: true 
      }
    );
  },

  // Statistiques hebdomadaires
  async getWeeklyOverview(date?: string): Promise<ApiResponse<any>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<any>>('/admin/dashboard/weekly-overview', {
        params: date ? { date } : {}
      }),
      { 
        showErrorToast: true 
      }
    );
  }
};