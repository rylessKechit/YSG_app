// admin-app/src/hooks/api/useSchedules.ts - FICHIER COMPLET AVEC TYPES CORRECTS
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '@/lib/api/schedules';
import {
  Schedule,
  ScheduleFilters,
  ScheduleCreateData,
  ScheduleUpdateData,
  ScheduleListData,
  BulkCreateData,
  CalendarData,
  ScheduleStatsData,
  ScheduleTemplate,
  WeekSchedule
} from '@/types/schedule';
import { toast } from 'sonner';

// ===== QUERY KEYS POUR LE CACHE =====
export const scheduleKeys = {
  all: ['schedules'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (filters: ScheduleFilters) => [...scheduleKeys.lists(), filters] as const,
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
  calendar: (params: any) => [...scheduleKeys.all, 'calendar', params] as const,
  templates: () => [...scheduleKeys.all, 'templates'] as const,
  userWeek: (userId: string, date?: string) => [...scheduleKeys.all, 'userWeek', userId, date] as const,
  stats: (filters: any) => [...scheduleKeys.all, 'stats', filters] as const,
  conflicts: (params: any) => [...scheduleKeys.all, 'conflicts', params] as const,
  search: (query: any) => [...scheduleKeys.all, 'search', query] as const,
};

// ===== HOOKS DE LECTURE (QUERIES) =====

// ✅ Hook pour récupérer la liste des plannings
export function useSchedules(filters: ScheduleFilters = {}) {
  return useQuery({
    queryKey: scheduleKeys.list(filters),
    queryFn: () => schedulesApi.getSchedules(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// ✅ Hook pour récupérer un planning spécifique
export function useSchedule(id: string, enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => schedulesApi.getSchedule(id),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data.schedule,
  });
}

// ✅ Hook pour la vue calendrier avec types corrects
export function useScheduleCalendar(params: {
  year?: number;
  month?: number;
  view?: 'month' | 'week';
  agency?: string;
  user?: string;
} = {}) {
  return useQuery({
    queryKey: scheduleKeys.calendar(params),
    queryFn: () => schedulesApi.getCalendarView(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data, // Retourne directement CalendarData
  });
}

// ✅ Hook pour les statistiques avec types corrects
export function useScheduleStats(filters: {
  startDate?: string;
  endDate?: string;
  agency?: string;
  user?: string;
  period?: string;
} = {}) {
  return useQuery({
    queryKey: scheduleKeys.stats(filters),
    queryFn: () => schedulesApi.getScheduleStats(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data, // Retourne directement ScheduleStatsData
  });
}

// ✅ Hook pour les templates
export function useScheduleTemplates(params: {
  category?: string;
  includeUsage?: boolean;
} = {}) {
  return useQuery({
    queryKey: scheduleKeys.templates(),
    queryFn: () => schedulesApi.getTemplates(params),
    staleTime: 10 * 60 * 1000, // 10 minutes car les templates changent peu
    gcTime: 15 * 60 * 1000, // 15 minutes
    select: (data) => data.data,
  });
}

// ✅ Hook pour le planning hebdomadaire d'un utilisateur
export function useUserWeekSchedule(userId: string, date?: string, enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.userWeek(userId, date),
    queryFn: () => schedulesApi.getUserWeekSchedule(userId, date),
    enabled: enabled && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute car ça change souvent
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
  });
}

// ✅ Hook pour les conflits
export function useScheduleConflicts(params: {
  startDate?: string;
  endDate?: string;
  severity?: 'all' | 'critical' | 'warning';
  includeResolutions?: boolean;
} = {}) {
  return useQuery({
    queryKey: scheduleKeys.conflicts(params),
    queryFn: () => schedulesApi.getConflicts(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
  });
}

// ✅ Hook pour vérifier les conflits (alias de useScheduleConflicts)
export function useCheckConflicts(params: {
  startDate?: string;
  endDate?: string;
  severity?: 'all' | 'critical' | 'warning';
  includeResolutions?: boolean;
} = {}) {
  return useScheduleConflicts(params);
}

// ✅ Hook pour la recherche de plannings
export function useScheduleSearch(query: {
  search: string;
  filters?: ScheduleFilters;
  options?: {
    includeArchived?: boolean;
    groupBy?: 'user' | 'agency' | 'date';
    sortBy?: 'relevance' | 'date' | 'user';
  };
}, enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.search(query),
    queryFn: () => schedulesApi.searchSchedules(query),
    enabled: enabled && !!query.search,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
  });
}

// ===== HOOKS DE MODIFICATION (MUTATIONS) =====

// ✅ Hook pour créer un planning
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleData: ScheduleCreateData) => schedulesApi.createSchedule(scheduleData),
    onSuccess: (data) => {
      // Invalider la liste des plannings
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      
      // Invalider le calendrier
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      
      // Invalider les stats
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'stats'] });
      
      // Ajouter le planning au cache
      const newSchedule = data.data.schedule;
      queryClient.setQueryData(scheduleKeys.detail(newSchedule.id), data);
      
      toast.success('Planning créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du planning');
    }
  });
}

// ✅ Hook pour modifier un planning
export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduleData }: { id: string; scheduleData: ScheduleUpdateData }) =>
      schedulesApi.updateSchedule(id, scheduleData),
    onSuccess: (data, variables) => {
      // Invalider les listes
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      
      // Mettre à jour le cache de détail
      queryClient.setQueryData(scheduleKeys.detail(variables.id), data);
      
      // Invalider le calendrier
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      
      // Invalider les stats
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'stats'] });
      
      toast.success('Planning modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification du planning');
    }
  });
}

// ✅ Hook pour supprimer un planning
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulesApi.deleteSchedule(id),
    onSuccess: (data, id) => {
      // Invalider les listes
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      
      // Supprimer du cache de détail
      queryClient.removeQueries({ queryKey: scheduleKeys.detail(id) });
      
      // Invalider le calendrier
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      
      // Invalider les stats
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'stats'] });
      
      toast.success('Planning supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression du planning');
    }
  });
}

// ✅ Hook pour la création en masse
export function useBulkCreateSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateData) => schedulesApi.bulkCreateSchedules(data),
    onSuccess: (data) => {
      // Invalider tous les caches liés aux plannings
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'stats'] });
      
      const result = data.data;
      if (result.created > 0) {
        toast.success(`${result.created} planning(s) créé(s) avec succès`);
      }
      if (result.failed > 0) {
        toast.warning(`${result.failed} planning(s) ont échoué`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création en masse');
    }
  });
}

// ✅ Hook pour créer un template
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateData: {
      name: string;
      description?: string;
      category: string;
      template: {
        startTime: string;
        endTime: string;
        breakStart?: string;
        breakEnd?: string;
      };
      defaultAgencies?: string[];
    }) => schedulesApi.createTemplate(templateData),
    onSuccess: () => {
      // Invalider les templates
      queryClient.invalidateQueries({ queryKey: scheduleKeys.templates() });
      toast.success('Template créé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du template');
    }
  });
}

// ✅ Hook pour appliquer un template
export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      templateId: string;
      userIds: string[];
      dateRange: {
        start: string;
        end: string;
      };
      agencyId: string;
      options: {
        skipConflicts: boolean;
        notifyUsers: boolean;
        overwrite: boolean;
      };
    }) => schedulesApi.applyTemplate(data),
    onSuccess: (data) => {
      // Invalider tous les caches
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'stats'] });
      
      const result = data.data;
      toast.success(`Template appliqué : ${result.applied} planning(s) créé(s)`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'application du template');
    }
  });
}

// ✅ Hook pour résoudre les conflits
export function useResolveConflicts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      conflictIds: string[];
      resolutionType: 'auto' | 'manual';
      parameters?: Record<string, any>;
    }) => schedulesApi.resolveConflicts(data),
    onSuccess: (data) => {
      // Invalider les conflits et les plannings
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'conflicts'] });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      
      const result = data.data;
      toast.success(`${result.resolved} conflit(s) résolu(s)`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la résolution des conflits');
    }
  });
}

// ✅ Hook pour dupliquer un planning
export function useDuplicateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: {
        newDate?: string;
        userId?: string;
        agencyId?: string;
      };
    }) => schedulesApi.duplicateSchedule(id, data),
    onSuccess: (data) => {
      // Invalider les listes et le calendrier
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      
      // Ajouter le nouveau planning au cache
      const newSchedule = data.data.schedule;
      queryClient.setQueryData(scheduleKeys.detail(newSchedule.id), data);
      
      toast.success('Planning dupliqué avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la duplication du planning');
    }
  });
}

// ✅ Hook pour valider un planning
export function useValidateSchedule() {
  return useMutation({
    mutationFn: (scheduleData: ScheduleCreateData) => schedulesApi.validateSchedule(scheduleData),
    onError: (error: any) => {
      // Pas de toast d'erreur automatique pour la validation
      console.error('Erreur validation planning:', error);
    }
  });
}

// ✅ Hook pour l'export
export function useExportSchedules() {
  return useMutation({
    mutationFn: (filters: ScheduleFilters & {
      format?: 'csv' | 'excel' | 'pdf';
      includeStats?: boolean;
    }) => schedulesApi.exportSchedules(filters),
    onSuccess: (blob, variables) => {
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plannings.${variables.format || 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Export terminé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'export');
    }
  });
}