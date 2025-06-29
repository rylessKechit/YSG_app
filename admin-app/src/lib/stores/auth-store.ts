import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { setAuthToken, clearAuthTokens } from '@/lib/api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  
  // Getters
  isAdmin: () => boolean;
  getUserFullName: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user: User, token: string, refreshToken?: string) => {
        console.log('🔑 Login store:', {
          email: user.email,
          role: user.role,
          tokenPreview: token.substring(0, 20) + '...',
          hasRefreshToken: !!refreshToken
        });
        
        // Utiliser les fonctions du client API pour la cohérence
        setAuthToken(token);
        
        if (refreshToken) {
          localStorage.setItem('refresh-token', refreshToken);
          localStorage.setItem('refreshToken', refreshToken); // Compatibilité
        }
        
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        console.log('✅ État auth mis à jour:', {
          isAuthenticated: true,
          userRole: user.role
        });
      },

      logout: () => {
        console.log('👋 Logout depuis store...');
        
        // Utiliser la fonction du client API pour nettoyer
        clearAuthTokens();
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });

        console.log('✅ Logout terminé, état reseté');
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData };
          console.log('📝 Mise à jour utilisateur:', userData);
          
          set({
            user: updatedUser
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Getters
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      getUserFullName: () => {
        const { user } = get();
        if (!user) return '';
        return `${user.firstName} ${user.lastName}`;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Ne pas persister le token dans Zustand, il est déjà dans localStorage
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 Hydratation auth store:', {
          isAuthenticated: state?.isAuthenticated || false,
          userEmail: state?.user?.email || 'aucun'
        });
        
        // Vérifier la cohérence entre le store et localStorage
        if (typeof window !== 'undefined') {
          const tokenInStorage = localStorage.getItem('auth-token') || localStorage.getItem('token');
          if (state?.isAuthenticated && !tokenInStorage) {
            console.warn('⚠️ Incohérence détectée: store authentifié mais pas de token');
            // Forcer la déconnexion
            state.isAuthenticated = false;
            state.user = null;
          }
        }
      },
    }
  )
);

// Hook personnalisé pour l'authentification avec méthodes utilitaires
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    ...store,
    
    // Méthodes utilitaires
    hasPermission: (permission: string) => {
      return store.isAdmin(); // Pour l'instant, seuls les admins ont toutes les permissions
    },
    
    hasAgencyAccess: (agencyId: string) => {
      if (store.isAdmin()) return true;
      return store.user?.agencies.some(agency => agency.id === agencyId) || false;
    },
    
    // Vérification de cohérence auth
    checkAuthConsistency: () => {
      if (typeof window === 'undefined') return true;
      
      const tokenInStorage = localStorage.getItem('auth-token') || localStorage.getItem('token');
      const isStoredAsAuthenticated = store.isAuthenticated;
      
      if (isStoredAsAuthenticated && !tokenInStorage) {
        console.warn('⚠️ Incohérence auth détectée, déconnexion forcée');
        store.logout();
        return false;
      }
      
      return true;
    }
  };
};