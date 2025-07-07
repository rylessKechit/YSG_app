'use client&apos;;

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useAuth, useAuthStore } from '@/lib/stores/auth-store';
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
  const { isAuthenticated, user, logout, setLoading, login } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔒 AuthGuard - Vérification auth...&apos;, {
        isAuthenticated,
        userRole: user?.role,
        requireAdmin
      });

      setLoading(true);
      
      try {
        // Vérifier si on a un token en localStorage
        const token = localStorage.getItem('auth-token') || localStorage.getItem('token');
        
        if (!token) {
          console.log('❌ Pas de token, redirection login&apos;);
          router.push('/login');
          return;
        }

        // Si pas d'utilisateur en store, vérifier avec l'API
        if (!isAuthenticated || !user) {
          console.log('🔄 Pas d\&apos;utilisateur en store, vérification API...&apos;);
          
          try {
            // Récupérer le profil utilisateur
            const profileResponse = await authApi.getProfile();
            
            console.log('📥 Réponse API profil:&apos;, profileResponse);
            
            // FIX TYPESCRIPT: Accès correct aux données selon la structure backend
            if (profileResponse.success && profileResponse.data?.user) {
              console.log('✅ Profil récupéré:&apos;, profileResponse.data.user);
              
              // Mettre à jour le store avec les données du profil
              // La structure retournée est: ApiResponse<{ user: User }>
              login(profileResponse.data.user, token);
            } else {
              throw new Error('Profil non récupéré&apos;);
            }
          } catch (error) {
            console.error('❌ Erreur récupération profil:&apos;, error);
            logout();
            router.push('/login');
            return;
          }
        }

        // Attendre que le store soit mis à jour
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Récupérer l'utilisateur mis à jour - FIX TYPESCRIPT'
        const authStore = useAuthStore.getState();
        const currentUser = authStore.user;
        
        console.log('🔍 Vérification permissions:&apos;, {
          requireAdmin,
          userRole: currentUser?.role,
          isAdmin: currentUser?.role === &apos;admin'
        });

        // Vérifier les permissions admin si requis
        if (requireAdmin && currentUser?.role !== &apos;admin') {
          console.log('❌ Permission admin requise mais utilisateur n\&apos;est pas admin&apos;);
          router.push('/unauthorized');
          return;
        }

        console.log('✅ AuthGuard validé avec succès&apos;);

      } catch (error) {
        console.error('💥 Erreur vérification auth:&apos;, error);
        logout();
        router.push('/login');
      } finally {
        setIsChecking(false);
        setLoading(false);
      }
    };

    checkAuth();
  }, [isAuthenticated, user, requireAdmin, router, logout, setLoading, login]);

  // Affichage pendant la vérification
  if (isChecking) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Vérification de l&apos;authentification...</p>
          {process.env.NODE_ENV === &apos;development' && (
            <p className="text-xs text-gray-400 mt-2">
              Auth: {isAuthenticated ? &apos;Oui' : 'Non'} | 
              User: {user?.email || 'Aucun'} | 
              Role: {user?.role || 'Aucun'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Si pas authentifié, on ne rend rien (redirection en cours)
  if (!isAuthenticated || !user) {
    console.log('❌ Pas authentifié ou pas d\&apos;utilisateur');
    return null;
  }

  // Si admin requis mais utilisateur pas admin
  if (requireAdmin && user.role !== &apos;admin') {
    console.log('❌ Admin requis mais rôle:&apos;, user.role);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Vous n&apos;avez pas les permissions pour accéder à cette page.</p>
          <p className="text-sm text-gray-400 mt-2">Rôle actuel: {user.role}</p>
        </div>
      </div>
    );
  }

  console.log('✅ AuthGuard OK, rendu enfants&apos;);
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

    if (requireAdmin && user?.role !== &apos;admin') {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, user, requireAdmin, router]);

  return { isAuthenticated, user };
}