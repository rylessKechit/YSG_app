// admin-app/src/components/timesheets/timesheets-header-fixed.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Clock, Plus, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function TimesheetsHeader() {
  const router = useRouter();

  const handleCreateTimesheet = () => {
    router.push('/timesheets/new');
  };

  const handleExportData = () => {
    // TODO: Implémenter l'export avec l'API backend
    toast.info('Export en cours de développement');
  };

  const handleRefresh = () => {
    // Recharger la page pour actualiser les données
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-8 w-8 text-blue-600" />
          Gestion des Pointages
        </h1>
        <p className="text-gray-600 mt-1">
          Suivi et validation des temps de travail
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
        
        <Button variant="outline" onClick={handleExportData}>
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
        
        <Button onClick={handleCreateTimesheet}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau pointage
        </Button>
      </div>
    </div>
  );
}