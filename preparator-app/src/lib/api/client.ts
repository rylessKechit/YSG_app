import axios, { AxiosError, AxiosResponse } from 'axios';

// Configuration du client API
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les requêtes
apiClient.interceptors.request.use(
  (config) => {
    // Log des requêtes en développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur requête API:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log des réponses en développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Log des erreurs
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // Gestion spécifique des erreurs d'authentification
    if (error.response?.status === 401) {
      console.warn('⚠️ Token invalide ou expiré - redirection vers login');
      
      // Nettoyer le localStorage et rediriger vers login
      localStorage.removeItem('auth-store');
      window.location.href = '/login';
      
      return Promise.reject(new Error('Session expirée. Veuillez vous reconnecter.'));
    }

    // Gestion des erreurs serveur
    if (error.response?.status && error.response.status >= 500) {
      return Promise.reject(new Error('Erreur serveur. Veuillez réessayer plus tard.'));
    }

    // Gestion des erreurs réseau
    if (!error.response) {
      return Promise.reject(new Error('Problème de connexion. Vérifiez votre connexion internet.'));
    }

    return Promise.reject(error);
  }
);

// Fonction utilitaire pour gérer les erreurs API
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Données invalides';
      case 401:
        return 'Authentification requise';
      case 403:
        return 'Accès refusé';
      case 404:
        return 'Ressource non trouvée';
      case 409:
        return 'Conflit de données';
      case 422:
        return 'Données non valides';
      case 429:
        return 'Trop de requêtes. Veuillez patienter.';
      case 500:
        return 'Erreur interne du serveur';
      case 502:
        return 'Service temporairement indisponible';
      case 503:
        return 'Service en maintenance';
      default:
        return `Erreur HTTP ${error.response.status}`;
    }
  }
  
  return 'Une erreur inattendue est survenue';
};

// Types pour les réponses API standardisées
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Fonction helper pour les requêtes avec retry
export const apiRequestWithRetry = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Ne pas retry pour certaines erreurs
      if (error.response?.status && [401, 403, 404, 422].includes(error.response.status)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.warn(`⚠️ Tentative ${attempt}/${maxRetries} échouée, retry dans ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Backoff exponentiel
      }
    }
  }
  
  throw lastError;
};

// Export du client configuré
export default apiClient;