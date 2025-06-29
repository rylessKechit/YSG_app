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

// ✅ Helper pour nettoyer les filtres avant envoi
export function cleanFilters(filters: AgencyFilters): AgencyFilters {
  const cleaned: AgencyFilters = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    // Supprimer les valeurs vides, null ou undefined
    if (value !== '' && value !== null && value !== undefined) {
      // Pour les tableaux, vérifier qu'ils ne sont pas vides
      if (Array.isArray(value) && value.length === 0) {
        return;
      }
      cleaned[key as keyof AgencyFilters] = value;
    }
  });
  
  return cleaned;
}

// API Client pour les agences
export const agenciesApi = {
  // ✅ Récupérer la liste des agences avec filtres
  async getAgencies(filters: AgencyFilters = {}): Promise<ApiResponse<AgencyListData>> {
    // Nettoyer les filtres avant envoi
    const cleanedFilters = cleanFilters(filters);
    
    console.log('🔍 [agenciesApi] Envoi requête agences avec filtres:', cleanedFilters);
    
    const response = await apiRequest(
      () => apiClient.get<ApiResponse<AgencyListData>>('/admin/agencies', {
        params: cleanedFilters
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
        console.log('✅ [agenciesApi] Données agences reçues:', {
          total: data.agencies.length,
          page: data.pagination.page,
          totalPages: data.pagination.totalPages
        });
      } else {
        console.warn('⚠️ [agenciesApi] Structure de données invalide:', data);
      }
    }

    return response;
  },

  // ✅ Récupérer une agence par ID
  async getAgency(id: string): Promise<ApiResponse<{ agency: Agency }>> {
    console.log('🔍 [agenciesApi] Récupération agence:', id);
    return apiRequest(
      () => apiClient.get<ApiResponse<{ agency: Agency }>>(`/admin/agencies/${id}`),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Créer une nouvelle agence
  async createAgency(data: AgencyCreateData): Promise<ApiResponse<{ agency: Agency }>> {
    console.log('➕ [agenciesApi] Création agence:', data);
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
    console.log('✏️ [agenciesApi] Modification agence:', id, data);
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
    console.log('🗑️ [agenciesApi] Suppression agence:', id);
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
    console.log('🔄 [agenciesApi] Réactivation agence:', id);
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
    console.log('🔍 [agenciesApi] Vérification code:', code, excludeId);
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
    console.log('🔄 [agenciesApi] Actions en masse:', data);
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
    console.log('📊 [agenciesApi] Récupération stats agence:', id);
    return apiRequest(
      () => apiClient.get<ApiResponse<{ stats: AgencyStats }>>(`/admin/agencies/${id}/stats`),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Obtenir les utilisateurs d'une agence
  async getAgencyUsers(id: string): Promise<ApiResponse<{ users: any[] }>> {
    console.log('👥 [agenciesApi] Récupération utilisateurs agence:', id);
    return apiRequest(
      () => apiClient.get<ApiResponse<{ users: any[] }>>(`/admin/agencies/${id}/users`),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Export des données d'agences
  async exportAgencies(format: 'excel' | 'csv' = 'excel', filters?: AgencyFilters): Promise<Blob> {
    console.log('📤 [agenciesApi] Export agences:', format, filters);
    
    try {
      const cleanedFilters = cleanFilters(filters || {});
      
      const response = await apiClient.post('/admin/agencies/export', {
        format,
        filters: cleanedFilters
      }, {
        responseType: 'blob'
      });
      
      console.log('✅ [agenciesApi] Export réussi');
      return response.data;
    } catch (error) {
      console.error('❌ [agenciesApi] Erreur export:', error);
      throw error;
    }
  },

  // ✅ Obtenir toutes les agences (pour les sélecteurs)
  async getAllAgencies(): Promise<ApiResponse<{ agencies: Agency[] }>> {
    console.log('📋 [agenciesApi] Récupération toutes agences');
    return apiRequest(
      () => apiClient.get<ApiResponse<{ agencies: Agency[] }>>('/agencies'),
      {
        showErrorToast: true
      }
    );
  },

  // ✅ Recherche d'agences pour l'autocomplétion
  async searchAgencies(query: string, limit: number = 10): Promise<ApiResponse<{ agencies: Agency[] }>> {
    console.log('🔍 [agenciesApi] Recherche agences:', query);
    
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: { agencies: [] },
        message: 'Requête trop courte'
      };
    }
    
    return apiRequest(
      () => apiClient.get<ApiResponse<{ agencies: Agency[] }>>('/admin/agencies/search', {
        params: { 
          q: query.trim(), 
          limit 
        }
      }),
      {
        showErrorToast: false // Pas d'erreur pour les recherches
      }
    );
  },

  // ✅ Obtenir l'activité récente d'une agence
  async getAgencyActivity(id: string, limit: number = 20): Promise<ApiResponse<{ activities: any[] }>> {
    console.log('📈 [agenciesApi] Récupération activité agence:', id);
    return apiRequest(
      () => apiClient.get<ApiResponse<{ activities: any[] }>>(`/admin/agencies/${id}/activity`, {
        params: { limit }
      }),
      {
        showErrorToast: true
      }
    );
  }
};