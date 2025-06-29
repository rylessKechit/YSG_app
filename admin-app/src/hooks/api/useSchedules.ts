// src/hooks/api/useSchedules.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '@/lib/api/schedules';
import {
  ScheduleFilters,
  ScheduleCreateData,
  ScheduleUpdateData,
  BulkCreateData
} from '@/types/schedule';
import { toast } from 'sonner';

// Query keys pour le cache
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
};

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

// ✅ Hook pour la vue calendrier
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
    select: (data) => data.data,
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

// ✅ Hook pour les statistiques
export function useScheduleStats(filters: {
  startDate?: string;
  endDate?: string;
  agency?: string;
  user?: string;
} = {}) {
  return useQuery({
    queryKey: scheduleKeys.stats(filters),
    queryFn: () => schedulesApi.getScheduleStats(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data,
  });
}

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
      
      toast.success('Planning modifié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la modification');
    }
  });
}

// ✅ Hook pour supprimer un planning
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulesApi.deleteSchedule(id),
    onSuccess: (_, id) => {
      // Invalider toutes les queries liées aux plannings
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      queryClient.removeQueries({ queryKey: scheduleKeys.detail(id) });
      
      // Invalider le calendrier
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      
      toast.success('Planning supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  });
}

// ✅ Hook pour la création en masse
export function useBulkCreateSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateData) => schedulesApi.bulkCreateSchedules(data),
    onSuccess: (result) => {
      // Invalider toutes les listes
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      
      // Invalider le calendrier
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      
      // Message de succès détaillé
      const { created, failed } = result.data;
      if (failed > 0) {
        toast.warning(`Plannings créés: ${created} réussis, ${failed} échecs`);
      } else {
        toast.success(`${created} planning(s) créé(s) avec succès`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création en masse');
    }
  });
}

// ✅ Hook pour vérifier les conflits
export function useCheckConflicts() {
  return useMutation({
    mutationFn: (scheduleData: ScheduleCreateData) => schedulesApi.checkConflicts(scheduleData),
    onError: () => {
      // Pas de toast d'erreur pour cette vérification
    }
  });
}

// ✅ Hook pour créer un template
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateData: any) => schedulesApi.createTemplate(templateData),
    onSuccess: () => {
      // Invalider la liste des templates
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
    mutationFn: (data: any) => schedulesApi.applyTemplate(data),
    onSuccess: (result) => {
      // Invalider toutes les listes
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
      
      // Invalider le calendrier
      queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
      
      // Message de succès
      const { created, failed } = result.data;
      if (failed > 0) {
        toast.warning(`Template appliqué: ${created} plannings créés, ${failed} échecs`);
      } else {
        toast.success(`Template appliqué: ${created} planning(s) créé(s)`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'application du template');
    }
  });
}

// ✅ Hook utilitaire pour invalider le cache plannings
export function useSchedulesCache() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
  };

  const invalidateList = (filters?: ScheduleFilters) => {
    if (filters) {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.list(filters) });
    } else {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    }
  };

  const invalidateSchedule = (id: string) => {
    queryClient.invalidateQueries({ queryKey: scheduleKeys.detail(id) });
  };

  const invalidateCalendar = () => {
    queryClient.invalidateQueries({ queryKey: [...scheduleKeys.all, 'calendar'] });
  };

  const prefetchSchedule = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: scheduleKeys.detail(id),
      queryFn: () => schedulesApi.getSchedule(id),
      staleTime: 2 * 60 * 1000,
    });
  };

  return {
    invalidateAll,
    invalidateList,
    invalidateSchedule,
    invalidateCalendar,
    prefetchSchedule,
  };
}