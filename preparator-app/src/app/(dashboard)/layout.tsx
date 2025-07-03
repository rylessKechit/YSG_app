'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, token, user, isLoading } = useAuthStore();
  const router = useRouter();

  // Vérifier l'authentification et rediriger si nécessaire
  useEffect(() => {
    if (!isLoading && (!token || !isAuthenticated || !user)) {
      console.log('🔒 Non authentifié, redirection vers /login');
      router.push('/login');
      return;
    }

    if (token && isAuthenticated) {
      const { apiClient } = require('@/lib/api/client');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('✅ Token restauré dans les headers');
    }
  }, [isAuthenticated, token, user, isLoading, router]);

  // Afficher un loader pendant la vérification
  if (isLoading || (!isAuthenticated && token)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Si pas authentifié, ne rien afficher (redirection en cours)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Afficher le contenu sans wrapper supplémentaire
  return <>{children}</>;
}