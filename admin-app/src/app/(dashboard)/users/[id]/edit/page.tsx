'use client&apos;;

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { UserForm } from '@/components/users/user-form';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/hooks/api/useUsers';
import { User } from '@/types/auth';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  // Vérifier que l'ID est valide'
  useEffect(() => {
    if (!userId || Array.isArray(userId)) {
      console.error('ID utilisateur invalide:&apos;, userId);
      router.push('/users');
    }
  }, [userId, router]);

  // Hook pour récupérer l'utilisateur'
  const { data: user, isLoading, error } = useUser(userId, !!userId);

  // Handlers
  const handleSuccess = (updatedUser: User) => {
    console.log('✅ Utilisateur modifié:&apos;, updatedUser);
    router.push('/users');
  };

  const handleCancel = () => {
    router.push('/users');
  };

  const handleBackToList = () => {
    router.push('/users');
  };

  const handleViewProfile = () => {
    router.push(`/users/${userId}/profile`);`
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Loading card */}
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">Chargement des informations utilisateur...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-600">
              Erreur de chargement
            </h1>
            <p className="text-gray-600 mt-1">
              Impossible de charger les informations de l&apos;utilisateur
            </p>
          </div>
        </div>

        {/* Error card */}
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error?.message || &apos;Utilisateur non trouvé ou une erreur est survenue lors du chargement.'}
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4 mt-6">
              <Button onClick={handleBackToList}>
                Retour à la liste
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - render form
  return (
    <div className="space-y-6">
      {/* Header avec informations utilisateur */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Modifier {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600 mt-1">
              Modifiez les informations de cet utilisateur
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleViewProfile}>
            Voir le profil
          </Button>
        </div>
      </div>

      {/* Informations actuelles - Badge */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-blue-700 text-sm">
                  {user.email} • {user.role === &apos;admin' ? &apos;Administrateur' : 'Préparateur'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">
                Statut: <span className={user.isActive ? &apos;text-green-600' : 'text-red-600'}>
                  {user.isActive ? &apos;Actif' : 'Inactif'}
                </span>
              </p>
              <p className="text-sm text-blue-600">
                {user.agencies?.length || 0} agence(s) assignée(s)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'édition */}'
      <UserForm 
        userId={userId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        hideHeader={true} // ✅ CORRECTION: Masquer le header du UserForm
      />
    </div>
  );
}