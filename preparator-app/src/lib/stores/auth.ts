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
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true, // ← Important : commencer par true
      error: null,

      login: async (credentials: LoginFormData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(credentials);
          const { token, user } = response;

          // Sauvegarder dans localStorage ET dans le store
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-token', token);
            localStorage.setItem('auth-user', JSON.stringify(user));
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

      initializeAuth: () => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('auth-token');
        const userStr = localStorage.getItem('auth-user');

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            console.log('🔄 Authentification restaurée depuis localStorage');
            
            // Vérifier en arrière-plan que le token est toujours valide
            get().checkAuth();
          } catch (error) {
            console.error('❌ Erreur parsing user localStorage');
            get().logout();
          }
        } else {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      checkAuth: async () => {
        const currentState = get();
        
        // Si pas de token, ne pas faire d'appel API
        if (!currentState.token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        try {
          const user = await authApi.getProfile();
          
          // Mettre à jour localStorage avec les nouvelles données
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth-user', JSON.stringify(user));
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          console.log('✅ Token vérifié et profil mis à jour');
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
      // Persister seulement les données essentielles
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      // Callback après restauration du store
      onRehydrateStorage: () => (state) => {
        console.log('🔄 Store Zustand restauré');
        if (state?.user?.firstName) {
          console.log('👤 Utilisateur trouvé:', state.user.firstName);
        }
        
        // Initialiser l'authentification après la restauration
        setTimeout(() => {
          useAuthStore.getState().initializeAuth();
        }, 100);
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