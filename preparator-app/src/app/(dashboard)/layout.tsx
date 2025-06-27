'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Header } from '@/components/layout/Header';
import { useAuthStore, useAppStore } from '@/lib/stores';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { setOnline, setIsPWA } = useAppStore();

  // Vérifier l'authentification
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirection si non authentifié
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Détection de l'état en ligne/hors ligne
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  // Détection PWA
  useEffect(() => {
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWA(isPWAMode);
  }, [setIsPWA]);

  // Afficher le spinner pendant la vérification auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Ne rien afficher si non authentifié (redirection en cours)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header fixe */}
      <Header />
      
      {/* Contenu principal avec padding pour header et navigation */}
      <main className="flex-1 pt-16 pb-20 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      
      {/* Navigation en bas fixe */}
      <BottomNavigation />
      
      {/* Overlay pour les notifications/toasts */}
      <div id="notification-portal" />
      
      {/* Indicateur hors ligne */}
      <OfflineIndicator />
    </div>
  );
}

// Composant indicateur hors ligne
function OfflineIndicator() {
  const { isOnline } = useAppStore();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-0 right-0 bg-orange-500 text-white text-center py-2 text-sm z-40">
      📡 Mode hors ligne - Les données seront synchronisées à la reconnexion
    </div>
  );
}