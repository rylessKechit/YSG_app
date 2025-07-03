'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';

export default function HomePage() {
  const { isAuthenticated, token, user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Si l'utilisateur est authentifié, rediriger vers le dashboard
    if (isAuthenticated && user && token) {
      console.log('✅ Utilisateur authentifié, redirection vers dashboard');
      router.replace('/dashboard');
      return;
    }

    // Si pas d'authentification et pas en cours de chargement, rediriger vers login
    if (!isLoading && !isAuthenticated) {
      console.log('🔒 Utilisateur non authentifié, redirection vers login');
      router.replace('/login');
      return;
    }
  }, [isAuthenticated, user, token, isLoading, router]);

  // Afficher un loader pendant la vérification de l'authentification
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
          <div className="w-10 h-10 text-white">
            🚗
          </div>
        </div>
        
        {/* Titre */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Prep</h1>
          <p className="text-gray-600">Application préparateurs SIXT</p>
        </div>

        {/* Loader */}
        <div className="space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">
            {isLoading ? 'Vérification de l\'authentification...' : 'Redirection...'}
          </p>
        </div>
      </div>
    </div>
  );
}