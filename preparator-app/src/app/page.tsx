// ===== @/app/page.tsx =====
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { Loader2, Car } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Vérifier l'authentification au chargement
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Redirection après vérification de l'auth
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Écran de chargement pendant la vérification
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
          <Car className="w-10 h-10 text-white" />
        </div>
        
        {/* Texte et chargement */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Prep</h1>
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Vérification de l'authentification...</span>
          </div>
        </div>
        
        {/* Indicateur de progression */}
        <div className="w-48 mx-auto">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}