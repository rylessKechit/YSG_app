// admin-app/src/hooks/api/useDashboard.ts - CORRECTION COMPLÈTE
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, ChartFilters } from '@/lib/api/dashboard';
import { DashboardFilters, DashboardOverviewResponse, DashboardAlert } from '@/types/dashboard';

// Query keys pour le cache
export const dashboardKeys = {
  all: ['dashboard'] as const,
  kpis: (filters: DashboardFilters) => [...dashboardKeys.all, 'kpis', filters] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  charts: (filters: ChartFilters) => [...dashboardKeys.all, 'charts', filters] as const,
  alerts: (filters: any) => [...dashboardKeys.all, 'alerts', filters] as const,
  weekly: (date?: string) => [...dashboardKeys.all, 'weekly', date] as const,
};

// Hook pour les KPIs avec refresh automatique
export function useKPIsData(filters: DashboardFilters = {}) {
  return useQuery({
    queryKey: dashboardKeys.kpis(filters),
    queryFn: () => dashboardApi.getKPIs(filters),
    refetchInterval: 30000, // Refresh toutes les 30 secondes
    staleTime: 15000, // Considéré comme frais pendant 15 secondes
    gcTime: 5 * 60 * 1000, // Cache pendant 5 minutes
    retry: 2,
    select: (data) => data.data, // Extraire directement les données
  });
}

// ✅ CORRECTION: Hook pour la vue d'ensemble avec bon type de retour
export function useDashboardOverview() {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: () => dashboardApi.getOverview(),
    refetchInterval: 60000, // Refresh toutes les minutes
    staleTime: 30000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    select: (data): DashboardOverviewResponse => data.data, // ✅ Type explicite
  });
}

// Hook pour les données de graphiques
export function useChartsData(filters: ChartFilters = {}) {
  return useQuery({
    queryKey: dashboardKeys.charts(filters),
    queryFn: () => dashboardApi.getCharts(filters),
    refetchInterval: 2 * 60 * 1000, // Refresh toutes les 2 minutes
    staleTime: 60000,
    gcTime: 15 * 60 * 1000,
    enabled: true,
    retry: 1,
    select: (data) => data.data,
  });
}

// ✅ CORRECTION: Hook pour les alertes avec type correct
export function useDashboardAlerts(filters: {
  priority?: 'low' | 'medium' | 'high' | 'critical'; // ✅ Type union strict
  limit?: number;
  unreadOnly?: boolean;
} = {}) {
  return useQuery({
    queryKey: dashboardKeys.alerts(filters),
    queryFn: () => dashboardApi.getAlerts(filters),
    refetchInterval: 15000, // Refresh toutes les 15 secondes pour les alertes
    staleTime: 5000,
    gcTime: 2 * 60 * 1000,
    retry: 2,
    select: (data): DashboardAlert[] => data.data, // ✅ Type explicite
  });
}

// ✅ CORRECTION: Hook pour les statistiques hebdomadaires
export function useWeeklyOverview(date?: string) {
  return useQuery({
    queryKey: dashboardKeys.weekly(date),
    queryFn: () => dashboardApi.getWeeklyOverview(date), // ✅ Méthode maintenant disponible
    refetchInterval: 5 * 60 * 1000, // Refresh toutes les 5 minutes
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    select: (data): DashboardOverviewResponse => data.data, // ✅ Type explicite
  });
}

// Hook utilitaire pour invalider le cache dashboard
export function useDashboardCache() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  const invalidateKPIs = (filters?: DashboardFilters) => {
    if (filters) {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.kpis(filters) });
    } else {
      queryClient.invalidateQueries({ queryKey: [...dashboardKeys.all, 'kpis'] });
    }
  };

  const invalidateOverview = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() });
  };

  const invalidateCharts = (filters?: ChartFilters) => {
    if (filters) {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.charts(filters) });
    } else {
      queryClient.invalidateQueries({ queryKey: [...dashboardKeys.all, 'charts'] });
    }
  };

  const invalidateAlerts = () => {
    queryClient.invalidateQueries({ queryKey: [...dashboardKeys.all, 'alerts'] });
  };

  const prefetchKPIs = (filters: DashboardFilters = {}) => {
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.kpis(filters),
      queryFn: () => dashboardApi.getKPIs(filters),
      staleTime: 15000,
    });
  };

  return {
    invalidateAll,
    invalidateKPIs,
    invalidateOverview,
    invalidateCharts,
    invalidateAlerts,
    prefetchKPIs,
  };
}

// ✅ CORRECTION: Hook combiné pour toutes les données du dashboard avec types explicites
export function useDashboardData(filters: DashboardFilters = {}) {
  const kpis = useKPIsData(filters);
  const overview = useDashboardOverview(); // ✅ Maintenant correctement typé
  const charts = useChartsData({ ...filters, type: 'all' });
  const alerts = useDashboardAlerts({ limit: 10, unreadOnly: false });

  return {
    kpis,
    overview,
    charts,
    alerts,
    isLoading: kpis.isLoading || overview.isLoading || charts.isLoading,
    isError: kpis.isError || overview.isError || charts.isError,
    error: kpis.error || overview.error || charts.error,
    refetchAll: () => {
      kpis.refetch();
      overview.refetch();
      charts.refetch();
      alerts.refetch();
    }
  };
}

// ✅ AJOUT: Hooks supplémentaires pour fonctionnalités avancées
export function useRealtimeStats() {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'realtime'],
    queryFn: () => dashboardApi.getRealtimeStats(),
    refetchInterval: 5000, // Très fréquent pour temps réel
    staleTime: 1000,
    retry: 1,
    select: (data) => data.data,
  });
}

export function useAgencyStats(filters: DashboardFilters = {}) {
  return useQuery({
    queryKey: [...dashboardKeys.all, 'agency-stats', filters],
    queryFn: () => dashboardApi.getAgencyStats(filters),
    staleTime: 60000,
    retry: 1,
    select: (data) => data.data,
  });
}

// Hook pour les actions sur les alertes
export function useAlertActions() {
  const queryClient = useQueryClient();

  const markAsRead = async (alertId: string) => {
    await dashboardApi.markAlertAsRead(alertId);
    // Invalider le cache des alertes
    queryClient.invalidateQueries({ queryKey: [...dashboardKeys.all, 'alerts'] });
  };

  const dismiss = async (alertId: string) => {
    await dashboardApi.dismissAlert(alertId);
    // Invalider le cache des alertes
    queryClient.invalidateQueries({ queryKey: [...dashboardKeys.all, 'alerts'] });
  };

  return {
    markAsRead,
    dismiss
  };
}