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
  stats: (filters?: { startDate?: string; endDate?: string; agency?: string; user?: string }) => 
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

      console.log('🔄 [usePreparations] API Call with params:', params.toString());
      const response = await apiClient.get(`/admin/preparations?${params.toString()}`);
      return response.data;
    },
    staleTime: 0, // ✅ FIX: Changé de 30000 à 0 pour forcer le refetch
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
 * Hook pour récupérer les statistiques des préparations - VERSION CORRIGÉE
 */
export function usePreparationsStats(filters?: {
  startDate?: string;
  endDate?: string;
  agency?: string;
  user?: string;  // ✅ AJOUTÉ !
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

      console.log('📊 [usePreparationsStats] Appel API avec params:', params.toString());

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
 * Hook pour exporter les préparations - VERSION CORRIGÉE
 */
export function useExportPreparations() {
  return useMutation({
    mutationFn: async (filters: PreparationFilters): Promise<Blob> => {
      // ✅ TRANSFORMATION DES FILTRES VERS LE FORMAT ATTENDU PAR LE BACKEND
      const exportPayload = {
        type: 'activite', // Type de rapport obligatoire
        format: 'excel', // Format par défaut
        period: {
          start: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 jours par défaut
          end: filters.endDate || new Date().toISOString().split('T')[0]
        },
        filters: {
          // ✅ Transformation des filtres de préparation
          agencies: filters.agency ? [filters.agency] : undefined,
          users: filters.user ? [filters.user] : undefined,
          status: filters.status && filters.status !== 'all' ? filters.status : undefined,
          search: filters.search || undefined,
          includeDetails: true,
          includeStats: true
        },
        delivery: {
          method: 'download' // Méthode de livraison obligatoire
        }
      };

      console.log('📤 Payload d\'export envoyé:', exportPayload);

      // ✅ UTILISATION DU BON ENDPOINT ET DE LA BONNE MÉTHODE
      const response = await apiClient.post('/admin/reports/export', exportPayload, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    },
    onSuccess: (blob) => {
      // ✅ CRÉATION DU FICHIER DE TÉLÉCHARGEMENT
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0];
      const filename = `preparations_export_${today}.xlsx`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export réalisé avec succès');
    },
    onError: (error: any) => {
      console.error('❌ Erreur export:', error);
      
      // ✅ GESTION D'ERREUR AMÉLIORÉE
      let message = 'Erreur lors de l\'export';
      
      if (error?.response?.status === 400) {
        message = error?.response?.data?.message || 'Paramètres d\'export invalides';
      } else if (error?.response?.status === 401) {
        message = 'Session expirée, veuillez vous reconnecter';
      } else if (error?.response?.status === 403) {
        message = 'Vous n\'avez pas les permissions pour exporter';
      }
      
      toast.error(message);
    },
  });
}

/**
 * Hook pour exporter avec options avancées
 */
export function useExportPreparationsAdvanced() {
  return useMutation({
    mutationFn: async (options: {
      filters: PreparationFilters;
      format?: 'excel' | 'csv' | 'pdf';
      includePhotos?: boolean;
      includeDetails?: boolean;
    }): Promise<Blob> => {
      const { filters, format = 'excel', includePhotos = false, includeDetails = true } = options;

      const exportPayload = {
        type: 'custom', // Type personnalisé pour préparations
        format,
        period: {
          start: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: filters.endDate || new Date().toISOString().split('T')[0]
        },
        filters: {
          agencies: filters.agency ? [filters.agency] : undefined,
          users: filters.user ? [filters.user] : undefined,
          status: filters.status && filters.status !== 'all' ? filters.status : undefined,
          search: filters.search || undefined,
          includeDetails,
          includePhotos,
          includeStats: true,
          // Paramètres de pagination si nécessaire
          page: filters.page || 1,
          limit: 1000 // Limite élevée pour export complet
        },
        delivery: {
          method: 'download'
        }
      };

      const response = await apiClient.post('/admin/reports/export', exportPayload, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    },
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0];
      const extension = variables.format === 'csv' ? 'csv' : variables.format === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `preparations_export_${today}.${extension}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Export ${variables.format?.toUpperCase()} réalisé avec succès`);
    },
    onError: (error: any) => {
      console.error('❌ Erreur export avancé:', error);
      
      let message = 'Erreur lors de l\'export';
      
      if (error?.response?.data?.message) {
        message = error.response.data.message;
      }
      
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

/**
 * Hook pour supprimer une préparation
 */
export function useDeletePreparation() {
  const queryClient = useQueryClient();

  return useMutation({
    // ✅ CORRECTION : Envoyer les données dans le body avec POST au lieu de DELETE
    mutationFn: async ({ 
      preparationId, 
      reason, 
      preserveData = false 
    }: { 
      preparationId: string; 
      reason: string; 
      preserveData?: boolean; 
    }): Promise<{ success: boolean; message: string }> => {
      console.log('🗑️ Suppression préparation:', preparationId);
      
      // Utiliser POST au lieu de DELETE pour pouvoir envoyer un body
      const response = await apiClient.post(`/admin/preparations/${preparationId}/delete`, {
        reason,
        preserveData
      });
      return response.data;
    },
    onSuccess: (data, { preparationId }) => {
      // Invalider les caches pour rafraîchir les listes
      queryClient.invalidateQueries({ queryKey: preparationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: preparationKeys.stats() });
      
      // Supprimer les données en cache pour cette préparation spécifique
      queryClient.removeQueries({ queryKey: preparationKeys.detail(preparationId) });
      
      toast.success(data.message || 'Préparation supprimée avec succès');
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression:', error);
      
      let message = 'Erreur lors de la suppression';
      
      if (error?.response?.status === 404) {
        message = 'Préparation non trouvée';
      } else if (error?.response?.status === 403) {
        message = 'Vous n\'avez pas les permissions pour supprimer cette préparation';
      } else if (error?.response?.status === 400) {
        // Erreur de validation
        message = error?.response?.data?.message || 'Données invalides';
      } else if (error?.response?.data?.message) {
        message = error.response.data.message;
      }
      
      toast.error(message);
    },
  });
}

/**
 * Hook pour supprimer plusieurs préparations
 */
export function useDeleteMultiplePreparations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      preparationIds, 
      reason, 
      preserveData = false 
    }: { 
      preparationIds: string[]; 
      reason: string; 
      preserveData?: boolean; 
    }): Promise<{ 
      success: boolean; 
      message: string; 
      deleted: number;
      errors?: any[];
    }> => {
      console.log('🗑️ Suppression multiple:', preparationIds.length, 'préparations');
      
      const response = await apiClient.post('/admin/preparations/bulk-delete', {
        preparationIds,
        reason,
        preserveData
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Invalider tous les caches liés aux préparations
      queryClient.invalidateQueries({ queryKey: preparationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: preparationKeys.stats() });
      
      // Message de succès avec détails
      const { deleted, errors } = data;
      let message = `${deleted} préparation(s) supprimée(s) avec succès`;
      
      if (errors && errors.length > 0) {
        message += ` (${errors.length} erreur(s))`;
      }
      
      toast.success(message);
    },
    onError: (error: any) => {
      console.error('❌ Erreur suppression multiple:', error);
      
      let message = 'Erreur lors de la suppression';
      
      if (error?.response?.status === 400) {
        message = error?.response?.data?.message || 'Données invalides';
      } else if (error?.response?.data?.message) {
        message = error.response.data.message;
      }
      
      toast.error(message);
    },
  });
}