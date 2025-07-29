// admin-app/src/hooks/api/useDashboardCharts.ts
// ✅ Types et hooks pour les graphiques dashboard - VERSION CORRIGÉE

export interface TimelineDataPoint {
  date: string;
  preparations: number;
  ponctualite: number;
  presents: number;
  retards: number;
  tempsMoyen?: number;
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

export interface TimeDistributionData {
  range: string;
  count: number;
  percentage: number;
  min?: number;
  max?: number;
}

// ✅ Type pour les paramètres de période des hooks
interface ChartHookParams {
  period: 'today' | 'week' | 'month';
}

// ✅ Interface de retour générique pour les hooks
interface ChartHookReturn<T> {
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ✅ Hook pour les données timeline
export const useTimelineData = (params: ChartHookParams): ChartHookReturn<TimelineDataPoint> => {
  // Mock des données pour éviter les erreurs
  const mockData: TimelineDataPoint[] = [
    {
      date: '2025-07-29',
      preparations: 12,
      ponctualite: 85,
      presents: 15,
      retards: 3,
      tempsMoyen: 22
    },
    {
      date: '2025-07-28',
      preparations: 18,
      ponctualite: 92,
      presents: 20,
      retards: 2,
      tempsMoyen: 19
    },
    {
      date: '2025-07-27',
      preparations: 14,
      ponctualite: 88,
      presents: 16,
      retards: 2,
      tempsMoyen: 25
    }
  ];

  return {
    data: mockData,
    isLoading: false,
    error: null,
    refetch: async () => {
      console.log('Refetch timeline data for period:', params.period);
    }
  };
};

// ✅ Hook pour les données de ponctualité par agence
export const usePunctualityByAgency = (params: ChartHookParams): ChartHookReturn<AgencyPerformanceData> => {
  // Mock des données pour éviter les erreurs
  const mockData: AgencyPerformanceData[] = [
    {
      agencyId: '1',
      agencyName: 'SIXT Antony',
      punctualityRate: 94.5,
      totalPreparations: 45,
      completedPreparations: 42,
      averageTime: 18,
      onTime: 40,
      total: 45
    },
    {
      agencyId: '2',
      agencyName: 'SIXT Massy TGV',
      punctualityRate: 87.2,
      totalPreparations: 38,
      completedPreparations: 35,
      averageTime: 23,
      onTime: 31,
      total: 38
    },
    {
      agencyId: '3',
      agencyName: 'SIXT Melun',
      punctualityRate: 91.8,
      totalPreparations: 29,
      completedPreparations: 27,
      averageTime: 20,
      onTime: 25,
      total: 29
    }
  ];

  return {
    data: mockData,
    isLoading: false,
    error: null,
    refetch: async () => {
      console.log('Refetch punctuality data for period:', params.period);
    }
  };
};

// ✅ Hook pour les données de distribution des temps
export const useTimeDistribution = (params: ChartHookParams): ChartHookReturn<TimeDistributionData> => {
  // Mock des données pour éviter les erreurs
  const mockData: TimeDistributionData[] = [
    {
      range: '0-15 min',
      count: 12,
      percentage: 25,
      min: 0,
      max: 15
    },
    {
      range: '15-25 min',
      count: 28,
      percentage: 58,
      min: 15,
      max: 25
    },
    {
      range: '25-35 min',
      count: 6,
      percentage: 12,
      min: 25,
      max: 35
    },
    {
      range: '35+ min',
      count: 2,
      percentage: 5,
      min: 35,
      max: 60
    }
  ];

  return {
    data: mockData,
    isLoading: false,
    error: null,
    refetch: async () => {
      console.log('Refetch time distribution data for period:', params.period);
    }
  };
};

// ✅ Hook pour précharger toutes les données de graphiques
export const useDashboardChartsPreload = (params: ChartHookParams) => {
  const timelineData = useTimelineData(params);
  const punctualityData = usePunctualityByAgency(params);
  const timeDistributionData = useTimeDistribution(params);

  const isLoading = timelineData.isLoading || punctualityData.isLoading || timeDistributionData.isLoading;
  const hasError = !!(timelineData.error || punctualityData.error || timeDistributionData.error);

  const refetchAll = async () => {
    await Promise.all([
      timelineData.refetch(),
      punctualityData.refetch(),
      timeDistributionData.refetch()
    ]);
  };

  return {
    timelineData: timelineData.data,
    punctualityData: punctualityData.data,
    timeDistributionData: timeDistributionData.data,
    isLoading,
    hasError,
    refetchAll
  };
};

// ✅ Utilitaires pour les graphiques
export const chartUtils = {
  formatDate: (date: string, period: 'today' | 'week' | 'month') => {
    const d = new Date(date);
    switch (period) {
      case 'today':
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      case 'week':
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      case 'month':
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      default:
        return date;
    }
  },

  formatPercentage: (value: number) => {
    return `${value.toFixed(1)}%`;
  },

  formatTime: (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  },

  getPunctualityColor: (rate: number) => {
    if (rate >= 95) return '#10b981'; // green
    if (rate >= 85) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  },

  getPerformanceStatus: (rate: number) => {
    if (rate >= 95) return 'excellent';
    if (rate >= 85) return 'good';
    return 'needs-improvement';
  }
};