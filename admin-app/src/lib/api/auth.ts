// src/lib/api/auth.ts
import { apiClient, apiRequest } from './client';
import { ApiResponse, LoginRequest, LoginResponse } from '@/types/api';
import { User } from '@/types/auth';

export const authApi = {
  // Connexion
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<LoginResponse>>('/auth/login', credentials),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Connexion réussie !',
      }
    );
  },

  // Récupérer le profil utilisateur
  async getProfile(): Promise<ApiResponse<User>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<User>>('/auth/me'),
      { showErrorToast: true }
    );
  },

  // Refresh token
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ token: string }>>('/auth/refresh', { refreshToken }),
      { showErrorToast: false } // Pas de toast pour le refresh automatique
    );
  },

  // Vérifier si l'utilisateur est toujours connecté
  async verifyAuth(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch {
      return false;
    }
  },
};

// Hook React Query pour l'authentification
export const useAuthQueries = () => {
  return {
    // Query pour vérifier l'auth au démarrage de l'app
    verifyAuth: {
      queryKey: ['auth', 'verify'],
      queryFn: authApi.verifyAuth,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },

    // Query pour récupérer le profil
    profile: {
      queryKey: ['auth', 'profile'],
      queryFn: authApi.getProfile,
      enabled: false, // Activé manuellement
    },
  };
};