// src/lib/api/users.ts
import { apiClient, apiRequest, ApiResponse } from './client';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'preparateur';
  agencies: Array<{
    _id: string;
    name: string;
    code: string;
    client: string;
  }>;
  isActive: boolean;
  lastLogin?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'preparateur';
  agencies: string[];
  phone?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'admin' | 'preparateur';
  agencies?: string[];
  phone?: string;
  isActive?: boolean;
}

export interface UsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'admin' | 'preparateur';
  agency?: string;
  isActive?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: UsersFilters;
}

export interface UserStats {
  total: number;
  active: number;
  byRole: {
    admin: number;
    preparateur: number;
  };
  byAgency: Array<{
    agencyId: string;
    agencyName: string;
    count: number;
  }>;
  recentLogins: number;
}

export const usersApi = {
  // Récupérer la liste des utilisateurs
  async getUsers(filters: UsersFilters = {}): Promise<ApiResponse<UsersResponse>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<UsersResponse>>('/admin/users', {
        params: filters
      }),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  // Récupérer un utilisateur par ID
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<User>>(`/admin/users/${id}`),
      { 
        showErrorToast: true 
      }
    );
  },

  // Créer un nouvel utilisateur
  async createUser(userData: CreateUserData): Promise<ApiResponse<User>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<User>>('/admin/users', userData),
      { 
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Utilisateur créé avec succès'
      }
    );
  },

  // Mettre à jour un utilisateur
  async updateUser(id: string, userData: UpdateUserData): Promise<ApiResponse<User>> {
    return apiRequest(
      () => apiClient.put<ApiResponse<User>>(`/admin/users/${id}`, userData),
      { 
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Utilisateur mis à jour avec succès'
      }
    );
  },

  // Désactiver un utilisateur
  async deactivateUser(id: string): Promise<ApiResponse<void>> {
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
  async reactivateUser(id: string): Promise<ApiResponse<User>> {
    return apiRequest(
      () => apiClient.patch<ApiResponse<User>>(`/admin/users/${id}/reactivate`),
      { 
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Utilisateur réactivé avec succès'
      }
    );
  },

  // Réinitialiser le mot de passe
  async resetPassword(id: string, newPassword: string): Promise<ApiResponse<void>> {
    return apiRequest(
      () => apiClient.patch<ApiResponse<void>>(`/admin/users/${id}/reset-password`, {
        newPassword
      }),
      { 
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Mot de passe réinitialisé avec succès'
      }
    );
  },

  // Obtenir les statistiques des utilisateurs
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<UserStats>>('/admin/users/stats'),
      { 
        showErrorToast: true 
      }
    );
  },

  // Exporter les utilisateurs
  async exportUsers(filters: UsersFilters = {}, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const response = await apiClient.get('/admin/users/export', {
      params: { ...filters, format },
      responseType: 'blob'
    });
    return response.data;
  },

  // Importer des utilisateurs
  async importUsers(file: File): Promise<ApiResponse<{
    imported: number;
    errors: Array<{ row: number; error: string; }>;
  }>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest(
      () => apiClient.post<ApiResponse<any>>('/admin/users/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }),
      { 
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Import des utilisateurs terminé'
      }
    );
  }
};