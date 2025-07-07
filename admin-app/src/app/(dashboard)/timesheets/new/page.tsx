// admin-app/src/app/(dashboard)/timesheets/new/page.tsx - VERSION CORRIGÉE
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ✅ Import correct des types
import { Timesheet } from '@/types/timesheet';

export default function NewTimesheetPage() {
  const router = useRouter();

  const handleSuccess = (newTimesheet: Timesheet) => {
    console.log('✅ Pointage créé:', newTimesheet);
    router.push('/timesheets');
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

      {/* ✅ Formulaire temporaire en attendant TimesheetForm */}
      <Card>
        <CardHeader>
          <CardTitle>Formulaire de création</CardTitle>
          <CardDescription>
            Le composant TimesheetForm sera disponible après l'implémentation du chapitre 5
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Formulaire de création de pointage en cours de développement
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleCancel}>
                Retour aux pointages
              </Button>
              <Button onClick={() => console.log('Création temporairement désactivée')}>
                Créer le pointage (Temporaire)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}