import { apiClient, apiRequest, ApiResponse } from './client';

export interface Agency {
  id: string;
  name: string;
  code?: string;
  client?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyFilters {
  page?: number;
  limit?: number;
  search?: string;
  client?: string;
  status?: 'all' | 'active' | 'inactive';
}

export interface AgencyListData {
  agencies: Agency[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  stats: {
    totalAgencies: number;
    activeAgencies: number;
    inactiveAgencies: number;
  };
}

export const agenciesApi = {
  // Récupérer la liste des agences
  async getAgencies(filters: AgencyFilters = {}): Promise<ApiResponse<AgencyListData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<AgencyListData>>('/admin/agencies', {
        params: filters
      }),
      {
        showErrorToast: true,
        retryCount: 2
      }
    );
  },

  // Récupérer une agence par ID
  async getAgency(id: string): Promise<ApiResponse<{ agency: Agency }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ agency: Agency }>>(`/admin/agencies/${id}`),
      {
        showErrorToast: true
      }
    );
  },
};