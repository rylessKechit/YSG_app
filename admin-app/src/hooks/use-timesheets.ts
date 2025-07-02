// admin-app/src/lib/hooks/use-timesheets.ts - HOOKS PERSONNALISÉS POUR TIMESHEETS
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { timesheetsApi, BulkActionData } from '@/lib/api/timesheets';
import {
  TimesheetFilters,
  TimesheetCreateData,
  TimesheetUpdateData,
  ComparisonFilters
} from '@/types/timesheet';

// ===== QUERY KEYS =====
export const TIMESHEET_QUERY_KEYS = {
  all: ['timesheets'] as const,
  lists: () => [...TIMESHEET_QUERY_KEYS.all, 'list'] as const,
  list: (filters: TimesheetFilters) => [...TIMESHEET_QUERY_KEYS.lists(), filters] as const,
  details: () => [...TIMESHEET_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TIMESHEET_QUERY_KEYS.details(), id] as const,
  comparison: (filters: ComparisonFilters) => [...TIMESHEET_QUERY_KEYS.all, 'comparison', filters] as const,
  missing: (filters: ComparisonFilters) => [...TIMESHEET_QUERY_KEYS.all, 'missing', filters] as const,
  stats: (filters: any) => [...TIMESHEET_QUERY_KEYS.all, 'stats', filters] as const,
  punctuality: (filters: any) => [...TIMESHEET_QUERY_KEYS.all, 'punctuality', filters] as const,
};

// ===== HOOKS DE LECTURE =====

/**
 * Hook pour récupérer la liste des timesheets
 */
export function useTimesheets(filters: TimesheetFilters = {}) {
  return useQuery({
    queryKey: TIMESHEET_QUERY_KEYS.list(filters),
    queryFn: () => timesheetsApi.getTimesheets(filters),
    staleTime: 30 * 1000, // 30 secondes
    refetchOnWindowFocus: false,
    select: (data) => data.data, // Extraire directement les données
  });
}

/**
 * Hook pour récupérer un timesheet par ID
 */
export function useTimesheet(id: string) {
  return useQuery({
    queryKey: TIMESHEET_QUERY_KEYS.detail(id),
    queryFn: () => timesheetsApi.getTimesheet(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    select: (data) => data.data.timesheet,
  });
}

/**
 * Hook pour la comparaison planning vs pointage
 */
export function useTimesheetComparison(filters: ComparisonFilters) {
  return useQuery({
    queryKey: TIMESHEET_QUERY_KEYS.comparison(filters),
    queryFn: () => timesheetsApi.getComparison(filters),
    enabled: !!(filters.startDate && filters.endDate),
    staleTime: 60 * 1000, // 1 minute
    select: (data) => data.data,
  });
}

/**
 * Hook pour les pointages manquants
 */
export function useMissingTimesheets(filters: ComparisonFilters) {
  return useQuery({
    queryKey: TIMESHEET_QUERY_KEYS.missing(filters),
    queryFn: () => timesheetsApi.getMissingTimesheets(filters),
    enabled: !!(filters.startDate && filters.endDate),
    staleTime: 60 * 1000,
    select: (data) => data.data,
  });
}

/**
 * Hook pour les statistiques
 */
export function useTimesheetStats(filters: any = {}) {
  return useQuery({
    queryKey: TIMESHEET_QUERY_KEYS.stats(filters),
    queryFn: () => timesheetsApi.getStats(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
  });
}

/**
 * Hook pour le rapport de ponctualité
 */
export function usePunctualityReport(filters: any = {}) {
  return useQuery({
    queryKey: TIMESHEET_QUERY_KEYS.punctuality(filters),
    queryFn: () => timesheetsApi.getPunctualityReport(filters),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
  });
}

// ===== HOOKS DE MUTATION =====

/**
 * Hook pour créer un timesheet
 */
export function useCreateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TimesheetCreateData) => timesheetsApi.createTimesheet(data),
    onSuccess: (response) => {
      // Invalider les listes pour refetch
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.all });
      
      toast.success(response.message || 'Pointage créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du pointage');
    },
  });
}

/**
 * Hook pour modifier un timesheet
 */
export function useUpdateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TimesheetUpdateData }) => 
      timesheetsApi.updateTimesheet(id, data),
    onSuccess: (response, variables) => {
      // Mettre à jour le cache pour ce timesheet spécifique
      queryClient.setQueryData(
        TIMESHEET_QUERY_KEYS.detail(variables.id),
        response.data.timesheet
      );

      // Invalider les listes pour refetch
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.all });
      
      toast.success(response.message || 'Pointage modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification du pointage');
    },
  });
}

/**
 * Hook pour supprimer un timesheet
 */
export function useDeleteTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timesheetsApi.deleteTimesheet(id),
    onSuccess: (response, id) => {
      // Supprimer du cache
      queryClient.removeQueries({ queryKey: TIMESHEET_QUERY_KEYS.detail(id) });
      
      // Invalider les listes
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.all });
      
      toast.success(response.message || 'Pointage supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du pointage');
    },
  });
}

/**
 * Hook pour les actions en masse
 */
export function useBulkTimesheetActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkActionData) => timesheetsApi.bulkActions(data),
    onSuccess: (response, variables) => {
      // Invalider toutes les queries timesheets
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.all });
      
      const actionLabels = {
        validate: 'validés',
        dispute: 'marqués en litige',
        delete: 'supprimés',
        export: 'exportés'
      };
      
      const actionLabel = actionLabels[variables.action] || variables.action;
      toast.success(
        response.message || 
        `${response.data.affectedCount} pointage(s) ${actionLabel} avec succès`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'action en masse');
    },
  });
}

// ===== HOOKS D'ACTION RAPIDES =====

/**
 * Hook pour valider un timesheet
 */
export function useValidateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes?: string }) => 
      timesheetsApi.validateTimesheet(id, adminNotes),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        TIMESHEET_QUERY_KEYS.detail(variables.id),
        response.data.timesheet
      );
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.lists() });
      
      toast.success('Pointage validé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la validation');
    },
  });
}

/**
 * Hook pour marquer un timesheet en litige
 */
export function useDisputeTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      timesheetsApi.disputeTimesheet(id, reason),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        TIMESHEET_QUERY_KEYS.detail(variables.id),
        response.data.timesheet
      );
      queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.lists() });
      
      toast.success('Pointage marqué en litige');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du marquage en litige');
    },
  });
}

// ===== HOOKS UTILITAIRES =====

/**
 * Hook pour précharger un timesheet
 */
export function usePrefetchTimesheet() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: TIMESHEET_QUERY_KEYS.detail(id),
      queryFn: () => timesheetsApi.getTimesheet(id),
      staleTime: 30 * 1000,
    });
  };
}

/**
 * Hook pour invalider toutes les queries timesheets
 */
export function useInvalidateTimesheets() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: TIMESHEET_QUERY_KEYS.all });
  };
}