'use client';

import { useRouter } from 'next/navigation';
import { Clock, Car, Play, Square, Coffee, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimesheetStore } from '@/lib/stores';
import { TimesheetStatus, Preparation, Agency } from '@/lib/types';
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

  const getClockInButton = () => {
    if (currentStatus?.isClockedOut) {
      return (
        <Button disabled className="w-full">
          <Square className="w-4 h-4 mr-2" />
          Service terminé
        </Button>
      );
    }

    if (currentStatus?.isClockedIn) {
      return (
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => handleClockAction('clock-out', () => clockOut(selectedAgencyId))}
          disabled={actionLoading === 'clock-out'}
        >
          <Square className="w-4 h-4 mr-2" />
          Pointer le départ
        </Button>
      );
    }

    return (
      <Button 
        className="w-full"
        onClick={() => handleClockAction('clock-in', () => clockIn(selectedAgencyId))}
        disabled={actionLoading === 'clock-in'}
      >
        <Play className="w-4 h-4 mr-2" />
        Pointer l'arrivée
      </Button>
    );
  };

  const getBreakButton = () => {
    if (!currentStatus?.isClockedIn || currentStatus?.isClockedOut) {
      return null;
    }

    if (currentStatus?.isOnBreak) {
      return (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => handleClockAction('break-end', () => endBreak(selectedAgencyId))}
          disabled={actionLoading === 'break-end'}
        >
          <Coffee className="w-4 h-4 mr-2" />
          Terminer la pause
        </Button>
      );
    }

    return (
      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => handleClockAction('break-start', () => startBreak(selectedAgencyId))}
        disabled={actionLoading === 'break-start'}
      >
        <Coffee className="w-4 h-4 mr-2" />
        Commencer la pause
      </Button>
    );
  };

  const getPreparationButton = () => {
    if (currentPreparation) {
      return (
        <Button 
          variant="secondary" 
          className="w-full"
          onClick={() => router.push(`/preparations/${currentPreparation.id}`)}
        >
          <Car className="w-4 h-4 mr-2" />
          Continuer préparation
        </Button>
      );
    }

    return (
      <Button 
        variant="secondary" 
        className="w-full"
        onClick={() => router.push('/preparations/new')}
      >
        <Car className="w-4 h-4 mr-2" />
        Nouvelle préparation
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Actions rapides</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sélection d'agence si nécessaire */}
        {!selectedAgency && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3">
            <p className="text-sm text-amber-800">
              Sélectionnez une agence pour commencer le pointage
            </p>
          </div>
        )}

        {/* Bouton pointage principal */}
        {getClockInButton()}

        {/* Bouton pause */}
        {getBreakButton()}

        {/* Bouton préparation */}
        {getPreparationButton()}

        {/* Informations contextuelles */}
        {selectedAgency && (
          <div className="text-xs text-gray-500 text-center">
            Agence: {selectedAgency.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
}