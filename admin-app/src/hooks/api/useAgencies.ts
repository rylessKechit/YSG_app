// admin-app/src/hooks/api/useAgencies.ts - HOOKS REACT QUERY POUR AGENCES
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { agenciesApi, BulkActionData } from '@/lib/api/agencies';
import { 
  Agency, 
  AgencyFilters, 
  AgencyCreateData, 
  AgencyUpdateData, 
  AgencyStats 
} from '@/types/agency';

// ===== QUERIES =====

// Hook pour récupérer la liste des agences
export function useAgencies(filters: AgencyFilters = {}) {
  return useQuery({
    queryKey: ['agencies', filters],
    queryFn: async () => {
      console.log('🔄 [useAgencies] Appel API avec filtres:', filters);
      
      try {
        const response = await agenciesApi.getAgencies(filters);
        
        if (response.success && response.data) {
          console.log('✅ [useAgencies] Données reçues:', {
            agenciesCount: response.data.agencies.length,
            page: response.data.pagination.page,
            total: response.data.pagination.total
          });
          return response.data;
        }
        
        // Erreur dans la réponse API
        const errorMessage = response.message || 'Erreur lors du chargement des agences';
        console.error('❌ [useAgencies] Erreur API:', errorMessage);
        throw new Error(errorMessage);
        
      } catch (error: any) {
        console.error('❌ [useAgencies] Erreur complète:', error);
        
        // Gestion d'erreurs spécifiques
        if (error.response?.status === 400) {
          console.error('❌ [useAgencies] Erreur 400 - Paramètres invalides:', error.response.data);
          throw new Error('Paramètres de recherche invalides');
        }
        if (error.response?.status === 401) {
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
        if (error.response?.status === 403) {
          throw new Error('Accès non autorisé');
        }
        if (error.response?.status === 500) {
          throw new Error('Erreur serveur, veuillez réessayer');
        }
        
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Ne pas retry sur les erreurs 400 (validation) et 401/403 (auth)
      if (error?.response?.status && [400, 401, 403].includes(error.response.status)) {
        console.log('🚫 [useAgencies] Pas de retry pour erreur:', error.response.status);
        return false;
      }
      // Retry max 2 fois pour les autres erreurs
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (remplace cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  });
}

// Hook pour récupérer une agence par ID
export function useAgency(id: string) {
  return useQuery({
    queryKey: ['agency', id],
    queryFn: async () => {
      console.log('🔄 [useAgency] Appel API pour agence:', id);
      
      try {
        const response = await agenciesApi.getAgency(id);
        
        if (response.success && response.data?.agency) {
          console.log('✅ [useAgency] Agence reçue:', response.data.agency);
          return response.data.agency;
        }
        
        const errorMessage = response.message || 'Agence non trouvée';
        console.error('❌ [useAgency] Erreur:', errorMessage);
        throw new Error(errorMessage);
        
      } catch (error: any) {
        console.error('❌ [useAgency] Erreur complète:', error);
        
        if (error.response?.status === 404) {
          throw new Error('Agence non trouvée');
        }
        if (error.response?.status === 403) {
          throw new Error('Accès non autorisé à cette agence');
        }
        
        throw error;
      }
    },
    enabled: !!id,
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook pour récupérer les statistiques d'une agence
export function useAgencyStats(id: string) {
  return useQuery({
    queryKey: ['agency-stats', id],
    queryFn: async () => {
      console.log('🔄 [useAgencyStats] Appel API stats pour agence:', id);
      
      try {
        const response = await agenciesApi.getAgencyStats(id);
        
        if (response.success && response.data?.stats) {
          console.log('✅ [useAgencyStats] Stats reçues:', response.data.stats);
          return response.data.stats;
        }
        
        throw new Error(response.message || 'Statistiques non disponibles');
        
      } catch (error: any) {
        console.error('❌ [useAgencyStats] Erreur:', error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes pour les stats
    gcTime: 15 * 60 * 1000,
  });
}

// Hook pour récupérer les utilisateurs d'une agence
export function useAgencyUsers(id: string) {
  return useQuery({
    queryKey: ['agency-users', id],
    queryFn: async () => {
      console.log('🔄 [useAgencyUsers] Appel API users pour agence:', id);
      
      try {
        const response = await agenciesApi.getAgencyUsers(id);
        
        if (response.success && response.data?.users) {
          console.log('✅ [useAgencyUsers] Utilisateurs reçus:', response.data.users.length);
          return response.data.users;
        }
        
        throw new Error(response.message || 'Utilisateurs non trouvés');
        
      } catch (error: any) {
        console.error('❌ [useAgencyUsers] Erreur:', error);
        throw error;
      }
    },
    enabled: !!id,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook pour récupérer l'activité d'une agence
export function useAgencyActivity(id: string, limit: number = 20) {
  return useQuery({
    queryKey: ['agency-activity', id, limit],
    queryFn: async () => {
      console.log('🔄 [useAgencyActivity] Appel API activité pour agence:', id);
      
      try {
        const response = await agenciesApi.getAgencyActivity(id, limit);
        
        if (response.success && response.data?.activities) {
          console.log('✅ [useAgencyActivity] Activités reçues:', response.data.activities.length);
          return response.data.activities;
        }
        
        return []; // Retourner un tableau vide si pas d'activité
        
      } catch (error: any) {
        console.error('❌ [useAgencyActivity] Erreur:', error);
        return []; // En cas d'erreur, retourner un tableau vide
      }
    },
    enabled: !!id,
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes pour l'activité récente
  });
}

// Hook pour vérifier la disponibilité d'un code
export function useCheckAgencyCode(code: string, excludeId?: string) {
  return useQuery({
    queryKey: ['agency-code-check', code, excludeId],
    queryFn: async () => {
      console.log('🔄 [useCheckAgencyCode] Vérification code:', code);
      
      try {
        const response = await agenciesApi.checkCodeAvailability(code, excludeId);
        
        if (response.success && response.data) {
          console.log('✅ [useCheckAgencyCode] Code disponible:', response.data.available);
          return response.data.available;
        }
        
        return false;
        
      } catch (error: any) {
        console.error('❌ [useCheckAgencyCode] Erreur:', error);
        return false;
      }
    },
    enabled: !!code && code.length >= 2,
    retry: 1,
    staleTime: 30 * 1000, // 30 secondes
  });
}

// Hook pour obtenir toutes les agences (pour sélecteurs)
export function useAllAgencies() {
  return useQuery({
    queryKey: ['all-agencies'],
    queryFn: async () => {
      console.log('🔄 [useAllAgencies] Récupération toutes agences');
      
      try {
        const response = await agenciesApi.getAllAgencies();
        
        if (response.success && response.data?.agencies) {
          console.log('✅ [useAllAgencies] Agences reçues:', response.data.agencies.length);
          return response.data.agencies;
        }
        
        throw new Error(response.message || 'Erreur lors du chargement');
        
      } catch (error: any) {
        console.error('❌ [useAllAgencies] Erreur:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,
  });
}

// Hook pour recherche d'agences (autocomplétion)
export function useSearchAgencies(query: string, limit: number = 10) {
  return useQuery({
    queryKey: ['search-agencies', query, limit],
    queryFn: async () => {
      console.log('🔄 [useSearchAgencies] Recherche:', query);
      
      try {
        const response = await agenciesApi.searchAgencies(query, limit);
        
        if (response.success && response.data?.agencies) {
          console.log('✅ [useSearchAgencies] Résultats:', response.data.agencies.length);
          return response.data.agencies;
        }
        
        return [];
        
      } catch (error: any) {
        console.error('❌ [useSearchAgencies] Erreur:', error);
        return [];
      }
    },
    enabled: !!query && query.trim().length >= 2,
    retry: 1,
    staleTime: 30 * 1000,
  });
}

// ===== MUTATIONS =====

// Hook pour création d'agence
export function useCreateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AgencyCreateData) => {
      console.log('➕ [useCreateAgency] Création:', data);
      
      try {
        const response = await agenciesApi.createAgency(data);
        
        if (response.success && response.data?.agency) {
          console.log('✅ [useCreateAgency] Agence créée:', response.data.agency);
          return response.data.agency;
        }
        
        throw new Error(response.message || 'Erreur lors de la création');
        
      } catch (error: any) {
        console.error('❌ [useCreateAgency] Erreur:', error);
        
        // Gestion d'erreurs spécifiques
        if (error.response?.status === 409) {
          throw new Error('Une agence avec ce code existe déjà');
        }
        if (error.response?.status === 400) {
          const errorMsg = error.response?.data?.message || 'Données invalides';
          throw new Error(errorMsg);
        }
        
        throw error;
      }
    },
    onSuccess: (agency) => {
      // Invalider et rafraîchir les caches
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      
      toast.success('Agence créée avec succès');
      console.log('✅ [useCreateAgency] Cache invalidé');
    },
    onError: (error: any) => {
      console.error('❌ [useCreateAgency] Erreur finale:', error);
      toast.error(error.message || 'Erreur lors de la création');
    },
  });
}

// Hook pour modification d'agence
export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AgencyUpdateData }) => {
      console.log('✏️ [useUpdateAgency] Modification:', id, data);
      
      try {
        const response = await agenciesApi.updateAgency(id, data);
        
        if (response.success && response.data?.agency) {
          console.log('✅ [useUpdateAgency] Agence modifiée:', response.data.agency);
          return response.data.agency;
        }
        
        throw new Error(response.message || 'Erreur lors de la modification');
        
      } catch (error: any) {
        console.error('❌ [useUpdateAgency] Erreur:', error);
        throw error;
      }
    },
    onSuccess: (agency, variables) => {
      // Mettre à jour les caches spécifiques
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['agency', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      
      toast.success('Agence modifiée avec succès');
      console.log('✅ [useUpdateAgency] Cache invalidé');
    },
    onError: (error: any) => {
      console.error('❌ [useUpdateAgency] Erreur finale:', error);
      toast.error(error.message || 'Erreur lors de la modification');
    },
  });
}

// Hook pour suppression/désactivation d'agence
export function useDeleteAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ [useDeleteAgency] Suppression:', id);
      
      try {
        const response = await agenciesApi.deleteAgency(id);
        
        if (response.success) {
          console.log('✅ [useDeleteAgency] Agence supprimée:', id);
          return response;
        }
        
        throw new Error(response.message || 'Erreur lors de la suppression');
        
      } catch (error: any) {
        console.error('❌ [useDeleteAgency] Erreur:', error);
        throw error;
      }
    },
    onSuccess: (response, id) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['agency', id] });
      queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      
      toast.success('Agence désactivée avec succès');
      console.log('✅ [useDeleteAgency] Cache invalidé');
    },
    onError: (error: any) => {
      console.error('❌ [useDeleteAgency] Erreur finale:', error);
      toast.error(error.message || 'Erreur lors de la désactivation');
    },
  });
}

// Hook pour réactivation d'agence
export function useReactivateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🔄 [useReactivateAgency] Réactivation:', id);
      
      try {
        const response = await agenciesApi.reactivateAgency(id);
        
        if (response.success && response.data?.agency) {
          console.log('✅ [useReactivateAgency] Agence réactivée:', response.data.agency);
          return response.data.agency;
        }
        
        throw new Error(response.message || 'Erreur lors de la réactivation');
        
      } catch (error: any) {
        console.error('❌ [useReactivateAgency] Erreur:', error);
        throw error;
      }
    },
    onSuccess: (agency, id) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['agency', id] });
      queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      
      toast.success('Agence réactivée avec succès');
      console.log('✅ [useReactivateAgency] Cache invalidé');
    },
    onError: (error: any) => {
      console.error('❌ [useReactivateAgency] Erreur finale:', error);
      toast.error(error.message || 'Erreur lors de la réactivation');
    },
  });
}

// Hook pour les actions en masse
export function useBulkActionsAgencies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkActionData) => {
      console.log('🔄 [useBulkActionsAgencies] Actions en masse:', data);
      
      try {
        const response = await agenciesApi.bulkActions(data);
        
        if (response.success) {
          console.log('✅ [useBulkActionsAgencies] Actions exécutées:', response.data);
          return response.data;
        }
        
        throw new Error(response.message || 'Erreur lors des actions en masse');
        
      } catch (error: any) {
        console.error('❌ [useBulkActionsAgencies] Erreur:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      // Invalider toutes les queries des agences
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
      
      toast.success(`Actions exécutées avec succès (${result.processed || 0} traitées)`);
      console.log('✅ [useBulkActionsAgencies] Cache invalidé');
    },
    onError: (error: any) => {
      console.error('❌ [useBulkActionsAgencies] Erreur finale:', error);
      toast.error(error.message || 'Erreur lors des actions en masse');
    },
  });
}

// Hook pour l'export
export function useExportAgencies() {
  return useMutation({
    mutationFn: async ({ format, filters }: { format: 'excel' | 'csv'; filters?: AgencyFilters }) => {
      console.log('📤 [useExportAgencies] Export:', format, filters);
      
      try {
        const blob = await agenciesApi.exportAgencies(format, filters);
        console.log('✅ [useExportAgencies] Export réussi');
        return { blob, format };
        
      } catch (error: any) {
        console.error('❌ [useExportAgencies] Erreur:', error);
        throw error;
      }
    },
    onSuccess: ({ blob, format }) => {
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `agences-${timestamp}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export téléchargé avec succès');
      console.log('✅ [useExportAgencies] Téléchargement lancé');
    },
    onError: (error: any) => {
      console.error('❌ [useExportAgencies] Erreur finale:', error);
      toast.error(error.message || 'Erreur lors de l\'export');
    },
  });
}

// ===== HOOKS AVEC CACHE =====

// Hook pour précharger les données d'agences
export function useAgenciesCache() {
  const queryClient = useQueryClient();

  const prefetchAgencies = async (filters: AgencyFilters = {}) => {
    console.log('⚡ [useAgenciesCache] Préchargement agences:', filters);
    
    await queryClient.prefetchQuery({
      queryKey: ['agencies', filters],
      queryFn: () => agenciesApi.getAgencies(filters),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchAgency = async (id: string) => {
    console.log('⚡ [useAgenciesCache] Préchargement agence:', id);
    
    await queryClient.prefetchQuery({
      queryKey: ['agency', id],
      queryFn: () => agenciesApi.getAgency(id),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchAllAgencies = async () => {
    console.log('⚡ [useAgenciesCache] Préchargement toutes agences');
    
    await queryClient.prefetchQuery({
      queryKey: ['all-agencies'],
      queryFn: () => agenciesApi.getAllAgencies(),
      staleTime: 10 * 60 * 1000,
    });
  };

  const invalidateAll = () => {
    console.log('🔄 [useAgenciesCache] Invalidation complète');
    
    queryClient.invalidateQueries({ queryKey: ['agencies'] });
    queryClient.invalidateQueries({ queryKey: ['all-agencies'] });
  };

  const clearCache = () => {
    console.log('🗑️ [useAgenciesCache] Nettoyage cache');
    
    queryClient.removeQueries({ queryKey: ['agencies'] });
    queryClient.removeQueries({ queryKey: ['all-agencies'] });
  };

  return {
    prefetchAgencies,
    prefetchAgency,
    prefetchAllAgencies,
    invalidateAll,
    clearCache,
  };
}

// ===== HOOKS UTILITAIRES =====

// Hook pour obtenir une agence spécifique du cache
export function useAgencyFromCache(id: string): Agency | undefined {
  const queryClient = useQueryClient();
  
  // Chercher dans le cache des agences individuelles
  const cachedAgency = queryClient.getQueryData<Agency>(['agency', id]);
  if (cachedAgency) {
    return cachedAgency;
  }
  
  // Chercher dans le cache de la liste des agences
  const cachedList = queryClient.getQueriesData<{ agencies: Agency[] }>({ queryKey: ['agencies'] });
  for (const [, data] of cachedList) {
    if (data?.agencies) {
      const found = data.agencies.find(agency => agency.id === id);
      if (found) {
        return found;
      }
    }
  }
  
  // Chercher dans le cache de toutes les agences
  const allAgencies = queryClient.getQueryData<Agency[]>(['all-agencies']);
  if (allAgencies) {
    return allAgencies.find(agency => agency.id === id);
  }
  
  return undefined;
}

// Hook pour obtenir les statistiques du cache sans refetch
export function useAgenciesStats() {
  const queryClient = useQueryClient();
  
  const getStats = () => {
    // Récupérer les données du cache de la liste des agences
    const cachedData = queryClient.getQueriesData<{ stats?: any }>({ queryKey: ['agencies'] });
    
    for (const [, data] of cachedData) {
      if (data?.stats) {
        return data.stats;
      }
    }
    
    return null;
  };
  
  return {
    stats: getStats(),
    hasStats: !!getStats()
  };
}

// Hook pour surveiller l'état de chargement global
export function useAgenciesLoadingState() {
  const queryClient = useQueryClient();
  
  const queries = queryClient.getQueryCache().findAll({ queryKey: ['agencies'] });
  const isLoading = queries.some(query => query.state.status === 'pending');
  const hasError = queries.some(query => query.state.status === 'error');
  const isSuccess = queries.length > 0 && queries.every(query => query.state.status === 'success');
  
  return {
    isLoading,
    hasError,
    isSuccess,
    queriesCount: queries.length
  };
}