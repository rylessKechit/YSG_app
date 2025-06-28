// src/lib/api/agencies.ts
import { apiClient, apiRequest, ApiResponse } from './client';

export interface Agency {
  _id: string;
  name: string;
  code: string;
  client: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    manager?: string;
  };
  isActive: boolean;
  settings: {
    workingHours: {
      start: string;
      end: string;
    };
    breakDuration: number;
    maxPreparateurs: number;
  };
  stats?: {
    totalUsers: number;
    activeUsers: number;
    todaySchedules: number;
    punctualityRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgencyData {
  name: string;
  code: string;
  client: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    manager?: string;
  };
  settings: {
    workingHours: {
      start: string;
      end: string;
    };
    breakDuration: number;
    maxPreparateurs: number;
  };
}

export interface UpdateAgencyData {
  name?: string;
  code?: string;
  client?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    manager?: string;
  };
  settings?: {
    workingHours?: {
      start?: string;
      end?: string;
    };
    breakDuration?: number;
    maxPreparateurs?: number;
  };
  isActive?: boolean;
}

export interface AgenciesFilters {
  page?: number;
  limit?: number;
  search?: string;
  client?: string;
  isActive?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  includeStats?: boolean;
}

export interface AgenciesResponse {
  agencies: Agency[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: AgenciesFilters;
}

export interface AgencyStats {
  total: number;
  active: number;
  byClient: Array<{
    client: string;
    count: number;
  }>;
  totalUsers: number;
  totalVehicles: number;
  averagePunctuality: number;
}

export const agenciesApi = {
  // Récupérer la liste des agences
  async getAgencies(filters: AgenciesFilters = {}): Promise<ApiResponse<AgenciesResponse>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<AgenciesResponse>>('/admin/agencies', {
        params: filters
      }),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  // Récupérer une agence par ID
  async getAgencyById(id: string, includeStats = false): Promise<ApiResponse<Agency>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<Agency>>(`/admin/agencies/${id}`, {
        params: { includeStats }
      }),
      { 
        showErrorToast: true 
      }
    );
  },

  // Créer une nouvelle agence
  async createAgency(agencyData: CreateAgencyData): Promise<ApiResponse<Agency>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<Agency>>('/admin/agencies', agencyData),
      { 
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Agence créée avec succès'
      }
    );
  },

  // Mettre à jour une agence
  async updateAgency(id: string, agencyData: UpdateAgencyData): Promise<ApiResponse<Agency>> {
    return apiRequest(
      () => apiClient.put<ApiResponse<Agency>>(`/admin/agencies/${id}`, agencyData),
      { 
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Agence mise à jour avec succès'
      }
    );
  },

  // Désactiver une agence
  async deactivateAgency(id: string): Promise<ApiResponse<void>> {
    return apiRequest(
      () => apiClient.delete<ApiResponse<void>>(`/admin/agencies/${id}`),
      { 
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Agence désactivée avec succès'
      }
    );
  },

  // Obtenir les statistiques des agences
  async getAgencyStats(): Promise<ApiResponse<AgencyStats>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<AgencyStats>>('/admin/agencies/stats'),
      { 
        showErrorToast: true 
      }
    );
  },

  // Obtenir les utilisateurs d'une agence
  async getAgencyUsers(id: string, filters: { 
    page?: number; 
    limit?: number; 
    role?: string;
    isActive?: boolean;
  } = {}): Promise<ApiResponse<any>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<any>>(`/admin/agencies/${id}/users`, {
        params: filters
      }),
      { 
        showErrorToast: true 
      }
    );
  },

  // Obtenir les véhicules d'une agence
  async getAgencyVehicles(id: string, filters: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<ApiResponse<any>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<any>>(`/admin/agencies/${id}/vehicles`, {
        params: filters
      }),
      { 
        showErrorToast: true 
      }
    );
  },

  // Obtenir le planning d'une agence
  async getAgencySchedule(id: string, filters: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  } = {}): Promise<ApiResponse<any>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<any>>(`/admin/agencies/${id}/schedule`, {
        params: filters
      }),
      { 
        showErrorToast: true 
      }
    );
  },

  // Exporter les données d'une agence
  async exportAgencyData(id: string, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const response = await apiClient.get(`/admin/agencies/${id}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
};