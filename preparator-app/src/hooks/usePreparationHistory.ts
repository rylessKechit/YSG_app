// preparator-app/src/hooks/usePreparationHistory.ts
// ✅ Hook pour l'historique des préparations - ERREURS TYPESCRIPT CORRIGÉES

import { useState, useCallback, useEffect } from 'react';
import { preparationApi } from '@/lib/api/preparations';
import type { 
  PreparationHistory, 
  PreparationFilters, 
  Preparation 
} from '@/lib/types/index';

// ===== TYPES POUR LE HOOK =====

export interface UsePreparationHistoryOptions {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  agencyId?: string;
  search?: string;
  autoLoad?: boolean;
}

export interface UsePreparationHistoryReturn {
  // État des données
  preparations: Preparation[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: PreparationFilters;
  
  // État de chargement
  isLoading: boolean;
  error: string | null;
  isLoadingMore: boolean;
  
  // Actions
  loadHistory: (options?: Partial<UsePreparationHistoryOptions>) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: Partial<PreparationFilters>) => void;
  setPage: (page: number) => void;
  clearError: () => void;
  
  // Utilitaires
  hasMore: boolean;
  isEmpty: boolean;
  total: number;
}

// ===== ÉTAT INITIAL =====

const initialPagination = {
  page: 1,
  limit: 20,
  totalCount: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false
};

const initialFilters: PreparationFilters = {
  page: 1,
  limit: 20
};

// ===== HOOK PRINCIPAL =====

export const usePreparationHistory = (
  options: UsePreparationHistoryOptions = {}
): UsePreparationHistoryReturn => {
  const {
    page = 1,
    limit = 20,
    startDate,
    endDate,
    agencyId,
    search,
    autoLoad = true
  } = options;

  // ===== ÉTAT LOCAL =====
  
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [filters, setFiltersState] = useState<PreparationFilters>({
    ...initialFilters,
    page,
    limit,
    startDate,
    endDate,
    agencyId,
    search
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== ACTIONS =====

  /**
   * Charger l'historique des préparations
   */
  const loadHistory = useCallback(async (newOptions?: Partial<UsePreparationHistoryOptions>) => {
    const loadingType = newOptions?.page && newOptions.page > 1 ? 'loadMore' : 'initial';
    
    if (loadingType === 'initial') {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    setError(null);

    try {
      // ✅ Construire les paramètres API avec les bons types
      const apiFilters: Record<string, string> = {};
      
      const currentFilters = { ...filters, ...newOptions };
      
      if (currentFilters.startDate) {
        apiFilters.startDate = currentFilters.startDate.toISOString().split('T')[0];
      }
      if (currentFilters.endDate) {
        apiFilters.endDate = currentFilters.endDate.toISOString().split('T')[0];
      }
      // ✅ Ne pas envoyer agencyId si c'est "all" ou vide
      if (currentFilters.agencyId && currentFilters.agencyId !== 'all') {
        apiFilters.agencyId = currentFilters.agencyId;
      }
      if (currentFilters.search) {
        apiFilters.search = currentFilters.search;
      }

      console.log('🔍 Chargement historique préparations:', {
        page: currentFilters.page || 1,
        limit: currentFilters.limit || 20,
        filters: apiFilters
      });

      // ✅ Appel API avec la bonne signature
      const historyData: PreparationHistory = await preparationApi.getPreparationHistory(
        currentFilters.page || 1,
        currentFilters.limit || 20,
        apiFilters
      );

      // ✅ Mise à jour de l'état avec les bonnes données
      if (loadingType === 'loadMore' && currentFilters.page && currentFilters.page > 1) {
        // Ajouter aux préparations existantes
        setPreparations(prev => [...prev, ...historyData.preparations]);
      } else {
        // Remplacer les préparations
        setPreparations(historyData.preparations);
      }

      // ✅ Mise à jour pagination
      setPagination(historyData.pagination);
      
      // ✅ Mise à jour filtres avec les nouvelles valeurs
      setFiltersState(prev => ({
        ...prev,
        ...currentFilters
      }));

      console.log('✅ Historique chargé:', {
        preparations: historyData.preparations.length,
        total: historyData.pagination.totalCount
      });

    } catch (err: any) {
      console.error('❌ Erreur chargement historique:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement de l\'historique';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters]);

  /**
   * Charger plus de préparations (pagination)
   */
  const loadMore = useCallback(async () => {
    if (pagination.hasNextPage && !isLoading && !isLoadingMore) {
      await loadHistory({ page: pagination.page + 1 });
    }
  }, [pagination.hasNextPage, pagination.page, isLoading, isLoadingMore, loadHistory]);

  /**
   * Rafraîchir les données
   */
  const refresh = useCallback(async () => {
    await loadHistory({ page: 1 });
  }, [loadHistory]);

  /**
   * Mettre à jour les filtres
   */
  const setFilters = useCallback((newFilters: Partial<PreparationFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }; // Reset page lors du filtrage
    setFiltersState(updatedFilters);
    loadHistory(updatedFilters);
  }, [filters, loadHistory]);

  /**
   * Changer de page
   */
  const setPage = useCallback((newPage: number) => {
    const updatedFilters = { ...filters, page: newPage };
    setFiltersState(updatedFilters);
    loadHistory(updatedFilters);
  }, [filters, loadHistory]);

  /**
   * Effacer l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== EFFETS =====

  /**
   * Chargement automatique au montage
   */
  useEffect(() => {
    if (autoLoad) {
      loadHistory();
    }
  }, []); // Dépendance vide pour ne charger qu'une fois

  // ===== VALEURS CALCULÉES =====

  const hasMore = pagination.hasNextPage;
  const isEmpty = !isLoading && preparations.length === 0;
  const total = pagination.totalCount;

  // ===== RETOUR DU HOOK =====

  return {
    // État des données
    preparations,
    pagination,
    filters,
    
    // État de chargement
    isLoading,
    error,
    isLoadingMore,
    
    // Actions
    loadHistory,
    loadMore,
    refresh,
    setFilters,
    setPage,
    clearError,
    
    // Utilitaires
    hasMore,
    isEmpty,
    total
  };
};

// ===== HOOKS DÉRIVÉS =====

/**
 * Hook simplifié pour l'historique avec filtres de base
 */
export const usePreparationHistorySimple = (agencyId?: string) => {
  return usePreparationHistory({
    agencyId,
    limit: 10,
    autoLoad: true
  });
};

/**
 * Hook pour l'historique avec recherche
 */
export const usePreparationHistoryWithSearch = () => {
  const history = usePreparationHistory({ autoLoad: false });
  
  const searchPreparations = useCallback((query: string, agencyId?: string) => {
    history.setFilters({
      search: query,
      agencyId,
      page: 1
    });
  }, [history]);

  return {
    ...history,
    searchPreparations
  };
};

// ===== EXPORTS =====

export default usePreparationHistory;