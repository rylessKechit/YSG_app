'use client&apos;;

import { useRouter } from 'next/navigation';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/stores/auth-store';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Accès refusé
          </CardTitle>
          <CardDescription className="text-gray-600">
            Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Informations utilisateur */}
          {user && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p><strong>Utilisateur :</strong> {user.firstName} {user.lastName}</p>
              <p><strong>Email :</strong> {user.email}</p>
              <p><strong>Rôle actuel :</strong> 
                <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                  user.role === &apos;admin' 
                    ? &apos;bg-green-100 text-green-800' 
                    : &apos;bg-blue-100 text-blue-800'
                }`}>`
                  {user.role}
                </span>
              </p>
            </div>
          )}

          {/* Message d'explication */}'
          <div className="text-sm text-gray-600">
            <p>Cette page nécessite des permissions d&apos;administrateur.</p>
            {user?.role !== &apos;admin' && (
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
          {process.env.NODE_ENV === &apos;development' && (
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
        </CardContent>
      </Card>
    </div>
  );
}