'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app';

// ✅ CORRECTION: Import du type Notification unifié
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: number; // ✅ Utilise timestamp au lieu de createdAt
  isRead?: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive';
}

export function NotificationManager() {
  const { notifications, removeNotification } = useAppStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // ✅ Fonction pour formater le temps écoulé
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    if (diffHour < 24) return `Il y a ${diffHour}h`;
    
    return new Date(timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
          getIcon={getIcon}
          getStyles={getStyles}
          formatTimeAgo={formatTimeAgo}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
  getIcon: (type: string) => React.JSX.Element;
  getStyles: (type: string) => string;
  formatTimeAgo: (timestamp: number) => string;
}

function NotificationItem({ 
  notification, 
  onRemove, 
  getIcon, 
  getStyles, 
  formatTimeAgo 
}: NotificationItemProps) {
  
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification, onRemove]);

  return (
    <div
      className={`
        w-full rounded-lg border p-4 shadow-lg transition-all duration-300 
        transform translate-x-0 opacity-100 
        ${getStyles(notification.type)}
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Icône */}
        <div className="flex-shrink-0">
          {getIcon(notification.type)}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold">
                {notification.title}
              </h4>
              <p className="mt-1 text-sm opacity-90">
                {notification.message}
              </p>
            </div>

            {/* Bouton de fermeture */}
            <button
              onClick={() => onRemove(notification.id)}
              className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Timestamp */}
          <div className="mt-2 text-xs opacity-75">
            {formatTimeAgo(notification.timestamp)}
          </div>

          {/* Actions optionnelles */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    onRemove(notification.id);
                  }}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-colors
                    ${action.variant === 'destructive' 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}