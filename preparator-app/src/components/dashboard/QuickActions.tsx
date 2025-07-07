'use client';

import { useRouter } from 'next/navigation';
import { Clock, Car, Play, Square, Coffee, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimesheetStore, TimesheetStatus } from '@/lib/stores/timesheet';
import { Preparation, Agency } from '@/lib/types';
import { useState } from 'react';
import { useAppStore } from '@/lib/stores';

interface QuickActionsProps {
  todayStatus: TimesheetStatus | null;
  currentPreparation: Preparation | null;
  selectedAgencyId: string;
  agencies: Agency[];
}

export function QuickActions({ 
  todayStatus, 
  currentPreparation, 
  selectedAgencyId,
  agencies 
}: QuickActionsProps) {
  const router = useRouter();
  const { clockIn, clockOut, startBreak, endBreak, isLoading } = useTimesheetStore();
  const { addNotification } = useAppStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ✅ MAINTENANT ON PEUT UTILISER DIRECTEMENT currentStatus
  const currentStatus = todayStatus?.currentStatus;
  const selectedAgency = agencies.find(a => a.id === selectedAgencyId);

  const handleClockAction = async (action: string, handler: () => Promise<void>) => {
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

  // ✅ Actions disponibles calculées simplement
  const canClockIn = currentStatus === 'not_started';
  const canClockOut = currentStatus === 'working' || currentStatus === 'on_break';
  const canStartBreak = currentStatus === 'working';
  const canEndBreak = currentStatus === 'on_break';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Actions rapides</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut actuel */}
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Statut actuel</p>
          <p className="font-semibold text-gray-900">
            {currentStatus === 'not_started' && '⚪ Pas encore pointé'}
            {currentStatus === 'working' && '🟢 En service'}
            {currentStatus === 'on_break' && '🟡 En pause'}
            {currentStatus === 'finished' && '🔵 Service terminé'}
          </p>
          {selectedAgency && (
            <p className="text-xs text-gray-500 mt-1">
              {selectedAgency.name}
            </p>
          )}
        </div>

        {/* Actions de pointage */}
        <div className="grid grid-cols-2 gap-3">
          {/* Arrivée */}
          <Button
            onClick={() => handleClockAction('clock-in', () => clockIn(selectedAgencyId))}
            disabled={!canClockIn || actionLoading !== null}
            className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === 'clock-in' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Arriver</span>
          </Button>

          {/* Départ */}
          <Button
            onClick={() => handleClockAction('clock-out', () => clockOut(selectedAgencyId))}
            disabled={!canClockOut || actionLoading !== null}
            className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {actionLoading === 'clock-out' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span>Partir</span>
          </Button>

          {/* Pause début */}
          <Button
            onClick={() => handleClockAction('break-start', () => startBreak(selectedAgencyId))}
            disabled={!canStartBreak || actionLoading !== null}
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            {actionLoading === 'break-start' ? (
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Coffee className="w-4 h-4" />
            )}
            <span>Pause</span>
          </Button>

          {/* Pause fin */}
          <Button
            onClick={() => handleClockAction('break-end', () => endBreak(selectedAgencyId))}
            disabled={!canEndBreak || actionLoading !== null}
            variant="outline"
            className="flex items-center justify-center space-x-2"
          >
            {actionLoading === 'break-end' ? (
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Fin pause</span>
          </Button>
        </div>

        {/* Action préparation si pas de préparation en cours */}
        {!currentPreparation && currentStatus === 'working' && (
          <Button
            onClick={() => router.push('/preparations/new')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Car className="w-4 h-4 mr-2" />
            Démarrer une préparation
          </Button>
        )}

        {/* Temps travaillé aujourd'hui */}
        {todayStatus?.currentWorkedMinutes && todayStatus.currentWorkedMinutes > 0 && (
          <div className="text-center text-sm text-gray-600 mt-3 pt-3 border-t">
            Temps travaillé: <span className="font-medium">
              {Math.floor(todayStatus.currentWorkedMinutes / 60)}h
              {(todayStatus.currentWorkedMinutes % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}