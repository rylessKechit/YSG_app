import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, LoginFormData, VehicleFormData, StepCompletionData, IssueReportData } from './types';

// Configuration de base
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6000';

// Création de l'instance Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types pour les réponses spécifiques
interface AuthResponse {
  token: string;
  user: any;
}

// Intercepteur de requête pour ajouter le token
apiClient.interceptors.request.use(
  (config) => {
    // Récupérer le token depuis le localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth-token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Log en mode debug
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(`🌐 API ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse pour gérer les erreurs
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(`✅ API Response ${response.config.url}`, response.data);
    }
    return response;
  },
  (error: AxiosError) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.error(`❌ API Error ${error.config?.url}`, error.response?.data);
    }

    // Gérer les erreurs d'authentification
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');
        window.location.href = '/login';
      }
    }

    // Gérer les erreurs réseau
    if (!error.response) {
      console.error('Erreur réseau - Serveur inaccessible');
      throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion.');
    }

    return Promise.reject(error);
  }
);

// === AUTHENTIFICATION ===

export const authApi = {
  // Connexion
  login: async (credentials: LoginFormData): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', credentials);
    return response.data.data!;
  },

  // Récupérer le profil utilisateur
  getProfile: async () => {
    const response = await apiClient.get<ApiResponse>('/api/auth/me');
    return response.data.data;
  },

  // Déconnexion
  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
  },

  // Rafraîchir le token
  refreshToken: async () => {
    const response = await apiClient.post<ApiResponse>('/api/auth/refresh');
    return response.data.data;
  }
};

// === POINTAGES ===

export const timesheetApi = {
  // Statut du jour
  getTodayStatus: async (agencyId: string) => {
    const response = await apiClient.get<ApiResponse>(`/api/timesheets/today-status?agencyId=${agencyId}`);
    return response.data.data;
  },

  // Pointer l'arrivée
  clockIn: async (agencyId: string) => {
    const response = await apiClient.post<ApiResponse>('/api/timesheets/clock-in', { agencyId });
    return response.data.data;
  },

  // Pointer le départ
  clockOut: async (agencyId: string, notes?: string) => {
    const response = await apiClient.post<ApiResponse>('/api/timesheets/clock-out', { agencyId, notes });
    return response.data.data;
  },

  // Début de pause
  startBreak: async (agencyId: string) => {
    const response = await apiClient.post<ApiResponse>('/api/timesheets/break-start', { agencyId });
    return response.data.data;
  },

  // Fin de pause
  endBreak: async (agencyId: string) => {
    const response = await apiClient.post<ApiResponse>('/api/timesheets/break-end', { agencyId });
    return response.data.data;
  },

  // Historique des pointages
  getHistory: async (params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    agencyId?: string;
  } = {}) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await apiClient.get<ApiResponse>(`/api/timesheets/history?${queryParams}`);
    return response.data.data;
  }
};

// === PRÉPARATIONS ===

export const preparationApi = {
  // Récupérer les agences de l'utilisateur
  getUserAgencies: async () => {
    const response = await apiClient.get<ApiResponse>('/api/preparations/user-agencies');
    return response.data.data;
  },

  // Démarrer une préparation
  startPreparation: async (data: VehicleFormData) => {
    const response = await apiClient.post<ApiResponse>('/api/preparations/start', data);
    return response.data.data;
  },

  // Récupérer la préparation en cours
  getCurrentPreparation: async () => {
    const response = await apiClient.get<ApiResponse>('/api/preparations/current');
    return response.data.data;
  },

  // Compléter une étape avec photo
  completeStep: async (preparationId: string, data: StepCompletionData) => {
    const formData = new FormData();
    formData.append('stepType', data.stepType);
    formData.append('photo', data.photo);
    if (data.notes) formData.append('notes', data.notes);

    const response = await apiClient.put<ApiResponse>(
      `/api/preparations/${preparationId}/step`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  // Terminer une préparation
  completePreparation: async (preparationId: string, notes?: string) => {
    const response = await apiClient.post<ApiResponse>(`/api/preparations/${preparationId}/complete`, { notes });
    return response.data.data;
  },

  // Signaler un incident
  reportIssue: async (preparationId: string, data: IssueReportData) => {
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('description', data.description);
    if (data.photo) formData.append('photo', data.photo);

    const response = await apiClient.post<ApiResponse>(
      `/api/preparations/${preparationId}/issue`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  // Historique des préparations
  getHistory: async (params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    agencyId?: string;
    search?: string;
  } = {}) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await apiClient.get<ApiResponse>(`/api/preparations/history?${queryParams}`);
    return response.data.data;
  },

  // Statistiques personnelles
  getMyStats: async (params: {
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await apiClient.get<ApiResponse>(`/api/preparations/my-stats?${queryParams}`);
    return response.data.data;
  },

  // Historique d'un véhicule par plaque
  getVehicleHistory: async (licensePlate: string) => {
    const response = await apiClient.get<ApiResponse>(`/api/preparations/vehicle-history/${licensePlate}`);
    return response.data.data;
  }
};

// === PROFIL ===

export const profileApi = {
  // Dashboard personnel
  getDashboard: async () => {
    const response = await apiClient.get<ApiResponse>('/api/profile/dashboard');
    return response.data.data;
  },

  // Planning de la semaine
  getWeekSchedule: async (date?: string) => {
    const queryParams = date ? `?date=${date}` : '';
    const response = await apiClient.get<ApiResponse>(`/api/profile/schedule/week${queryParams}`);
    return response.data.data;
  },

  // Statistiques de performance
  getPerformance: async (params: {
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await apiClient.get<ApiResponse>(`/api/profile/performance?${queryParams}`);
    return response.data.data;
  }
};

// === UTILITAIRES ===

// Fonction pour vérifier la connexion au serveur
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/health');
    return true;
  } catch {
    return false;
  }
};

// Fonction pour gérer les erreurs API
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.data?.errors) {
    return error.response.data.errors.map((e: any) => e.message).join(', ');
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Une erreur inattendue s\'est produite';
};

// Export par défaut
export default apiClient;