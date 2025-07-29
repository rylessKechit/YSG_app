// admin-app/src/lib/api/dashboard.ts - VERSION COMPLÈTE AVEC TOUTES LES MÉTHODES
import { apiClient } from './client';
import { 
  DashboardStats, 
  DashboardOverviewStats, 
  DashboardAlert, 
  DashboardFilters,
  DashboardOverviewResponse
} from '@/types/dashboard';

// Types pour les filtres graphiques (étendus)
export interface ChartFilters extends DashboardFilters {
  type?: 'all' | 'timeline' | 'ponctualite' | 'temps' | 'agencies';
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

// Types pour les réponses de graphiques
export interface ChartDataResponse {
  timeline: Array<{
    date: string;
    preparations: number;
    ponctualite: number;
    presents: number;
    retards: number;
    tempsMoyen?: number;
  }>;
  punctualityByAgency: Array<{
    agencyId: string;
    agencyName: string;
    punctualityRate: number;
    totalPreparations: number;
    completedPreparations: number;
    averageTime: number;
    onTime?: number;
    total?: number;
  }>;
  timeDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
    min?: number;
    max?: number;
  }>;
  agencyPerformance: Array<{
    agencyId: string;
    agencyName: string;
    punctualityRate: number;
    totalPreparations: number;
    completedPreparations: number;
    averageTime: number;
    onTime?: number;
    total?: number;
  }>;
}

// Types pour les réponses API
interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: any;
}

interface DashboardKPIResponse {
  timestamp: string;
  period: string;
  kpis: {
    totalPreparateurs: number;
    activePreparateurs: number;
    totalAgencies: number;
    preparationsToday: number;
    preparationsThisWeek: number;
    averageTimeToday: number;
    punctualityRate: number;
  };
  agencyStats: any[];
  chartData: any;
  comparison: any;
  alerts: DashboardAlert[];
}

// ✅ CORRECTION: API Dashboard principal avec toutes les méthodes
export const dashboardApi = {
  // Récupération des KPIs principaux
  async getKPIs(filters: DashboardFilters = {}): Promise<APIResponse<DashboardKPIResponse>> {
    const params = new URLSearchParams();
    
    if (filters.period) params.append('period', filters.period);
    if (filters.agencies?.length) {
      filters.agencies.forEach(agency => params.append('agencies[]', agency));
    }
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`/admin/dashboard/kpis?${params.toString()}`);
    return response.data;
  },

  // ✅ CORRECTION: Vue d'ensemble du dashboard
  async getOverview(filters: DashboardFilters = {}): Promise<APIResponse<DashboardOverviewResponse>> {
    const params = new URLSearchParams();
    
    if (filters.period) params.append('period', filters.period);
    if (filters.agencies?.length) {
      filters.agencies.forEach(agency => params.append('agencies[]', agency));
    }

    const response = await apiClient.get(`/admin/dashboard/overview?${params.toString()}`);
    return response.data;
  },

  // Données pour les graphiques
  async getCharts(filters: ChartFilters = {}): Promise<APIResponse<ChartDataResponse>> {
    const params = new URLSearchParams();
    
    // Paramètres de base
    if (filters.type) params.append('type', filters.type);
    if (filters.period) params.append('period', filters.period);
    if (filters.granularity) params.append('granularity', filters.granularity);
    
    // Filtres par agence
    if (filters.agencies?.length) {
      filters.agencies.forEach(agency => params.append('agencies[]', agency));
    }
    
    // Dates personnalisées
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get(`/admin/dashboard/charts?${params.toString()}`);
    return response.data;
  },

  // ✅ CORRECTION: Récupération des alertes avec bon type
  async getAlerts(options: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
    unreadOnly?: boolean;
    type?: string;
  } = {}): Promise<APIResponse<DashboardAlert[]>> {
    const params = new URLSearchParams();
    
    if (options.priority) params.append('priority', options.priority);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.unreadOnly) params.append('unreadOnly', 'true');
    if (options.type) params.append('type', options.type);

    const response = await apiClient.get(`/admin/dashboard/alerts?${params.toString()}`);
    return response.data;
  },

  // ✅ AJOUT: Méthode getWeeklyOverview manquante
  async getWeeklyOverview(date?: string): Promise<APIResponse<DashboardOverviewResponse>> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);

    const response = await apiClient.get(`/admin/dashboard/weekly?${params.toString()}`);
    return response.data;
  },

  // ✅ AJOUT: Méthodes supplémentaires pour les filtres avancés
  async getAgencyStats(filters: DashboardFilters = {}): Promise<APIResponse<any[]>> {
    const params = new URLSearchParams();
    
    if (filters.period) params.append('period', filters.period);
    if (filters.agencies?.length) {
      filters.agencies.forEach(agency => params.append('agencies[]', agency));
    }

    const response = await apiClient.get(`/admin/dashboard/agency-stats?${params.toString()}`);
    return response.data;
  },

  // ✅ AJOUT: Export des données
  async exportData(filters: DashboardFilters = {}, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.period) params.append('period', filters.period);
    if (filters.agencies?.length) {
      filters.agencies.forEach(agency => params.append('agencies[]', agency));
    }
    params.append('format', format);

    const response = await apiClient.get(`/admin/dashboard/export?${params.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // ✅ AJOUT: Mise à jour de configuration
  async updateDashboardConfig(config: any): Promise<APIResponse<any>> {
    const response = await apiClient.put('/admin/dashboard/config', config);
    return response.data;
  },

  // ✅ AJOUT: Actions sur les alertes
  async markAlertAsRead(alertId: string): Promise<APIResponse<any>> {
    const response = await apiClient.put(`/admin/dashboard/alerts/${alertId}/read`);
    return response.data;
  },

  async dismissAlert(alertId: string): Promise<APIResponse<any>> {
    const response = await apiClient.delete(`/admin/dashboard/alerts/${alertId}`);
    return response.data;
  },

  // ✅ AJOUT: Méthodes pour les KPIs en temps réel
  async getRealtimeStats(): Promise<APIResponse<any>> {
    const response = await apiClient.get('/admin/dashboard/realtime');
    return response.data;
  },

  // ✅ AJOUT: Méthodes pour les comparaisons
  async getComparison(
    period1: { start: string; end: string },
    period2: { start: string; end: string }
  ): Promise<APIResponse<any>> {
    const params = new URLSearchParams({
      'period1_start': period1.start,
      'period1_end': period1.end,
      'period2_start': period2.start,
      'period2_end': period2.end
    });

    const response = await apiClient.get(`/admin/dashboard/comparison?${params.toString()}`);
    return response.data;
  }
};