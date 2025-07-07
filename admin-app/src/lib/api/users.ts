// src/lib/api/users.ts - VERSION CORRIGÉE AVEC EXPORTS PROPRES
import { apiClient, apiRequest, ApiResponse } from './client';
import { User } from '@/types/auth';

// ===== TYPES SPÉCIFIQUES POUR LES UTILISATEURS =====
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

export interface UserListData {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    totalPages: number;
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

// ===== TYPE GUARDS ET HELPERS =====

/**
 * Type guard pour valider la structure UserListData
 */
export function isValidUserListData(data: any): data is UserListData {
  return (
    data &&
    Array.isArray(data.users) &&
    data.pagination &&
    typeof data.pagination.page === 'number' &&
    typeof data.pagination.total === 'number' &&
    (typeof data.pagination.pages === 'number' || typeof data.pagination.totalPages === 'number') &&
    data.stats &&
    typeof data.stats.totalUsers === 'number'
  );
}

/**
 * Helper pour normaliser la pagination
 */
export function normalizePagination(pagination: any) {
  return {
    ...pagination,
    pages: pagination.pages || pagination.totalPages || 1,
    totalPages: pagination.totalPages || pagination.pages || 1,
    hasNext: pagination.hasNext ?? (pagination.page < (pagination.pages || pagination.totalPages || 1)),
    hasPrev: pagination.hasPrev ?? (pagination.page > 1),
  };
}

/**
 * Helper pour nettoyer les filtres avant envoi
 */
export function cleanUserFilters(filters: UserFilters): UserFilters {
  const cleaned: UserFilters = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      if (Array.isArray(value) && value.length === 0) {
        return;
      }
      cleaned[key as keyof UserFilters] = value;
    }
  });
  
  return cleaned;
}

// ===== API CLIENT POUR LES UTILISATEURS =====
export const usersApi = {
  
  /**
   * Récupérer la liste des utilisateurs avec filtres
   */
  async getUsers(filters: UserFilters = {}): Promise<ApiResponse<UserListData>> {
    const cleanedFilters = cleanUserFilters(filters);
    console.log('👥 [usersApi] Récupération utilisateurs avec filtres:', cleanedFilters);
    
    const response = await apiRequest(
      () => apiClient.get<ApiResponse<UserListData>>('/admin/users', {
        params: cleanedFilters
      }),
      { 
        showErrorToast: true,
        retryCount: 1
      }
    );

    // Validation et normalisation
    if (response.data && !isValidUserListData(response.data)) {
      console.warn('⚠️ Structure UserListData invalide:', response.data);
    }
    
    if (response.data && response.data.pagination) {
      response.data.pagination = normalizePagination(response.data.pagination);
    }
    
    return response;
  },

  /**
   * Récupérer un utilisateur par ID
   */
  async getUser(id: string): Promise<ApiResponse<{ user: User }>> {
    console.log('👤 [usersApi] Récupération utilisateur:', id);
    return apiRequest(
      () => apiClient.get<ApiResponse<{ user: User }>>(`/admin/users/${id}`),
      { 
        showErrorToast: true,
        retryCount: 1 
      }
    );
  },

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(data: UserCreateData): Promise<ApiResponse<{ user: User }>> {
    console.log('➕ [usersApi] Création utilisateur:', { ...data, password: '[HIDDEN]' });
    return apiRequest(
      () => apiClient.post<ApiResponse<{ user: User }>>('/admin/users', data),
      {
        showErrorToast: true,
        successMessage: 'Utilisateur créé avec succès'
      }
    );
  },

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(id: string, data: UserUpdateData): Promise<ApiResponse<{ user: User }>> {
    console.log('✏️ [usersApi] Mise à jour utilisateur:', id, data);
    return apiRequest(
      () => apiClient.put<ApiResponse<{ user: User }>>(`/admin/users/${id}`, data),
      {
        showErrorToast: true,
        successMessage: 'Utilisateur mis à jour avec succès'
      }
    );
  },

  /**
   * Supprimer (désactiver) un utilisateur
   */
  async deleteUser(id: string): Promise<ApiResponse<{ message: string }>> {
    console.log('🗑️ [usersApi] Suppression utilisateur:', id);
    return apiRequest(
      () => apiClient.delete<ApiResponse<{ message: string }>>(`/admin/users/${id}`),
      {
        showErrorToast: true,
        successMessage: 'Utilisateur supprimé avec succès'
      }
    );
  },

  /**
   * Réactiver un utilisateur
   */
  async reactivateUser(id: string): Promise<ApiResponse<{ user: User }>> {
    console.log('🔄 [usersApi] Réactivation utilisateur:', id);
    return apiRequest(
      () => apiClient.post<ApiResponse<{ user: User }>>(`/admin/users/${id}/reactivate`),
      {
        showErrorToast: true,
        successMessage: 'Utilisateur réactivé avec succès'
      }
    );
  },

  /**
   * Vérifier la disponibilité d'un email
   */
  async checkEmailAvailability(email: string, excludeId?: string): Promise<ApiResponse<{ available: boolean }>> {
    console.log('📧 [usersApi] Vérification email:', email, excludeId);
    return apiRequest(
      () => apiClient.post<ApiResponse<{ available: boolean }>>('/admin/users/check-email', {
        email,
        excludeUserId: excludeId
      }),
      {
        showErrorToast: false
      }
    );
  },

  /**
   * Actions en masse sur les utilisateurs
   */
  async bulkActions(data: BulkActionData): Promise<ApiResponse<any>> {
    console.log('🔄 [usersApi] Actions en masse:', data);
    return apiRequest(
      () => apiClient.post<ApiResponse<any>>('/admin/users/bulk-actions', data),
      {
        showErrorToast: true,
        successMessage: 'Actions exécutées avec succès'
      }
    );
  },

  /**
   * Obtenir les statistiques d'un utilisateur
   */
  async getUserStats(id: string): Promise<ApiResponse<{ stats: UserStats }>> {
    console.log('📊 [usersApi] Récupération stats utilisateur:', id);
    return apiRequest(
      () => apiClient.get<ApiResponse<{ stats: UserStats }>>(`/admin/users/${id}/stats`),
      {
        showErrorToast: true
      }
    );
  },

  /**
   * Export des données utilisateurs
   */
  async exportUsers(format: 'excel' | 'csv' = 'excel', filters?: UserFilters): Promise<ApiResponse<{ downloadUrl: string }>> {
    const cleanedFilters = filters ? cleanUserFilters(filters) : {};
    console.log('📥 [usersApi] Export utilisateurs:', format, cleanedFilters);
    
    return apiRequest(
      () => apiClient.post<ApiResponse<{ downloadUrl: string }>>('/admin/users/export', {
        format,
        filters: cleanedFilters
      }),
      {
        showErrorToast: true,
        successMessage: 'Export généré avec succès'
      }
    );
  },

  /**
   * Réinitialiser le mot de passe d'un utilisateur
   */
  async resetPassword(id: string): Promise<ApiResponse<{ temporaryPassword: string }>> {
    console.log('🔑 [usersApi] Réinitialisation mot de passe:', id);
    return apiRequest(
      () => apiClient.post<ApiResponse<{ temporaryPassword: string }>>(`/admin/users/${id}/reset-password`),
      {
        showErrorToast: true,
        successMessage: 'Mot de passe réinitialisé avec succès'
      }
    );
  }
};

// ===== EXPORTS POUR COMPATIBILITÉ =====
export default usersApi;