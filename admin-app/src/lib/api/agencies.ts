// admin-app/src/lib/api/agencies.ts - API CLIENT COMPLET POUR AGENCES
import { apiClient, apiRequest, ApiResponse } from './client';
import { Agency, AgencyFilters, AgencyListData, AgencyCreateData, AgencyUpdateData, AgencyStats } from '@/types/agency';

// Types pour les actions en masse
export interface BulkActionData {
  action: 'activate' | 'deactivate' | 'export';
  agencyIds: string[];
  params?: {
    format?: 'excel' | 'csv';
    notify?: boolean;
  };
}

// Type guard pour valider la structure AgencyListData
export function isValidAgencyListData(data: any): data is AgencyListData {
  return (
    data &&
    Array.isArray(data.agencies) &&
    data.pagination &&
    typeof data.pagination.page === 'number' &&
    typeof data.pagination.total === 'number' &&
    (typeof data.pagination.pages === 'number' || typeof data.pagination.totalPages === 'number')
  );
}

// Helper pour normaliser la pagination
export function normalizePagination(pagination: any) {
  return {
    ...pagination,
    pages: pagination.pages || pagination.totalPages || 1,
    totalPages: pagination.totalPages || pagination.pages || 1,
  };
}

// API Client pour les agences
export const agenciesApi = {
  // ✅ Récupérer la liste des agences avec filtres
  async getAgencies(filters: AgencyFilters = {}): Promise<ApiResponse<AgencyListData>> {
    const response = await apiRequest(
      () => apiClient.get<ApiResponse<AgencyListData>>('/admin/agencies', {
        params: filters
      }),
      {
        showErrorToast: true,
        retryCount: 2
      }
    );

    // Valider et normaliser la réponse
    if (response.success && response.data) {
      const data = response.data;
      if (isValidAgencyListData(data)) {
        data.pagination = normalizePagination(data.pagination);
      }
    }

    return response;
  },

  // ✅ Récupérer une agence par ID
  async getAgency(id: string): Promise<ApiResponse<{ agency: Agency }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ agency: Agency }>>(`/admin/agencies/${id}`),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Créer une nouvelle agence
  async createAgency(data: AgencyCreateData): Promise<ApiResponse<{ agency: Agency }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ agency: Agency }>>('/admin/agencies', data),
      {
        showErrorToast: true,
        successMessage: 'Agence créée avec succès'
      }
    );
  },

  // ✅ Modifier une agence
  async updateAgency(id: string, data: AgencyUpdateData): Promise<ApiResponse<{ agency: Agency }>> {
    return apiRequest(
      () => apiClient.put<ApiResponse<{ agency: Agency }>>(`/admin/agencies/${id}`, data),
      {
        showErrorToast: true,
        successMessage: 'Agence modifiée avec succès'
      }
    );
  },

  // ✅ Supprimer/Désactiver une agence
  async deleteAgency(id: string): Promise<ApiResponse<void>> {
    return apiRequest(
      () => apiClient.delete<ApiResponse<void>>(`/admin/agencies/${id}`),
      {
        showErrorToast: true,
        successMessage: 'Agence désactivée avec succès'
      }
    );
  },

  // ✅ Réactiver une agence
  async reactivateAgency(id: string): Promise<ApiResponse<{ agency: Agency }>> {
    return apiRequest(
      () => apiClient.patch<ApiResponse<{ agency: Agency }>>(`/admin/agencies/${id}/reactivate`),
      {
        showErrorToast: true,
        successMessage: 'Agence réactivée avec succès'
      }
    );
  },

  // ✅ Vérifier la disponibilité d'un code agence
  async checkCodeAvailability(code: string, excludeId?: string): Promise<ApiResponse<{ available: boolean }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ available: boolean }>>('/admin/agencies/check-code', {
        code,
        excludeAgencyId: excludeId
      }),
      {
        showErrorToast: false // Pas d'erreur toast pour cette vérification
      }
    );
  },

  // ✅ Actions en masse
  async bulkActions(data: BulkActionData): Promise<ApiResponse<any>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<any>>('/admin/agencies/bulk-actions', data),
      {
        showErrorToast: true,
        successMessage: 'Actions exécutées avec succès'
      }
    );
  },

  // ✅ Statistiques des agences
  async getAgencyStats(id: string): Promise<ApiResponse<{ stats: AgencyStats }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ stats: AgencyStats }>>(`/admin/agencies/${id}/stats`),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Export des données d'agences
  async exportAgencies(format: 'excel' | 'csv' = 'excel', filters?: AgencyFilters): Promise<Blob> {
    const response = await apiClient.post('/admin/agencies/export', {
      format,
      filters
    }, {
      responseType: 'blob'
    });
    
    return response.data;
  },

  // ✅ Obtenir les utilisateurs d'une agence
  async getAgencyUsers(id: string): Promise<ApiResponse<{ users: any[] }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ users: any[] }>>(`/admin/agencies/${id}/users`),
      {
        showErrorToast: true
      }
    );
  }
};