// src/lib/api/users.ts
import { apiClient, apiRequest, ApiResponse } from './client';
import { User } from '@/types/auth';

// Types spécifiques pour les utilisateurs
export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  agency?: string;
  status?: 'all' | 'active' | 'inactive';
  role?: 'admin' | 'preparateur';
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface UserCreateData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  agencies: string[];
  role?: 'admin' | 'preparateur';
}

export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  agencies?: string[];
  isActive?: boolean;
  role?: 'admin' | 'preparateur';
}

export interface UserStats {
  totalPreparations: number;
  averageTime: number;
  onTimeRate: number;
  lastActivity: string;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BulkActionData {
  action: 'activate' | 'deactivate' | 'change_agency' | 'export';
  userIds: string[];
  params?: {
    newAgencyId?: string;
    format?: 'excel' | 'csv';
    notify?: boolean;
  };
}

// API Client pour les utilisateurs
export const usersApi = {
  // Récupérer la liste des utilisateurs avec filtres
  async getUsers(filters: UserFilters = {}): Promise<ApiResponse<UserListResponse>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<UserListResponse>>('/admin/users', {
        params: filters
      }),
      {
        showErrorToast: true,
        retryCount: 2
      }
    );
  },

  // Récupérer un utilisateur par ID
  async getUser(id: string): Promise<ApiResponse<{ user: User }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ user: User }>>(`/admin/users/${id}`),
      {
        showErrorToast: true
      }
    );
  },

  // Créer un nouvel utilisateur
  async createUser(userData: UserCreateData): Promise<ApiResponse<{ user: User }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ user: User }>>('/admin/users', userData),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Utilisateur créé avec succès'
      }
    );
  },

  // Mettre à jour un utilisateur
  async updateUser(id: string, userData: UserUpdateData): Promise<ApiResponse<{ user: User }>> {
    return apiRequest(
      () => apiClient.put<ApiResponse<{ user: User }>>(`/admin/users/${id}`, userData),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Utilisateur modifié avec succès'
      }
    );
  },

  // Désactiver un utilisateur
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiRequest(
      () => apiClient.delete<ApiResponse<void>>(`/admin/users/${id}`),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Utilisateur désactivé avec succès'
      }
    );
  },

  // Réactiver un utilisateur
  async reactivateUser(id: string): Promise<ApiResponse<{ user: User }>> {
    return apiRequest(
      () => apiClient.patch<ApiResponse<{ user: User }>>(`/admin/users/${id}/reactivate`),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Utilisateur réactivé avec succès'
      }
    );
  },

  // Récupérer les statistiques d'un utilisateur
  async getUserStats(id: string, period?: string): Promise<ApiResponse<UserStats>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<UserStats>>(`/admin/users/${id}/stats`, {
        params: period ? { period } : {}
      }),
      {
        showErrorToast: true
      }
    );
  },

  // Actions en masse
  async bulkAction(data: BulkActionData): Promise<ApiResponse<{ processed: number; failed: number; results: any[] }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ processed: number; failed: number; results: any[] }>>('/admin/users/bulk-actions', data),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: `Action en masse effectuée sur ${data.userIds.length} utilisateur(s)`
      }
    );
  },

  // Vérifier si un email existe
  async checkEmail(email: string, excludeUserId?: string): Promise<ApiResponse<{ available: boolean }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ available: boolean }>>('/admin/users/check-email', {
        email,
        excludeUserId
      }),
      {
        showErrorToast: false
      }
    );
  },

  // Réinitialiser le mot de passe
  async resetPassword(id: string): Promise<ApiResponse<{ tempPassword: string }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ tempPassword: string }>>(`/admin/users/${id}/reset-password`),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Mot de passe réinitialisé'
      }
    );
  },

  // Exporter la liste des utilisateurs
  async exportUsers(filters: UserFilters = {}, format: 'excel' | 'csv' = 'excel'): Promise<Blob> {
    const response = await apiClient.get('/admin/users/export', {
      params: { ...filters, format },
      responseType: 'blob'
    });
    
    return response.data;
  }
};