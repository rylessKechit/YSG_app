// hooks/useStats.ts
// ✅ Hook pour gérer les statistiques

import { useState, useCallback, useEffect } from 'react';
import { statsApi } from '@/lib/api/stats';
import type { DetailedStats, StatsFilter } from '@/lib/types/stats';

interface UseStatsOptions {
  autoLoad?: boolean;
  defaultPeriod?: 'today' | 'week' | 'month';
}

interface UseStatsReturn {
  // État des données
  stats: DetailedStats | null;
  
  // État de chargement
  isLoading: boolean;
  error: string | null;
  
  // Filtres actuels
  currentFilters: StatsFilter;
  
  // Actions
  loadStats: (filters?: Partial<StatsFilter>) => Promise<void>;
  refresh: () => Promise<void>;
  setPeriod: (period: 'today' | 'week' | 'month') => Promise<void>;
  setAgency: (agencyId?: string) => Promise<void>;
  clearError: () => void;
  
  // Utilitaires
  isEmpty: boolean;
  lastUpdated: Date | null;
}

export const useStats = (options: UseStatsOptions = {}): UseStatsReturn => {
  const {
    autoLoad = true,
    defaultPeriod = 'today'
  } = options;

  // États
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentFilters, setCurrentFilters] = useState<StatsFilter>({
    period: defaultPeriod
  });

  /**
   * Charger les statistiques
   */
  const loadStats = useCallback(async (newFilters?: Partial<StatsFilter>) => {
    setIsLoading(true);
    setError(null);

    try {
      const filters = { ...currentFilters, ...newFilters };
      setCurrentFilters(filters);

      console.log('📊 Chargement stats avec filtres:', filters);

      const statsData = await statsApi.getMyStats(filters);
      
      setStats(statsData);
      setLastUpdated(new Date());
      
      console.log('✅ Stats chargées:', {
        totalPreparations: statsData.totalPreparations,
        period: filters.period
      });

    } catch (err: any) {
      console.error('❌ Erreur chargement stats:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement des statistiques';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters]);

  /**
   * Rafraîchir les données
   */
  const refresh = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  /**
   * Changer la période
   */
  const setPeriod = useCallback(async (period: 'today' | 'week' | 'month') => {
    await loadStats({ period });
  }, [loadStats]);

  /**
   * Changer l'agence
   */
  const setAgency = useCallback(async (agencyId?: string) => {
    await loadStats({ agencyId });
  }, [loadStats]);

  /**
   * Effacer l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Chargement automatique
  useEffect(() => {
    if (autoLoad) {
      loadStats();
    }
  }, []);

  // Valeurs calculées
  const isEmpty = !isLoading && (!stats || stats.totalPreparations === 0);

  return {
    // État des données
    stats,
    
    // État de chargement
    isLoading,
    error,
    
    // Filtres actuels
    currentFilters,
    
    // Actions
    loadStats,
    refresh,
    setPeriod,
    setAgency,
    clearError,
    
    // Utilitaires
    isEmpty,
    lastUpdated
  };
};