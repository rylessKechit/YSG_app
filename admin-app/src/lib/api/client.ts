// src/lib/api/client.ts
import axios, { AxiosResponse, AxiosError } from 'axios';
import { toast } from 'sonner';

// Configuration de base
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interface pour les réponses API standardisées
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Interface pour les options de requête
interface RequestOptions {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  retryCount?: number;
}

// Intercepteur de requête pour ajouter le token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse pour gérer les erreurs et refresh token
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Gestion du token expiré (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
            { refreshToken }
          );
          
          localStorage.setItem('token', data.data.token);
          originalRequest.headers.Authorization = `Bearer ${data.data.token}`;
          
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Fonction utilitaire pour faire des requêtes avec gestion d'erreur
export async function apiRequest<T>(
  requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    showErrorToast = false,
    showSuccessToast = false,
    successMessage,
    retryCount = 0
  } = options;

  try {
    const response = await requestFn();
    
    if (showSuccessToast && response.data.success) {
      toast.success(successMessage || response.data.message || 'Opération réussie');
    }
    
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    const errorData = axiosError.response?.data;
    
    if (showErrorToast) {
      const errorMessage = errorData?.message || 
                          axiosError.message || 
                          'Une erreur est survenue';
      toast.error(errorMessage);
    }
    
    // Retry logic for network errors
    if (retryCount > 0 && !axiosError.response) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiRequest(requestFn, { ...options, retryCount: retryCount - 1 });
    }
    
    throw error;
  }
}