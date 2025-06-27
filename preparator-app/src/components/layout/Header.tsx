'use client';

import { useState } from 'react';
import { Menu, X, Bell, Wifi, WifiOff, Settings, LogOut, User, Clock, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/button';

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline] = useState(true); // À connecter à votre store réseau

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const menuItems = [
    { icon: Clock, label: 'Pointages', href: '/timesheets' },
    { icon: Car, label: 'Préparations', href: '/preparations' },
    { icon: User, label: 'Profil', href: '/profile' },
    { icon: Settings, label: 'Paramètres', href: '/settings' },
  ];

  if (!user) {
    return (
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
          <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Menu hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(true)}
            className="text-gray-700"
          >
            <Menu className="w-6 h-6" />
          </Button>

          {/* Logo/Titre */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <span className="font-semibold text-gray-900">Vehicle Prep</span>
          </div>

          {/* Actions droite */}
          <div className="flex items-center space-x-2">
            {/* Indicateur connexion */}
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                2
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Menu slide-in */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform">
            <div className="p-4">
              {/* Header du menu */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Profil utilisateur */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{user.role}</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        router.push(item.href);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Icon className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-700">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Déconnexion */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-3 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}