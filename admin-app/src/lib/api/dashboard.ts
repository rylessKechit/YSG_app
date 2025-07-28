// admin-app/src/lib/api/dashboard.ts - VERSION AVEC TYPES CORRIGÉS
import { apiClient } from './client';
import { 
  DashboardStats, 
  DashboardOverviewStats, 
  DashboardAlert, 
  DashboardFilters
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

interface DashboardOverviewResponse {
  timestamp: string;
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
    punctualityRate: number;
    attendanceRate: number;
    completionRate: number;
    averagePreparationTime: number;
  };
  trends: {
    preparationsChange: number;
    punctualityChange: number;
    attendanceChange: number;
  };
}

// API Dashboard principal
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

  // Vue d'ensemble du dashboard
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

  // Récupération des alertes
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

  // Actions sur les alertes
  async markAlertAsRead(alertId: string): Promise<APIResponse<{ success: boolean }>> {
    const response = await apiClient.patch(`/admin/dashboard/alerts/${alertId}/read`);
    return response.data;
  },

  async dismissAlert(alertId: string): Promise<APIResponse<{ success: boolean }>> {
    const response = await apiClient.delete(`/admin/dashboard/alerts/${alertId}`);
    return response.data;
  },

  async markAllAlertsAsRead(): Promise<APIResponse<{ count: number }>> {
    const response = await apiClient.patch('/admin/dashboard/alerts/read-all');
    return response.data;
  },

  // Données temps réel
  async getRealTimeData(): Promise<APIResponse<{
    timestamp: string;
    activeUsers: number;
    ongoingPreparations: number;
    currentAlerts: number;
    systemStatus: 'operational' | 'degraded' | 'down';
  }>> {
    const response = await apiClient.get('/admin/dashboard/realtime');
    return response.data;
  },

  // Export des données
  async exportData(options: {
    type: 'kpis' | 'charts' | 'alerts' | 'complete';
    format: 'json' | 'csv' | 'excel';
    filters?: DashboardFilters;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    
    params.append('type', options.type);
    params.append('format', options.format);
    
    if (options.filters) {
      if (options.filters.period) params.append('period', options.filters.period);
      if (options.filters.agencies?.length) {
        options.filters.agencies.forEach(agency => params.append('agencies[]', agency));
      }
      if (options.filters.startDate) params.append('startDate', options.filters.startDate);
      if (options.filters.endDate) params.append('endDate', options.filters.endDate);
    }

    const response = await apiClient.get(`/admin/dashboard/export?${params.toString()}`, {
      responseType: 'blob'
    });
    
    return response.data;
  },

  // Configuration du dashboard
  async getDashboardConfig(): Promise<APIResponse<{
    refreshInterval: number;
    defaultPeriod: string;
    enabledWidgets: string[];
    chartColors: Record<string, string>;
    alertThresholds: Record<string, number>;
  }>> {
    const response = await apiClient.get('/admin/dashboard/config');
    return response.data;
  },

  async updateDashboardConfig(config: {
    refreshInterval?: number;
    defaultPeriod?: string;
    enabledWidgets?: string[];
    chartColors?: Record<string, string>;
    alertThresholds?: Record<string, number>;
  }): Promise<APIResponse<{ success: boolean }>> {
    const response = await apiClient.patch('/admin/dashboard/config', config);
    return response.data;
  },
};

// Utilitaires pour la manipulation des données
export const dashboardUtils = {
  // Formatage des données pour les graphiques
  formatTimelineData: (rawData: any[]): ChartDataResponse['timeline'] => {
    return rawData.map(item => ({
      date: item.date || item.time,
      preparations: item.preparations || 0,
      ponctualite: item.punctualityRate || item.ponctualite || 0,
      presents: item.presents || item.attendees || 0,
      retards: item.retards || item.lateCount || 0,
      tempsMoyen: item.averageTime || item.tempsMoyen || 0
    }));
  },

  // Calcul des tendances
  calculateTrend: (current: number, previous: number): {
    value: number;
    percentage: number;
    isPositive: boolean;
    label: string;
  } | null => {
    if (!previous || previous === 0) return null;
    
    const change = current - previous;
    const percentage = Math.abs((change / previous) * 100);
    
    return {
      value: change,
      percentage,
      isPositive: change >= 0,
      label: change >= 0 ? 'hausse' : 'baisse'
    };
  },

  // Formatage des pourcentages
  formatPercentage: (value: number): string => {
    return `${value.toFixed(1)}%`;
  },

  // Formatage des temps
  formatTime: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes.toFixed(0)}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes.toFixed(0).padStart(2, '0')}`;
  },

  // Validation des filtres
  validateFilters: (filters: DashboardFilters): boolean => {
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      if (start > end) return false;
    }
    
    if (filters.period && !['today', 'week', 'month'].includes(filters.period)) {
      return false;
    }
    
    return true;
  },

  // Génération des couleurs pour les graphiques
  getChartColors: (count: number): string[] => {
    const baseColors = [
      '#3b82f6', // bleu
      '#10b981', // vert
      '#f59e0b', // orange
      '#ef4444', // rouge
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange foncé
    ];
    
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }
    
    // Générer des couleurs supplémentaires
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      const hue = (i * 137.508) % 360; // Golden angle
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    
    return colors;
  }
};