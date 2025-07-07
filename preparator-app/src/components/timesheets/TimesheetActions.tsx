'use client';

import { useState } from 'react';
import { Play, Square, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimesheetStore } from '@/lib/stores/timesheet';
import { useAppStore } from '@/lib/stores/app';

interface TimesheetActionsProps {
  status: any; // ✅ Simplifié pour éviter les conflits de types
  selectedAgencyId: string; // ✅ Ajout de l'agence sélectionnée
}

export function TimesheetActions({ status, selectedAgencyId }: TimesheetActionsProps) {
  // ✅ CORRECTION: Utilisation directe du store au lieu du hook
  const { clockIn, clockOut, startBreak, endBreak, isLoading } = useTimesheetStore();
  const { addNotification } = useAppStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ✅ Calcul des actions disponibles
  const canClockIn = !status || status.currentStatus === 'not_started';
  const canClockOut = status?.currentStatus === 'working' || status?.currentStatus === 'on_break';
  const canStartBreak = status?.currentStatus === 'working';
  const canEndBreak = status?.currentStatus === 'on_break';

  // ✅ CORRECTION: Fonction pour gérer les actions avec agencyId
  const handleAction = async (action: string, handler: (agencyId: string) => Promise<void>) => {
    if (!selectedAgencyId) {
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Veuillez sélectionner une agence',
        duration: 3000
      });
      return;
    }

    setActionLoading(action);
    try {
      await handler(selectedAgencyId); // ✅ Passer l'agencyId
      
      const messages = {
        'clock-in': 'Arrivée pointée avec succès',
        'clock-out': 'Départ pointé avec succès',
        'break-start': 'Pause commencée',
        'break-end': 'Pause terminée'
      };

      addNotification({
        type: 'success',
        title: 'Succès',
        message: messages[action as keyof typeof messages],
        duration: 3000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Une erreur est survenue',
        duration: 5000
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Arriver */}
          <Button
            onClick={() => handleAction('clock-in', clockIn)}
            disabled={!canClockIn || actionLoading !== null || isLoading}
            className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === 'clock-in' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            <span>Arriver</span>
          </Button>

          {/* Partir */}
          <Button
            onClick={() => handleAction('clock-out', (agencyId) => clockOut(agencyId))}
            disabled={!canClockOut || actionLoading !== null || isLoading}
            className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {actionLoading === 'clock-out' ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span>Partir</span>
          </Button>

          {/* Commencer pause */}
          <Button
            onClick={() => handleAction('break-start', startBreak)}
            disabled={!canStartBreak || actionLoading !== null || isLoading}
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            {actionLoading === 'break-start' ? (
              <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Coffee className="w-5 h-5" />
            )}
            <span>Commencer pause</span>
          </Button>

          {/* Terminer pause */}
          <Button
            onClick={() => handleAction('break-end', endBreak)}
            disabled={!canEndBreak || actionLoading !== null || isLoading}
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            {actionLoading === 'break-end' ? (
              <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span>Terminer pause</span>
          </Button>
        </div>

        {/* Statut actuel */}
        {status && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Statut actuel</p>
            <p className="font-medium text-gray-900">
              {status.currentStatus === 'not_started' && '⚪ Pas encore pointé'}
              {status.currentStatus === 'working' && '🟢 En service'}
              {status.currentStatus === 'on_break' && '🟡 En pause'}
              {status.currentStatus === 'finished' && '🔵 Service terminé'}
            </p>
            
            {/* Temps travaillé */}
            {status.currentWorkedMinutes > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Temps travaillé: {Math.floor(status.currentWorkedMinutes / 60)}h
                {(status.currentWorkedMinutes % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>
        )}

        {/* Agence sélectionnée */}
        {selectedAgencyId && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Actions pour l'agence sélectionnée
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}