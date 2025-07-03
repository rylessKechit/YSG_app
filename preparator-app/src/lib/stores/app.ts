import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface AppState {
  // Notifications
  notifications: Notification[];
  
  // États globaux
  isOnline: boolean;
  lastSync: string | null;
  
  // Configuration
  theme: 'light' | 'dark';
  language: 'fr' | 'en';
}

interface AppStore extends AppState {
  // Actions notifications
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Actions états
  setOnlineStatus: (online: boolean) => void;
  updateLastSync: () => void;
  
  // Actions configuration
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'fr' | 'en') => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // État initial
      notifications: [],
      isOnline: true,
      lastSync: null,
      theme: 'light',
      language: 'fr',

      // Ajouter une notification
      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification = {
          ...notification,
          id,
          duration: notification.duration || 5000 // 5 secondes par défaut
        };
        
        set((state) => ({
          notifications: [...state.notifications, newNotification]
        }));
      },

      // Supprimer une notification
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },

      // Vider toutes les notifications
      clearNotifications: () => {
        set({ notifications: [] });
      },

      // Mettre à jour le statut en ligne
      setOnlineStatus: (online) => {
        set({ isOnline: online });
        
        if (online) {
          get().addNotification({
            type: 'success',
            title: 'Connexion rétablie',
            message: 'Vous êtes de nouveau en ligne',
            duration: 3000
          });
        } else {
          get().addNotification({
            type: 'warning',
            title: 'Connexion perdue',
            message: 'Vous êtes hors ligne. Certaines fonctions peuvent être limitées.',
            duration: 5000
          });
        }
      },

      // Mettre à jour la dernière synchronisation
      updateLastSync: () => {
        set({ lastSync: new Date().toISOString() });
      },

      // Changer le thème
      setTheme: (theme) => {
        set({ theme });
        
        // Appliquer le thème à l'élément root
        if (typeof window !== 'undefined') {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },

      // Changer la langue
      setLanguage: (language) => {
        set({ language });
      }
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        lastSync: state.lastSync
      }),
    }
  )
);