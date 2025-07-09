// ✅ Hook usePreparationHistory optimisé - STOP REFRESH AUTO + SEARCH TRIGGER ONLY

import { useState, useCallback, useEffect, useRef } from 'react';
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
  agencyId?: string;
  search?: string;
  autoLoad?: boolean; // ✅ DÉSACTIVÉ PAR DÉFAUT
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

// ===== HOOK PRINCIPAL OPTIMISÉ =====

export const usePreparationHistory = (
  options: UsePreparationHistoryOptions = {}
): UsePreparationHistoryReturn => {
  const {
    page = 1,
    limit = 20,
    agencyId,
    search,
    autoLoad = false // ✅ DÉSACTIVÉ PAR DÉFAUT
  } = options;

  // ===== ÉTAT LOCAL =====
  
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

  // ✅ Référence pour éviter les appels multiples
  const loadingRef = useRef(false);

  // ===== ACTIONS =====

  /**
   * ✅ Charger l'historique des préparations - OPTIMISÉ
   */
  const loadHistory = useCallback(async (newOptions?: Partial<UsePreparationHistoryOptions>) => {
    // ✅ Prévenir les appels multiples simultanés
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
      // ✅ Construire les filtres de requête
      const currentFilters = {
        ...filters,
        ...newOptions
      };

      // ✅ Préparer les paramètres pour l'API
      const apiFilters: Record<string, string> = {};
      if (currentFilters.agencyId && currentFilters.agencyId !== 'all') {
        apiFilters.agencyId = currentFilters.agencyId;
      }
      if (currentFilters.search && currentFilters.search.trim()) {
        apiFilters.search = currentFilters.search.trim();
      }

      console.log('🔄 Chargement historique avec filtres:', currentFilters);

      // ✅ Appel API
      const historyData = await preparationApi.getPreparationHistory(
        currentFilters.page || 1,
        currentFilters.limit || 20,
        apiFilters
      );

      // ✅ Mise à jour des données
      if (isLoadingMore) {
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
        total: historyData.pagination.totalCount,
        date: new Date().toLocaleDateString('fr-FR')
      });

    } catch (err: any) {
      console.error('❌ Erreur chargement historique:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du chargement de l\'historique';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      loadingRef.current = false; // ✅ Libérer le verrou
    }
  }, [filters]);

  /**
   * ✅ Charger plus de préparations (pagination)
   */
  const loadMore = useCallback(async () => {
    if (pagination.hasNextPage && !isLoading && !isLoadingMore) {
      await loadHistory({ page: pagination.page + 1 });
    }
  }, [pagination.hasNextPage, pagination.page, isLoading, isLoadingMore, loadHistory]);

  /**
   * ✅ Rafraîchir les données (manuel uniquement)
   */
  const refresh = useCallback(async () => {
    console.log('🔄 Refresh manuel déclenché');
    await loadHistory({ page: 1 });
  }, [loadHistory]);

  /**
   * ✅ Mettre à jour les filtres - TRIGGER MANUAL
   */
  const setFilters = useCallback((newFilters: Partial<PreparationFilters>) => {
    console.log('🔍 Mise à jour filtres:', newFilters);
    const updatedFilters = { ...filters, ...newFilters, page: 1 }; // Reset page lors du filtrage
    setFiltersState(updatedFilters);
    // ✅ PAS DE CHARGEMENT AUTO - uniquement quand explicitement demandé
  }, [filters]);

  /**
   * ✅ Appliquer les filtres et charger (manuel)
   */
  const applyFiltersAndLoad = useCallback(async (newFilters: Partial<PreparationFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFiltersState(updatedFilters);
    await loadHistory(updatedFilters);
  }, [filters, loadHistory]);

  /**
   * ✅ Changer de page
   */
  const setPage = useCallback(async (newPage: number) => {
    const updatedFilters = { ...filters, page: newPage };
    setFiltersState(updatedFilters);
    await loadHistory(updatedFilters);
  }, [filters, loadHistory]);

  /**
   * ✅ Effacer l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== EFFETS =====

  /**
   * ✅ Chargement automatique au montage SEULEMENT si autoLoad = true
   */
  useEffect(() => {
    if (autoLoad) {
      console.log('🚀 Chargement auto au montage');
      loadHistory();
    }
  }, []); // ✅ Dépendance vide - ne charge qu'UNE SEULE FOIS

  // ✅ SUPPRIMÉ: Plus d'effet qui écoute les changements de filtres
  // Cela évite les refresh automatiques non désirés

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
    setFilters, // ✅ Ne charge pas automatiquement
    applyFiltersAndLoad, // ✅ Nouvelle méthode pour appliquer + charger
    setPage,
    clearError,
    
    // Utilitaires
    hasMore,
    isEmpty,
    total
  };
};

// ===== EXPORTS =====
export default usePreparationHistory;