// src/lib/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (user: User, token: string, refreshToken: string) => void;
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

      login: (user: User, token: string, refreshToken: string) => {
        // Stocker dans localStorage
        localStorage.setItem('auth-token', token);
        localStorage.setItem('refresh-token', refreshToken);
        
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        // Nettoyer localStorage
        localStorage.removeItem('auth-token');
        localStorage.removeItem('refresh-token');
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
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
      }),
    }
  )
);

// Hook personnalisé pour l'authentification
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
  };
};