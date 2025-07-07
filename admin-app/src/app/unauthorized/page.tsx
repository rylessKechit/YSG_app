'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/lib/stores/auth-store';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // Rediriger si pas authentifié
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null; // Redirection en cours
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {/* Icône */}
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-red-600" />
            </div>

            {/* Titre */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Accès refusé
              </h1>
              <p className="text-gray-500 mt-2">
                Vous n'avez pas les permissions nécessaires pour accéder à cette ressource.
              </p>
            </div>

            {/* Informations utilisateur */}
            {user && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Utilisateur:</span> {user.email}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Rôle:</span>{' '}
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                </p>
              </div>
            )}

            {/* Message d'explication */}
            <div className="text-sm text-gray-600">
              <p>Cette page nécessite des permissions d'administrateur.</p>
              {user?.role !== 'admin' && (
                <p className="mt-2">
                  Contactez votre administrateur système pour obtenir les accès nécessaires.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col space-y-2">
              <Button onClick={handleGoBack} variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              
              <Button onClick={handleGoHome} variant="default" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Accueil
              </Button>
              
              <Button onClick={handleLogout} variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                Se déconnecter
              </Button>
            </div>

            {/* Debug info en développement */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p className="font-medium text-yellow-800">Debug Info:</p>
                <pre className="text-yellow-700 mt-1">
                  {JSON.stringify({
                    userRole: user?.role,
                    isAuthenticated: !!user,
                    timestamp: new Date().toISOString()
                  }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}