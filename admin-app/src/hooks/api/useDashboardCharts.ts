// admin-app/src/hooks/api/useDashboardCharts.ts
'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import { DashboardFilters } from '@/types/dashboard';

// Types pour les filtres spécifiques aux graphiques
export interface ChartFilters extends DashboardFilters {
  type?: 'all' | 'timeline' | 'ponctualite' | 'temps' | 'agencies';
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

// Types pour les données spécifiques aux graphiques
export interface TimelineDataPoint {
  date: string;
  preparations: number;
  ponctualite: number;
  presents: number;
  retards: number;
  tempsMoyen?: number;
}

export interface TimeDistributionData {
  range: string;
  count: number;
  percentage: number;
  min?: number;
  max?: number;
}

export interface AgencyPerformanceData {
  agencyId: string;
  agencyName: string;
  punctualityRate: number;
  totalPreparations: number;
  completedPreparations: number;
  averageTime: number;
  onTime?: number;
  total?: number;
}

export interface DashboardChartsData {
  timeline: TimelineDataPoint[];
  punctualityByAgency: AgencyPerformanceData[];
  timeDistribution: TimeDistributionData[];
  agencyPerformance: AgencyPerformanceData[];
}

// Fonction de transformation des données backend vers frontend
const transformChartData = (backendData: any): DashboardChartsData => {
  const result: DashboardChartsData = {
    timeline: [],
    punctualityByAgency: [],
    timeDistribution: [],
    agencyPerformance: []
  };

  // Transformation des données timeline
  if (backendData.timeline && Array.isArray(backendData.timeline)) {
    result.timeline = backendData.timeline.map((item: any) => ({
      date: item.date || item.time,
      preparations: item.preparations || 0,
      ponctualite: item.punctualityRate || item.ponctualite || 0,
      presents: item.presents || item.attendees || 0,
      retards: item.retards || item.lateCount || 0,
      tempsMoyen: item.averageTime || item.tempsMoyen || 0
    }));
  }

  // Transformation des données de ponctualité par agence
  if (backendData.punctualityByAgency && Array.isArray(backendData.punctualityByAgency)) {
    result.punctualityByAgency = backendData.punctualityByAgency.map((item: any) => ({
      agencyId: item.agencyId || item._id,
      agencyName: item.agencyName || item.name,
      punctualityRate: item.punctualityRate || item.rate || 0,
      totalPreparations: item.totalPreparations || item.total || 0,
      completedPreparations: item.completedPreparations || item.completed || 0,
      averageTime: item.averageTime || 0,
      onTime: item.onTime || 0,
      total: item.total || 0
    }));
  }

  // Transformation des données de distribution des temps
  if (backendData.timeDistribution && Array.isArray(backendData.timeDistribution)) {
    result.timeDistribution = backendData.timeDistribution.map((item: any) => ({
      range: item.range || '',
      count: item.count || 0,
      percentage: item.percentage || 0,
      min: item.min,
      max: item.max
    }));
  }

  // Transformation des données de performance par agence
  if (backendData.agencyPerformance && Array.isArray(backendData.agencyPerformance)) {
    result.agencyPerformance = backendData.agencyPerformance.map((item: any) => ({
      agencyId: item.agencyId || item._id,
      agencyName: item.agencyName || item.name,
      punctualityRate: item.punctualityRate || item.rate || 0,
      totalPreparations: item.totalPreparations || item.total || 0,
      completedPreparations: item.completedPreparations || item.completed || 0,
      averageTime: item.averageTime || 0,
      onTime: item.onTime || 0,
      total: item.total || 0
    }));
  }

  return result;
};

// Hook principal pour récupérer les données de graphiques
export function useDashboardCharts(
  filters: ChartFilters = { period: 'week' }
): UseQueryResult<DashboardChartsData, Error> {
  return useQuery({
    queryKey: ['dashboard-charts', filters],
    queryFn: async () => {
      const response = await dashboardApi.getCharts(filters);
      return transformChartData(response.data);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Actualisation toutes les 10 minutes
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook spécialisé pour les données timeline
export function useTimelineData(
  filters: ChartFilters = { period: 'week', type: 'timeline' }
): UseQueryResult<TimelineDataPoint[], Error> {
  return useQuery({
    queryKey: ['dashboard-timeline', filters],
    queryFn: async () => {
      const response = await dashboardApi.getCharts({ ...filters, type: 'timeline' });
      const transformedData = transformChartData(response.data);
      return transformedData.timeline;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Plus fréquent pour timeline
  });
}

// Hook spécialisé pour la ponctualité par agence
export function usePunctualityByAgency(
  filters: ChartFilters = { period: 'week', type: 'ponctualite' }
): UseQueryResult<AgencyPerformanceData[], Error> {
  return useQuery({
    queryKey: ['dashboard-punctuality-agency', filters],
    queryFn: async () => {
      const response = await dashboardApi.getCharts({ ...filters, type: 'ponctualite' });
      const transformedData = transformChartData(response.data);
      return transformedData.punctualityByAgency;
    },
    staleTime: 10 * 60 * 1000, // Plus stable
  });
}

// Hook spécialisé pour la distribution des temps
export function useTimeDistribution(
  filters: ChartFilters = { period: 'week', type: 'temps' }
): UseQueryResult<TimeDistributionData[], Error> {
  return useQuery({
    queryKey: ['dashboard-time-distribution', filters],
    queryFn: async () => {
      const response = await dashboardApi.getCharts({ ...filters, type: 'temps' });
      const transformedData = transformChartData(response.data);
      return transformedData.timeDistribution;
    },
    staleTime: 15 * 60 * 1000, 
  });
}

// Hook spécialisé pour la performance par agence
export function useAgencyPerformance(
  filters: ChartFilters = { period: 'week', type: 'agencies' }
): UseQueryResult<AgencyPerformanceData[], Error> {
  return useQuery({
    queryKey: ['dashboard-agency-performance', filters],
    queryFn: async () => {
      const response = await dashboardApi.getCharts({ ...filters, type: 'agencies' });
      const transformedData = transformChartData(response.data);
      return transformedData.agencyPerformance;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// Hook combiné pour précharger toutes les données de graphiques
export function useDashboardChartsPreload() {
  const filters: ChartFilters = { period: 'week', type: 'all' };
  
  const chartsQuery = useDashboardCharts(filters);
  
  // Fonctions utilitaires pour extraire des données spécifiques
  const getTimelineData = (): TimelineDataPoint[] => {
    return chartsQuery.data?.timeline || [];
  };

  const getPunctualityData = (): AgencyPerformanceData[] => {
    return chartsQuery.data?.punctualityByAgency || [];
  };

  const getTimeDistributionData = (): TimeDistributionData[] => {
    return chartsQuery.data?.timeDistribution || [];
  };

  const getAgencyPerformanceData = (): AgencyPerformanceData[] => {
    return chartsQuery.data?.agencyPerformance || [];
  };

  return {
    // Données principales
    data: chartsQuery.data,
    isLoading: chartsQuery.isLoading,
    isError: chartsQuery.isError,
    error: chartsQuery.error,
    refetch: chartsQuery.refetch,
    
    // Fonctions d'extraction
    getTimelineData,
    getPunctualityData,
    getTimeDistributionData,
    getAgencyPerformanceData,
    
    // Statuts individuels
    hasTimelineData: (chartsQuery.data?.timeline?.length || 0) > 0,
    hasPunctualityData: (chartsQuery.data?.punctualityByAgency?.length || 0) > 0,
    hasTimeDistributionData: (chartsQuery.data?.timeDistribution?.length || 0) > 0,
    hasAgencyPerformanceData: (chartsQuery.data?.agencyPerformance?.length || 0) > 0,
  };
}

// Hook avec cache intelligent pour les données temps réel
export function useRealtimeCharts(filters: ChartFilters = { period: 'today' }) {
  return useQuery({
    queryKey: ['dashboard-realtime-charts', filters],
    queryFn: async () => {
      const response = await dashboardApi.getCharts({
        ...filters,
        granularity: 'hour' // Plus de granularité pour temps réel
      });
      return transformChartData(response.data);
    },
    staleTime: 1 * 60 * 1000, // 1 minute pour temps réel
    refetchInterval: 2 * 60 * 1000, // Actualisation toutes les 2 minutes
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true, // Continue en arrière-plan
  });
}

// Utilitaires pour le formatage des données
export const chartUtils = {
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

  // Formatage des dates
  formatDate: (dateString: string, format: 'short' | 'long' = 'short'): string => {
    const date = new Date(dateString);
    if (format === 'short') {
      return date.toLocaleDateString('fr-FR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
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
    const percentage = (change / previous) * 100;
    
    return {
      value: change,
      percentage: Math.abs(percentage),
      isPositive: change >= 0,
      label: change >= 0 ? 'hausse' : 'baisse'
    };
  },

  // Génération de couleurs pour les graphiques
  generateColors: (count: number): string[] => {
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
    
    // Générer des couleurs supplémentaires si nécessaire
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      const hue = (i * 137.508) % 360; // Golden angle approximation
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    
    return colors;
  }
};