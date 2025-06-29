// src/lib/api/users.ts - VERSION CORRIGÉE
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

// 🔧 TYPES CORRIGÉS selon la documentation backend
export interface UserListData {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number; // Backend utilise 'pages' au lieu de 'totalPages'
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  filters: {
    search: string;
    agency: string | null;
    status: string;
    role: string | null;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    preparateurs: number;
    admins: number;
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
  async getUsers(filters: UserFilters = {}): Promise<ApiResponse<UserListData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<UserListData>>('/admin/users', {
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

  // Vérifier la disponibilité d'un email
  async checkEmail(email: string, excludeUserId?: string): Promise<ApiResponse<{ available: boolean; message: string }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ available: boolean; message: string }>>('/admin/users/check-email', {
        email,
        excludeUserId
      }),
      {
        showErrorToast: false // Pas de toast pour cette vérification
      }
    );
  },

  // Réinitialiser le mot de passe d'un utilisateur
  async resetPassword(id: string): Promise<ApiResponse<{ tempPassword: string; userId: string; email: string }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ tempPassword: string; userId: string; email: string }>>(`/admin/users/${id}/reset-password`),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Mot de passe réinitialisé avec succès'
      }
    );
  },

  // Actions en masse
  async bulkAction(data: BulkActionData): Promise<ApiResponse<{ processed: number; failed: number; total: number; results: any[] }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ processed: number; failed: number; total: number; results: any[] }>>('/admin/users/bulk-actions', data),
      {
        showErrorToast: true,
        showSuccessToast: false // Le message de succès est géré dans le hook
      }
    );
  },

  // Récupérer les statistiques d'un utilisateur  
  async getUserStats(id: string, period: string = 'month'): Promise<ApiResponse<UserStats>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<UserStats>>(`/admin/users/${id}/stats`, {
        params: { period }
      }),
      {
        showErrorToast: true
      }
    );
  },

  // Export des utilisateurs
  async exportUsers(filters: UserFilters = {}, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    try {
      const response = await apiClient.get('/admin/users/export', {
        params: { ...filters, format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Erreur export utilisateurs:', error);
      throw error;
    }
  }
};