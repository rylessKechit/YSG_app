// admin-app/src/app/(dashboard)/timesheets/[id]/edit/page.tsx - VERSION CORRIGÉE
'use client';

import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/loading-spinner';

// ✅ Import correct des hooks et types
import { useTimesheet } from '@/hooks/use-timesheets';
import { Timesheet } from '@/types/timesheet';

interface EditTimesheetPageProps {
  params: {
    id: string;
  };
}

export default function EditTimesheetPage({ params }: EditTimesheetPageProps) {
  const router = useRouter();
  const { id } = params;

  // Data hooks
  const { 
    data: timesheet, 
    isLoading, 
    error 
  } = useTimesheet(id);

  // Redirect si pas trouvé
  if (error?.message?.includes('404') || error?.message?.includes('not found')) {
    notFound();
  }

  // Handlers
  const handleSuccess = (updatedTimesheet: Timesheet) => {
    console.log('✅ Pointage modifié:', updatedTimesheet);
    router.push(`/timesheets/${id}`);
  };

  const handleCancel = () => {
    router.push(`/timesheets/${id}`);
  };

  const handleBackToList = () => {
    router.push('/timesheets');
  };

  const handleViewDetail = () => {
    router.push(`/timesheets/${id}`);
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
              <p className="text-gray-600 mt-4">Chargement du pointage...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !timesheet) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux pointages
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-600">
              Erreur de chargement
            </h1>
            <p className="text-gray-600 mt-1">
              Impossible de charger les informations du pointage
            </p>
          </div>
        </div>

        {/* Error card */}
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error?.message || 'Pointage non trouvé ou une erreur est survenue lors du chargement.'}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={handleBackToList}>
                Retour à la liste
              </Button>
              <Button onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleViewDetail}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au détail
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Edit className="h-8 w-8" />
              Modifier le pointage
            </h1>
            <p className="text-gray-600 mt-1">
              {typeof timesheet.user === 'object' 
                ? `${timesheet.user.firstName} ${timesheet.user.lastName}`
                : 'Utilisateur'
              } - {new Date(timesheet.date).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={handleViewDetail}>
          Voir le détail
        </Button>
      </div>

      {/* Alert pour pointage validé */}
      {timesheet.status === 'validated' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ce pointage a déjà été validé. Les modifications nécessiteront une nouvelle validation.
          </AlertDescription>
        </Alert>
      )}

      {/* ✅ Formulaire d'édition temporaire en attendant TimesheetForm */}
      <Card>
        <CardHeader>
          <CardTitle>Formulaire d'édition</CardTitle>
          <CardDescription>
            Le composant TimesheetForm sera disponible après l'implémentation du chapitre 5
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations actuelles du timesheet */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateur:</p>
              <p className="text-lg">
                {typeof timesheet.user === 'object' 
                  ? `${timesheet.user.firstName} ${timesheet.user.lastName}`
                  : 'Utilisateur supprimé'
                }
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Agence:</p>
              <p className="text-lg">
                {typeof timesheet.agency === 'object' 
                  ? timesheet.agency.name 
                  : 'Agence supprimée'
                }
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Date:</p>
              <p className="text-lg">{new Date(timesheet.date).toLocaleDateString('fr-FR')}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Statut:</p>
              <p className="text-lg">
                {timesheet.status === 'incomplete' ? 'Incomplet' :
                 timesheet.status === 'complete' ? 'Complet' :
                 timesheet.status === 'validated' ? 'Validé' :
                 'En litige'}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Début:</p>
              <p className="text-lg">
                {timesheet.startTime 
                  ? new Date(timesheet.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : 'Non renseigné'
                }
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600">Fin:</p>
              <p className="text-lg">
                {timesheet.endTime 
                  ? new Date(timesheet.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : 'Non renseigné'
                }
              </p>
            </div>
          </div>

          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Formulaire d'édition de pointage en cours de développement
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleCancel}>
                Annuler
              </Button>
              <Button onClick={() => console.log('Modification temporairement désactivée')}>
                Enregistrer les modifications (Temporaire)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}