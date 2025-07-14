// admin-app/src/app/(dashboard)/timesheets/[id]/edit/page.tsx - VERSION MISE À JOUR
'use client';

import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/loading-spinner';

// Import du formulaire fonctionnel
import { TimesheetForm } from '@/components/timesheets/timesheet-form';
import { useTimesheet, useUpdateTimesheet } from '@/hooks/use-timesheets';
import { TimesheetUpdateData } from '@/types/timesheet';
import { toast } from 'sonner';

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
    isLoading: isLoadingTimesheet, 
    error 
  } = useTimesheet(id);

  const updateTimesheet = useUpdateTimesheet();

  // Redirect si pas trouvé
  if (error?.message?.includes('404') || error?.message?.includes('not found')) {
    notFound();
  }

  // Handlers
  const handleSuccess = (data: TimesheetUpdateData) => {
    updateTimesheet.mutate({ id, data }, {
      onSuccess: (response) => {
        toast.success('Pointage modifié avec succès !');
        router.push(`/timesheets/${id}`);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la modification');
      }
    });
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
  if (isLoadingTimesheet) {
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
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 mt-4">Chargement du pointage...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux pointages
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-600">
              Erreur
            </h1>
            <p className="text-gray-600 mt-1">
              Impossible de charger ce pointage
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error.message || 'Une erreur est survenue lors du chargement du pointage.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleViewDetail}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux détails
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Edit className="h-8 w-8" />
            Modifier le pointage
          </h1>
          <p className="text-gray-600 mt-1">
            Pointage du {timesheet ? 
              new Date(timesheet.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 
              '...'
            }
          </p>
        </div>
      </div>

      {/* Info */}
      <Alert>
        <AlertDescription>
          <strong>Modification de pointage:</strong> Les modifications seront enregistrées avec une trace 
          d'audit. Vérifiez bien les informations avant de valider.
        </AlertDescription>
      </Alert>

      {/* Formulaire */}
      {timesheet && (
        <TimesheetForm
          timesheet={timesheet}
          onSubmit={handleSuccess}
          onCancel={handleCancel}
          isLoading={updateTimesheet.isPending}
        />
      )}
    </div>
  );
}