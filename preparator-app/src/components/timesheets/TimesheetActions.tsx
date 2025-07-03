'use client';

import { useState } from 'react';
import { Play, Square, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimesheetStatus } from '@/lib/types/timesheet';
import { useTimesheetActions } from '@/hooks/useTimesheet';
import { useAppStore } from '@/lib/stores/app';

interface TimesheetActionsProps {
  status: TimesheetStatus | null;
}

export function TimesheetActions({ status }: TimesheetActionsProps) {
  const { clockIn, clockOut, startBreak, endBreak } = useTimesheetActions();
  const { addNotification } = useAppStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canClockIn = status?.currentStatus === 'not_started';
  const canClockOut = status?.currentStatus === 'working' || status?.currentStatus === 'on_break';
  const canStartBreak = status?.currentStatus === 'working';
  const canEndBreak = status?.currentStatus === 'on_break';

  const handleAction = async (action: string, handler: () => Promise<void>) => {
    setActionLoading(action);
    try {
      await handler();
      
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
            disabled={!canClockIn || actionLoading !== null}
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
            onClick={() => handleAction('clock-out', clockOut)}
            disabled={!canClockOut || actionLoading !== null}
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
            disabled={!canStartBreak || actionLoading !== null}
            variant="outline"
            className="flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {actionLoading === 'break-start' ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Coffee className="w-5 h-5" />
            )}
            <span>Pause</span>
          </Button>

          {/* Terminer pause */}
          <Button
            onClick={() => handleAction('break-end', endBreak)}
            disabled={!canEndBreak || actionLoading !== null}
            variant="outline"
            className="flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {actionLoading === 'break-end' ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            <span>Reprendre</span>
          </Button>
        </div>

        {/* Indicateurs d'aide */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            {!status && 'Chargement du statut...'}
            {status?.currentStatus === 'not_started' && 'Vous pouvez pointer votre arrivée'}
            {status?.currentStatus === 'working' && 'Vous êtes en service - Vous pouvez prendre une pause ou pointer votre départ'}
            {status?.currentStatus === 'on_break' && 'Vous êtes en pause - Vous pouvez reprendre le travail ou pointer votre départ'}
            {status?.currentStatus === 'finished' && 'Votre service est terminé pour aujourd\'hui'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}