import axios from 'axios';

// Configuration de base de l'API client
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Intercepteur pour gérer les réponses et erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 et pas déjà tenté de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (typeof window !== 'undefined') {
          const refreshToken = localStorage.getItem('refresh-token');
          
          if (refreshToken) {
            // Tentative de refresh du token
            const response = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/refresh`,
              { refreshToken }
            );

            const { token } = response.data.data;
            localStorage.setItem('auth-token', token);

            // Retry de la requête originale avec le nouveau token
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh échoué, rediriger vers login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('refresh-token');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Fonction utilitaire pour gérer les erreurs API
export const handleApiError = (error: unknown): string => {
  console.error('API Error:', error);

  if (axios.isAxiosError(error)) {
    // Erreur de réponse du serveur
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return data?.message || 'Données invalides';
        case 401:
          return 'Non autorisé - Veuillez vous reconnecter';
        case 403:
          return 'Accès refusé';
        case 404:
          return 'Ressource non trouvée';
        case 409:
          return data?.message || 'Conflit - Cette action a déjà été effectuée';
        case 422:
          return data?.message || 'Erreur de validation des données';
        case 500:
          return 'Erreur interne du serveur';
        default:
          return data?.message || `Erreur HTTP ${status}`;
      }
    }
    
    // Erreur de requête (réseau, timeout, etc.)
    if (error.request) {
      if (error.code === 'ECONNABORTED') {
        return 'Délai d\'attente dépassé - Vérifiez votre connexion';
      }
      return 'Erreur de connexion - Vérifiez votre réseau';
    }
  }

  // Erreur générique
  if (error instanceof Error) {
    return error.message;
  }

  return 'Une erreur inattendue s\'est produite';
};