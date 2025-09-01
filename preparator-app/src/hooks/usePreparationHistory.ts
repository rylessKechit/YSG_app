// ✅ Hook usePreparationHistory - CORRECTION FINALE NOM DE MÉTHODE

import { useState, useCallback, useEffect, useRef } from 'react';
import { PreparationAPI } from '@/lib/api/preparations';
import type { 
  PreparationHistory, 
  PreparationFilters, 
  Preparation 
} from '@/lib/types/index';

// Créer une instance de l'API
const preparationApi = new PreparationAPI();

// ===== TYPES POUR LE HOOK =====

export interface UsePreparationHistoryOptions {
  page?: number;
  limit?: number;
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
  applyFiltersAndLoad: (filters: Partial<PreparationFilters>) => Promise<void>;
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
    agencyId,
    search,
    autoLoad = false
  } = options;

  // État local
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [filters, setFiltersState] = useState<PreparationFilters>({
    ...initialFilters,
    page,
    limit,
    agencyId,
    search
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);

  // ===== ACTIONS =====

  const loadHistory = useCallback(async (newOptions?: Partial<UsePreparationHistoryOptions>) => {
    if (loadingRef.current) {
      console.log('⚠️ Chargement déjà en cours, ignoré');
      return;
    }

    loadingRef.current = true;
    const isLoadingMore = newOptions?.page && newOptions.page > 1;
    
    if (isLoadingMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    setError(null);

    try {
      // Construire les filtres
      const currentFilters = {
        ...filters,
        ...newOptions
      };

      // Créer un objet PreparationFilters pour l'API
      const apiFilters: PreparationFilters = {
        page: currentFilters.page || 1,
        limit: currentFilters.limit || 20
      };

      if (currentFilters.agencyId && currentFilters.agencyId !== 'all') {
        apiFilters.agencyId = currentFilters.agencyId;
      }
      if (currentFilters.search && currentFilters.search.trim()) {
        apiFilters.search = currentFilters.search.trim();
      }

      console.log('🔄 Chargement historique avec filtres:', apiFilters);

      // ✅ CORRECTION: Utiliser getPreparationsHistory (avec 's')
      const historyData = await preparationApi.getPreparationsHistory(apiFilters);

      if (historyData && historyData.preparations) {
        // Mise à jour des données
        if (isLoadingMore) {
          setPreparations(prev => [...prev, ...historyData.preparations]);
        } else {
          setPreparations(historyData.preparations);
        }

        // Mise à jour pagination
        setPagination(historyData.pagination);
        
        // Mise à jour filtres
        setFiltersState(prev => ({
          ...prev,
          ...currentFilters
        }));

        console.log('✅ Historique chargé:', {
          preparations: historyData.preparations.length,
          total: historyData.pagination.totalCount
        });
      } else {
        console.warn('⚠️ Structure de données inattendue:', historyData);
        setPreparations([]);
        setPagination(initialPagination);
      }

    } catch (err: any) {
      console.error('❌ Erreur chargement historique:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement de l\'historique';
      setError(errorMessage);
      
      // Reset en cas d'erreur
      setPreparations([]);
      setPagination(initialPagination);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (pagination.hasNextPage && !isLoading && !isLoadingMore) {
      await loadHistory({ page: pagination.page + 1 });
    }
  }, [pagination.hasNextPage, pagination.page, isLoading, isLoadingMore, loadHistory]);

  const refresh = useCallback(async () => {
    console.log('🔄 Refresh manuel déclenché');
    await loadHistory({ page: 1 });
  }, [loadHistory]);

  const setFilters = useCallback((newFilters: Partial<PreparationFilters>) => {
    console.log('🔍 Mise à jour filtres:', newFilters);
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFiltersState(updatedFilters);
  }, [filters]);

  const applyFiltersAndLoad = useCallback(async (newFilters: Partial<PreparationFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFiltersState(updatedFilters);
    await loadHistory(updatedFilters);
  }, [filters, loadHistory]);

  const setPage = useCallback(async (newPage: number) => {
    const updatedFilters = { ...filters, page: newPage };
    setFiltersState(updatedFilters);
    await loadHistory(updatedFilters);
  }, [filters, loadHistory]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Chargement automatique
  useEffect(() => {
    if (autoLoad) {
      console.log('🚀 Chargement auto au montage');
      loadHistory();
    }
  }, []);

  // Valeurs calculées
  const hasMore = pagination.hasNextPage;
  const isEmpty = !isLoading && preparations.length === 0;
  const total = pagination.totalCount;

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
    applyFiltersAndLoad,
    setPage,
    clearError,
    
    // Utilitaires
    hasMore,
    isEmpty,
    total
  };
};

export default usePreparationHistory;