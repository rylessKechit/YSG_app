// admin-app/src/app/(dashboard)/timesheets/new/page.tsx - COPIE EXACTE DE EDIT
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Import du formulaire fonctionnel - EXACTEMENT COMME EDIT
import { TimesheetForm } from '@/components/timesheets/timesheet-form';
import { useCreateTimesheet } from '@/hooks/use-timesheets';
import { toast } from 'sonner';

// ===== PAS DE TYPES LOCAUX - ON UTILISE CEUX DU FORMULAIRE =====

export default function NewTimesheetPage() {
  const router = useRouter();
  const createTimesheet = useCreateTimesheet();

  // ✅ EXACTEMENT LA MÊME SIGNATURE QUE EDIT
  const handleSuccess = (data: any) => {
    createTimesheet.mutate(data, {
      onSuccess: (response) => {
        toast.success('Pointage créé avec succès !');
        router.push('/timesheets');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la création');
      }
    });
  };

  const handleCancel = () => {
    router.push('/timesheets');
  };

  const handleBack = () => {
    router.push('/timesheets');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux pointages
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Plus className="h-8 w-8" />
            Nouveau pointage
          </h1>
          <p className="text-gray-600 mt-1">
            Créer un pointage manuel pour un employé
          </p>
        </div>
      </div>

      {/* Info */}
      <Alert>
        <AlertDescription>
          <strong>Nouveau pointage:</strong> Remplissez les informations ci-dessous pour créer un pointage manuel. 
          Les champs marqués d'un * sont obligatoires.
        </AlertDescription>
      </Alert>

      {/* Formulaire - EXACTEMENT COMME EDIT */}
      <TimesheetForm
        onSubmit={handleSuccess}
        onCancel={handleCancel}
        isLoading={createTimesheet.isPending}
      />
    </div>
  );
}