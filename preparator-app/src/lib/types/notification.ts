// =====================================================
// FICHIER: preparator-app/src/lib/types/notification.ts
// ✅ TYPE NOTIFICATION UNIFIÉ POUR TOUT LE PROJET
// =====================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number; // ✅ Propriété principale (millisecondes)
  createdAt?: Date;   // ✅ Propriété optionnelle pour compatibilité
  isRead?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive';
}

// ===== TYPES POUR LES STORES =====

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

export interface NotificationActions {
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
}

// ===== UTILITAIRES =====

/**
 * Crée une nouvelle notification avec ID et timestamp automatiques
 */
export function createNotification(
  notification: Omit<Notification, 'id' | 'timestamp'>
): Notification {
  return {
    ...notification,
    id: Math.random().toString(36).substring(2, 15),
    timestamp: Date.now(),
    createdAt: new Date(),
    isRead: false
  };
}

/**
 * Formate le timestamp d'une notification
 */
export function formatNotificationTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  if (diffDay < 7) return `Il y a ${diffDay}j`;
  
  return new Date(timestamp).toLocaleDateString('fr-FR');
}