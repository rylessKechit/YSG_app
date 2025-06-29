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
    queryFn: () => agenciesApi.getAgencies(filters),
    select: (response) => {
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Erreur lors du chargement des agences');
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour récupérer une agence par ID
export function useAgency(id: string) {
  return useQuery({
    queryKey: ['agency', id],
    queryFn: () => agenciesApi.getAgency(id),
    select: (response) => {
      if (response.success && response.data?.agency) {
        return response.data.agency;
      }
      throw new Error(response.message || 'Agence non trouvée');
    },
    enabled: !!id,
    retry: 2,
  });
}

// Hook pour récupérer les statistiques d'une agence
export function useAgencyStats(id: string) {
  return useQuery({
    queryKey: ['agency-stats', id],
    queryFn: () => agenciesApi.getAgencyStats(id),
    select: (response) => {
      if (response.success && response.data?.stats) {
        return response.data.stats;
      }
      throw new Error(response.message || 'Statistiques non disponibles');
    },
    enabled: !!id,
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes pour les stats
  });
}

// Hook pour récupérer les utilisateurs d'une agence
export function useAgencyUsers(id: string) {
  return useQuery({
    queryKey: ['agency-users', id],
    queryFn: () => agenciesApi.getAgencyUsers(id),
    select: (response) => {
      if (response.success && response.data?.users) {
        return response.data.users;
      }
      throw new Error(response.message || 'Utilisateurs non trouvés');
    },
    enabled: !!id,
    retry: 2,
  });
}

// Hook pour vérifier la disponibilité d'un code
export function useCheckAgencyCode(code: string, excludeId?: string) {
  return useQuery({
    queryKey: ['agency-code-check', code, excludeId],
    queryFn: () => agenciesApi.checkCodeAvailability(code, excludeId),
    select: (response) => {
      if (response.success && response.data) {
        return response.data.available;
      }
      return false;
    },
    enabled: !!code && code.length >= 2,
    retry: false,
    staleTime: 30 * 1000, // 30 secondes
  });
}

// ===== MUTATIONS =====

// Hook pour créer une agence
export function useCreateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AgencyCreateData) => agenciesApi.createAgency(data),
    onSuccess: (response) => {
      if (response.success) {
        // Invalider et rafraîchir les queries liées
        queryClient.invalidateQueries({ queryKey: ['agencies'] });
        
        toast.success('Agence créée avec succès');
        
        // Mettre en cache la nouvelle agence
        if (response.data?.agency) {
          queryClient.setQueryData(
            ['agency', response.data.agency.id], 
            response.data.agency
          );
        }
      } else {
        throw new Error(response.message || 'Erreur lors de la création');
      }
    },
    onError: (error: any) => {
      console.error('Erreur création agence:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'agence');
    },
  });
}

// Hook pour modifier une agence
export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgencyUpdateData }) => 
      agenciesApi.updateAgency(id, data),
    onSuccess: (response, variables) => {
      if (response.success) {
        // Invalider les queries
        queryClient.invalidateQueries({ queryKey: ['agencies'] });
        queryClient.invalidateQueries({ queryKey: ['agency', variables.id] });
        
        toast.success('Agence modifiée avec succès');
        
        // Mettre à jour le cache de l'agence
        if (response.data?.agency) {
          queryClient.setQueryData(
            ['agency', variables.id], 
            response.data.agency
          );
        }
      } else {
        throw new Error(response.message || 'Erreur lors de la modification');
      }
    },
    onError: (error: any) => {
      console.error('Erreur modification agence:', error);
      toast.error(error.message || 'Erreur lors de la modification');
    },
  });
}

// Hook pour supprimer/désactiver une agence
export function useDeleteAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agenciesApi.deleteAgency(id),
    onSuccess: (response, id) => {
      if (response.success) {
        // Invalider les queries
        queryClient.invalidateQueries({ queryKey: ['agencies'] });
        queryClient.invalidateQueries({ queryKey: ['agency', id] });
        
        toast.success('Agence désactivée avec succès');
      } else {
        throw new Error(response.message || 'Erreur lors de la désactivation');
      }
    },
    onError: (error: any) => {
      console.error('Erreur suppression agence:', error);
      toast.error(error.message || 'Erreur lors de la désactivation');
    },
  });
}

// Hook pour réactiver une agence
export function useReactivateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agenciesApi.reactivateAgency(id),
    onSuccess: (response, id) => {
      if (response.success) {
        // Invalider les queries
        queryClient.invalidateQueries({ queryKey: ['agencies'] });
        queryClient.invalidateQueries({ queryKey: ['agency', id] });
        
        toast.success('Agence réactivée avec succès');
      } else {
        throw new Error(response.message || 'Erreur lors de la réactivation');
      }
    },
    onError: (error: any) => {
      console.error('Erreur réactivation agence:', error);
      toast.error(error.message || 'Erreur lors de la réactivation');
    },
  });
}

// Hook pour les actions en masse
export function useBulkActionsAgencies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkActionData) => agenciesApi.bulkActions(data),
    onSuccess: (response) => {
      if (response.success) {
        // Invalider toutes les queries des agences
        queryClient.invalidateQueries({ queryKey: ['agencies'] });
        
        toast.success('Actions exécutées avec succès');
      } else {
        throw new Error(response.message || 'Erreur lors des actions en masse');
      }
    },
    onError: (error: any) => {
      console.error('Erreur actions en masse:', error);
      toast.error(error.message || 'Erreur lors des actions en masse');
    },
  });
}

// Hook pour l'export
export function useExportAgencies() {
  return useMutation({
    mutationFn: ({ format, filters }: { format: 'excel' | 'csv'; filters?: AgencyFilters }) => 
      agenciesApi.exportAgencies(format, filters),
    onSuccess: (blob, variables) => {
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agences-${new Date().toISOString().split('T')[0]}.${variables.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export téléchargé avec succès');
    },
    onError: (error: any) => {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    },
  });
}

// ===== HOOKS AVEC CACHE =====

// Hook pour précharger les données d'agences
export function useAgenciesCache() {
  const queryClient = useQueryClient();

  const prefetchAgencies = async (filters: AgencyFilters = {}) => {
    await queryClient.prefetchQuery({
      queryKey: ['agencies', filters],
      queryFn: () => agenciesApi.getAgencies(filters),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchAgency = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['agency', id],
      queryFn: () => agenciesApi.getAgency(id),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    prefetchAgencies,
    prefetchAgency,
  };
}