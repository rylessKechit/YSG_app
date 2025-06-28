// src/lib/api/client.ts
import axios, { AxiosError, AxiosResponse } from 'axios';
// Import du toast 
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

// Instance Axios principale
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token automatiquement
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les réponses et erreurs
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Si erreur 401 (token expiré)
    if (error.response?.status === 401 && originalRequest) {
      // Essayer de refresh le token
      try {
        const refreshToken = localStorage.getItem('refresh-token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { token } = response.data.data;
          localStorage.setItem('auth-token', token);
          
          // Retry la requête originale
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('auth-token');
        localStorage.removeItem('refresh-token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Gestion des erreurs avec toasts Shadcn
    const errorMessage = (error.response?.data as any)?.message || error.message || 'Une erreur est survenue';
    
    if (error.response?.status !== 401) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMessage,
      });
    }

    return Promise.reject(error);
  }
);

// Types pour les requêtes
export interface ApiRequestConfig {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

// Wrapper pour les requêtes avec gestion d'erreurs
export async function apiRequest<T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  config: ApiRequestConfig = {}
): Promise<T> {
  const { showErrorToast = true, showSuccessToast = false, successMessage } = config;

  try {
    const response = await requestFn();
    
    if (showSuccessToast && successMessage) {
      toast({
        title: "Succès",
        description: successMessage,
      });
    }
    
    return response.data;
  } catch (error) {
    if (showErrorToast && error instanceof AxiosError) {
      const message = (error.response?.data as any)?.message || error.message || 'Une erreur est survenue';
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message,
      });
    }
    throw error;
  }
}

export default apiClient;