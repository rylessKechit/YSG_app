import axios from 'axios';

// Configuration de base de l'API client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Créer l'instance axios
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 secondes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour les requêtes (ajout automatique du token)
apiClient.interceptors.request.use(
  (config) => {
    // Le token est déjà ajouté par le store auth, mais on peut faire des logs ici
    console.log(`🌐 Requête API: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Ajouter timestamp pour debugging
    if (process.env.NODE_ENV === 'development') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur requête API:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses (gestion des erreurs globales)
apiClient.interceptors.response.use(
  (response) => {
    // Log des réponses en mode développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Réponse API: ${response.status}`, response.data);
    }
    
    return response;
  },
  (error) => {
    // Gestion centralisée des erreurs
    console.error('❌ Erreur réponse API:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
      method: error.config?.method
    });

    // Gestion spécifique des codes d'erreur
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      console.warn('🔑 Token invalide ou expiré');
      
      // Supprimer le token des headers
      delete apiClient.defaults.headers.common['Authorization'];
      
      // Rediriger vers login si on n'y est pas déjà
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // Accès refusé
      console.warn('🚫 Accès refusé');
    } else if (error.response?.status >= 500) {
      // Erreur serveur
      console.error('🔥 Erreur serveur:', error.response?.data);
    }

    return Promise.reject(error);
  }
);

// Fonction utilitaire pour gérer les erreurs d'API
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Données de requête invalides';
      case 401:
        return 'Authentification requise';
      case 403:
        return 'Accès refusé';
      case 404:
        return 'Ressource non trouvée';
      case 422:
        return 'Données invalides';
      case 429:
        return 'Trop de requêtes, réessayez plus tard';
      case 500:
        return 'Erreur interne du serveur';
      case 502:
        return 'Serveur indisponible';
      case 503:
        return 'Service temporairement indisponible';
      default:
        return `Erreur ${error.response.status}`;
    }
  } else {
    return 'Erreur de connexion';
  }
};

// Fonction utilitaire pour vérifier la connectivité réseau
export const checkNetworkConnection = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; // Assume connection on server
};

// Types pour les réponses d'API standardisées
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Configuration des headers par défaut selon l'environnement
if (process.env.NODE_ENV === 'development') {
  // Headers de développement
  apiClient.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  apiClient.defaults.headers.common['X-Client'] = 'vehicle-prep-frontend';
}

export default apiClient;