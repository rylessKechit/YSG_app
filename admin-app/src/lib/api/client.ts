import axios, { AxiosResponse, AxiosError } from 'axios';
import { toast } from 'sonner';

// Configuration du client API
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interface pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
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

// 🔧 FONCTION SÉCURISÉE POUR RÉCUPÉRER LE TOKEN
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Essayer différentes clés de stockage
  const token = localStorage.getItem('auth-token') || 
                localStorage.getItem('token');
  
  console.log('🎫 Token récupéré:', token ? token.substring(0, 20) + '...' : 'AUCUN TOKEN');
  return token;
};

// 🔧 FONCTION POUR SAUVEGARDER LE TOKEN
const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  console.log('💾 Sauvegarde token:', token.substring(0, 20) + '...');
  
  // Sauvegarder avec les deux clés pour compatibilité
  localStorage.setItem('auth-token', token);
  localStorage.setItem('token', token);
};

// 🔧 FONCTION POUR NETTOYER LES TOKENS
const clearAuthTokens = (): void => {
  if (typeof window === 'undefined') return;
  console.log('🧹 Nettoyage de tous les tokens...');
  
  // Nettoyer toutes les variantes possibles
  localStorage.removeItem('auth-token');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh-token');
  localStorage.removeItem('refreshToken');
};

// Variable pour éviter les appels multiples de refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// 🔧 INTERCEPTEUR DE REQUÊTE AVEC LOGS DÉTAILLÉS
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('📤 Requête AVEC token:', config.method?.toUpperCase(), config.url);
    } else {
      console.log('📤 Requête SANS token:', config.method?.toUpperCase(), config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('💥 Erreur intercepteur request:', error);
    return Promise.reject(error);
  }
);

// 🔧 INTERCEPTEUR DE RÉPONSE AVEC GESTION 401 AMÉLIORÉE
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('📥 Réponse OK:', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error: AxiosError) => {
    console.error('📥 Erreur réponse:', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    
    const originalRequest = error.config as any;

    // Gestion spéciale des erreurs 401 (token invalide/expiré)
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Si on est en train de refresh, mettre en queue
      if (isRefreshing) {
        console.log('🔄 Refresh en cours, mise en queue...');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      console.log('🔄 Token 401 - Tentative de refresh...');
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh-token') || 
                           localStorage.getItem('refreshToken');
                           
        if (refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined') {
          console.log('🔄 Refresh avec token:', refreshToken.substring(0, 15) + '...');
          
          // Appel de refresh sans passer par l'intercepteur
          const refreshResponse = await axios.post(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
            { refreshToken },
            {
              headers: {
                'Content-Type': 'application/json',
                // Ne pas ajouter Authorization ici car le refresh token est dans le body
              }
            }
          );
          
          const newToken = refreshResponse.data.data.token;
          console.log('✅ Nouveau token reçu:', newToken.substring(0, 20) + '...');
          
          // Sauvegarder le nouveau token
          setAuthToken(newToken);
          
          // Traiter la queue
          processQueue(null, newToken);
          
          // Retry la requête originale avec le nouveau token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          console.log('🔄 Retry requête avec nouveau token...');
          
          return apiClient(originalRequest);
        } else {
          console.log('❌ Pas de refresh token disponible');
          throw new Error('No refresh token available');
        }
      } catch (refreshError) {
        console.error('💥 Erreur lors du refresh:', refreshError);
        processQueue(refreshError, null);
        
        // Redirection vers login si refresh échoue
        console.log('🔄 Redirection vers login...');
        clearAuthTokens();
        
        // Éviter la redirection en boucle si on est déjà sur login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// 🔧 FONCTION UTILITAIRE POUR FAIRE DES REQUÊTES AVEC GESTION D'ERREUR
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
    
    // Retourner directement response.data qui est de type ApiResponse<T>
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse<any>>;
    const errorData = axiosError.response?.data;
    
    console.error('💥 Erreur API Request:', {
      status: axiosError.response?.status,
      message: errorData?.message || axiosError.message,
      url: axiosError.config?.url,
      method: axiosError.config?.method
    });
    
    if (showErrorToast) {
      const errorMessage = errorData?.message || 
                          axiosError.message || 
                          'Une erreur est survenue';
      toast.error(errorMessage);
    }
    
    // Retry logic pour les erreurs réseau (pas 401/403)
    if (retryCount > 0 && !axiosError.response) {
      console.log('🔄 Retry dans 1s... (tentatives restantes:', retryCount, ')');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiRequest(requestFn, { ...options, retryCount: retryCount - 1 });
    }
    
    throw error;
  }
}

// Export des fonctions utilitaires
export { setAuthToken, clearAuthTokens, getAuthToken };