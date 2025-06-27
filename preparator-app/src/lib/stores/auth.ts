import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, handleApiError } from '../api';
import { User, LoginFormData, AuthState } from '../types';

interface AuthStore extends AuthState {
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
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginFormData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(credentials);
          const { token, user } = response;

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

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-user');
        }

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
          get().logout();
        }
      },

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

      clearError: () => {
        set({ error: null });
      },

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

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, isLoading, error };
};

export const useAuthActions = () => {
  const { login, logout, refreshToken, checkAuth, clearError } = useAuthStore();
  return { login, logout, refreshToken, checkAuth, clearError };
};