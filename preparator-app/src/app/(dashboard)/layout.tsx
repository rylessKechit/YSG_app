'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { Header } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  // Initialiser l'authentification au montage du composant
  useEffect(() => {
    initializeAuth();
  }, []); // Une seule fois au montage

  // Rediriger vers login si pas authentifié ET pas en cours de chargement
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('🔄 Redirection vers login - non authentifié');
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Afficher un loader pendant l'initialisation/vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Ne pas afficher le contenu si pas authentifié
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec menu hamburger */}
      <Header />
      
      {/* Contenu principal avec padding pour header et navigation */}
      <main className="pt-16 pb-20 px-4">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </main>
      
      {/* Navigation en bas */}
      <BottomNavigation />
    </div>
  );
}