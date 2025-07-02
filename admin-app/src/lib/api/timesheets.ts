// admin-app/src/lib/api/timesheets.ts - API CLIENT COMPLET POUR TIMESHEETS
import { apiClient, apiRequest, ApiResponse } from './client';
import {
  Timesheet,
  TimesheetFilters,
  TimesheetListData,
  TimesheetCreateData,
  TimesheetUpdateData,
  TimesheetBulkActionData,
  ComparisonFilters,
  ComparisonData,
  MissingTimesheetData,
  TimesheetStatsData,
  PunctualityReportData
} from '@/types/timesheet';

// ===== TYPES POUR LES ACTIONS EN MASSE =====
export interface BulkActionData {
  action: 'validate' | 'dispute' | 'delete' | 'export';
  timesheetIds: string[];
  params?: {
    format?: 'excel' | 'csv';
    notify?: boolean;
    adminNotes?: string;
  };
}

// ===== TYPE GUARDS POUR VALIDATION =====
export function isValidTimesheetListData(data: any): data is TimesheetListData {
  return (
    data &&
    Array.isArray(data.timesheets) &&
    data.pagination &&
    typeof data.pagination.page === 'number' &&
    typeof data.pagination.total === 'number' &&
    (typeof data.pagination.pages === 'number' || typeof data.pagination.totalPages === 'number') &&
    data.stats &&
    typeof data.stats.totalTimesheets === 'number'
  );
}

export function isValidComparisonData(data: any): data is ComparisonData {
  return (
    data &&
    Array.isArray(data.comparisons) &&
    data.summary &&
    typeof data.summary.total === 'number' &&
    typeof data.summary.punctualityRate === 'number'
  );
}

export function isValidStatsData(data: any): data is TimesheetStatsData {
  return (
    data &&
    data.globalStats &&
    typeof data.globalStats.totalTimesheets === 'number' &&
    Array.isArray(data.trends) &&
    data.userStats &&
    Array.isArray(data.agencyStats)
  );
}

// ===== HELPER POUR NETTOYER LES FILTRES =====
export function cleanTimesheetFilters(filters: TimesheetFilters): TimesheetFilters {
  const cleaned: TimesheetFilters = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    // Supprimer les valeurs vides, null ou undefined
    if (value !== '' && value !== null && value !== undefined) {
      // Pour les tableaux, vérifier qu'ils ne sont pas vides
      if (Array.isArray(value) && value.length === 0) {
        return;
      }
      cleaned[key as keyof TimesheetFilters] = value;
    }
  });
  
  return cleaned;
}

// ===== HELPER POUR NORMALISER LA PAGINATION =====
export function normalizePagination(pagination: any) {
  return {
    ...pagination,
    pages: pagination.pages || pagination.totalPages || 1,
    totalPages: pagination.totalPages || pagination.pages || 1,
  };
}

// ===== API CLIENT POUR LES TIMESHEETS =====
export const timesheetsApi = {
  
  // ================================
  // CRUD DE BASE
  // ================================
  
  /**
   * Récupérer la liste des timesheets avec filtres
   */
  async getTimesheets(filters: TimesheetFilters = {}): Promise<ApiResponse<TimesheetListData>> {
    const cleanedFilters = cleanTimesheetFilters(filters);
    
    const response = await apiRequest(
      () => apiClient.get<ApiResponse<TimesheetListData>>('/admin/timesheets', {
        params: cleanedFilters
      }),
      { 
        showErrorToast: true,
        retryCount: 1
      }
    );

    // Validation et normalisation après la réponse
    if (response.data && !isValidTimesheetListData(response.data)) {
      console.warn('⚠️ Structure TimesheetListData invalide:', response.data);
    }
    
    // Normaliser la pagination si nécessaire
    if (response.data && response.data.pagination) {
      response.data.pagination = normalizePagination(response.data.pagination);
    }
    
    return response;
  },

  /**
   * Récupérer un timesheet par ID
   */
  async getTimesheet(id: string): Promise<ApiResponse<{ timesheet: Timesheet }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ timesheet: Timesheet }>>(`/admin/timesheets/${id}`),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  /**
   * Créer un nouveau timesheet
   */
  async createTimesheet(data: TimesheetCreateData): Promise<ApiResponse<{ timesheet: Timesheet }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ timesheet: Timesheet }>>('/admin/timesheets', data),
      { 
        showErrorToast: true,
        retryCount: 0 
      }
    );
  },

  /**
   * Modifier un timesheet existant
   */
  async updateTimesheet(id: string, data: TimesheetUpdateData): Promise<ApiResponse<{ 
    timesheet: Timesheet;
    changes: {
      from: Partial<Timesheet>;
      to: Partial<Timesheet>;
    };
  }>> {
    return apiRequest(
      () => apiClient.put<ApiResponse<{ 
        timesheet: Timesheet;
        changes: any;
      }>>(`/admin/timesheets/${id}`, data),
      { 
        showErrorToast: true,
        retryCount: 0 
      }
    );
  },

  /**
   * Supprimer un timesheet
   */
  async deleteTimesheet(id: string): Promise<ApiResponse<void>> {
    return apiRequest(
      () => apiClient.delete<ApiResponse<void>>(`/admin/timesheets/${id}`),
      { 
        showErrorToast: true,
        retryCount: 0 
      }
    );
  },

  /**
   * Actions en masse sur les timesheets
   */
  async bulkActions(data: BulkActionData): Promise<ApiResponse<{ 
    affectedCount: number;
    result: any;
  }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ 
        affectedCount: number;
        result: any;
      }>>('/admin/timesheets/bulk-actions', data),
      { 
        showErrorToast: true,
        retryCount: 0 
      }
    );
  },

  // ================================
  // COMPARAISON PLANNING VS POINTAGE
  // ================================

  /**
   * Vue comparative détaillée
   */
  async getComparison(filters: ComparisonFilters): Promise<ApiResponse<ComparisonData>> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('startDate', filters.startDate);
    queryParams.append('endDate', filters.endDate);
    
    if (filters.agencyId) queryParams.append('agencyId', filters.agencyId);
    if (filters.userId) queryParams.append('userId', filters.userId);
    if (filters.includeDetails !== undefined) {
      queryParams.append('includeDetails', filters.includeDetails.toString());
    }
    if (filters.anomaliesOnly !== undefined) {
      queryParams.append('anomaliesOnly', filters.anomaliesOnly.toString());
    }

    const response = await apiRequest(
      () => apiClient.get<ApiResponse<ComparisonData>>(
        `/admin/timesheets/compare?${queryParams.toString()}`
      ),
      { 
        showErrorToast: true,
        retryCount: 1
      }
    );

    // Validation après la réponse
    if (response.data && !isValidComparisonData(response.data)) {
      console.warn('⚠️ Structure ComparisonData invalide:', response.data);
    }
    
    return response;
  },

  /**
   * Pointages manquants
   */
  async getMissingTimesheets(filters: ComparisonFilters): Promise<ApiResponse<MissingTimesheetData>> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('startDate', filters.startDate);
    queryParams.append('endDate', filters.endDate);
    
    if (filters.agencyId) queryParams.append('agencyId', filters.agencyId);
    if (filters.userId) queryParams.append('userId', filters.userId);

    return apiRequest(
      () => apiClient.get<ApiResponse<MissingTimesheetData>>(
        `/admin/timesheets/compare/missing?${queryParams.toString()}`
      ),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  // ================================
  // STATISTIQUES ET ANALYTICS
  // ================================

  /**
   * Statistiques globales
   */
  async getStats(filters: {
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    agencyId?: string;
    userId?: string;
    groupBy?: 'day' | 'week' | 'month' | 'agency' | 'user';
  } = {}): Promise<ApiResponse<TimesheetStatsData>> {
    const response = await apiRequest(
      () => apiClient.get<ApiResponse<TimesheetStatsData>>('/admin/timesheets/stats', {
        params: filters
      }),
      { 
        showErrorToast: true,
        retryCount: 1
      }
    );

    // Validation après la réponse
    if (response.data && !isValidStatsData(response.data)) {
      console.warn('⚠️ Structure TimesheetStatsData invalide:', response.data);
    }
    
    return response;
  },

  /**
   * Rapport de ponctualité détaillé
   */
  async getPunctualityReport(filters: {
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    agencyId?: string;
    userId?: string;
  } = {}): Promise<ApiResponse<PunctualityReportData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<PunctualityReportData>>('/admin/timesheets/stats/punctuality', {
        params: filters
      }),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  // ================================
  // FONCTIONS UTILITAIRES
  // ================================

  /**
   * Valider un timesheet
   */
  async validateTimesheet(id: string, adminNotes?: string): Promise<ApiResponse<{ timesheet: Timesheet }>> {
    return this.updateTimesheet(id, { 
      status: 'validated',
      adminNotes: adminNotes ? 
        `${adminNotes}\nValidé le ${new Date().toLocaleDateString()}` :
        `Validé le ${new Date().toLocaleDateString()}`
    });
  },

  /**
   * Marquer un timesheet en litige
   */
  async disputeTimesheet(id: string, reason: string): Promise<ApiResponse<{ timesheet: Timesheet }>> {
    return this.updateTimesheet(id, { 
      status: 'disputed',
      adminNotes: `Marqué en litige le ${new Date().toLocaleDateString()}: ${reason}`
    });
  },

  /**
   * Valider plusieurs timesheets
   */
  async validateMultipleTimesheets(timesheetIds: string[], adminNotes?: string): Promise<ApiResponse<{ 
    affectedCount: number;
    result: any;
  }>> {
    return this.bulkActions({
      action: 'validate',
      timesheetIds,
      params: { adminNotes }
    });
  },

  /**
   * Marquer plusieurs timesheets en litige
   */
  async disputeMultipleTimesheets(timesheetIds: string[], reason: string): Promise<ApiResponse<{ 
    affectedCount: number;
    result: any;
  }>> {
    return this.bulkActions({
      action: 'dispute',
      timesheetIds,
      params: { adminNotes: reason }
    });
  },

  /**
   * Supprimer plusieurs timesheets
   */
  async deleteMultipleTimesheets(timesheetIds: string[]): Promise<ApiResponse<{ 
    affectedCount: number;
    result: any;
  }>> {
    return this.bulkActions({
      action: 'delete',
      timesheetIds
    });
  },

  /**
   * Exporter des timesheets
   */
  async exportTimesheets(
    timesheetIds: string[], 
    format: 'excel' | 'csv' = 'excel'
  ): Promise<ApiResponse<{ 
    affectedCount: number;
    result: any;
  }>> {
    return this.bulkActions({
      action: 'export',
      timesheetIds,
      params: { format }
    });
  },

  // ================================
  // HELPERS DE VALIDATION
  // ================================

  /**
   * Vérifier si un timesheet peut être modifié
   */
  canEditTimesheet(timesheet: Timesheet): boolean {
    // Les timesheets validés ne peuvent pas être modifiés
    // sauf par les super admins (à implémenter selon vos règles)
    return timesheet.status !== 'validated';
  },

  /**
   * Vérifier si un timesheet peut être supprimé
   */
  canDeleteTimesheet(timesheet: Timesheet): boolean {
    // Généralement, on ne supprime pas les timesheets validés
    return timesheet.status !== 'validated';
  },

  /**
   * Calculer le statut de ponctualité
   */
  getPunctualityStatus(variance: number | null): 'on_time' | 'late' | 'slight_delay' | 'early' {
    if (variance === null) return 'on_time';
    
    if (variance > 15) return 'late';
    if (variance > 5) return 'slight_delay';
    if (variance < -5) return 'early';
    return 'on_time';
  },

  /**
   * Formater la variance pour l'affichage
   */
  formatVariance(variance: number | null): string {
    if (variance === null) return '—';
    if (variance === 0) return 'Ponctuel';
    if (variance > 0) return `+${variance}min`;
    return `${variance}min`;
  }
};