// src/lib/api/auth.ts
import { apiClient, apiRequest, ApiResponse } from './client';
import { LoginRequest, User } from '@/types/auth';

// Types pour les réponses API qui correspondent à votre backend
interface AuthLoginResponse {
  token: string;
  user: User;
  refreshToken?: string;
}

interface AuthProfileData {
  user: User;
}

export const authApi = {
  // Connexion - TYPE CORRIGÉ
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthLoginResponse>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<AuthLoginResponse>>('/auth/login', credentials),
      {
        showErrorToast: true,
        showSuccessToast: true,
        successMessage: 'Connexion réussie !',
      }
    );
  },

  // Récupérer le profil utilisateur - TYPE CORRIGÉ
  async getProfile(): Promise<ApiResponse<AuthProfileData>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<AuthProfileData>>('/auth/me'),
      { showErrorToast: true }
    );
  },

  // Refresh token - TYPE CORRIGÉ
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string }>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{ token: string }>>('/auth/refresh', { refreshToken }),
      { showErrorToast: false } // Pas de toast pour le refresh automatique
    );
  },

  // Vérifier si l'utilisateur est toujours connecté
  async verifyAuth(): Promise<boolean> {
    try {
      const response = await this.getProfile();
      return response.success && !!response.data?.user;
    } catch {
      return false;
    }
  },

  // Vérifier la validité du token
  async verifyToken(): Promise<ApiResponse<{ valid: boolean; userId?: string; role?: string }>> {
    return apiRequest(
      () => apiClient.get<ApiResponse<{ valid: boolean; userId?: string; role?: string }>>('/auth/verify'),
      { showErrorToast: false }
    );
  },

  // Déconnexion
  async logout(): Promise<ApiResponse<{}>> {
    return apiRequest(
      () => apiClient.post<ApiResponse<{}>>('/auth/logout'),
      { 
        showErrorToast: false,
        showSuccessToast: true,
        successMessage: 'Déconnexion réussie'
      }
    );
  }
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

    // Query pour vérifier le token
    verifyToken: {
      queryKey: ['auth', 'token'],
      queryFn: authApi.verifyToken,
      retry: false,
      staleTime: 1 * 60 * 1000, // 1 minute
    }
  };
};