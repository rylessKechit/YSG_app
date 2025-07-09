// admin-app/src/hooks/apiClient/usePreparations.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api';
import type { 
  PreparationListResponse,
  PreparationDetailResponse,
  PreparationStatsResponse,
  PreparationPhotosResponse,
  UpdateAgencyResponse,
  UpdateStepsResponse,
  PreparationFilters,
  UpdateAgencyRequest,
  UpdateStepsRequest
} from '@/types/preparation';

// ===== QUERY KEYS =====

export const preparationKeys = {
  all: ['preparations'] as const,
  lists: () => [...preparationKeys.all, 'list'] as const,
  list: (filters: PreparationFilters) => [...preparationKeys.lists(), filters] as const,
  details: () => [...preparationKeys.all, 'detail'] as const,
  detail: (id: string) => [...preparationKeys.details(), id] as const,
  stats: (filters?: { startDate?: string; endDate?: string; agency?: string }) => 
    [...preparationKeys.all, 'stats', filters] as const,
};

// ===== HOOKS DE QUERY =====

/**
 * Hook pour récupérer la liste des préparations avec filtres
 */
export function usePreparations(filters: PreparationFilters) {
  return useQuery({
    queryKey: preparationKeys.list(filters),
    queryFn: async (): Promise<PreparationListResponse> => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await apiClient.get(`/admin/preparations?${params.toString()}`);
      return response.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook pour récupérer le détail d'une préparation
 */
export function usePreparation(id: string) {
  return useQuery({
    queryKey: preparationKeys.detail(id),
    queryFn: async (): Promise<PreparationDetailResponse> => {
      const response = await apiClient.get(`/admin/preparations/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 60000,
  });
}

/**
 * Hook pour récupérer les statistiques des préparations
 */
export function usePreparationsStats(filters?: {
  startDate?: string;
  endDate?: string;
  agency?: string;
}) {
  return useQuery({
    queryKey: preparationKeys.stats(filters),
    queryFn: async (): Promise<PreparationStatsResponse> => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const response = await apiClient.get(`/admin/preparations/stats?${params.toString()}`);
      return response.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook pour récupérer les photos d'une préparation
 */
export function usePreparationPhotos(preparationId: string) {
  return useQuery({
    queryKey: [...preparationKeys.detail(preparationId), 'photos'],
    queryFn: async (): Promise<PreparationPhotosResponse> => {
      const response = await apiClient.get(`/admin/preparations/${preparationId}/photos`);
      return response.data;
    },
    enabled: !!preparationId,
    staleTime: 300000,
  });
}

// ===== HOOKS DE MUTATION =====

/**
 * Hook pour modifier l'agence d'une préparation
 */
export function useUpdatePreparationAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      preparationId,
      agencyId,
      reason
    }: {
      preparationId: string;
      agencyId: string;
      reason?: string;
    }): Promise<UpdateAgencyResponse> => {
      const payload: UpdateAgencyRequest = {
        agencyId,
        reason
      };

      const response = await apiClient.put(`/admin/preparations/${preparationId}/agency`, payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: preparationKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: preparationKeys.detail(variables.preparationId) 
      });
      queryClient.invalidateQueries({ queryKey: preparationKeys.stats() });

      toast.success(data.message || 'Agence modifiée avec succès');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erreur lors de la modification de l\'agence';
      toast.error(message);
    },
  });
}

/**
 * Hook pour modifier les étapes d'une préparation
 */
export function useUpdatePreparationSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      preparationId,
      steps,
      adminNotes
    }: {
      preparationId: string;
      steps: Array<{
        step: string;
        completed: boolean;
        notes?: string;
      }>;
      adminNotes?: string;
    }): Promise<UpdateStepsResponse> => {
      const payload: UpdateStepsRequest = {
        steps,
        adminNotes
      };

      const response = await apiClient.put(`/admin/preparations/${preparationId}/steps`, payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: preparationKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: preparationKeys.detail(variables.preparationId) 
      });
      queryClient.invalidateQueries({ queryKey: preparationKeys.stats() });

      toast.success('Étapes modifiées avec succès');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erreur lors de la modification des étapes';
      toast.error(message);
    },
  });
}

/**
 * Hook pour exporter les préparations
 */
export function useExportPreparations() {
  return useMutation({
    mutationFn: async (filters: PreparationFilters): Promise<Blob> => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await apiClient.get(`/admin/preparations/export?${params.toString()}`, {
        responseType: 'blob',
      });
      
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0];
      const filename = `preparations_${today}.xlsx`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export réalisé avec succès');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erreur lors de l\'export';
      toast.error(message);
    },
  });
}

// ===== HOOKS UTILITAIRES =====

/**
 * Hook pour précharger une préparation
 */
export function usePrefetchPreparation() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: preparationKeys.detail(id),
      queryFn: async (): Promise<PreparationDetailResponse> => {
        const response = await apiClient.get(`/admin/preparations/${id}`);
        return response.data;
      },
      staleTime: 60000,
    });
  };
}

/**
 * Hook pour invalider les caches liés aux préparations
 */
export function useInvalidatePreparations() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: preparationKeys.all });
    },
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: preparationKeys.lists() });
    },
    invalidateDetail: (id: string) => {
      queryClient.invalidateQueries({ queryKey: preparationKeys.detail(id) });
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: preparationKeys.stats() });
    },
  };
}

/**
 * Hook pour obtenir les données en cache d'une préparation
 */
export function usePreparationCache(id: string) {
  const queryClient = useQueryClient();

  return {
    getPreparation: () => {
      return queryClient.getQueryData(preparationKeys.detail(id));
    },
    setPreparation: (data: PreparationDetailResponse) => {
      queryClient.setQueryData(preparationKeys.detail(id), data);
    },
  };
}