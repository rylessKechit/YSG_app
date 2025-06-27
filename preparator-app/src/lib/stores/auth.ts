import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, handleApiError } from '../api';
import { User, LoginFormData, AuthState } from '../types';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginFormData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // État initial
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Connexion
      login: async (credentials: LoginFormData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(credentials);
          const { token, user } = response;

          // Stocker le token dans localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', token);
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          console.log('✅ Connexion réussie:', user.firstName, user.lastName);
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });
          
          console.error('❌ Erreur de connexion:', errorMessage);
          throw error;
        }
      },

      // Déconnexion
      logout: () => {
        // Nettoyer le localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-user');
        }

        // Appeler l'API de déconnexion (sans attendre)
        authApi.logout().catch(console.error);

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });

        console.log('👋 Déconnexion réussie');
      },

      // Rafraîchir le token
      refreshToken: async () => {
        try {
          const response = await authApi.refreshToken();
          const { token } = response;

          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', token);
          }

          set({ token });
          console.log('🔄 Token rafraîchi');
        } catch (error) {
          console.error('❌ Erreur rafraîchissement token:', error);
          // En cas d'erreur, déconnecter l'utilisateur
          get().logout();
        }
      },

      // Vérifier l'authentification au démarrage
      checkAuth: async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
        
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        set({ isLoading: true, token });

        try {
          const user = await authApi.getProfile();
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          console.log('✅ Authentification vérifiée:', user.firstName);
        } catch (error) {
          console.error('❌ Token invalide, déconnexion');
          get().logout();
        }
      },

      // Nettoyer les erreurs
      clearError: () => {
        set({ error: null });
      },

      // Définir l'état de chargement
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔄 Store auth rechargé:', state.user?.firstName);
        }
      }
    }
  )
);

// Hook personnalisé pour les sélecteurs fréquents
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, isLoading, error };
};

export const useAuthActions = () => {
  const { login, logout, refreshToken, checkAuth, clearError } = useAuthStore();
  return { login, logout, refreshToken, checkAuth, clearError };
};