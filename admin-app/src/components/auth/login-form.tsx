'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuth } from '@/lib/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('🔐 Tentative de connexion:', data.email);
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('📤 Envoi requête login...');
      const response = await authApi.login(data);
      
      console.log('📥 Réponse login:', {
        success: response.success,
        hasToken: !!response.data?.token,
        tokenPreview: response.data?.token?.substring(0, 20) + '...' || 'AUCUN',
        userRole: response.data?.user?.role
      });
      
      if (response.success && response.data) {
        const { user, token, refreshToken } = response.data;
        
        if (!token) {
          console.error('❌ Pas de token dans la réponse !');
          setError('Erreur: Token manquant dans la réponse');
          return;
        }
        
        console.log('✅ Token reçu, mise à jour du store...');
        
        // Mettre à jour le store auth
        login(user, token, refreshToken);
        
        console.log('🔄 Redirection vers dashboard...');
        
        // Rediriger vers le dashboard
        router.push('/dashboard');
      } else {
        console.error('❌ Réponse login sans succès:', response);
        setError('Échec de la connexion');
      }
    } catch (error: any) {
      console.error('💥 Erreur lors du login:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Erreur de connexion inconnue';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Vehicle Prep Admin</CardTitle>
          <CardDescription>
            Connectez-vous à votre espace administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Se connecter
                </>
              )}
            </Button>
          </form>

          {/* Infos de test en développement */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p className="font-medium mb-1">🧪 Comptes de test :</p>
              <p><strong>Admin:</strong> admin@example.com / password123</p>
              <p className="mt-2 text-yellow-600">
                💡 Vérifiez les logs console pour le debug des tokens
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}