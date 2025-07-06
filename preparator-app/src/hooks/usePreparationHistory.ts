// preparator-app/src/hooks/usePreparationHistory.ts
import { useState, useEffect, useCallback } from 'react';
import { preparationAPI } from '@/lib/api/preparations';

// Types
interface PreparationHistoryItem {
  id: string;
  vehicle: {
    licensePlate: string;
    brand: string;
    model: string;
    color?: string;
  };
  agency: {
    id: string;
    name: string;
    code: string;
  };
  startTime: string;
  endTime?: string;
  totalTime?: number;
  status: 'completed' | 'cancelled' | 'in_progress';
  steps: any[];
  isOnTime?: boolean;
  createdAt: string;
}

interface PreparationHistoryData {
  preparations: PreparationHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UsePreparationHistoryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'completed' | 'cancelled';
  agencyId?: string;
  startDate?: string;
  endDate?: string;
}

export const usePreparationHistory = (options: UsePreparationHistoryOptions = {}) => {
  const [data, setData] = useState<PreparationHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Construire les filtres pour l'API
  const buildFilters = useCallback(() => {
    const filters: any = {};
    
    if (options.search) filters.search = options.search;
    if (options.status && options.status !== 'all') filters.status = options.status;
    if (options.agencyId && options.agencyId !== 'all') filters.agencyId = options.agencyId;
    if (options.startDate) filters.startDate = options.startDate;
    if (options.endDate) filters.endDate = options.endDate;
    
    return filters;
  }, [options]);

  // Charger les données
  const loadHistory = useCallback(async (reset = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const page = reset ? 1 : (options.page || 1);
      const limit = options.limit || 20;
      const filters = buildFilters();

      console.log('🔍 Chargement historique préparations:', { page, limit, filters });

      const response = await preparationAPI.getPreparationHistory(page, limit, filters);
      
      if (reset || page === 1) {
        setData(response);
      } else {
        // Ajouter à la liste existante (pagination)
        setData(prev => prev ? {
          ...response,
          preparations: [...prev.preparations, ...response.preparations]
        } : response);
      }

      console.log('✅ Historique chargé:', response);

    } catch (err: any) {
      console.error('❌ Erreur chargement historique:', err);
      setError(err.response?.data?.message || err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setIsLoading(false);
    }
  }, [options, buildFilters, isLoading]);

  // Recharger les données
  const refresh = useCallback(() => {
    loadHistory(true);
  }, [loadHistory]);

  // Charger plus de données (pagination)
  const loadMore = useCallback(() => {
    if (data?.pagination?.hasNext && !isLoading) {
      const nextPage = (data.pagination.page || 1) + 1;
      loadHistory(false);
    }
  }, [data, isLoading, loadHistory]);

  // Charger au montage et quand les options changent
  useEffect(() => {
    loadHistory(true);
  }, [
    options.search,
    options.status,
    options.agencyId,
    options.startDate,
    options.endDate,
    options.limit
  ]);

  return {
    data,
    preparations: data?.preparations || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refresh,
    loadMore,
    hasMore: data?.pagination?.hasNext || false
  };
};