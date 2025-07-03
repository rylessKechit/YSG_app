import { create } from 'zustand';

// Types pour les notifications
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
  isRead?: boolean;
}

// Types pour les paramètres de l'app
interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'fr' | 'en';
  notifications: {
    push: boolean;
    email: boolean;
    sound: boolean;
  };
}

// État de l'application
interface AppState {
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Interface
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  isOnline: boolean;
  
  // Paramètres
  settings: AppSettings;
  
  // Loading states globaux
  globalLoading: boolean;
  loadingMessage: string;
}

// Actions du store
interface AppStore extends AppState {
  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Interface
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setOnlineStatus: (isOnline: boolean) => void;
  
  // Paramètres
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

// Paramètres par défaut
const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'fr',
  notifications: {
    push: true,
    email: false,
    sound: true
  }
};

// Création du store
export const useAppStore = create<AppStore>((set, get) => ({
  // État initial
  notifications: [],
  unreadCount: 0,
  sidebarOpen: false,
  mobileMenuOpen: false,
  isOnline: true,
  settings: defaultSettings,
  globalLoading: false,
  loadingMessage: '',

  // Ajouter une notification
  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();
    
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp,
      isRead: false,
      duration: notification.duration || 5000
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications.slice(0, 49)], // Garder max 50 notifications
      unreadCount: state.unreadCount + 1
    }));

    console.log(`📬 Notification ajoutée [${notification.type}]:`, notification.message);

    // Auto-suppression après la durée spécifiée
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }
  },

  // Supprimer une notification
  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find(n => n.id === id);
      const wasUnread = notification && !notification.isRead;
      
      return {
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      };
    });

    console.log(`🗑️ Notification supprimée: ${id}`);
  },

  // Marquer une notification comme lue
  markNotificationAsRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      );
      
      const notification = state.notifications.find(n => n.id === id);
      const wasUnread = notification && !notification.isRead;
      
      return {
        notifications,
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      };
    });

    console.log(`👁️ Notification marquée comme lue: ${id}`);
  },

  // Supprimer toutes les notifications
  clearAllNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0
    });

    console.log('🧹 Toutes les notifications supprimées');
  },

  // Basculer la sidebar
  toggleSidebar: () => {
    set((state) => ({
      sidebarOpen: !state.sidebarOpen
    }));
  },

  // Basculer le menu mobile
  toggleMobileMenu: () => {
    set((state) => ({
      mobileMenuOpen: !state.mobileMenuOpen
    }));
  },

  // Définir le statut en ligne
  setOnlineStatus: (isOnline) => {
    const wasOffline = !get().isOnline;
    
    set({ isOnline });

    // Notification de changement de statut
    if (wasOffline && isOnline) {
      get().addNotification({
        type: 'success',
        title: 'Connexion rétablie',
        message: 'Vous êtes de nouveau en ligne',
        duration: 3000
      });
    } else if (!isOnline) {
      get().addNotification({
        type: 'warning',
        title: 'Connexion perdue',
        message: 'Vous êtes hors ligne',
        duration: 5000
      });
    }

    console.log(`🌐 Statut connexion: ${isOnline ? 'En ligne' : 'Hors ligne'}`);
  },

  // Mettre à jour les paramètres
  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }));

    console.log('⚙️ Paramètres mis à jour:', newSettings);
  },

  // Définir le loading global
  setGlobalLoading: (loading, message = '') => {
    set({
      globalLoading: loading,
      loadingMessage: message
    });

    if (loading) {
      console.log(`⏳ Loading global: ${message}`);
    } else {
      console.log('✅ Loading global terminé');
    }
  }
}));

// Hook pour les notifications toast
export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, markNotificationAsRead } = useAppStore();
  
  return {
    notifications,
    addNotification,
    removeNotification,
    markNotificationAsRead,
    // Helpers
    success: (title: string, message: string, duration?: number) => 
      addNotification({ type: 'success', title, message, duration }),
    error: (title: string, message: string, duration?: number) => 
      addNotification({ type: 'error', title, message, duration: duration || 8000 }),
    warning: (title: string, message: string, duration?: number) => 
      addNotification({ type: 'warning', title, message, duration }),
    info: (title: string, message: string, duration?: number) => 
      addNotification({ type: 'info', title, message, duration })
  };
};

// Hook pour détecter le statut de connexion
export const useNetworkStatus = () => {
  const { isOnline, setOnlineStatus } = useAppStore();
  
  // Effet pour écouter les changements de connexion
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setOnlineStatus(true));
    window.addEventListener('offline', () => setOnlineStatus(false));
  }
  
  return isOnline;
};