import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification, ThemeMode } from '../types';

interface AppState {
  // Thème
  theme: ThemeMode;
  
  // Notifications
  notifications: Notification[];
  
  // État de connexion
  isOnline: boolean;
  
  // État global de chargement
  isLoading: boolean;
  
  // Erreur globale
  error: string | null;
  
  // Paramètres utilisateur
  userPreferences: {
    language: 'fr' | 'en';
    autoRefresh: boolean;
    soundEnabled: boolean;
  };
}

interface AppStore extends AppState {
  // Actions thème
  setTheme: (theme: ThemeMode) => void;
  
  // Actions notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Actions état réseau
  setOnlineStatus: (isOnline: boolean) => void;
  
  // Actions chargement global
  setLoading: (isLoading: boolean) => void;
  
  // Actions erreur globale
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Actions préférences
  updateUserPreferences: (preferences: Partial<AppState['userPreferences']>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // État initial
      theme: 'system',
      notifications: [],
      isOnline: true,
      isLoading: false,
      error: null,
      userPreferences: {
        language: 'fr',
        autoRefresh: true,
        soundEnabled: true,
      },

      // Actions thème
      setTheme: (theme: ThemeMode) => {
        set({ theme });
        
        // Appliquer le thème au DOM
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          
          if (theme === 'dark') {
            root.classList.add('dark');
          } else if (theme === 'light') {
            root.classList.remove('dark');
          } else {
            // Système - détecter la préférence du système
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (systemPrefersDark) {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          }
        }
      },

      // Actions notifications
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 10) // Limiter à 10 notifications
        }));
        
        // Auto-remove après durée si spécifiée
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(newNotification.id);
          }, notification.duration);
        }
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter(notification => notification.id !== id)
        }));
      },

      markNotificationAsRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
          )
        }));
      },

      clearAllNotifications: () => {
        set({ notifications: [] });
      },

      // Actions état réseau
      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
        
        if (isOnline) {
          get().addNotification({
            type: 'success',
            title: 'Connexion rétablie',
            message: 'Vous êtes de nouveau en ligne',
            duration: 3000
          });
        } else {
          get().addNotification({
            type: 'warning',
            title: 'Hors ligne',
            message: 'Vérifiez votre connexion internet',
            duration: 5000
          });
        }
      },

      // Actions chargement global
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      // Actions erreur globale
      setError: (error: string | null) => {
        set({ error });
        
        if (error) {
          get().addNotification({
            type: 'error',
            title: 'Erreur',
            message: error,
            duration: 5000
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      // Actions préférences
      updateUserPreferences: (preferences) => {
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            ...preferences
          }
        }));
      }
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        theme: state.theme,
        userPreferences: state.userPreferences
      })
    }
  )
);

// Export du type Notification pour les autres composants
export type { Notification } from '../types';