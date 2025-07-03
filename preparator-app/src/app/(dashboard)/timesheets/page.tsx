'use client';

import { useEffect, useState } from 'react';
import { Clock, Play, Square, Coffee, RotateCcw, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTimesheetStore } from '@/lib/stores/timesheet';
import { useAuthStore } from '@/lib/stores/auth';
import { useAppStore } from '@/lib/stores/app';
import { TimesheetStatus } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TimesheetsPage() {
  const { user } = useAuthStore();
  const { 
    todayStatus, 
    history, 
    isLoading, 
    error,
    getTodayStatus,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getHistory,
    clearError
  } = useTimesheetStore();
  const { addNotification } = useAppStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) {
      getTodayStatus();
      getHistory();
    }
  }, [user, getTodayStatus, getHistory]);

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

  const getStatusInfo = (status: TimesheetStatus) => {
    switch (status.currentStatus) {
      case 'not_started':
        return { 
          label: 'Pas encore pointé', 
          color: 'text-gray-600', 
          bgColor: 'bg-gray-100',
          icon: Clock 
        };
      case 'working':
        return { 
          label: 'En service', 
          color: 'text-green-600', 
          bgColor: 'bg-green-100',
          icon: Play 
        };
      case 'on_break':
        return { 
          label: 'En pause', 
          color: 'text-orange-600', 
          bgColor: 'bg-orange-100',
          icon: Coffee 
        };
      case 'finished':
        return { 
          label: 'Service terminé', 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-100',
          icon: Square 
        };
      default:
        return { 
          label: 'Statut inconnu', 
          color: 'text-gray-600', 
          bgColor: 'bg-gray-100',
          icon: Clock 
        };
    }
  };

  const canClockIn = todayStatus?.currentStatus === 'not_started';
  const canClockOut = todayStatus?.currentStatus === 'working' || todayStatus?.currentStatus === 'on_break';
  const canStartBreak = todayStatus?.currentStatus === 'working';
  const canEndBreak = todayStatus?.currentStatus === 'on_break';

  if (isLoading && !todayStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pointages</h1>
          <p className="text-gray-600">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center space-x-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Historique</span>
        </Button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearError();
                  getTodayStatus();
                }}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statut actuel */}
      {todayStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Statut du jour</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Statut principal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {(() => {
                  const statusInfo = getStatusInfo(todayStatus);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <>
                      <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
                        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{statusInfo.label}</p>
                        <p className="text-sm text-gray-600">
                          {new Date().toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Temps travaillé */}
              {todayStatus.totalWorkedMinutes > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Temps travaillé</p>
                  <p className="font-semibold text-gray-900">
                    {Math.floor(todayStatus.totalWorkedMinutes / 60)}h
                    {(todayStatus.totalWorkedMinutes % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              )}
            </div>

            {/* Détails des horaires */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Arrivée</p>
                <p className="font-medium">
                  {todayStatus.startTime ? 
                    format(new Date(todayStatus.startTime), 'HH:mm') : 
                    'Non pointé'
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Départ</p>
                <p className="font-medium">
                  {todayStatus.endTime ? 
                    format(new Date(todayStatus.endTime), 'HH:mm') : 
                    'Non pointé'
                  }
                </p>
              </div>
            </div>

            {/* Pauses */}
            {(todayStatus.breakStart || todayStatus.breakEnd) && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Début pause</p>
                  <p className="font-medium">
                    {todayStatus.breakStart ? 
                      format(new Date(todayStatus.breakStart), 'HH:mm') : 
                      'Non commencée'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Fin pause</p>
                  <p className="font-medium">
                    {todayStatus.breakEnd ? 
                      format(new Date(todayStatus.breakEnd), 'HH:mm') : 
                      'En cours'
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions de pointage */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAction('clock-in', clockIn)}
              disabled={!canClockIn || actionLoading !== null}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'clock-in' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>Arriver</span>
            </Button>

            <Button
              onClick={() => handleAction('clock-out', clockOut)}
              disabled={!canClockOut || actionLoading !== null}
              className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700"
            >
              {actionLoading === 'clock-out' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <span>Partir</span>
            </Button>

            <Button
              onClick={() => handleAction('break-start', startBreak)}
              disabled={!canStartBreak || actionLoading !== null}
              variant="outline"
              className="flex items-center justify-center space-x-2"
            >
              {actionLoading === 'break-start' ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Coffee className="w-5 h-5" />
              )}
              <span>Pause</span>
            </Button>

            <Button
              onClick={() => handleAction('break-end', endBreak)}
              disabled={!canEndBreak || actionLoading !== null}
              variant="outline"
              className="flex items-center justify-center space-x-2"
            >
              {actionLoading === 'break-end' ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <span>Reprendre</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historique */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Historique</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history && history.length > 0 ? (
              <div className="space-y-3">
                {history.slice(0, 10).map((entry: any, index: any) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {entry.startTime ? format(new Date(entry.startTime), 'HH:mm') : '--'} - 
                        {entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '--'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Temps travaillé</p>
                      <p className="font-semibold text-gray-900">
                        {entry.totalWorkedMinutes > 0 ? 
                          `${Math.floor(entry.totalWorkedMinutes / 60)}h${(entry.totalWorkedMinutes % 60).toString().padStart(2, '0')}` : 
                          '--'
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun historique disponible</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}