import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, ThemeMode, Notification } from '../types';

interface AppStore extends AppState {
  // Navigation
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // État de l'app
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setOnline: (online: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  
  // PWA
  isPWA: boolean;
  setIsPWA: (isPWA: boolean) => void;
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // État initial
      isLoading: false,
      error: null,
      isOnline: true,
      theme: 'system',
      currentTab: 'dashboard',
      notifications: [],
      isPWA: false,
      deferredPrompt: null,

      // Navigation
      setCurrentTab: (tab: string) => {
        set({ currentTab: tab });
      },

      // Notifications
      addNotification: (notification) => {
        const newNotification: Notification = {
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
          ...notification
        };

        set(state => ({
          notifications: [...state.notifications, newNotification]
        }));

        // Auto-remove après duration
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(newNotification.id);
          }, notification.duration);
        }
      },

      removeNotification: (id: string) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      // État de l'app
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setOnline: (online: boolean) => {
        set({ isOnline: online });
      },

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
            // System preference
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isDark) {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          }
        }
      },

      // PWA
      setIsPWA: (isPWA: boolean) => {
        set({ isPWA });
      },

      setDeferredPrompt: (prompt: any) => {
        set({ deferredPrompt: prompt });
      }
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
        currentTab: state.currentTab
      })
    }
  )
);