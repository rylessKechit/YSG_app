// admin-app/src/lib/api/schedules.ts - FICHIER COMPLET AVEC TYPES CORRECTS
import { apiClient, apiRequest, ApiResponse } from './client';
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

export const schedulesApi = {
  // ✅ Récupérer la liste des plannings avec filtres
  async getSchedules(filters: ScheduleFilters = {}): Promise<ApiResponse<ScheduleListData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<ScheduleListData>>('/admin/schedules', {
        params: filters
      }),
      {
        showErrorToast: true,
        retryCount: 2
      }
    );
  },

  // ✅ Récupérer un planning par ID
  async getSchedule(id: string): Promise<ApiResponse<{ schedule: Schedule }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ schedule: Schedule }>>(`/admin/schedules/${id}`),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Créer un nouveau planning
  async createSchedule(scheduleData: ScheduleCreateData): Promise<ApiResponse<{ schedule: Schedule }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ schedule: Schedule }>>('/admin/schedules', scheduleData),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Planning créé avec succès'
      }
    );
  },

  // ✅ Mettre à jour un planning
  async updateSchedule(id: string, scheduleData: ScheduleUpdateData): Promise<ApiResponse<{ schedule: Schedule }>> {
    return apiRequest(
      () => apiClient.put<ApiResponse<{ schedule: Schedule }>>(`/admin/schedules/${id}`, scheduleData),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Planning modifié avec succès'
      }
    );
  },

  // ✅ Supprimer un planning
  async deleteSchedule(id: string): Promise<ApiResponse<void>> {
    return apiRequest(
      () => apiClient.delete<ApiResponse<void>>(`/admin/schedules/${id}`),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Planning supprimé avec succès'
      }
    );
  },

  // ✅ Création en masse de plannings
  async bulkCreateSchedules(data: BulkCreateData): Promise<ApiResponse<{ 
    created: number; 
    failed: number; 
    total: number; 
    results: any[] 
  }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ created: number; failed: number; total: number; results: any[] }>>('/admin/schedules/bulk-create', data),
      {
        showErrorToast: true,
        showSuccessToast: false // Message géré dans le hook
      }
    );
  },

  // ✅ Vue calendrier avec types corrects
  async getCalendarView(params: {
    year?: number;
    month?: number;
    view?: 'month' | 'week';
    agency?: string;
    user?: string;
  } = {}): Promise<ApiResponse<CalendarData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<CalendarData>>('/admin/schedules/calendar', {
        params: params
      }),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Statistiques des plannings avec types corrects
  async getScheduleStats(filters: {
    startDate?: string;
    endDate?: string;
    agency?: string;
    user?: string;
    period?: string;
  } = {}): Promise<ApiResponse<ScheduleStatsData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<ScheduleStatsData>>('/admin/schedules/stats', {
        params: filters
      }),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Templates de planning
  async getTemplates(params: {
    category?: string;
    includeUsage?: boolean;
  } = {}): Promise<ApiResponse<{
    templates: ScheduleTemplate[];
    categories: Record<string, number>;
  }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{
        templates: ScheduleTemplate[];
        categories: Record<string, number>;
      }>>('/admin/schedules/templates', {
        params: params
      }),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Créer un template de planning
  async createTemplate(templateData: {
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
  }): Promise<ApiResponse<{ template: ScheduleTemplate }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ template: ScheduleTemplate }>>('/admin/schedules/templates', templateData),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Template créé avec succès'
      }
    );
  },

  // ✅ Appliquer un template
  async applyTemplate(data: {
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
  }): Promise<ApiResponse<{ applied: number; failed: number; results: any[] }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ applied: number; failed: number; results: any[] }>>('/admin/schedules/apply-template', data),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Template appliqué avec succès'
      }
    );
  },

  // ✅ Planning hebdomadaire d'un utilisateur
  async getUserWeekSchedule(userId: string, date?: string): Promise<ApiResponse<WeekSchedule>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<WeekSchedule>>(`/admin/schedules/user/${userId}/week`, {
        params: { date }
      }),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Détecter les conflits
  async getConflicts(params: {
    startDate?: string;
    endDate?: string;
    severity?: 'all' | 'critical' | 'warning';
    includeResolutions?: boolean;
  } = {}): Promise<ApiResponse<{
    conflicts: any[];
    statistics: {
      total: number;
      bySeverity: Record<string, number>;
      byType: Record<string, number>;
      autoFixable: number;
    };
    priorities: {
      immediate: any[];
      thisWeek: any[];
      planned: any[];
    };
    recommendations: any[];
  }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<any>>('/admin/schedules/conflicts', {
        params: params
      }),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Résoudre des conflits
  async resolveConflicts(data: {
    conflictIds: string[];
    resolutionType: 'auto' | 'manual';
    parameters?: Record<string, any>;
  }): Promise<ApiResponse<{
    resolved: number;
    failed: number;
    results: any[];
  }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ resolved: number; failed: number; results: any[] }>>('/admin/schedules/conflicts/resolve', data),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Conflits résolus avec succès'
      }
    );
  },

  // ✅ Export des plannings
  async exportSchedules(filters: ScheduleFilters & {
    format?: 'csv' | 'excel' | 'pdf';
    includeStats?: boolean;
  }): Promise<Blob> {
    try {
      const response = await apiClient.get('/admin/schedules/export', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erreur export plannings:', error);
      throw error;
    }
  },

  // ✅ Dupliquer un planning
  async duplicateSchedule(id: string, data: {
    newDate?: string;
    userId?: string;
    agencyId?: string;
  }): Promise<ApiResponse<{ schedule: Schedule }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ schedule: Schedule }>>(`/admin/schedules/${id}/duplicate`, data),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Planning dupliqué avec succès'
      }
    );
  },

  // ✅ Valider un planning (vérifier les conflits)
  async validateSchedule(scheduleData: ScheduleCreateData): Promise<ApiResponse<{
    isValid: boolean;
    conflicts: any[];
    warnings: any[];
    suggestions: any[];
  }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{
        isValid: boolean;
        conflicts: any[];
        warnings: any[];
        suggestions: any[];
      }>>('/admin/schedules/validate', scheduleData),
      {
        showErrorToast: false // Pas d'erreur toast pour la validation
      }
    );
  },

  // ✅ Recherche avancée de plannings
  async searchSchedules(query: {
    search: string;
    filters?: ScheduleFilters;
    options?: {
      includeArchived?: boolean;
      groupBy?: 'user' | 'agency' | 'date';
      sortBy?: 'relevance' | 'date' | 'user';
    };
  }): Promise<ApiResponse<{
    results: Schedule[];
    total: number;
    grouped?: Record<string, Schedule[]>;
    suggestions?: string[];
  }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{
        results: Schedule[];
        total: number;
        grouped?: Record<string, Schedule[]>;
        suggestions?: string[];
      }>>('/admin/schedules/search', query),
      {
        showErrorToast: true
      }
    );
  }
};