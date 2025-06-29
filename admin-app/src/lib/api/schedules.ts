// src/lib/api/schedules.ts
import { apiClient, apiRequest, ApiResponse } from './client';
import {
  Schedule,
  ScheduleFilters,
  ScheduleCreateData,
  ScheduleUpdateData,
  ScheduleListData,
  BulkCreateData,
  CalendarData,
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
  async bulkCreateSchedules(data: BulkCreateData): Promise<ApiResponse<{ created: number; failed: number; total: number; results: any[] }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ created: number; failed: number; total: number; results: any[] }>>('/admin/schedules/bulk-create', data),
      {
        showErrorToast: true,
        showSuccessToast: false // Message géré dans le hook
      }
    );
  },

  // ✅ Vue calendrier
  async getCalendarView(params: {
    year?: number;
    month?: number;
    view?: 'month' | 'week';
    agency?: string;
    user?: string;
  } = {}): Promise<ApiResponse<CalendarData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<CalendarData>>('/admin/schedules/calendar', {
        params
      }),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Vérifier les conflits avant création
  async checkConflicts(scheduleData: ScheduleCreateData): Promise<ApiResponse<{ conflicts: any[]; canCreate: boolean }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ conflicts: any[]; canCreate: boolean }>>('/admin/schedules/conflicts/check', scheduleData),
      {
        showErrorToast: false // Pas de toast pour une vérification
      }
    );
  },

  // ✅ Récupérer les templates de planning
  async getTemplates(params: {
    category?: string;
    includeUsage?: boolean;
  } = {}): Promise<ApiResponse<{ templates: ScheduleTemplate[]; categories: Record<string, number> }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ templates: ScheduleTemplate[]; categories: Record<string, number> }>>('/admin/schedules/templates', {
        params
      }),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Créer un template
  async createTemplate(templateData: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'recentUsage'>): Promise<ApiResponse<{ template: ScheduleTemplate }>> {
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
  }): Promise<ApiResponse<{ created: number; failed: number; conflicts: any[] }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ created: number; failed: number; conflicts: any[] }>>('/admin/schedules/apply-template', data),
      {
        showErrorToast: true,
        showSuccessToast: false // Message géré dans le hook
      }
    );
  },

  // ✅ Planning de la semaine pour un utilisateur
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

  // ✅ Statistiques des plannings
  async getScheduleStats(filters: {
    startDate?: string;
    endDate?: string;
    agency?: string;
    user?: string;
  } = {}): Promise<ApiResponse<{
    totalSchedules: number;
    totalWorkingHours: number;
    averagePerUser: number;
    averagePerDay: number;
    busiestrDays: Array<{ date: string; count: number; hours: number }>;
    userStats: Array<{
      userId: string;
      userName: string;
      totalHours: number;
      totalDays: number;
      averagePerDay: number;
    }>;
    agencyStats: Array<{
      agencyId: string;
      agencyName: string;
      totalSchedules: number;
      totalHours: number;
      activeUsers: number;
    }>;
  }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<any>>('/admin/schedules/stats', {
        params: filters
      }),
      {
        showErrorToast: true
      }
    );
  }
};