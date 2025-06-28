// src/components/auth/auth-guard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/lib/stores/auth-store';
import { authApi } from '@/lib/api/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  requireAdmin = false, 
  fallback 
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, logout, setLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      
      try {
        // Vérifier si on a un token en localStorage
        const token = localStorage.getItem('auth-token');
        
        if (!token) {
          router.push('/login');
          return;
        }

        // Si pas d'utilisateur en store, vérifier avec l'API
        if (!isAuthenticated || !user) {
          const isValid = await authApi.verifyAuth();
          
          if (!isValid) {
            logout();
            router.push('/login');
            return;
          }

          // Récupérer le profil utilisateur
          try {
            const profileResponse = await authApi.getProfile();
            if (profileResponse.success) {
              // Mettre à jour le store avec les données du profil
              // Note: On pourrait améliorer ça en ajoutant une méthode setUser au store
            }
          } catch (error) {
            console.error('Erreur récupération profil:', error);
          }
        }

        // Vérifier les permissions admin si requis
        if (requireAdmin && user?.role !== 'admin') {
          router.push('/unauthorized');
          return;
        }

      } catch (error) {
        console.error('Erreur vérification auth:', error);
        logout();
        router.push('/login');
      } finally {
        setIsChecking(false);
        setLoading(false);
      }
    };

    checkAuth();
  }, [isAuthenticated, user, requireAdmin, router, logout, setLoading]);

  // Affichage pendant la vérification
  if (isChecking) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Si pas authentifié, on ne rend rien (redirection en cours)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Si admin requis mais utilisateur pas admin
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook personnalisé pour protéger des composants
export function useRequireAuth(requireAdmin = false) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requireAdmin && user?.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, user, requireAdmin, router]);

  return { isAuthenticated, user };
}