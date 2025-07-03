'use client';

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';
import { useAppStore } from '@/lib/stores/app';

// CORRIGÉ: Définition du type Notification
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  read?: boolean;
  actions?: NotificationAction[];
  createdAt: Date;
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

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
          getIcon={getIcon}
          getStyles={getStyles}
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
}

function NotificationItem({ notification, onRemove, getIcon, getStyles }: NotificationItemProps) {
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
        transform translate-x-0 opacity-100 animate-in slide-in-from-right-2
        ${getStyles(notification.type)}
      `}
      style={{
        animation: 'slideInFromRight 0.3s ease-out'
      }}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="text-sm mt-1 opacity-90">{notification.message}</p>
          
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
                    px-3 py-1 rounded text-xs font-medium transition-colors
                    ${action.variant === 'destructive' 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-white/20 hover:bg-white/30'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={() => onRemove(notification.id)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}