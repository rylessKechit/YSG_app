import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react'; // CORRIGÉ: Import React useEffect
import { apiClient } from '../api/client';

// CORRIGÉ: Interfaces complètes
interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
  isActive: boolean;
  createdAt: Date;
}

interface UserStats {
  totalPreparations: number;
  onTimeRate: number;
  averageTime: number;
  lastCalculated: string | null;
  thisWeekPreparations?: number;
  thisMonthPreparations?: number;
  qualityScore?: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: 'preparateur' | 'superviseur' | 'admin';
  agencies: Agency[];
  stats?: UserStats;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

interface AuthState {
  // Données utilisateur
  user: User | null;
  token: string | null;
  
  // États
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Tentatives de connexion
  loginAttempts: number;
  lastLoginAttempt: Date | null;
}

interface LoginFormData {
  email: string;
  password: string;
}

interface AuthStore extends AuthState {
  // Actions d'authentification
  login: (credentials: LoginFormData) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  
  // Actions utilisateur
  updateUser: (userData: Partial<User>) => void;
  
  // Gestion des erreurs
  clearError: () => void;
  
  // Utilitaires
  checkTokenExpiry: () => boolean;
  resetLoginAttempts: () => void;
}

// CORRIGÉ: Vraie API utilisant le client API configuré
const authApi = {
  login: async (credentials: LoginFormData) => {
    try {
      console.log('🔑 Tentative de connexion avec API réelle...', credentials.email);
      
      const response = await apiClient.post('/auth/login', {
        email: credentials.email,
        password: credentials.password
      });

      console.log('✅ Réponse API login:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur de connexion');
      }

      return {
        user: response.data.data.user,
        token: response.data.data.token
      };
    } catch (error: any) {
      console.error('❌ Erreur API login:', error.response?.data || error.message);
      
      // Extraire le message d'erreur du backend
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Erreur de connexion';
      
      throw new Error(errorMessage);
    }
  },
  
  getProfile: async (token: string) => {
    try {
      const response = await apiClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur récupération profil');
      }

      return response.data.data.user;
    } catch (error: any) {
      console.error('❌ Erreur API getProfile:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erreur récupération profil');
    }
  },

  refreshToken: async (token: string) => {
    try {
      const response = await apiClient.post('/auth/refresh', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur rafraîchissement token');
      }

      return {
        token: response.data.data.token,
        user: response.data.data.user
      };
    } catch (error: any) {
      console.error('❌ Erreur API refreshToken:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Erreur rafraîchissement token');
    }
  }
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // État initial
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      loginAttempts: 0,
      lastLoginAttempt: null,

      // Connexion avec vraie API
      login: async (credentials: LoginFormData) => {
        const state = get();
        
        // Vérifier les tentatives de connexion (protection brute force)
        if (state.loginAttempts >= 5) {
          const timeSinceLastAttempt = state.lastLoginAttempt 
            ? Date.now() - state.lastLoginAttempt.getTime()
            : 0;
          
          if (timeSinceLastAttempt < 15 * 60 * 1000) { // 15 minutes
            set({ error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' });
            return;
          } else {
            set({ loginAttempts: 0 });
          }
        }

        set({ 
          isLoading: true, 
          error: null,
          loginAttempts: state.loginAttempts + 1,
          lastLoginAttempt: new Date()
        });

        try {
          // CORRIGÉ: Utiliser la vraie API
          const response = await authApi.login(credentials);
          
          // Configurer le token pour les futures requêtes
          if (response.token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
          }
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            loginAttempts: 0, // Reset sur succès
            lastLoginAttempt: null
          });

          console.log('✅ Connexion réussie:', response.user.firstName);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });
          console.error('❌ Erreur connexion:', errorMessage);
          throw error;
        }
      },

      // Déconnexion
      logout: () => {
        // Supprimer le token des headers par défaut
        delete apiClient.defaults.headers.common['Authorization'];
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          loginAttempts: 0,
          lastLoginAttempt: null
        });
        console.log('🔐 Déconnexion effectuée');
      },

      // Rafraîchir l'authentification
      refreshAuth: async () => {
        const { token } = get();
        
        if (!token) {
          get().logout();
          return;
        }

        set({ isLoading: true });

        try {
          const response = await authApi.refreshToken(token);
          
          // Mettre à jour le token dans les headers
          if (response.token) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
          }
          
          set({
            token: response.token,
            user: response.user,
            isLoading: false,
            error: null
          });

          console.log('🔄 Token rafraîchi avec succès');
        } catch (error) {
          console.error('❌ Erreur rafraîchissement token:', error);
          get().logout();
        }
      },

      // Mettre à jour les données utilisateur
      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              ...userData,
              updatedAt: new Date()
            }
          });
        }
      },

      // Nettoyer les erreurs
      clearError: () => {
        set({ error: null });
      },

      // Vérifier l'expiration du token
      checkTokenExpiry: () => {
        const { token } = get();
        if (!token) return false;

        try {
          // Décoder le JWT pour vérifier l'expiration
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Date.now() / 1000;
          
          if (payload.exp < currentTime) {
            console.log('🔑 Token expiré');
            get().refreshAuth();
            return false;
          }
          
          return true;
        } catch (error) {
          console.error('❌ Erreur vérification token:', error);
          return false;
        }
      },

      // Reset des tentatives de connexion
      resetLoginAttempts: () => {
        set({ 
          loginAttempts: 0, 
          lastLoginAttempt: null 
        });
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loginAttempts: state.loginAttempts,
        lastLoginAttempt: state.lastLoginAttempt
      }),
      onRehydrateStorage: () => (state) => {
        // Restaurer le token dans les headers après rechargement
        if (state?.token) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      }
    }
  )
);

// CORRIGÉ: Hook pour initialiser l'authentification avec import correct
export const useAuthInit = () => {
  const { token, user, isAuthenticated, checkTokenExpiry, logout } = useAuthStore();

  // CORRIGÉ: Utilisation correcte de useEffect
  useEffect(() => {
    if (token && user && isAuthenticated) {
      // Restaurer le token dans les headers
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Vérifier l'expiration
      const isValid = checkTokenExpiry();
      if (!isValid) {
        logout();
      }
    }
  }, [token, user, isAuthenticated, checkTokenExpiry, logout]);
};

// Export des types pour utilisation ailleurs
export type { User, Agency, UserStats, AuthStore, LoginFormData };