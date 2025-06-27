'use client';

import { Bell, Wifi, WifiOff, User } from 'lucide-react';
import { useAuthStore, useAppStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function Header() {
  const { user } = useAuthStore();
  const { isOnline, notifications } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mise à jour de l'heure toutes les minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 safe-top">
      <div className="flex items-center justify-between px-4 h-16">
        {/* Logo et info utilisateur */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {user?.firstName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {formatTime(currentTime)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Indicateur connexion */}
          <div className="flex items-center">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Profil */}
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}