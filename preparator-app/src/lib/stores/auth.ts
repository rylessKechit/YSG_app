import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

// Types pour le store Auth
interface Agency {
  id: string;
  name: string;
  code: string;
  client: string;
  isDefault?: boolean;
  isActive: boolean;
  createdAt: string;
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
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginAttempts: number;
  lastLoginAttempt: Date | null;
}

interface LoginFormData {
  email: string;
  password: string;
}

interface AuthStore extends AuthState {
  login: (credentials: LoginFormData) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
  checkTokenExpiry: () => boolean;
  resetLoginAttempts: () => void;
}

// API pour l'authentification
const authApi = {
  login: async (credentials: LoginFormData) => {
    try {
      console.log('🔑 Tentative de connexion...', credentials.email);
      
      const response = await apiClient.post('/auth/login', {
        email: credentials.email,
        password: credentials.password
      });

      console.log('✅ Réponse API login:', response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur de connexion');
      }

      return {
        user: response.data.data.user,
        token: response.data.data.token
      };

    } catch (error: any) {
      console.error('❌ Erreur login API:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Email ou mot de passe incorrect');
      } else if (error.response?.status === 403) {
        throw new Error('Compte désactivé. Contactez votre administrateur.');
      } else if (error.response?.status >= 500) {
        throw new Error('Erreur serveur. Veuillez réessayer.');
      }
      
      throw new Error(error.response?.data?.message || 'Erreur de connexion');
    }
  },

  refreshToken: async (token: string) => {
    try {
      console.log('🔄 Rafraîchissement du token...');
      
      const response = await apiClient.post('/auth/refresh', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.data?.success) {
        throw new Error('Token invalide');
      }

      return {
        user: response.data.data.user,
        token: response.data.data.token
      };

    } catch (error: any) {
      console.error('❌ Erreur refresh token:', error);
      throw new Error('Session expirée');
    }
  },

  getProfile: async (token: string) => {
    try {
      console.log('👤 Récupération du profil...');
      
      const response = await apiClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.data?.success) {
        throw new Error('Erreur récupération profil');
      }

      return response.data.data.user;

    } catch (error: any) {
      console.error('❌ Erreur get profile:', error);
      throw new Error('Erreur récupération profil');
    }
  }
};

// Store Zustand
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

      // Connexion
      login: async (credentials: LoginFormData) => {
        set({ isLoading: true, error: null });

        try {
          // Vérifier les tentatives de connexion
          const { loginAttempts, lastLoginAttempt } = get();
          const now = new Date();
          
          if (loginAttempts >= 5 && lastLoginAttempt) {
            const timeDiff = now.getTime() - lastLoginAttempt.getTime();
            if (timeDiff < 15 * 60 * 1000) { // 15 minutes
              throw new Error('Trop de tentatives de connexion. Réessayez dans 15 minutes.');
            } else {
              // Reset des tentatives après 15 minutes
              set({ loginAttempts: 0, lastLoginAttempt: null });
            }
          }

          console.log('🔐 Connexion en cours...');
          const { user, token } = await authApi.login(credentials);

          // Configurer le token pour les requêtes suivantes
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            loginAttempts: 0,
            lastLoginAttempt: null
          });

          console.log('✅ Connexion réussie:', user);

        } catch (error: any) {
          console.error('❌ Erreur connexion:', error);
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message,
            loginAttempts: get().loginAttempts + 1,
            lastLoginAttempt: new Date()
          });

          throw error;
        }
      },

      // Déconnexion
      logout: () => {
        console.log('🚪 Déconnexion...');
        
        // Nettoyer le token des headers
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

        console.log('✅ Déconnexion réussie');
      },

      // Rafraîchir l'authentification
      refreshAuth: async () => {
        const { token } = get();
        
        if (!token) {
          throw new Error('Aucun token disponible');
        }

        set({ isLoading: true, error: null });

        try {
          console.log('🔄 Rafraîchissement de l\'authentification...');
          const { user, token: newToken } = await authApi.refreshToken(token);

          // Mettre à jour le token
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

          set({
            user,
            token: newToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          console.log('✅ Authentification rafraîchie');

        } catch (error: any) {
          console.error('❌ Erreur rafraîchissement auth:', error);
          
          // Déconnecter en cas d'erreur
          get().logout();
          throw error;
        }
      },

      // Mettre à jour l'utilisateur
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          });
          console.log('✅ Utilisateur mis à jour:', userData);
        }
      },

      // Nettoyer les erreurs
      clearError: () => {
        set({ error: null });
      },

      // Vérifier l'expiration du token
      checkTokenExpiry: () => {
        const { token } = get();
        
        if (!token) {
          return false;
        }

        try {
          // Décoder le JWT pour vérifier l'expiration
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Date.now() / 1000;
          
          if (payload.exp < now) {
            console.warn('⚠️ Token expiré');
            get().logout();
            return false;
          }
          
          return true;
        } catch (error) {
          console.error('❌ Erreur vérification token:', error);
          get().logout();
          return false;
        }
      },

      // Reset des tentatives de connexion
      resetLoginAttempts: () => {
        set({ loginAttempts: 0, lastLoginAttempt: null });
        console.log('🔄 Tentatives de connexion réinitialisées');
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.isAuthenticated) {
          // Restaurer le token dans les headers
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
          
          // Vérifier l'expiration du token
          if (!state.checkTokenExpiry()) {
            console.warn('⚠️ Token expiré lors de la réhydratation');
            state.logout();
          } else {
            console.log('✅ Authentification restaurée depuis le localStorage');
          }
        }
      }
    }
  )
);